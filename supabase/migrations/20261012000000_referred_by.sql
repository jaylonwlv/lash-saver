-- Which pro's pay link, menu page or client email a new pro came from ("Powered by
-- Dibs" links carry ?ref=<slug>). Set once by the server at sign-up; techs can't
-- write it (profiles update is limited by column grants, 20260924000000).
alter table public.profiles
  add column referred_by uuid references public.profiles (id) on delete set null;

create index profiles_referred_by_idx on public.profiles (referred_by)
  where referred_by is not null;
