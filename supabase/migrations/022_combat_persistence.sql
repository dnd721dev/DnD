-- ============================================================
-- 022_combat_persistence.sql
--
-- Adds DB columns to persist combat state across devices:
--   encounters: turn_index, round_number, combat_started,
--               active_wallet, active_name
--   tokens: conditions, resistances, immunities
--   initiative_entries: legendary_used (for legendary action tracking)
--
-- Also:
--   - Adds unique index on initiative_entries(encounter_id, wallet_address)
--   - Creates session_messages table
-- ============================================================

-- ── encounters — persistent combat state ─────────────────────
ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS turn_index      INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS round_number    INT     NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS combat_started  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_wallet   TEXT,
  ADD COLUMN IF NOT EXISTS active_name     TEXT;

-- ── tokens — conditions, resistances, immunities ─────────────
ALTER TABLE tokens
  ADD COLUMN IF NOT EXISTS conditions  TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resistances TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS immunities  TEXT[] NOT NULL DEFAULT '{}';

-- ── initiative_entries — legendary action count ───────────────
ALTER TABLE initiative_entries
  ADD COLUMN IF NOT EXISTS legendary_used INT NOT NULL DEFAULT 0;

-- ── Unique constraint: one entry per (encounter, wallet) ──────
-- Protects against duplicate initiative entries for the same player.
CREATE UNIQUE INDEX IF NOT EXISTS initiative_entries_encounter_wallet_uniq
  ON initiative_entries(encounter_id, wallet_address)
  WHERE wallet_address IS NOT NULL;

-- ── session_messages — in-session chat / system events ────────
CREATE TABLE IF NOT EXISTS public.session_messages (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_wallet  TEXT        NOT NULL,
  sender_name    TEXT        NOT NULL DEFAULT 'Unknown',
  body           TEXT        NOT NULL,
  kind           TEXT        NOT NULL DEFAULT 'chat',  -- chat | system | roll_result
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_messages_session_id_idx ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS session_messages_created_at_idx ON session_messages(created_at);

ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

-- Anyone in the session can read messages
CREATE POLICY "session_messages_select_open"
  ON session_messages FOR SELECT USING (true);

-- Any authenticated wallet can insert their own messages
CREATE POLICY "session_messages_insert_own"
  ON session_messages FOR INSERT
  WITH CHECK (sender_wallet = lower(
    coalesce(current_setting('request.headers', true)::json->>'x-wallet-address', '')
  ));

-- Add session_messages to realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'session_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_messages;
  END IF;
END
$$;
