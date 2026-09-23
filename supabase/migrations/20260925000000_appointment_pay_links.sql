-- Pay links: the tech creates an appointment (time agreed in Instagram DMs) and
-- sends the client a link to pay the deposit.

-- Snapshot what the client is paying for, so later edits to the service or the
-- tech's policy don't change an existing booking. The policy snapshot and
-- acceptance time are evidence if a client disputes a kept deposit.
alter table public.appointments
  add column price_cents integer check (price_cents >= 0),
  add column deposit_cents integer check (deposit_cents >= 0),
  add column policy_accepted_at timestamptz,
  add column policy_text_snapshot text,
  add column cancellation_window_hours_snapshot integer
    check (cancellation_window_hours_snapshot >= 0);

-- At most one deposit per appointment can hold money. A second payment for the
-- same appointment (two open checkout tabs) is refunded, never kept.
create unique index deposits_one_settled_per_appointment
  on public.deposits (appointment_id)
  where status in ('paid', 'applied', 'forfeited');

create index deposits_payment_intent_idx on public.deposits (stripe_payment_intent_id);
create index appointments_hold_idx on public.appointments (hold_expires_at)
  where status = 'pending_deposit';
