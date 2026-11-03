-- The dashboard's first-run tour shows once per account, not once per browser.
-- Pros set it themselves when they close the tour, so it's added to the columns
-- they may update (see 20260924000000_profile_update_grants.sql).
alter table public.profiles add column tour_seen_at timestamptz;

grant update (tour_seen_at) on public.profiles to authenticated;
