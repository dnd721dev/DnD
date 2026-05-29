-- ============================================================
-- Migration 033 — combat-state RLS hardening
-- ------------------------------------------------------------
-- Locks down five combat-critical tables that shipped with
-- `FOR ALL USING (true) WITH CHECK (true)`. Any authenticated
-- wallet could previously mutate any session's combat state
-- (move tokens, set HP to 0, change turn order, edit death
-- saves) — a one-click griefing vector.
--
-- Pattern mirrors migration 032 (fog_reveals): keep SELECT
-- wide-open so spectators and late-joiners still load combat
-- state; tighten writes to either the row's owner (where one
-- exists) or the session GM.
--
-- The current_wallet() helper from 002 reads
-- request.headers->>'x-wallet-address' set by src/lib/supabase.ts.
--
-- All operations are DDL only (DROP/CREATE POLICY). No row
-- writes, so the realtime "replica identity" issue from 032
-- does not apply here.
--
-- Tables covered:
--   - encounters         (002:342) → GM-only writes
--   - initiative_entries (002:362) → GM-only writes (UI is GM-only)
--   - tokens             (002:397) → owner OR GM
--   - encounter_state    (007:110) → GM-only
--   - encounter_initiative (007:130) → GM-only
--
-- Recording tables (002:625, 002:640) are NOT covered — recording
-- is a "do not touch" system per the audit plan. Spin off
-- separately.
-- ============================================================

-- Helper: is the current wallet the GM of the encounter's session?
-- Encounters → sessions → gm_wallet. encounter_id is TEXT here.
-- Inlined into each policy to keep the migration self-contained.

-- ── 1. encounters ──────────────────────────────────────────
DROP POLICY IF EXISTS "encounters_open" ON encounters;

CREATE POLICY "encounters_select_open" ON encounters
  FOR SELECT USING (true);

CREATE POLICY "encounters_write_gm" ON encounters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = encounters.session_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = encounters.session_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );

-- ── 2. initiative_entries ──────────────────────────────────
-- UI-side writes only happen in InitiativeTracker which mounts
-- inside GMSidebar (GM-only render). PlayerSidebar does not
-- write to this table. If a future player flow needs to write
-- here (e.g. self-managed death saves), relax to allow
-- wallet_address = current_wallet() too.
DROP POLICY IF EXISTS "initiative_entries_open" ON initiative_entries;

CREATE POLICY "initiative_entries_select_open" ON initiative_entries
  FOR SELECT USING (true);

CREATE POLICY "initiative_entries_write_gm" ON initiative_entries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = initiative_entries.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = initiative_entries.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );

-- ── 3. tokens ──────────────────────────────────────────────
-- Two write paths: the token's owner (player moving their own
-- PC) and the GM (spawning monsters, applying damage, etc.).
DROP POLICY IF EXISTS "tokens_open" ON tokens;

CREATE POLICY "tokens_select_open" ON tokens
  FOR SELECT USING (true);

CREATE POLICY "tokens_write_owner_or_gm" ON tokens
  FOR ALL
  USING (
    lower(coalesce(owner_wallet, '')) = current_wallet()
    OR EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = tokens.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  )
  WITH CHECK (
    lower(coalesce(owner_wallet, '')) = current_wallet()
    OR EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = tokens.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );

-- ── 4. encounter_state ─────────────────────────────────────
DROP POLICY IF EXISTS "encounter_state_all" ON encounter_state;
-- encounter_state_select stays — already SELECT USING (true).

CREATE POLICY "encounter_state_write_gm" ON encounter_state
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = encounter_state.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = encounter_state.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );

-- ── 5. encounter_initiative ────────────────────────────────
DROP POLICY IF EXISTS "encounter_initiative_all" ON encounter_initiative;
-- encounter_initiative_select stays — already SELECT USING (true).

CREATE POLICY "encounter_initiative_write_gm" ON encounter_initiative
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = encounter_initiative.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = encounter_initiative.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );
