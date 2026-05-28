-- Realtime + denormalised requester for the song queue.
-- Add guest_name/depot to welchfest.songs so realtime INSERT events
-- carry the requester's identity (matches the photos pattern). Backfill
-- existing rows and expose songs + song_votes on supabase_realtime so
-- /songs and /dj can subscribe instead of polling.
-- Applied via Supabase MCP; this file is the documented source of truth.

ALTER TABLE welchfest.songs
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS depot TEXT;

UPDATE welchfest.songs s
   SET guest_name = g.name,
       depot      = g.depot
  FROM welchfest.guests g
 WHERE s.guest_id = g.id
   AND (s.guest_name IS NULL OR s.depot IS NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime'
       AND schemaname='welchfest' AND tablename='songs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE welchfest.songs';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime'
       AND schemaname='welchfest' AND tablename='song_votes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE welchfest.song_votes';
  END IF;
END$$;
