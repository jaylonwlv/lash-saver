-- Lash Saver: initial schema.
-- Money is integer cents. Timestamps are timestamptz (UTC). RLS is on for every table.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.appointment_status as enum (
  'pending_deposit',    -- slot held, waiting on client to pay
  'confirmed',          -- deposit paid
  'completed',          -- client showed up
  'no_show',            -- client didn't show; deposit kept by tech
  'cancelled_by_client',
  'cancelled_by_tech',
  'expired'             -- deposit never paid within the hold window
);

create type public.deposit_status as enum (
  'pending',    -- checkout created, not paid
  'paid',       -- captured, held against the appointment
  'applied',    -- put toward the service price at the appointment
  'forfeited',  -- kept because of a no-show / late cancel
  'refunded',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per tech (auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext not null,
  business_name text,
  slug citext unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  instagram_handle text,
  phone text,
  timezone text not null default 'America/New_York',
  cancellation_window_hours integer not null default 48 check (cancellation_window_hours >= 0),
  policy_text text,
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  stripe_details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile row when a tech signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- services: what a tech offers (full set, fill, lift...)
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  tech_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  price_cents integer not null check (price_cents >= 0),
  deposit_cents integer not null check (deposit_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deposit_not_above_price check (deposit_cents <= price_cents)
);

create index services_tech_id_idx on public.services (tech_id);
create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- appointments: clients are not users; their contact info lives here
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tech_id uuid not null references public.profiles (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  client_name text not null,
  client_email citext,
  client_phone text,
  client_instagram text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pending_deposit',
  hold_expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ends_after_starts check (ends_at > starts_at),
  constraint client_contactable check (client_email is not null or client_phone is not null)
);

create index appointments_tech_starts_idx on public.appointments (tech_id, starts_at);
create index appointments_status_starts_idx on public.appointments (status, starts_at);
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- deposits: one Stripe payment per row; written by server code / webhooks
-- ---------------------------------------------------------------------------
create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  tech_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  currency text not null default 'usd',
  status public.deposit_status not null default 'pending',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deposits_appointment_id_idx on public.deposits (appointment_id);
create index deposits_tech_id_idx on public.deposits (tech_id);
create trigger deposits_updated_at before update on public.deposits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notification_log: what we sent, so cron jobs don't double-send
-- ---------------------------------------------------------------------------
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete cascade,
  template text not null,
  channel text not null check (channel in ('email', 'sms')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create unique index notification_log_once_idx
  on public.notification_log (appointment_id, template, channel)
  where error is null;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Clients never sign in: public booking reads go through the anon role,
-- and all client writes go through server code using the secret key.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.deposits enable row level security;
alter table public.notification_log enable row level security;

-- profiles
create policy "techs read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "techs update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Stripe fields are only written by the server (secret key).
revoke update (stripe_account_id, stripe_charges_enabled, stripe_details_submitted)
  on public.profiles from authenticated;

-- Public booking page: expose only safe profile fields through a view.
create view public.public_profiles with (security_invoker = false) as
  select id, business_name, slug, instagram_handle, timezone,
         cancellation_window_hours, policy_text
  from public.profiles
  where slug is not null and stripe_charges_enabled;
grant select on public.public_profiles to anon, authenticated;

-- services
create policy "techs manage own services" on public.services
  for all to authenticated
  using (tech_id = (select auth.uid())) with check (tech_id = (select auth.uid()));
create policy "anyone reads active services" on public.services
  for select to anon, authenticated using (is_active);

-- appointments
create policy "techs manage own appointments" on public.appointments
  for all to authenticated
  using (tech_id = (select auth.uid())) with check (tech_id = (select auth.uid()));

-- deposits: techs read only; status changes come from Stripe webhooks.
create policy "techs read own deposits" on public.deposits
  for select to authenticated using (tech_id = (select auth.uid()));

-- notification_log: server only (no policies).
