-- 029_mystic_arcanum.sql
-- Wave 3 — Warlock Mystic Arcanum tracking.
--
-- Warlocks at level 11+ gain ONE spell of 6th level, at 13+ one 7th, 15+ one
-- 8th, 17+ one 9th. Each can be cast 1/day (long rest) without consuming a
-- pact slot. We store the chosen spell names keyed by spell level.
--
-- Schema example: { "6": "Eyebite", "7": "Plane Shift", "8": null, "9": null }
--
-- Daily usage tracked in resource_state.mystic_arcanum_used_<level> (already
-- reset by spellSlots.ts → longRestSlots via the mystic_arcanum_used_ prefix).

ALTER TABLE characters ADD COLUMN IF NOT EXISTS mystic_arcanum JSONB DEFAULT '{}'::jsonb;
