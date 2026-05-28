-- Direct-publish guest photo feed.
-- Denormalise guest name/depot onto the photo row so realtime INSERT
-- events carry everything the feed needs to render — no follow-up join.
-- Switch defaults so new uploads go live immediately (status='approved',
-- type='photo'); /moderate can still hide a row after the fact.
-- Applied via Supabase MCP; this file is the documented source of truth.

ALTER TABLE welchfest.photos
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS depot TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE welchfest.photos ALTER COLUMN type SET DEFAULT 'photo';
ALTER TABLE welchfest.photos ALTER COLUMN status SET DEFAULT 'approved';

-- Backfill denormalised fields for existing rows.
UPDATE welchfest.photos p
   SET guest_name = g.name,
       depot      = g.depot
  FROM welchfest.guests g
 WHERE p.guest_id = g.id
   AND (p.guest_name IS NULL OR p.depot IS NULL);

-- image_url is the public storage URL; bucket is public.
UPDATE welchfest.photos
   SET image_url =
     'https://virybnhjigtupuiwveke.supabase.co/storage/v1/object/public/welchfest-photos/'
     || storage_path
 WHERE image_url IS NULL
   AND storage_path IS NOT NULL;

-- Expose the table on the realtime publication so /feed can subscribe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'welchfest'
       AND tablename = 'photos'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE welchfest.photos';
  END IF;
END$$;
