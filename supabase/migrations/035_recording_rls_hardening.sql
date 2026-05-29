-- ============================================================
-- Migration 035 — recording_tracks / recording_markers RLS
-- ------------------------------------------------------------
-- Recording Wave 4D: locks down two tables that shipped with
-- `FOR ALL USING (true) WITH CHECK (true)` (002_rebuild_backend.sql
-- lines 625 and 640). Carried over from the deferred item in the
-- system audit (migration 033).
--
-- Pattern mirrors 032 (fog_reveals) and 033 (combat state): keep
-- SELECT wide-open so participants can review recordings; tighten
-- writes to the session GM via the recording_id → session_recordings
-- → sessions → gm_wallet join.
--
-- The webhook handler at /api/livekit-webhook/route.ts uses
-- supabaseAdmin() (service role key) which bypasses RLS, so it is
-- unaffected. The recover endpoint and any future server-side
-- maintenance tooling are likewise unaffected.
-- ============================================================

-- ── recording_tracks ──────────────────────────────────────────
DROP POLICY IF EXISTS "recording_tracks_open" ON recording_tracks;

CREATE POLICY "recording_tracks_select_open" ON recording_tracks
  FOR SELECT USING (true);

CREATE POLICY "recording_tracks_write_gm" ON recording_tracks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM session_recordings r
      JOIN sessions s ON s.id = r.session_id
      WHERE r.id = recording_tracks.recording_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_recordings r
      JOIN sessions s ON s.id = r.session_id
      WHERE r.id = recording_tracks.recording_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );

-- ── recording_markers ─────────────────────────────────────────
DROP POLICY IF EXISTS "recording_markers_open" ON recording_markers;

CREATE POLICY "recording_markers_select_open" ON recording_markers
  FOR SELECT USING (true);

CREATE POLICY "recording_markers_write_gm" ON recording_markers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM session_recordings r
      JOIN sessions s ON s.id = r.session_id
      WHERE r.id = recording_markers.recording_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_recordings r
      JOIN sessions s ON s.id = r.session_id
      WHERE r.id = recording_markers.recording_id
        AND lower(s.gm_wallet) = current_wallet()
    )
  );
