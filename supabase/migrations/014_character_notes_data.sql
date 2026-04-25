-- Migration 014: Add notes_data jsonb column to characters
-- Stores per-campaign notes as { general?: string, [campaignId: uuid]: string }
-- The legacy plain-text `notes` column is kept for backwards compatibility.

-- 1. Add the new column (safe to re-run: IF NOT EXISTS)
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS notes_data jsonb DEFAULT '{}';

-- 2. Back-fill: migrate any existing plain-text notes into notes_data->>'general'
--    Only touches rows that have notes but no notes_data yet.
UPDATE characters
SET notes_data = jsonb_build_object('general', notes)
WHERE notes IS NOT NULL
  AND notes <> ''
  AND (notes_data IS NULL OR notes_data = '{}');

-- 3. Index for efficient lookups (optional but useful for large tables)
CREATE INDEX IF NOT EXISTS idx_characters_notes_data
  ON characters USING gin (notes_data);
