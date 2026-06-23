-- 049: Scope combat (initiative) entries to a specific map.
--
-- Problem: encounters are one-per-session (no map_id), so the DM's combat
-- tracker listed every combatant across every map in the session. Tokens and
-- fog are already map-scoped via tokens.map_id; only the initiative list was
-- not. This adds a map_id to initiative_entries so the tracker can show (and
-- run turns for) only the current map's combatants.

ALTER TABLE initiative_entries
  ADD COLUMN IF NOT EXISTS map_id UUID REFERENCES maps(id) ON DELETE CASCADE;

-- Backfill existing entries from their linked token's map so in-flight combats
-- partition correctly. Entries with no token (e.g. a PC initiative roll made
-- before placement) stay NULL and are treated as "shown on every map" for
-- backward compatibility.
UPDATE initiative_entries ie
SET map_id = t.map_id
FROM tokens t
WHERE ie.token_id = t.id
  AND ie.map_id IS NULL
  AND t.map_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_initiative_entries_encounter_map
  ON initiative_entries(encounter_id, map_id);
