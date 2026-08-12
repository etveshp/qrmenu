-- Storage hardening: public buckets serve files by URL without an RLS
-- SELECT policy. The broad SELECT policies allowed anonymous clients to
-- LIST all objects (file enumeration) — remove them.
-- Writes stay owner-only; guests still load images via the public URL.

drop policy if exists "qr_codes_read_public" on storage.objects;
drop policy if exists "dish_images_read_public" on storage.objects;
