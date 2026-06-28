-- ============================================================
-- Migration 054 — trigger target rules + cross-device victim saves
-- ------------------------------------------------------------
-- Adds a `target_rule` to map_triggers so a trap can redirect its effect to a
-- token OTHER than the one that stepped on the tile (e.g. "lowest current HP in
-- the party"). Default 'self' = existing behavior (hits the tripper).
--
-- Because the resolved victim can be on a DIFFERENT device than the player who
-- tripped the trap, and the saving-throw modal lives on the victim's own client
-- (PlayerSidebar), we need a cross-device hand-off. `trigger_save_events` is that
-- channel: when a redirect trap fires, the server resolves the target(s) and
-- inserts one row per victim. Each victim's client subscribes by session_id,
-- sees the row addressed to its wallet, and rolls its OWN save (then applies the
-- effect to its own token via apply_combat_damage, exactly like the self path).
--
-- 'self' triggers DO NOT use this table — they keep the original same-device
-- window-event path untouched.
-- ============================================================

-- 1. The redirect rule on the trigger itself.
ALTER TABLE map_triggers
  ADD COLUMN IF NOT EXISTS target_rule TEXT NOT NULL DEFAULT 'self';
  -- self | lowest_hp_party | lowest_hp_percent | highest_hp_party | random_party | all_party

-- 2. Cross-device "you must save against this trap" events.
CREATE TABLE IF NOT EXISTS trigger_save_events (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  trigger_id           UUID        REFERENCES map_triggers(id) ON DELETE CASCADE,
  -- The token that must save + take the effect (the resolved victim).
  target_token_id      UUID        NOT NULL REFERENCES tokens(id) ON DELETE CASCADE,
  target_wallet        TEXT,       -- victim's owner wallet (lowercased); the client filter key
  -- The token that originally tripped the trap (for "X triggered it, Y takes it").
  triggering_token_id  UUID,
  triggering_label     TEXT,
  -- Snapshot of the effect so the victim's client doesn't need SELECT on a
  -- hidden map_triggers row: { name, save_type, save_dc, damage_dice,
  -- damage_type, condition_applied, description }.
  effect               JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trigger_save_events_session_idx ON trigger_save_events(session_id);

-- Open RLS, consistent with tokens_open / initiative_entries_open (002). Writes
-- come from the service-role fire route; reads are scoped client-side by the
-- session subscription + wallet filter.
ALTER TABLE trigger_save_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trigger_save_events_open" ON trigger_save_events;
CREATE POLICY "trigger_save_events_open" ON trigger_save_events FOR ALL USING (true) WITH CHECK (true);

-- 3. Realtime — the whole point is the live INSERT fan-out to victim clients.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'trigger_save_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trigger_save_events;
  END IF;
END $$;

-- REPLICA IDENTITY FULL so filtered (session_id) payloads are complete.
ALTER TABLE trigger_save_events REPLICA IDENTITY FULL;
