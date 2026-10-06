-- Techs write appointments through the Supabase API as themselves, so the old
-- "for all" policy let a signed-in pro skip createAppointment's checks by calling
-- the API directly: create pay links without a subscription or a confirmed email,
-- or rewrite the policy snapshot a client agreed to. Narrow it to what the app
-- does: create a pay link (only when allowed), and move an appointment along.

drop policy "techs manage own appointments" on public.appointments;

create policy "techs read own appointments" on public.appointments
  for select to authenticated using (tech_id = (select auth.uid()));

-- Same gate as createAppointment: confirmed email, a live subscription, their own service.
create policy "techs create pay links" on public.appointments
  for insert to authenticated
  with check (
    tech_id = (select auth.uid())
    and status = 'pending_deposit'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.email_confirmed
        and p.subscription_status in ('trialing', 'active', 'past_due')
    )
    and (
      service_id is null
      or exists (
        select 1 from public.services s
        where s.id = service_id and s.tech_id = (select auth.uid())
      )
    )
  );

create policy "techs update own appointments" on public.appointments
  for update to authenticated
  using (tech_id = (select auth.uid())) with check (tech_id = (select auth.uid()));

-- Column grants (a table-level grant would override column limits; see
-- 20260924000000_profile_update_grants.sql). Snapshots, deposit amounts and
-- policy acceptance stay server-only. No deletes: deposits point at appointments.
revoke insert, update, delete on public.appointments from anon, authenticated;
grant insert (
  tech_id, service_id, client_name, client_email, client_phone, client_instagram, notes,
  starts_at, ends_at, status, hold_expires_at, price_cents, deposit_cents, payment_method
) on public.appointments to authenticated;
grant update (status, hold_expires_at, client_marked_sent_at) on public.appointments
  to authenticated;

-- A pro can close or confirm an appointment, but not reopen a pay link or stretch
-- one: that would be a pay link without the checks above.
create or replace function public.guard_tech_appointment_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    if new.status = 'pending_deposit' and old.status <> 'pending_deposit' then
      raise exception 'A pay link can''t be reopened' using errcode = '42501';
    end if;
    if new.hold_expires_at is not null
       and new.hold_expires_at is distinct from old.hold_expires_at then
      raise exception 'A pay link''s hold is set by the server' using errcode = '42501';
    end if;
    if new.client_marked_sent_at is not null
       and new.client_marked_sent_at is distinct from old.client_marked_sent_at then
      raise exception 'Only the client marks a deposit as sent' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger appointments_guard_tech_update before update on public.appointments
  for each row execute function public.guard_tech_appointment_update();
