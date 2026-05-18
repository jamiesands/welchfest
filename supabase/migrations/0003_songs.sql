-- Songs + votes. Status flow: queued → cued → playing → played | skipped | blocked.
-- Vote count denormalised on songs; trigger keeps it in sync.
-- Applied via Supabase MCP; this file is the documented source of truth.

CREATE TABLE IF NOT EXISTS welchfest.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES welchfest.guests(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'cued', 'playing', 'played', 'blocked', 'skipped')),
  votes_count INT NOT NULL DEFAULT 1,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cued_at TIMESTAMPTZ,
  started_playing_at TIMESTAMPTZ,
  finished_playing_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS songs_status_votes_idx ON welchfest.songs(status, votes_count DESC);
CREATE INDEX IF NOT EXISTS songs_requested_idx ON welchfest.songs(requested_at DESC);

CREATE TABLE IF NOT EXISTS welchfest.song_votes (
  song_id UUID NOT NULL REFERENCES welchfest.songs(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES welchfest.guests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (song_id, guest_id)
);

CREATE OR REPLACE FUNCTION welchfest.update_song_vote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE welchfest.songs SET votes_count = votes_count + 1 WHERE id = NEW.song_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE welchfest.songs SET votes_count = GREATEST(votes_count - 1, 0) WHERE id = OLD.song_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS song_votes_count_trigger ON welchfest.song_votes;
CREATE TRIGGER song_votes_count_trigger
AFTER INSERT OR DELETE ON welchfest.song_votes
FOR EACH ROW EXECUTE FUNCTION welchfest.update_song_vote_count();

ALTER TABLE welchfest.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE welchfest.song_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS songs_select_anon ON welchfest.songs;
CREATE POLICY songs_select_anon ON welchfest.songs FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS songs_insert_anon ON welchfest.songs;
CREATE POLICY songs_insert_anon ON welchfest.songs FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS song_votes_select_anon ON welchfest.song_votes;
CREATE POLICY song_votes_select_anon ON welchfest.song_votes FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS song_votes_insert_anon ON welchfest.song_votes;
CREATE POLICY song_votes_insert_anon ON welchfest.song_votes FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS song_votes_delete_anon ON welchfest.song_votes;
CREATE POLICY song_votes_delete_anon ON welchfest.song_votes FOR DELETE TO anon USING (true);

GRANT ALL ON ALL TABLES IN SCHEMA welchfest TO anon, authenticated;
