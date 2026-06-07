-- 045_trigger_radius_reveal.sql
-- Adds a configurable trigger radius and per-player reveal tracking to map_triggers.
--   radius      — how many tiles out from the placed tile the trap fires (0 = exact tile only)
--   revealed_to — wallets that have spotted this trap via a Perception check; the trap
--                 becomes visible to (and safe from auto-fire for) those players.

ALTER TABLE map_triggers
  ADD COLUMN IF NOT EXISTS radius      INT    NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revealed_to TEXT[] NOT NULL DEFAULT '{}';
