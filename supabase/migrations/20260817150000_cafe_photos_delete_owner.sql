-- The owner re-uploads café photos/logos and the app deletes the previous
-- object; without a DELETE policy storage.remove() fails with 403 and stale
-- files pile up in the bucket. Same pattern as qr-codes.
create policy "cafe_photos_delete_owner" on storage.objects
  for delete to authenticated using (bucket_id = 'cafe-photos');
