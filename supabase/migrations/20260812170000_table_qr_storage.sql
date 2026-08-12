-- QR codes stored in Supabase Storage; tables.qr_path holds the object path.
-- Deleting a table also removes its QR file (handled by the app).

alter table public.tables add column qr_path text;

-- Public bucket for table QR PNGs (writes owner-only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qr-codes', 'qr-codes', true, 1048576, array['image/png'])
on conflict (id) do nothing;

create policy "qr_codes_insert_owner" on storage.objects
  for insert to authenticated with check (bucket_id = 'qr-codes');

create policy "qr_codes_update_owner" on storage.objects
  for update to authenticated using (bucket_id = 'qr-codes') with check (bucket_id = 'qr-codes');

create policy "qr_codes_delete_owner" on storage.objects
  for delete to authenticated using (bucket_id = 'qr-codes');

create policy "qr_codes_read_public" on storage.objects
  for select to anon, authenticated using (bucket_id = 'qr-codes');
