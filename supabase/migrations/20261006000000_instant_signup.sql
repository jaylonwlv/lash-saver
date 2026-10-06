-- Instant sign-up (/start): a new pro's account is created and signed in from the
-- email they type, before they prove they own it. They confirm it with a code
-- before their first pay link. Everyone who signed in with a code already has.
-- Not in the techs' column grants, so only server code can change it.
alter table public.profiles
  add column email_confirmed boolean not null default true;
