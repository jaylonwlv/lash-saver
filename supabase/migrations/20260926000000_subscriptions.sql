-- Tech subscriptions: $29/month through Stripe Billing, with a 30-day free
-- trial that starts when the tech adds a card (before their first pay link).

-- Written only by server code from Stripe data. The update grant from
-- 20260924000000_profile_update_grants.sql lists specific columns, so techs
-- can't write these.
alter table public.profiles
  add column stripe_customer_id text unique,
  add column subscription_id text unique,
  add column subscription_status text,
  add column trial_ends_at timestamptz,
  add column current_period_end timestamptz,
  add column cancel_at_period_end boolean not null default false;

-- Signals of who already had a free trial: card and payout-bank fingerprints
-- from Stripe, normalized email, Instagram handle. A new account matching any
-- of them gets no second trial. tech_id is kept nullable so deleting an
-- account doesn't erase the claim.
create table public.trial_claims (
  id uuid primary key default gen_random_uuid(),
  tech_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('card', 'bank', 'email', 'instagram')),
  value text not null,
  created_at timestamptz not null default now(),
  unique (tech_id, kind, value)
);

create index trial_claims_lookup_idx on public.trial_claims (kind, value);

-- Server only: RLS on, no policies.
alter table public.trial_claims enable row level security;
