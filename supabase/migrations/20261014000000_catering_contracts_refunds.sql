-- Catering: e-signed agreements and automatic refunds.
--
-- Hosts sign the agreement (event, price, payment schedule, refund terms, the
-- owner's policy and contract terms) by typing their name. We keep the exact text
-- they signed with the time, IP address and browser, as the record.
--
-- Refunds follow the terms saved on each booking: an owner's cancellation refunds
-- everything the host paid; a host may cancel online (if the owner allows it) for a
-- full refund at least full_refund_days before the event, after which the deposit
-- is kept and any balance paid is refunded.

alter table public.catering_settings
  add column contract_terms text check (char_length(contract_terms) <= 10000),
  add column host_can_cancel boolean not null default true,
  add column full_refund_days integer not null default 30 check (full_refund_days between 0 and 365);

alter table public.catering_bookings
  add column contract_text text check (char_length(contract_text) <= 20000),
  add column signature_name text check (char_length(signature_name) <= 100),
  add column signed_at timestamptz,
  add column signer_ip text check (char_length(signer_ip) <= 100),
  add column signer_user_agent text check (char_length(signer_user_agent) <= 500),
  add column host_can_cancel boolean not null default false,
  add column full_refund_days integer check (full_refund_days between 0 and 365),
  add column cancelled_by text check (cancelled_by in ('owner', 'host'));

-- Owners record who cancelled (themselves) along with the other cancel fields.
grant update (cancelled_by) on public.catering_bookings to authenticated;

-- hold_catering_date now also stores the signature and refund terms.
create or replace function public.hold_catering_date(p_booking jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tech uuid := (p_booking ->> 'tech_id')::uuid;
  v_date date := (p_booking ->> 'event_date')::date;
  v_capacity integer;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_tech::text || ':' || v_date::text, 0));
  select daily_capacity into v_capacity from public.catering_settings where tech_id = v_tech;
  if v_capacity is null then return null; end if;
  if exists (select 1 from public.catering_blocked_dates where tech_id = v_tech and date = v_date) then
    return null;
  end if;
  if public.catering_held_count(v_tech, v_date) >= v_capacity then return null; end if;

  insert into public.catering_bookings (
    tech_id, public_token, status, event_date, start_time, end_time, timezone, guest_count,
    package_id, add_on_ids, extra_hours, event_type, event_address, event_notes,
    host_name, host_email, host_phone, quote, subtotal_cents, travel_fee_cents,
    service_fee_cents, tax_cents, total_cents, deposit_cents, balance_cents,
    balance_due_date, policy_text_snapshot, terms_accepted_at, hold_expires_at,
    contract_text, signature_name, signed_at, signer_ip, signer_user_agent,
    host_can_cancel, full_refund_days
  ) values (
    v_tech, p_booking ->> 'public_token', p_booking ->> 'status', v_date,
    (p_booking ->> 'start_time')::time, (p_booking ->> 'end_time')::time,
    p_booking ->> 'timezone', (p_booking ->> 'guest_count')::integer,
    (p_booking ->> 'package_id')::uuid,
    coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p_booking -> 'add_on_ids') x), '{}'),
    (p_booking ->> 'extra_hours')::integer, p_booking ->> 'event_type',
    p_booking ->> 'event_address', p_booking ->> 'event_notes',
    p_booking ->> 'host_name', p_booking ->> 'host_email', p_booking ->> 'host_phone',
    p_booking -> 'quote', (p_booking ->> 'subtotal_cents')::integer,
    (p_booking ->> 'travel_fee_cents')::integer, (p_booking ->> 'service_fee_cents')::integer,
    (p_booking ->> 'tax_cents')::integer, (p_booking ->> 'total_cents')::integer,
    (p_booking ->> 'deposit_cents')::integer, (p_booking ->> 'balance_cents')::integer,
    (p_booking ->> 'balance_due_date')::date, p_booking ->> 'policy_text_snapshot',
    (p_booking ->> 'terms_accepted_at')::timestamptz, (p_booking ->> 'hold_expires_at')::timestamptz,
    p_booking ->> 'contract_text', p_booking ->> 'signature_name',
    (p_booking ->> 'signed_at')::timestamptz, p_booking ->> 'signer_ip', p_booking ->> 'signer_user_agent',
    coalesce((p_booking ->> 'host_can_cancel')::boolean, false),
    (p_booking ->> 'full_refund_days')::integer
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.hold_catering_date(jsonb) from public, anon, authenticated;
grant execute on function public.hold_catering_date(jsonb) to service_role;
