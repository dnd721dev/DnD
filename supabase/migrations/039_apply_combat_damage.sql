-- ============================================================
-- Migration 039 — apply_combat_damage RPC
-- ------------------------------------------------------------
-- Lets the session GM apply a monster attack's damage to a target
-- token and keep a PC's character sheet HP in sync.
--
-- Why an RPC: tokens RLS allows GM writes, but characters RLS is
-- owner-only (characters_update_own, migration 002:234-235), so the
-- GM cannot directly write a player's hit_points_current. This
-- SECURITY DEFINER function bypasses RLS after authorizing that the
-- caller is the GM of the token's encounter's session — mirroring the
-- move_my_token ownership pattern (migration 012).
-- ============================================================

CREATE OR REPLACE FUNCTION apply_combat_damage(p_token_id UUID, p_amount INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller  text;
  v_char_id uuid;
  v_is_gm   boolean;
BEGIN
  v_caller := lower(
    nullif(trim(current_setting('request.headers', true)::json->>'x-wallet-address'), '')
  );
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no wallet address in request headers';
  END IF;

  -- Caller must be the GM of the token's encounter's session.
  SELECT EXISTS (
    SELECT 1
    FROM tokens t
    JOIN encounters e ON e.id = t.encounter_id
    JOIN sessions  s ON s.id = e.session_id
    WHERE t.id = p_token_id
      AND lower(s.gm_wallet) = v_caller
  ) INTO v_is_gm;

  IF NOT v_is_gm THEN
    RAISE EXCEPTION 'Not authorized to apply damage to token %', p_token_id;
  END IF;

  -- Apply to the map token (clamped at 0); capture the linked PC, if any.
  UPDATE tokens
     SET current_hp = GREATEST(0, COALESCE(current_hp, hp, 0) - GREATEST(0, p_amount))
   WHERE id = p_token_id
   RETURNING character_id INTO v_char_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token % not found', p_token_id;
  END IF;

  -- Keep the PC's character sheet HP in sync (owner-only RLS bypassed here).
  IF v_char_id IS NOT NULL THEN
    UPDATE characters
       SET hit_points_current = GREATEST(0, COALESCE(hit_points_current, 0) - GREATEST(0, p_amount))
     WHERE id = v_char_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_combat_damage(UUID, INT) TO anon, authenticated;
