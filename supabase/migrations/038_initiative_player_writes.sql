-- ============================================================
-- Migration 038 — allow players to write their own initiative
-- ------------------------------------------------------------
-- Migration 033 locked initiative_entries writes to the session
-- GM only (initiative_entries_write_gm). That silently blocked the
-- player initiative roll flow (handleInitiative in TableClient),
-- so player rolls never reached the combat tracker — it read 0 and
-- the DM was forced to roll.
--
-- This relaxes the write policy to owner-OR-GM, mirroring the
-- tokens_write_owner_or_gm pattern from migration 033:
--   - a player may insert/update ONLY their own PC row
--     (is_pc = true AND wallet_address = current_wallet())
--   - the session GM retains full write access
--
-- SELECT stays wide-open (initiative_entries_select_open from 033).
-- The unique index initiative_entries_encounter_wallet_uniq (022)
-- makes the player's onConflict upsert update-in-place (no dupes).
--
-- current_wallet() (migration 002) reads
-- request.headers->>'x-wallet-address' set by src/lib/supabase.ts.
-- ============================================================

DROP POLICY IF EXISTS "initiative_entries_write_gm" ON initiative_entries;

CREATE POLICY "initiative_entries_write_owner_or_gm" ON initiative_entries
  FOR ALL
  USING (
    -- a player may write their own PC row
    (initiative_entries.is_pc = true
      AND lower(coalesce(initiative_entries.wallet_address, '')) = current_wallet())
    OR EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = initiative_entries.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  )
  WITH CHECK (
    (initiative_entries.is_pc = true
      AND lower(coalesce(initiative_entries.wallet_address, '')) = current_wallet())
    OR EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = initiative_entries.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );
