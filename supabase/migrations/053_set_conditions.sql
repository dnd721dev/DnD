-- ============================================================
-- Migration 053 — set_conditions: one canonical write for conditions
-- ------------------------------------------------------------
-- Conditions were split across two stores that never synced:
--   • tokens.conditions          → map rings, initiative pips, DM panels
--   • characters.action_state.active_conditions → the only enforcement
--     surface (PlayerSidebar: movement / attack disadvantage / save
--     auto-fail / action-blocking) + the sheet chips
-- Worse, characters UPDATE is owner-only RLS (characters_update_own,
-- migration 002), so a GM toggling a PC's condition from the initiative
-- tracker / DM dashboard silently failed → the player was never restricted.
--
-- This SECURITY DEFINER RPC (mirroring apply_combat_damage, migration 041)
-- writes BOTH stores for the linked token<->character pair after authorizing
-- the caller, bypassing the owner-only RLS. Callers pass whichever id they
-- have (a token at the table, or a character on the sheet/dashboard).
-- ============================================================

CREATE OR REPLACE FUNCTION set_conditions(
  p_conditions   TEXT[],
  p_token_id     UUID DEFAULT NULL,
  p_character_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller  text;
  v_char_id uuid := p_character_id;
  v_session uuid;
  v_ok      boolean := false;
  v_conds   text[]  := COALESCE(p_conditions, ARRAY[]::text[]);
BEGIN
  v_caller := lower(nullif(coalesce(
    current_setting('request.headers', true)::json ->> 'x-wallet-address',
    auth.jwt() ->> 'wallet_address'
  ), ''));
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no wallet address';
  END IF;

  -- Resolve the token<->character pairing + owning session.
  IF p_token_id IS NOT NULL THEN
    SELECT t.character_id, e.session_id
      INTO v_char_id, v_session
      FROM tokens t
      JOIN encounters e ON e.id = t.encounter_id
     WHERE t.id = p_token_id;
  ELSIF v_char_id IS NOT NULL THEN
    SELECT e.session_id
      INTO v_session
      FROM tokens t
      JOIN encounters e ON e.id = t.encounter_id
     WHERE t.character_id = v_char_id
     ORDER BY t.created_at DESC
     LIMIT 1;
  END IF;

  -- Authorize: GM of, or participant in, the token's session …
  IF v_session IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = v_session
        AND (
          lower(s.gm_wallet) = v_caller
          OR EXISTS (
            SELECT 1 FROM session_players sp
            WHERE sp.session_id = s.id AND lower(sp.wallet_address) = v_caller
          )
        )
    ) INTO v_ok;
  END IF;
  -- … or the character's own owner (sheet edits before placement).
  IF NOT v_ok AND v_char_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = v_char_id AND lower(c.wallet_address) = v_caller
    ) INTO v_ok;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Not authorized to set conditions';
  END IF;

  -- Write the token store (the specific token, or every token for the PC).
  IF p_token_id IS NOT NULL THEN
    UPDATE tokens SET conditions = v_conds WHERE id = p_token_id;
  ELSIF v_char_id IS NOT NULL THEN
    UPDATE tokens SET conditions = v_conds WHERE character_id = v_char_id;
  END IF;

  -- Write the character store (preserving other action_state keys).
  IF v_char_id IS NOT NULL THEN
    UPDATE characters
       SET action_state = jsonb_set(
             COALESCE(action_state, '{}'::jsonb),
             '{active_conditions}',
             to_jsonb(v_conds),
             true)
     WHERE id = v_char_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION set_conditions(TEXT[], UUID, UUID) TO anon, authenticated;
