-- Photos of a pro's work, gliding across their page (optional). Files live in the public
-- "gallery" storage bucket under <tech id>/; this table lists them. Up to 12 per pro
-- (GALLERY_LIMIT in src/lib/gallery.ts). Photos are public: they're on the pro's page.

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  tech_id uuid not null references public.profiles(id) on delete cascade,
  path text not null unique,
  width integer not null check (width between 1 and 10000),
  height integer not null check (height between 1 and 10000),
  created_at timestamptz not null default now(),
  -- A pro can only list files in their own folder.
  constraint gallery_photos_own_folder check (path like tech_id::text || '/%')
);

create index gallery_photos_tech on public.gallery_photos (tech_id, created_at);

alter table public.gallery_photos enable row level security;

create policy "Gallery photos are public"
  on public.gallery_photos for select to anon, authenticated using (true);
create policy "Pros add their own gallery photos"
  on public.gallery_photos for insert to authenticated with check (tech_id = auth.uid());
create policy "Pros remove their own gallery photos"
  on public.gallery_photos for delete to authenticated using (tech_id = auth.uid());

-- At most 12 photos per pro, whatever the app does.
create function public.gallery_photo_limit() returns trigger
  language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.gallery_photos where tech_id = new.tech_id) >= 12 then
    raise exception 'gallery_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger gallery_photo_limit
  before insert on public.gallery_photos
  for each row execute function public.gallery_photo_limit();

-- The bucket: public to read (it's the pro's page), JPEG only, 2 MB a file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

-- Pros upload to, see and delete from their own folder only (deleting needs "see" too).
create policy "Pros see their gallery folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Pros upload to their gallery folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Pros delete from their gallery folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'gallery' and (storage.foldername(name))[1] = auth.uid()::text);
