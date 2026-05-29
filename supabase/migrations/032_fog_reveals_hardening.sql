-- ============================================================
-- Migration 032 — fog_reveals schema hardening
-- ------------------------------------------------------------
-- Came out of the fog-of-war audit (whimsical-booping-kahn plan,
-- Wave 3). Three changes, all additive — no data is dropped, the
-- existing fog_reveals_unique constraint stays in place as the
-- conflict target for upserts.
--
-- 1. Surrogate primary key + revealed_at audit column. The table
--    was previously PK-less, which is why Supabase upserts had
--    to be patched to pass `onConflict` (the named unique
--    constraint) explicitly. The PK only gives us a row identity
--    for tooling — the unique constraint is still what dedupes.
--
-- 2. Replace the wide-open RLS policy with the wallet-auth
--    pattern used elsewhere in the schema (see profiles,
--    characters, session_participants). Reads stay open so
--    spectators and late-joiners can still load fog state.
--    Writes require the request's x-wallet-address header to
--    match viewer_wallet OR to be the session GM.
--
-- 3. Composite index on (encounter_id, map_id, viewer_wallet)
--    matches the actual SELECT shape in loadReveals() — the
--    existing (encounter_id, viewer_wallet) index will still
--    work but this is a tighter match for multi-map sessions.
-- ============================================================

-- 1. Surrogate primary key + audit column ────────────────────
-- WHY no UPDATE statements: fog_reveals is in the supabase_realtime
-- publication. Postgres refuses DML UPDATE on a published table that
-- has no replica identity (the error you'd see is ERROR 55000:
-- "cannot update table because it does not have a replica identity").
-- The primary key becomes the replica identity — but we don't have one
-- yet at this point in the migration. Avoid the issue entirely by using
-- ADD COLUMN ... NOT NULL DEFAULT ..., which fills existing rows via
-- PostgreSQL's catalog-default mechanism (pg 11+ fast add column) and
-- never emits UPDATE DML events.
ALTER TABLE fog_reveals
  ADD COLUMN IF NOT EXISTS id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Add the primary key only if it isn't there yet (re-runnable).
-- This also sets the replica identity for the publication going forward.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.fog_reveals'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE fog_reveals ADD PRIMARY KEY (id);
  END IF;
END $$;

-- 2. Tighten RLS to wallet-auth pattern ──────────────────────
-- Reads remain open (spectators + late-joiners).
-- Writes require viewer_wallet = current_wallet() OR the
-- requester is the GM of the session that owns the encounter.

DROP POLICY IF EXISTS "fog_reveals_open" ON fog_reveals;

CREATE POLICY "fog_reveals_select_open" ON fog_reveals
  FOR SELECT USING (true);

-- Helper expression: is the current wallet the GM of the encounter's session?
-- Encounters → sessions → gm_wallet. The encounter_id column on
-- fog_reveals is TEXT (not UUID) per migration 002, so cast the
-- session id on the join side too — the underlying encounters.id is TEXT.
CREATE POLICY "fog_reveals_insert_own_or_gm" ON fog_reveals
  FOR INSERT WITH CHECK (
    lower(viewer_wallet) = current_wallet()
    OR EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = fog_reveals.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );

CREATE POLICY "fog_reveals_update_own_or_gm" ON fog_reveals
  FOR UPDATE USING (
    lower(viewer_wallet) = current_wallet()
    OR EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = fog_reveals.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );

CREATE POLICY "fog_reveals_delete_own_or_gm" ON fog_reveals
  FOR DELETE USING (
    lower(viewer_wallet) = current_wallet()
    OR EXISTS (
      SELECT 1 FROM encounters e
      JOIN sessions s ON s.id = e.session_id
      WHERE e.id = fog_reveals.encounter_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );

-- 3. Composite index for the actual SELECT shape ─────────────
CREATE INDEX IF NOT EXISTS fog_reveals_enc_map_viewer
  ON fog_reveals(encounter_id, map_id, viewer_wallet);
