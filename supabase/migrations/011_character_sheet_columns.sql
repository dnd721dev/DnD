-- 011_character_sheet_columns.sql
--
-- Three problems fixed here:
--
-- 1. PlayerSidebar.tsx selects armor_class, temp_hp, resource_state,
--    spell_save_dc, spell_attack_bonus, spell_slots — none of which exist
--    in the characters table. This makes every character sheet load fail
--    with "Could not load character preview."
--
-- 2. PlaceCharactersPanel queries session_players joined to characters.
--    The characters RLS only allows SELECT by the owner wallet or
--    visibility='public', so the GM (different wallet) gets null for
--    every player character.  A new policy grants GMs SELECT on any
--    character that belongs to a player in one of their sessions.
--
-- 3. session_players is not in the realtime publication, so the DM panel
--    never updates when players join after the page loads.


-- ── 1. Add missing columns to characters ─────────────────────────────────────

-- armor_class: a stored generated column that always mirrors ac.
-- PlayerSidebar reads armor_class; step6 writes ac.
-- This keeps both in sync without changing step6.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS armor_class INT GENERATED ALWAYS AS (ac) STORED;

-- temp_hp: temporary hit points, displayed + edited in the player sidebar.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS temp_hp INT NOT NULL DEFAULT 0;

-- resource_state: tracks class resource usage between turns
-- (spell slots used, rage charges, ki points, etc.).
-- Distinct from action_state (per-turn booleans like action_used_turn).
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS resource_state JSONB NOT NULL DEFAULT '{}';

-- spell_save_dc, spell_attack_bonus, spell_slots: computed from abilities +
-- level + class; nullable so existing rows are unaffected. step6 can
-- optionally populate them; PlayerSidebar displays them if present.
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS spell_save_dc INT;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS spell_attack_bonus INT;

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS spell_slots JSONB;


-- ── 2. GM RLS policy on characters ───────────────────────────────────────────

-- Allow the GM to SELECT characters that belong to players currently in
-- one of their sessions.  Required for PlaceCharactersPanel's
-- session_players → characters join to return data.
CREATE POLICY "characters_select_session_gm" ON characters FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM   session_players sp
      JOIN   sessions         s  ON s.id = sp.session_id
      WHERE  sp.character_id = characters.id
        AND  s.gm_wallet = current_wallet()
    )
  );


-- ── 3. Realtime for session_players ──────────────────────────────────────────

-- Without this, the DM's PlaceCharactersPanel only shows the state at
-- page-load time and never updates when players join or select characters.
ALTER PUBLICATION supabase_realtime ADD TABLE session_players;
