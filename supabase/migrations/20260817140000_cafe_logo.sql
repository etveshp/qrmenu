-- Café logo (PNG/SVG) is stored in the same public cafe-photos bucket.
-- Extend the allowed mime types to include SVG.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
where id = 'cafe-photos';
