-- ============================================================
-- Migration 043 — campaign game type (CAYA vs Free-Level)
-- ------------------------------------------------------------
-- The mode is now a campaign-level property. A campaign is either:
--   'set_level' (Free-Level) — characters are made at a chosen level and each
--                              session states the exact required level.
--   'caya'      (Come As You Are) — characters are forced to level 1 at
--                              creation and only level via XP in CAYA games.
-- Sessions inherit the campaign mode; character type is validated when joining.
-- Existing campaigns default to Free-Level.
-- ============================================================

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS campaign_type TEXT NOT NULL DEFAULT 'set_level'
  CHECK (campaign_type IN ('set_level', 'caya'));
