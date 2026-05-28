-- Design a Lorry submissions. Guests photograph their finished
-- printed-template designs and upload them here. Anon may INSERT and
-- SELECT; no anon UPDATE/DELETE. Mirrors the photos pattern.
-- Applied via Supabase MCP; this file is the documented source of truth.

CREATE TABLE IF NOT EXISTS welchfest.lorry_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES welchfest.guests(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  employee_name TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lorry_designs_created_idx
  ON welchfest.lorry_designs(created_at DESC);

ALTER TABLE welchfest.lorry_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lorry_designs_select_anon ON welchfest.lorry_designs;
CREATE POLICY lorry_designs_select_anon ON welchfest.lorry_designs
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS lorry_designs_insert_anon ON welchfest.lorry_designs;
CREATE POLICY lorry_designs_insert_anon ON welchfest.lorry_designs
  FOR INSERT TO anon WITH CHECK (true);

GRANT SELECT, INSERT ON welchfest.lorry_designs TO anon, authenticated;
GRANT ALL ON welchfest.lorry_designs TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime'
       AND schemaname='welchfest' AND tablename='lorry_designs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE welchfest.lorry_designs';
  END IF;
END$$;
