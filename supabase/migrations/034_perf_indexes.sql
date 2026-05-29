-- ============================================================
-- Migration 034 — performance indexes
-- ------------------------------------------------------------
-- Audit Wave 4B: two composite indexes that match actual hot
-- query shapes the planner currently can't satisfy with the
-- existing single-column indexes.
--
-- These are CREATE INDEX IF NOT EXISTS — safe to re-run, no
-- schema rewrite, no data movement.
-- ============================================================

-- ── fog_reveals: match loadReveals() filter shape ─────────────
-- MapBoardView.loadReveals() filters by (encounter_id, viewer_wallet, map_id).
-- The existing fog_reveals_enc_viewer covers the first two columns; this
-- composite adds map_id so multi-map sessions get an index scan instead of
-- an index scan + filter step.
CREATE INDEX IF NOT EXISTS fog_reveals_enc_viewer_map
  ON fog_reveals(encounter_id, viewer_wallet, map_id);

-- ── tokens: match the spell-dashboard fallback ────────────────
-- SpellDashboard's character-resolution fallback chain queries tokens by
-- (encounter_id, owner_wallet) to find the player's PC token. Currently
-- there's an index on encounter_id alone; the planner has to read all
-- tokens for the encounter and filter by owner_wallet.
CREATE INDEX IF NOT EXISTS tokens_enc_owner
  ON tokens(encounter_id, owner_wallet);
