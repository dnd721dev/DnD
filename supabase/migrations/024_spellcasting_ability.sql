-- 024_spellcasting_ability.sql
-- Add spellcasting_ability column to characters table.
-- This column gates isMageUser = Boolean(c.spellcasting_ability) on the character sheet,
-- which controls whether the Spellbook tab is shown.
-- It was referenced in step6 save and character-sheet code but was never added to the schema.

ALTER TABLE characters ADD COLUMN IF NOT EXISTS spellcasting_ability TEXT;
