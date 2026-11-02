-- Dibs Catering: food trucks and caterers publish a quote page (/c/<slug>) where an
-- event host picks a date, guest count and package, sees the price and pays a
-- deposit to hold the date. The owner is an ordinary Dibs pro (profiles row) whose
-- trade is 'catering'; money is integer cents; dates are the owner's wall-clock
-- dates in profiles.timezone.

-- 1. A new kind of pro. Must match TRADES in src/lib/trades.ts.
alter table public.profiles drop constraint profiles_trade_check;
alter table public.profiles add constraint profiles_trade_check check (
  trade in ('barber', 'tattoo', 'nails', 'lashes', 'hair', 'fitness', 'detailing', 'photography', 'catering', 'other')
);

-- 2. Settings and pricing rules, one row per owner. Percentages are basis points
--    (3000 = 30%) so the math stays in integers.
create table public.catering_settings (
  tech_id uuid primary key references public.profiles (id) on delete cascade,
  cuisine text check (char_length(cuisine) <= 80),
  city text check (char_length(city) <= 80),
  description text check (char_length(description) <= 600),
  policy_text text check (char_length(policy_text) <= 2000),
  is_published boolean not null default false,
  daily_capacity integer not null default 1 check (daily_capacity between 1 and 20),
  min_notice_days integer not null default 7 check (min_notice_days between 0 and 365),
  max_advance_days integer not null default 365 check (max_advance_days between 7 and 730),
  minimum_spend_cents integer check (minimum_spend_cents between 0 and 10000000),
  extra_hour_price_cents integer check (extra_hour_price_cents between 0 and 1000000),
  max_extra_hours integer not null default 3 check (max_extra_hours between 0 and 12),
  travel_fee_cents integer not null default 0 check (travel_fee_cents between 0 and 1000000),
  service_fee_bps integer not null default 0 check (service_fee_bps between 0 and 5000),
  tax_bps integer not null default 0 check (tax_bps between 0 and 3000),
  deposit_type text not null default 'percent' check (deposit_type in ('percent', 'flat')),
  -- Basis points when percent (1000-10000), cents when flat (at least $1).
  deposit_value integer not null default 3000 check (deposit_value >= 100),
  balance_due_days_before integer not null default 7 check (balance_due_days_before between 0 and 90),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deposit_type = 'flat' or deposit_value between 1000 and 10000)
);
create trigger catering_settings_updated_at before update on public.catering_settings
  for each row execute function public.set_updated_at();

-- 3. Menu packages and add-ons.
create table public.catering_packages (
  id uuid primary key default gen_random_uuid(),
  tech_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  items_text text check (char_length(items_text) <= 1000),
  pricing_type text not null check (pricing_type in ('per_person', 'flat')),
  price_cents integer not null check (price_cents between 100 and 10000000),
  min_guests integer not null default 1 check (min_guests between 1 and 5000),
  max_guests integer check (max_guests between 1 and 5000),
  included_minutes integer not null default 120 check (included_minutes between 30 and 1440),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_guests is null or max_guests >= min_guests)
);
create index catering_packages_tech_idx on public.catering_packages (tech_id);
create trigger catering_packages_updated_at before update on public.catering_packages
  for each row execute function public.set_updated_at();

create table public.catering_addons (
  id uuid primary key default gen_random_uuid(),
  tech_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 300),
  pricing_type text not null check (pricing_type in ('per_person', 'flat')),
  price_cents integer not null check (price_cents between 0 and 10000000),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index catering_addons_tech_idx on public.catering_addons (tech_id);
create trigger catering_addons_updated_at before update on public.catering_addons
  for each row execute function public.set_updated_at();

-- 4. Dates the owner isn't taking events. The reason is a private note.
create table public.catering_blocked_dates (
  tech_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (tech_id, date)
);

