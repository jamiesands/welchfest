-- Rebalance the Best Truck age bands.
--
-- 0007 set the rule New >=2022 / Mid >=2018 / Veteran <2018, which split the
-- 24 pre-loaded trucks 17 / 5 / 2 — lopsided. Redraw the lines for an even
-- contest: New >=2024, Mid 2021-2023, Veteran <=2020 (gives 8 / 9 / 7).
--
-- band is a STORED generated column; on PostgreSQL 17 ALTER COLUMN ...
-- SET EXPRESSION recomputes it for every existing row atomically (it does a
-- table rewrite and rebuilds trucks_band_idx). Done before any votes were
-- cast, so no truck_votes.band rows had to move. Applied to the live project
-- via Supabase MCP; this file is the documented source of truth.

ALTER TABLE welchfest.trucks
  ALTER COLUMN band SET EXPRESSION AS (
    CASE
      WHEN year >= 2024 THEN 'new'
      WHEN year >= 2021 THEN 'mid'
      ELSE 'veteran'
    END
  );
