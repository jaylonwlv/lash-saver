-- "Your own website": a pro's page (and later their pay links) on their own domain,
-- e.g. studionova.com. $99/year, or $15/month plus a $25 setup fee (src/lib/domains.ts).
-- Dibs buys the domain through Vercel's registrar with the pro as the registrant, only
-- after Stripe confirms the payment. One per pro. Server-written; pros read their own row.

create table public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  tech_id uuid not null unique references public.profiles (id) on delete cascade,
  domain text not null check (domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.(com|pro)$'),
  plan text not null check (plan in ('yearly', 'monthly')),
  -- pending: checkout open · registering: paid, buying the domain · active: live
  -- failed: couldn't register (refunded) · cancelled: add-on ended
  status text not null default 'pending'
    check (status in ('pending', 'registering', 'active', 'failed', 'cancelled')),
  stripe_checkout_session_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- What the registrar quoted when they chose it, in cents (first year and renewal).
  purchase_cents integer,
  renewal_cents integer,
  -- Registrant details for the purchase only; cleared once the domain is registered.
  registrant jsonb,
  -- "No refund once registered; you own it; cancelling stops renewal" (the buy screen).
  terms_agreed_at timestamptz,
  registrar_order_id text,
  -- The latest renewal order (cron), checked on the next run.
  renewal_order_id text,
  registered_at timestamptz,
  expires_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Two pros can't hold the same domain at once.
create unique index custom_domains_live_domain
  on public.custom_domains (domain)
  where status in ('registering', 'active');

create trigger custom_domains_updated_at before update on public.custom_domains
  for each row execute function public.set_updated_at();

alter table public.custom_domains enable row level security;

create policy "techs read own custom domain" on public.custom_domains
  for select to authenticated using (tech_id = (select auth.uid()));

-- Server-only writes (Checkout, webhook, cron) through the service role.
revoke insert, update, delete on public.custom_domains from anon, authenticated;

-- The request proxy maps a live domain to its pro's page. Only domain and slug.
create view public.public_custom_domains with (security_invoker = false) as
  select d.domain, p.slug
  from public.custom_domains d
  join public.profiles p on p.id = d.tech_id
  where d.status = 'active' and p.slug is not null;

grant select on public.public_custom_domains to anon, authenticated;
