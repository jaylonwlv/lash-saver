-- Fonts from a trade's own world for the pro's page: tattoo (metal, 90s anime,
-- old-school flash) and detailing (ultra luxury, performance, professional).
-- Must match PAGE_STYLES in src/lib/page-styles.ts (a test checks).
alter table public.profiles drop constraint profiles_page_style_check;
alter table public.profiles
  add constraint profiles_page_style_check
  check (page_style in ('editorial', 'bold', 'clean', 'metal', 'anime', 'flash', 'luxury', 'performance', 'professional'));
