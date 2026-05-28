-- 028_wildcard_spells.sql
-- Wave 1B — Track Eldritch Knight / Arcane Trickster any-school wildcard picks.
--
-- EK and AT can pick one leveled spell from any school at character levels
-- 3, 8, 14, and 20 (otherwise restricted to Abjuration/Evocation for EK,
-- Enchantment/Illusion for AT). We need to remember WHICH spells were
-- wildcard picks so the school filter knows to allow them, and so the
-- wildcard budget displays correctly when leveling up.
--
-- Stored as JSONB array of spell names. Example: ["Fireball", "Detect Magic"]

ALTER TABLE characters ADD COLUMN IF NOT EXISTS wildcard_spells JSONB DEFAULT '[]'::jsonb;
