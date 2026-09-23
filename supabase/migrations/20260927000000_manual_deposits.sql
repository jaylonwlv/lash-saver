-- "Collect it myself": pros can take deposits through their own Cash App,
-- Zelle or Venmo instead of Stripe. Dibs still handles the policy, reminders,
-- cancellations and no-shows; the pro confirms receipt and sends refunds.

alter table public.profiles
  add column deposit_method text not null default 'stripe'
    check (deposit_method in ('stripe', 'manual')),
  add column cashapp_tag text check (cashapp_tag ~ '^\$[A-Za-z0-9]{1,20}$'),
  add column zelle_contact text check (char_length(zelle_contact) <= 120),
  add column venmo_handle text check (venmo_handle ~ '^[A-Za-z0-9_-]{5,30}$');

-- Self-service columns (see 20260924000000_profile_update_grants.sql).
grant update (deposit_method, cashapp_tag, zelle_contact, venmo_handle)
  on public.profiles to authenticated;

-- How this appointment's deposit is paid, fixed when it's created.
alter table public.appointments
  add column payment_method text not null default 'stripe'
    check (payment_method in ('stripe', 'manual')),
  -- Client tapped "I've sent my deposit"; the pro hasn't confirmed yet.
  add column client_marked_sent_at timestamptz;

alter table public.deposits
  add column method text not null default 'stripe' check (method in ('stripe', 'manual')),
  add column manual_app text check (manual_app in ('cashapp', 'zelle', 'venmo'));

-- A manual deposit the pro owes back (early cancellation); they send it
-- themselves and then mark it refunded.
alter type public.deposit_status add value if not exists 'refund_due';

-- Payment handles also count as trial signals.
alter table public.trial_claims drop constraint trial_claims_kind_check;
alter table public.trial_claims add constraint trial_claims_kind_check
  check (kind in ('card', 'bank', 'email', 'instagram', 'cashapp', 'zelle', 'venmo'));

-- The booking page goes live once the pro can take deposits either way.
create or replace view public.public_profiles with (security_invoker = false) as
  select id, business_name, slug, instagram_handle, timezone,
         cancellation_window_hours, policy_text
  from public.profiles
  where slug is not null
    and (
      stripe_charges_enabled
      or (
        deposit_method = 'manual'
        and (cashapp_tag is not null or zelle_contact is not null or venmo_handle is not null)
      )
    );