-- 5. Bookings. Written only by server code (validated quote, capacity checked in
--    hold_catering_date below). public_token is the host's unguessable link (/e/<token>).
create table public.catering_bookings (
  id uuid primary key default gen_random_uuid(),
  tech_id uuid not null references public.profiles (id) on delete cascade,
  public_token text not null unique check (char_length(public_token) >= 32),
  status text not null check (status in (
    'requested', 'awaiting_deposit', 'confirmed', 'balance_due', 'paid_in_full',
    'completed', 'cancelled', 'declined', 'expired'
  )),
  event_date date not null,
  start_time time not null,
  end_time time not null,
  timezone text not null,
  guest_count integer not null check (guest_count between 1 and 5000),
  package_id uuid references public.catering_packages (id) on delete set null,
  add_on_ids uuid[] not null default '{}',
  extra_hours integer not null default 0 check (extra_hours between 0 and 12),
  event_type text not null check (event_type in ('wedding', 'corporate', 'birthday', 'graduation', 'other')),
  event_address text not null check (char_length(event_address) between 1 and 300),
  event_notes text check (char_length(event_notes) <= 1000),
  host_name text not null check (char_length(host_name) between 1 and 100),
  host_email text not null check (char_length(host_email) between 3 and 254),
  host_phone text check (char_length(host_phone) <= 30),
  -- The full quote (line items, labels) as shown when they booked.
  quote jsonb not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  travel_fee_cents integer not null default 0 check (travel_fee_cents >= 0),
  service_fee_cents integer not null default 0 check (service_fee_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null check (total_cents > 0),
  deposit_cents integer not null check (deposit_cents > 0),
  balance_cents integer not null check (balance_cents >= 0),
  balance_due_date date,
  policy_text_snapshot text,
  terms_accepted_at timestamptz,
  -- Unpaid holds (awaiting_deposit, requested) count toward capacity until then.
  hold_expires_at timestamptz,
  deposit_paid_at timestamptz,
  balance_paid_at timestamptz,
  owner_approved_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 500),
  owner_notes text check (char_length(owner_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (deposit_cents + balance_cents = total_cents)
);
create index catering_bookings_tech_date_idx on public.catering_bookings (tech_id, event_date);
create trigger catering_bookings_updated_at before update on public.catering_bookings
  for each row execute function public.set_updated_at();

-- 6. Payments (deposit and balance). Destination charges like Dibs deposits.
create table public.catering_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.catering_bookings (id) on delete cascade,
  tech_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('deposit', 'balance')),
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index catering_payments_booking_idx on public.catering_payments (booking_id);
-- At most one paid deposit and one paid balance per booking.
create unique index catering_payments_one_paid_idx on public.catering_payments (booking_id, kind)
  where status = 'paid';
create trigger catering_payments_updated_at before update on public.catering_payments
  for each row execute function public.set_updated_at();

-- 7. Row level security.
alter table public.catering_settings enable row level security;
alter table public.catering_packages enable row level security;
alter table public.catering_addons enable row level security;
alter table public.catering_blocked_dates enable row level security;
alter table public.catering_bookings enable row level security;
alter table public.catering_payments enable row level security;

create policy "owners manage own catering settings" on public.catering_settings
  for all to authenticated
  using (tech_id = (select auth.uid())) with check (tech_id = (select auth.uid()));
create policy "anyone reads published catering settings" on public.catering_settings
  for select to anon, authenticated using (is_published);

create policy "owners manage own packages" on public.catering_packages
  for all to authenticated
  using (tech_id = (select auth.uid())) with check (tech_id = (select auth.uid()));
create policy "anyone reads published packages" on public.catering_packages
  for select to anon, authenticated using (
    is_active and exists (
      select 1 from public.catering_settings s where s.tech_id = catering_packages.tech_id and s.is_published
    )
  );

create policy "owners manage own add-ons" on public.catering_addons
  for all to authenticated
  using (tech_id = (select auth.uid())) with check (tech_id = (select auth.uid()));
create policy "anyone reads published add-ons" on public.catering_addons
  for select to anon, authenticated using (
    is_active and exists (
      select 1 from public.catering_settings s where s.tech_id = catering_addons.tech_id and s.is_published
    )
  );

create policy "owners manage own blocked dates" on public.catering_blocked_dates
  for all to authenticated
  using (tech_id = (select auth.uid())) with check (tech_id = (select auth.uid()));

-- Owners read their bookings and payments. They change only their own notes and
-- the owner actions (approve, decline, cancel, complete), limited by column grants;
-- amounts, quote and payment state are server-only.
create policy "owners read own catering bookings" on public.catering_bookings
  for select to authenticated using (tech_id = (select auth.uid()));
create policy "owners update own catering bookings" on public.catering_bookings
  for update to authenticated
  using (tech_id = (select auth.uid()))
  with check (tech_id = (select auth.uid()) and status in (
    'awaiting_deposit', 'confirmed', 'balance_due', 'paid_in_full', 'completed', 'cancelled', 'declined'
  ));
revoke insert, update, delete on public.catering_bookings from anon, authenticated;
grant update (status, owner_notes, cancelled_at, cancel_reason, owner_approved_at, hold_expires_at)
  on public.catering_bookings to authenticated;

create policy "owners read own catering payments" on public.catering_payments
  for select to authenticated using (tech_id = (select auth.uid()));
revoke insert, update, delete on public.catering_payments from anon, authenticated;

-- 8. Holding a date without double-booking. Runs as the owner of the tables, for
--    server code only: takes a lock on (owner, date), counts the bookings that hold
--    that date, and inserts the new one only if there's room. Returns the new id, or
--    null when the date is full or blocked.
create or replace function public.catering_held_count(p_tech uuid, p_date date, p_exclude uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.catering_bookings b
  where b.tech_id = p_tech and b.event_date = p_date
    and (p_exclude is null or b.id <> p_exclude)
    and (
      b.status in ('confirmed', 'balance_due', 'paid_in_full')
      or (b.status in ('awaiting_deposit', 'requested') and b.hold_expires_at > now())
    );
$$;

create or replace function public.hold_catering_date(p_booking jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tech uuid := (p_booking ->> 'tech_id')::uuid;
  v_date date := (p_booking ->> 'event_date')::date;
  v_capacity integer;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_tech::text || ':' || v_date::text, 0));
  select daily_capacity into v_capacity from public.catering_settings where tech_id = v_tech;
  if v_capacity is null then return null; end if;
  if exists (select 1 from public.catering_blocked_dates where tech_id = v_tech and date = v_date) then
    return null;
  end if;
  if public.catering_held_count(v_tech, v_date) >= v_capacity then return null; end if;

  insert into public.catering_bookings (
    tech_id, public_token, status, event_date, start_time, end_time, timezone, guest_count,
    package_id, add_on_ids, extra_hours, event_type, event_address, event_notes,
    host_name, host_email, host_phone, quote, subtotal_cents, travel_fee_cents,
    service_fee_cents, tax_cents, total_cents, deposit_cents, balance_cents,
    balance_due_date, policy_text_snapshot, terms_accepted_at, hold_expires_at
  ) values (
    v_tech, p_booking ->> 'public_token', p_booking ->> 'status', v_date,
    (p_booking ->> 'start_time')::time, (p_booking ->> 'end_time')::time,
    p_booking ->> 'timezone', (p_booking ->> 'guest_count')::integer,
    (p_booking ->> 'package_id')::uuid,
    coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p_booking -> 'add_on_ids') x), '{}'),
    (p_booking ->> 'extra_hours')::integer, p_booking ->> 'event_type',
    p_booking ->> 'event_address', p_booking ->> 'event_notes',
    p_booking ->> 'host_name', p_booking ->> 'host_email', p_booking ->> 'host_phone',
    p_booking -> 'quote', (p_booking ->> 'subtotal_cents')::integer,
    (p_booking ->> 'travel_fee_cents')::integer, (p_booking ->> 'service_fee_cents')::integer,
    (p_booking ->> 'tax_cents')::integer, (p_booking ->> 'total_cents')::integer,
    (p_booking ->> 'deposit_cents')::integer, (p_booking ->> 'balance_cents')::integer,
    (p_booking ->> 'balance_due_date')::date, p_booking ->> 'policy_text_snapshot',
    (p_booking ->> 'terms_accepted_at')::timestamptz, (p_booking ->> 'hold_expires_at')::timestamptz
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.catering_held_count(uuid, date, uuid) from public, anon, authenticated;
revoke all on function public.hold_catering_date(jsonb) from public, anon, authenticated;
grant execute on function public.catering_held_count(uuid, date, uuid) to service_role;
grant execute on function public.hold_catering_date(jsonb) to service_role;
