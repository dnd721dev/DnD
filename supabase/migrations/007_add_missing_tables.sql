-- 007_add_missing_tables.sql
-- Creates six tables that are referenced in the codebase but were never migrated:
--   campaign_participants, campaign_character_selections, session_players,
--   player_inventory, encounter_state, encounter_initiative


-- ── 1. campaign_participants ──────────────────────────────────────────────────
-- Tracks who has joined a campaign and in what role.
CREATE TABLE IF NOT EXISTS campaign_participants (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  wallet_address TEXT        NOT NULL,
  role           TEXT        NOT NULL DEFAULT 'player',   -- 'gm' | 'player'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS campaign_participants_campaign_idx ON campaign_participants(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_participants_wallet_idx   ON campaign_participants(wallet_address);

ALTER TABLE campaign_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_participants_select" ON campaign_participants FOR SELECT USING (true);
CREATE POLICY "campaign_participants_insert" ON campaign_participants FOR INSERT WITH CHECK (wallet_address = current_wallet());
CREATE POLICY "campaign_participants_delete" ON campaign_participants FOR DELETE USING (wallet_address = current_wallet());


-- ── 2. campaign_character_selections ─────────────────────────────────────────
-- Each participant's chosen character for a given campaign.
CREATE TABLE IF NOT EXISTS campaign_character_selections (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id    UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  wallet_address TEXT        NOT NULL,
  character_id   UUID        NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS ccs_campaign_idx ON campaign_character_selections(campaign_id);
CREATE INDEX IF NOT EXISTS ccs_wallet_idx   ON campaign_character_selections(wallet_address);

ALTER TABLE campaign_character_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccs_select" ON campaign_character_selections FOR SELECT USING (true);
CREATE POLICY "ccs_insert" ON campaign_character_selections FOR INSERT WITH CHECK (wallet_address = current_wallet());
CREATE POLICY "ccs_update" ON campaign_character_selections FOR UPDATE USING (wallet_address = current_wallet());
CREATE POLICY "ccs_delete" ON campaign_character_selections FOR DELETE USING (wallet_address = current_wallet());


-- ── 3. session_players ───────────────────────────────────────────────────────
-- Active character assignment per player per session (synced from campaign selection).
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

ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_players_select" ON session_players FOR SELECT USING (true);
CREATE POLICY "session_players_insert" ON session_players FOR INSERT WITH CHECK (wallet_address = current_wallet());
CREATE POLICY "session_players_update" ON session_players FOR UPDATE USING (wallet_address = current_wallet());
CREATE POLICY "session_players_delete" ON session_players FOR DELETE USING (wallet_address = current_wallet());


-- ── 4. player_inventory ──────────────────────────────────────────────────────
-- On-chain shop purchases recorded after tx confirmation.
CREATE TABLE IF NOT EXISTS player_inventory (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address   TEXT        NOT NULL,
  item_id          TEXT        NOT NULL,
  item_name        TEXT,
  item_kind        TEXT,
  price_tokens     INT,
  payment_tx_hash  TEXT,
  used             BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_inventory_wallet_idx ON player_inventory(wallet_address);

ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_inventory_select" ON player_inventory FOR SELECT USING (wallet_address = current_wallet());
CREATE POLICY "player_inventory_insert" ON player_inventory FOR INSERT WITH CHECK (wallet_address = current_wallet());
CREATE POLICY "player_inventory_update" ON player_inventory FOR UPDATE USING (wallet_address = current_wallet());


-- ── 5. encounter_state ───────────────────────────────────────────────────────
-- One row per encounter tracking active turn index and combat status.
-- encounters.id is TEXT (not UUID) per 002_rebuild_backend.sql.
CREATE TABLE IF NOT EXISTS encounter_state (
  encounter_id   TEXT        PRIMARY KEY REFERENCES encounters(id) ON DELETE CASCADE,
  turn_index     INT         NOT NULL DEFAULT 0,
  combat_active  BOOLEAN     NOT NULL DEFAULT false,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE encounter_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encounter_state_select" ON encounter_state FOR SELECT USING (true);
CREATE POLICY "encounter_state_all"    ON encounter_state FOR ALL   USING (true);


-- ── 6. encounter_initiative ──────────────────────────────────────────────────
-- Initiative order rows for an encounter.
-- encounters.id is TEXT; tokens.id is UUID.
CREATE TABLE IF NOT EXISTS encounter_initiative (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id   TEXT        NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  token_id       UUID        REFERENCES tokens(id) ON DELETE CASCADE,
  init_value     INT,
  sort_order     INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS encounter_initiative_encounter_idx ON encounter_initiative(encounter_id);

ALTER TABLE encounter_initiative ENABLE ROW LEVEL SECURITY;

CREATE POLICY "encounter_initiative_select" ON encounter_initiative FOR SELECT USING (true);
CREATE POLICY "encounter_initiative_all"    ON encounter_initiative FOR ALL   USING (true);
