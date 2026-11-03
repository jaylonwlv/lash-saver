-- The pro's own color on their client pages (pay links, menu page). A fixed set of
-- readable presets; must match ACCENTS in src/lib/accents.ts (a test checks).
alter table public.profiles
  add column accent_color text not null default 'pink'
  check (accent_color in ('pink', 'plum', 'ocean', 'teal', 'forest', 'terracotta', 'gold', 'espresso', 'charcoal'));

grant update (accent_color) on public.profiles to authenticated;

-- Menu pages read it through the public view (new column added at the end).
create or replace view public.public_profiles with (security_invoker = false) as
  select id, business_name, slug, instagram_handle, timezone,
         cancellation_window_hours, policy_text, accent_color
  from public.profiles
  where slug is not null
    and (
      stripe_charges_enabled
      or (
        deposit_method = 'manual'
        and (cashapp_tag is not null or zelle_contact is not null or venmo_handle is not null)
      )
    );
