-- ============================================================
-- Migration 041 — apply_combat_damage: allow session participants
-- ------------------------------------------------------------
-- Migration 039 created apply_combat_damage authorized for the GM only.
-- But players also deal damage (weapon attacks). Migration 033 hardened
-- tokens writes to owner-or-GM, so a player's direct
-- `tokens.update({ current_hp })` against a MONSTER token they don't own
-- silently no-ops (zero rows) — player weapon damage stopped reducing
-- monster HP.
--
-- Broaden authorization: the caller may be the session GM OR any
-- participant of the token's session (session_players). Scoped to the
-- token's own session, so it is not a cross-session griefing vector.
--
-- Also resolve the caller wallet from the header first, then the JWT
-- claim (consistent with current_wallet() in migration 040), so the RPC
-- works both over REST and any JWT-only path.
-- ============================================================

CREATE OR REPLACE FUNCTION apply_combat_damage(p_token_id UUID, p_amount INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller  text;
  v_char_id uuid;
  v_ok      boolean;
BEGIN
  v_caller := lower(nullif(coalesce(
    current_setting('request.headers', true)::json ->> 'x-wallet-address',
    auth.jwt() ->> 'wallet_address'
  ), ''));
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no wallet address';
  END IF;

  -- Caller must be the GM of, or a participant in, the token's session.
  SELECT EXISTS (
    SELECT 1
    FROM tokens t
    JOIN encounters e ON e.id = t.encounter_id
    JOIN sessions  s ON s.id = e.session_id
    WHERE t.id = p_token_id
      AND (
        lower(s.gm_wallet) = v_caller
        OR EXISTS (
          SELECT 1 FROM session_players sp
          WHERE sp.session_id = s.id
            AND lower(sp.wallet_address) = v_caller
        )
      )
  ) INTO v_ok;

  IF NOT v_ok THEN
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
