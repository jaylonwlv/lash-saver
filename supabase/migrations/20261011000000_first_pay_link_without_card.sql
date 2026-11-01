-- A pro's first pay link no longer needs a card. They add one when they send their
-- second, which starts the free trial then (same trial length, asked at the moment
-- they've seen a pay link go out). Same rule as before otherwise: their own service,
-- and a live subscription for every pay link after the first.

-- "Has this pro made a pay link yet?" A policy on appointments can't query
-- appointments itself (Postgres reports infinite recursion), so this runs as the
-- owner. It only ever answers for the signed-in pro (auth.uid()), never another.
create or replace function public.has_no_pay_links()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.appointments a where a.tech_id = (select auth.uid())
  );
$$;

revoke all on function public.has_no_pay_links() from public, anon;
grant execute on function public.has_no_pay_links() to authenticated;

drop policy "techs create pay links" on public.appointments;

create policy "techs create pay links" on public.appointments
  for insert to authenticated
  with check (
    tech_id = (select auth.uid())
    and status = 'pending_deposit'
    and (
      exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.subscription_status in ('trialing', 'active', 'past_due')
      )
      -- Their first pay link ever (any status counts, so it's one per account).
      or (select public.has_no_pay_links())
    )
    and (
      service_id is null
      or exists (
        select 1 from public.services s
        where s.id = service_id and s.tech_id = (select auth.uid())
      )
    )
  );
