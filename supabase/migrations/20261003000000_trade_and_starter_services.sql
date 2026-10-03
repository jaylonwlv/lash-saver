-- What kind of pro this is, picked once during setup (or later on the profile).
-- Used only in the pro's own setup: starter services and policy. Never shown to
-- clients, so it stays out of the public_profiles view. Must match TRADES in
-- src/lib/trades.ts.
alter table public.profiles
  add column trade text check (
    trade in ('barber', 'tattoo', 'nails', 'lashes', 'hair', 'fitness', 'detailing', 'photography', 'other')
  );

-- Self-service column (see 20260924000000_profile_update_grants.sql).
grant update (trade) on public.profiles to authenticated;

-- Services added from a trade's starter menu, still at the example price.
-- Cleared the first time the pro saves the service.
alter table public.services
  add column is_starter boolean not null default false;
