-- 014_session_players_avatar_rls.sql
-- BUG-01 fix: allow any authenticated user to read session_players rows so
-- TableChat.loadAvatars() can build an avatarMap for every participant.
--
-- This migration is fully self-contained: it creates session_players if
-- migration 007 has not been applied to this environment yet.

-- ── 1. Create table (idempotent) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_players (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  wallet_address TEXT        NOT NULL,
  character_id   UUID        REFERENCES characters(id) ON DELETE SET NULL,
  role           TEXT        NOT NULL DEFAULT 'player',
  is_ready       BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS session_players_session_idx ON session_players(session_id);
CREATE INDEX IF NOT EXISTS session_players_wallet_idx  ON session_players(wallet_address);

-- ── 2. Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;

-- ── 3. Drop any existing SELECT policies (new one replaces them all) ──────────
DROP POLICY IF EXISTS "session_players_self_only"  ON session_players;
DROP POLICY IF EXISTS "session_players_read_own"   ON session_players;
DROP POLICY IF EXISTS "session_players_select"     ON session_players;
DROP POLICY IF EXISTS "session_players_read_all"   ON session_players;

-- ── 4. Open SELECT policy ─────────────────────────────────────────────────────
-- Any request may read session_players rows (used for avatar loading + chat).
-- Write operations are still restricted to the owning wallet below.
CREATE POLICY "session_players_read_all"
  ON session_players
  FOR SELECT
  USING (true);

-- ── 5. Write policies (idempotent — drop first so re-running is safe) ─────────
DROP POLICY IF EXISTS "session_players_insert" ON session_players;
DROP POLICY IF EXISTS "session_players_update" ON session_players;
DROP POLICY IF EXISTS "session_players_delete" ON session_players;

CREATE POLICY "session_players_insert"
  ON session_players FOR INSERT
  WITH CHECK (wallet_address = current_wallet());

CREATE POLICY "session_players_update"
  ON session_players FOR UPDATE
  USING (wallet_address = current_wallet());

CREATE POLICY "session_players_delete"
  ON session_players FOR DELETE
  USING (wallet_address = current_wallet());

-- ── 6. Realtime publication (safe to run even if already added) ───────────────
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE session_players;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;
