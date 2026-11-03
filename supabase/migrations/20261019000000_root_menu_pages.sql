-- Menu pages move to the root (getdibs.pro/studio-nova), so a pro's link must not
-- take an address the app needs. Same list as RESERVED_SLUGS in src/lib/slugs.ts
-- (a test keeps them in sync). Checked before adding: no existing pro uses one.
alter table public.profiles
  add constraint profiles_slug_not_reserved check (
    slug is null or lower(slug::text) not in (
    'start', 'login', 'logout', 'signup', 'signin', 'demo', 'terms', 'privacy', 'catering',
    'pay', 'dashboard', 'api', 'auth', 'unsubscribe', 'b', 'c', 'e', 't', 'admin', 'app',
    'about', 'blog', 'help', 'support', 'pricing', 'contact', 'settings', 'billing',
    'account', 'www', 'mail', 'static', 'assets', 'images', 'dibs', 'getdibs', 'lashes',
    'lash-techs', 'nails', 'nail-techs', 'hair', 'braiders', 'barbers', 'barber', 'tattoo',
    'estheticians', 'esthetician', 'detailing', 'detailers', 'photography',
    'photographers', 'fitness', 'trainers', 'food-trucks', 'caterers'
    )
  );
