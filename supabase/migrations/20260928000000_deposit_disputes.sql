-- Card chargebacks on deposits. The platform is liable to Stripe for disputes,
-- so when a client disputes a deposit Dibs pulls the pro's share back from their
-- Stripe account, and returns it if the dispute is won.
alter table public.deposits
  add column dispute_id text unique,
  add column dispute_status text check (dispute_status in ('open', 'won', 'lost'));
