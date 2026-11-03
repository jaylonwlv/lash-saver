-- 1. A pro's page goes live as soon as they have a page address, deposits set up or
--    not: the menu page never takes money (clients message to book). Pay links still
--    need a deposit method (canTakeDeposits). Catering pages keep their own publish
--    check. Same columns as 20261021000000, only the where clause changes.
create or replace view public.public_profiles with (security_invoker = false) as
  select id, business_name, slug, instagram_handle, timezone,
         cancellation_window_hours, policy_text, accent_color, page_style
  from public.profiles
  where slug is not null;

-- 2. The first time a pro's page is opened from Instagram (their bio link, most
--    likely). Written by the server only; the dashboard ticks "Put it in your bio"
--    and the bio reminder email stops. Techs get no update grant on it.
alter table public.profiles
  add column instagram_visit_at timestamptz;
