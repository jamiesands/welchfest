-- Best Truck guest voting. One vote per guest per band, enforced at the
-- DB via UNIQUE(guest_id, band). vote_count is denormalised on
-- welchfest.trucks and kept in sync by a trigger — same pattern as
-- welchfest.songs / welchfest.song_votes. Anon may INSERT and SELECT.
-- Applied via Supabase MCP; this file is the documented source of truth.

ALTER TABLE welchfest.trucks
  ADD COLUMN IF NOT EXISTS vote_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS welchfest.truck_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_id UUID NOT NULL REFERENCES welchfest.trucks(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES welchfest.guests(id) ON DELETE CASCADE,
  band TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (guest_id, band)
);

CREATE INDEX IF NOT EXISTS truck_votes_truck_idx ON welchfest.truck_votes(truck_id);
CREATE INDEX IF NOT EXISTS truck_votes_guest_idx ON welchfest.truck_votes(guest_id);

CREATE OR REPLACE FUNCTION welchfest.update_truck_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE welchfest.trucks
       SET vote_count = vote_count + 1
     WHERE id = NEW.truck_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE welchfest.trucks
       SET vote_count = GREATEST(vote_count - 1, 0)
     WHERE id = OLD.truck_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS truck_votes_count_trigger ON welchfest.truck_votes;
CREATE TRIGGER truck_votes_count_trigger
AFTER INSERT OR DELETE ON welchfest.truck_votes
FOR EACH ROW EXECUTE FUNCTION welchfest.update_truck_vote_count();

-- Backfill in case any votes existed before the trigger (none expected).
UPDATE welchfest.trucks t
   SET vote_count = COALESCE(c.n, 0)
  FROM (
    SELECT truck_id, COUNT(*) AS n FROM welchfest.truck_votes GROUP BY truck_id
  ) c
 WHERE c.truck_id = t.id;

ALTER TABLE welchfest.truck_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS truck_votes_select_anon ON welchfest.truck_votes;
CREATE POLICY truck_votes_select_anon ON welchfest.truck_votes
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS truck_votes_insert_anon ON welchfest.truck_votes;
CREATE POLICY truck_votes_insert_anon ON welchfest.truck_votes
  FOR INSERT TO anon WITH CHECK (true);
-- No anon UPDATE / DELETE: votes are final.

GRANT SELECT, INSERT ON welchfest.truck_votes TO anon, authenticated;
GRANT ALL ON welchfest.truck_votes TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime'
       AND schemaname='welchfest' AND tablename='truck_votes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE welchfest.truck_votes';
  END IF;
END$$;
