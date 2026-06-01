-- Grant the service role access to the welchfest schema.
--
-- 0001_init granted USAGE + table privileges to anon and authenticated but
-- never to service_role, so every server-side write (the /api/admin/*,
-- /api/dj/* and /api/moderate/* routes all use the service-role key) failed
-- with "permission denied for schema welchfest". The trucks were pre-loaded
-- via the SQL editor (which runs as postgres), so this only surfaced when the
-- Truck Entry form tried to insert a row through the API.
--
-- service_role bypasses RLS but still needs schema USAGE and table privileges.
-- Grant the lot, plus default privileges so future tables are covered without
-- another migration. Applied via Supabase MCP; this file is the documented
-- source of truth.

GRANT USAGE ON SCHEMA welchfest TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA welchfest TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA welchfest TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA welchfest
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA welchfest
  GRANT ALL ON SEQUENCES TO service_role;
