-- The look of a pro's own page: a designed preset (see src/lib/page-styles.ts; a test
-- keeps the lists in sync). Existing pros keep today's look (editorial).
alter table public.profiles
  add column page_style text not null default 'editorial'
  check (page_style in ('editorial', 'bold', 'clean'));

grant update (page_style) on public.profiles to authenticated;

-- Menu pages read it through the public view (new column added at the end).
create or replace view public.public_profiles with (security_invoker = false) as
  select id, business_name, slug, instagram_handle, timezone,
         cancellation_window_hours, policy_text, accent_color, page_style
  from public.profiles
  where slug is not null
    and (
      stripe_charges_enabled
      or (
        deposit_method = 'manual'
        and (cashapp_tag is not null or zelle_contact is not null or venmo_handle is not null)
      )
    );
