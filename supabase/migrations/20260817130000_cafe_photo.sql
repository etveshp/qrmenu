-- Café photo shown in the guest menu banner.
-- File lives in the public `cafe-photos` bucket (owner writes only);
-- the DB reference lives in settings key 'cafe' -> { photo_path }.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cafe-photos', 'cafe-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "cafe_photos_insert_owner" on storage.objects
  for insert to authenticated with check (bucket_id = 'cafe-photos');

create policy "cafe_photos_update_owner" on storage.objects
  for update to authenticated using (bucket_id = 'cafe-photos') with check (bucket_id = 'cafe-photos');

-- upsert needs SELECT on storage.objects (like qr-codes)
create policy "cafe_photos_select_owner" on storage.objects
  for select to authenticated using (bucket_id = 'cafe-photos');

-- Guests may read ONLY the cafe row (photo path), never owner preferences.
create policy "settings_cafe_read_anon" on public.settings
  for select to anon using (key = 'cafe');

grant select on public.settings to anon;
