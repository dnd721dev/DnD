-- ============================================================
-- Migration 044 — separate saving-throw DC for map triggers
-- ------------------------------------------------------------
-- map_triggers had a single `dc` used for BOTH the perception check (to spot
-- the trap) and the saving throw, so the two couldn't differ. Add `save_dc`
-- for the saving throw; `dc` remains the perception/detection DC.
-- Existing triggers default to 15 (the prior default).
-- ============================================================

ALTER TABLE map_triggers
  ADD COLUMN IF NOT EXISTS save_dc INT NOT NULL DEFAULT 15;
