-- ============================================================
-- 020_session_lifecycle_status.sql
--
-- Migrate session status values from old names to the new
-- lifecycle vocabulary used throughout the UI.
--
-- Old values  →  New values
--   planned        →  setup
--   in_progress    →  active
--   cancelled      →  setup   (safest fallback)
--   completed      →  completed  (unchanged)
--
-- Also adds sessions to the realtime publication so clients
-- receive status changes instantly (Fix 7).
-- ============================================================

-- ── Rename existing statuses ──────────────────────────────────
UPDATE sessions SET status = 'setup'  WHERE status IN ('planned', 'cancelled');
UPDATE sessions SET status = 'active' WHERE status = 'in_progress';
-- 'completed' is unchanged.

-- ── Ensure sessions table is in the realtime publication ──────
-- This is idempotent; adding a table that is already in the
-- publication raises no error in Postgres 15+.
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
