-- Instant sign-ups no longer confirm their email with a code before their first
-- pay link (that trip to the inbox lost sign-ups). Same rule as before, minus the
-- confirmed email: a live subscription and their own service.
drop policy "techs create pay links" on public.appointments;

create policy "techs create pay links" on public.appointments
  for insert to authenticated
  with check (
    tech_id = (select auth.uid())
    and status = 'pending_deposit'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
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
