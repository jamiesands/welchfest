-- Welchfest schema bootstrap.
-- Applied via the Supabase MCP server, not auto-run.

CREATE SCHEMA IF NOT EXISTS welchfest;

CREATE TABLE IF NOT EXISTS welchfest.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  depot TEXT NOT NULL CHECK (depot IN ('DXF', 'BED', 'STI', 'GUEST')),
  consent_given BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE welchfest.guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guests_insert_anon ON welchfest.guests;
CREATE POLICY guests_insert_anon ON welchfest.guests
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS guests_select_anon ON welchfest.guests;
CREATE POLICY guests_select_anon ON welchfest.guests
  FOR SELECT TO anon USING (true);

GRANT USAGE ON SCHEMA welchfest TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA welchfest TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA welchfest TO anon, authenticated;
