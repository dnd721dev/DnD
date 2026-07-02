-- ============================================================
-- Migration 055 — apply_combat_damage: support healing
-- ------------------------------------------------------------
-- Migrations 039/041 defined apply_combat_damage with
-- `- GREATEST(0, p_amount)`, which clamps the applied amount to be
-- non-negative. That means a NEGATIVE p_amount (a heal) collapses to 0
-- and does nothing — so every heal path (DM dashboard party cards,
-- character sheet HP buttons, spell dashboard, battle console) silently
-- failed while damage still worked.
--
-- Fix: apply the raw signed amount (positive = damage, negative = heal)
-- and clamp the RESULT to the valid range:
--   token:     0 .. COALESCE(hp, ...)             (hp is the token's max)
--   character: 0 .. COALESCE(hit_points_max, ...)  (sheet max HP)
-- When a max is unknown (NULL) we don't cap above, so healing still works
-- without over-clamping to a stale value.
--
-- Authorization is unchanged from 041 (GM or any participant of the
-- token's session).
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

  -- Apply the signed amount to the map token, clamped to [0, max hp].
  -- Positive p_amount damages; negative p_amount heals (up to the token's hp).
  UPDATE tokens
     SET current_hp = LEAST(
           GREATEST(0, COALESCE(current_hp, hp, 0) - p_amount),
           COALESCE(hp, GREATEST(0, COALESCE(current_hp, 0) - p_amount))
         )
   WHERE id = p_token_id
   RETURNING character_id INTO v_char_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token % not found', p_token_id;
  END IF;

  -- Keep the PC's character sheet HP in sync, clamped to [0, hit_points_max].
  IF v_char_id IS NOT NULL THEN
    UPDATE characters
       SET hit_points_current = LEAST(
             GREATEST(0, COALESCE(hit_points_current, 0) - p_amount),
             COALESCE(hit_points_max, GREATEST(0, COALESCE(hit_points_current, 0) - p_amount))
           )
     WHERE id = v_char_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION apply_combat_damage(UUID, INT) TO anon, authenticated;
