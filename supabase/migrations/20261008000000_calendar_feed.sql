-- A private calendar feed per pro: Apple Calendar or Google Calendar subscribes to
-- /api/calendar/<token>.ics and shows their appointments. The token is the only
-- key (calendar apps can't sign in), so it's random, server-made and resettable.
alter table public.profiles
  add column calendar_token uuid not null unique default gen_random_uuid();

-- Not in the techs' column grants (see 20260924000000_profile_update_grants.sql):
-- they get a new random token from this function, never one they chose.
create or replace function public.reset_calendar_token()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  token uuid := gen_random_uuid();
begin
  update public.profiles set calendar_token = token where id = (select auth.uid());
  if not found then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  return token;
end;
$$;

revoke execute on function public.reset_calendar_token() from public, anon;
grant execute on function public.reset_calendar_token() to authenticated;
