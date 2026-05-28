-- Admin-only 360 uploads have no guest behind them.
-- Drop the NOT NULL on guest_id so /admin/360 can insert rows with
-- guest_id=null. The FK to welchfest.guests still permits NULL.
-- Applied via Supabase MCP; this file is the documented source of truth.

ALTER TABLE welchfest.photos ALTER COLUMN guest_id DROP NOT NULL;
