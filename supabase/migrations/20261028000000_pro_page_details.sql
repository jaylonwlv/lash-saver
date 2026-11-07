-- What a client wants to know about a pro at a glance, all optional and in the pro's
-- own words: what they do, where, a short note about them, a status they keep current
-- ("Booking for December"), and a portrait (a file in the gallery bucket, in their own
-- folder, so the existing storage policies cover it). Limits match
-- dashboard/profile/schema.ts. profiles.trade stays private: `specialty` is what the
-- pro chooses to show.
alter table public.profiles
  add column specialty text check (char_length(specialty) <= 40),
  add column location text check (char_length(location) <= 40),
  add column about text check (char_length(about) <= 160),
  add column status_line text check (char_length(status_line) <= 50),
  add column portrait_path text check (portrait_path like id::text || '/%');

grant update (specialty, location, about, status_line, portrait_path)
  on public.profiles to authenticated;

-- Menu pages read them through the public view (new columns added at the end).
create or replace view public.public_profiles with (security_invoker = false) as
  select id, business_name, slug, instagram_handle, timezone,
         cancellation_window_hours, policy_text, accent_color, page_style,
         specialty, location, about, status_line, portrait_path
  from public.profiles
  where slug is not null;
