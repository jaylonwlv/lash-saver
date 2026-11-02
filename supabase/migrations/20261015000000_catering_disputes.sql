-- Chargebacks on catering payments, handled like deposit disputes
-- (lib/catering/disputes.ts): the dispute is recorded once, and its outcome too.
alter table public.catering_payments
  add column dispute_id text,
  add column dispute_status text check (dispute_status in ('open', 'won', 'lost'));
