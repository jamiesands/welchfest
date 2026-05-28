-- Best Truck entries: pre-populated by Jamie on the morning of the
-- event. RLS allows anon SELECT so guests can browse for voting; all
-- writes go through the service role (no anon INSERT/UPDATE/DELETE).
-- Band is a stored generated column so the rule lives in the DB.
-- Applied via Supabase MCP; this file is the documented source of truth.

CREATE TABLE IF NOT EXISTS welchfest.trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  depot TEXT NOT NULL CHECK (depot IN ('DXF', 'BED', 'STI')),
  year INTEGER NOT NULL CHECK (year >= 1980 AND year <= 2026),
  band TEXT NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN year >= 2022 THEN 'new'
      WHEN year >= 2018 THEN 'mid'
      ELSE 'veteran'
    END
  ) STORED,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trucks_band_idx ON welchfest.trucks(band);
CREATE INDEX IF NOT EXISTS trucks_created_idx ON welchfest.trucks(created_at DESC);

ALTER TABLE welchfest.trucks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trucks_select_anon ON welchfest.trucks;
CREATE POLICY trucks_select_anon ON welchfest.trucks
  FOR SELECT TO anon USING (true);

-- No anon INSERT/UPDATE/DELETE policies: writes only via service role.

GRANT SELECT ON welchfest.trucks TO anon, authenticated;
GRANT ALL ON welchfest.trucks TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname='supabase_realtime'
       AND schemaname='welchfest' AND tablename='trucks'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE welchfest.trucks';
  END IF;
END$$;
