-- When a pro's own domain was confirmed to actually open their page (Dibs fetched
-- https://<domain>/api/domain-check and got its own answer). Until then the dashboard
-- shows "Connecting…" and the "Your website is live" email waits. Server-written.
alter table public.custom_domains
  add column verified_at timestamptz;
