-- ============================================================
-- 021_session_lifecycle.sql
--
-- Adds lifecycle timestamp columns and a status CHECK constraint
-- to the sessions table, and creates the session_items table for
-- tracking shop items claimed during a session.
-- ============================================================

-- ── Lifecycle timestamp columns ───────────────────────────────
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS setup_at      timestamptz,
  ADD COLUMN IF NOT EXISTS lobby_at      timestamptz,
  ADD COLUMN IF NOT EXISTS started_at    timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at     timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at  timestamptz,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS player_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_summary text;

-- ── Status CHECK constraint ───────────────────────────────────
-- Drop any old constraint first (name may differ across environments).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM   pg_constraint
    WHERE  conrelid = 'sessions'::regclass
      AND  contype  = 'c'
      AND  conname  LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE sessions DROP CONSTRAINT %I', r.conname);
  END LOOP;
END
$$;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('setup', 'lobby', 'active', 'paused', 'completed'));

-- ── session_items table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_items (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  character_id            uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  wallet_address          text NOT NULL,
  item_id                 text NOT NULL,
  item_name               text NOT NULL,
  item_tier               text NOT NULL,
  item_type               text NOT NULL,   -- consumable | gear | magic_item | cosmetic
  source                  text NOT NULL DEFAULT 'shop',  -- shop | sponsor | award
  used                    boolean NOT NULL DEFAULT false,
  used_at                 timestamptz,
  auto_remove_on_session_end boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS session_items_session_id_idx    ON session_items(session_id);
CREATE INDEX IF NOT EXISTS session_items_character_id_idx  ON session_items(character_id);
CREATE INDEX IF NOT EXISTS session_items_wallet_idx        ON session_items(wallet_address);

-- ── RLS on session_items ──────────────────────────────────────
ALTER TABLE session_items ENABLE ROW LEVEL SECURITY;

-- Players can read their own items
CREATE POLICY "session_items_select_own"
  ON session_items
  FOR SELECT
  USING (
    wallet_address = lower(
      coalesce(
        current_setting('request.headers', true)::json->>'x-wallet-address',
        ''
      )
    )
  );

-- All writes go through service role (API routes use supabaseAdmin).
-- No INSERT / UPDATE / DELETE policy needed for anon/authenticated roles.

-- ── Add session_items to realtime publication ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname   = 'supabase_realtime'
      AND tablename = 'session_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_items;
  END IF;
END
$$;
