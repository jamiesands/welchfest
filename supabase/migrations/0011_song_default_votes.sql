-- A requested song should open with a single vote — the requester's own.
-- Previously songs.votes_count defaulted to 1 (see 0003_songs.sql) AND the
-- client inserts a real self-vote into song_votes on request, whose AFTER
-- INSERT trigger bumps votes_count again — so new songs opened at 2.
-- Drop the seeded default to 0 so the requester's actual self-vote is the
-- only thing counted, keeping votes_count in sync with song_votes (1 row → 1).
-- Apply via Supabase MCP; this file is the documented source of truth.

ALTER TABLE welchfest.songs
  ALTER COLUMN votes_count SET DEFAULT 0;
