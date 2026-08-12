-- The QR generation uses `upsert: true`, which requires SELECT on
-- storage.objects (INSERT + SELECT + UPDATE). The previous hardening
-- removed ALL public SELECT policies and broke owner upserts.
-- Restore SELECT for the owner ONLY — guests still cannot list files
-- (public bucket serves files by URL without a SELECT policy).

create policy "qr_codes_select_owner" on storage.objects
  for select to authenticated
  using (bucket_id = 'qr-codes');
