-- ============================================================
-- DND721 — 002_rebuild_backend.sql
-- Full schema rebuild for a fresh Supabase project.
--
-- Run order: this file (002) runs before the additive migrations
-- (add_death_saves_to_initiative, add_fog_of_war, etc.) because
-- those files all use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, so
-- they are safe no-ops when the columns already exist.
--
-- Auth strategy: wallet-address auth.
--   - profiles.wallet_address is the primary user identity key.
--   - RLS reads the wallet from the custom request header
--     x-wallet-address (injected by src/lib/supabase.ts).
--   - The helper current_wallet() returns that header value,
--     lowercased, for use in every policy.
-- ============================================================

-- ── Helper: extract wallet from request header ────────────────
CREATE OR REPLACE FUNCTION current_wallet()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT lower(nullif(
    current_setting('request.headers', true)::json ->> 'x-wallet-address',
    ''
  ))
$$;


-- ══════════════════════════════════════════════════════════════
-- SECTION 1 — USER PROFILES
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  wallet_address  TEXT        PRIMARY KEY,
  user_id         UUID        UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  username        TEXT,
  bio             TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_open"  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own"   ON profiles FOR INSERT WITH CHECK (wallet_address = current_wallet());
CREATE POLICY "profiles_update_own"   ON profiles FOR UPDATE USING (wallet_address = current_wallet());
CREATE POLICY "profiles_delete_own"   ON profiles FOR DELETE USING (wallet_address = current_wallet());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ══════════════════════════════════════════════════════════════
-- SECTION 2 — CAMPAIGNS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS campaigns (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gm_wallet         TEXT        NOT NULL,
  title             TEXT        NOT NULL,
  description       TEXT,
  status            TEXT        NOT NULL DEFAULT 'active',  -- active | archived
  livekit_room_name TEXT        UNIQUE,
  settings          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_gm_wallet_idx ON campaigns(gm_wallet);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Anyone can read campaigns; only the GM can write them.
CREATE POLICY "campaigns_select_open"  ON campaigns FOR SELECT USING (true);
CREATE POLICY "campaigns_insert_gm"    ON campaigns FOR INSERT WITH CHECK (gm_wallet = current_wallet());
CREATE POLICY "campaigns_update_gm"    ON campaigns FOR UPDATE USING (gm_wallet = current_wallet());
CREATE POLICY "campaigns_delete_gm"    ON campaigns FOR DELETE USING (gm_wallet = current_wallet());


-- ══════════════════════════════════════════════════════════════
-- SECTION 3 — SESSIONS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID        REFERENCES campaigns(id) ON DELETE SET NULL,
  title            TEXT,
  description      TEXT,
  gm_wallet        TEXT,
  status           TEXT        NOT NULL DEFAULT 'planned',  -- planned | in_progress | completed | cancelled
  session_type     TEXT        NOT NULL DEFAULT 'set_level', -- set_level | caya
  required_level   INT,
  xp_award         INT,
  scheduled_start  TIMESTAMPTZ,
  duration_minutes INT         NOT NULL DEFAULT 120,
  map_image_url    TEXT,
  current_map_id   UUID,       -- FK added after maps table exists (see below)
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_campaign_id_idx ON sessions(campaign_id);
CREATE INDEX IF NOT EXISTS sessions_gm_wallet_idx   ON sessions(gm_wallet);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_select_open"  ON sessions FOR SELECT USING (true);
CREATE POLICY "sessions_insert_gm"    ON sessions FOR INSERT WITH CHECK (gm_wallet = current_wallet());
CREATE POLICY "sessions_update_gm"    ON sessions FOR UPDATE USING (gm_wallet = current_wallet());
CREATE POLICY "sessions_delete_gm"    ON sessions FOR DELETE USING (gm_wallet = current_wallet());


-- ══════════════════════════════════════════════════════════════
-- SECTION 4 — SESSION PARTICIPANTS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_participants (
  session_id     UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'player',  -- gm | player | observer
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS session_participants_wallet_idx ON session_participants(wallet_address);

ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_participants_select_open" ON session_participants FOR SELECT USING (true);
CREATE POLICY "session_participants_write_own"   ON session_participants
  FOR ALL USING (wallet_address = current_wallet());


-- ══════════════════════════════════════════════════════════════
-- SECTION 5 — CHARACTERS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS characters (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address      TEXT        NOT NULL,
  name                TEXT        NOT NULL,
  level               INT         NOT NULL DEFAULT 1,
  race                TEXT,
  main_job            TEXT,
  subclass            TEXT,
  background          TEXT,
  alignment           TEXT,
  proficiency         INT         NOT NULL DEFAULT 2,

  -- Core ability scores (stored as jsonb: {str, dex, con, int, wis, cha})
  abilities           JSONB       NOT NULL DEFAULT '{}',
  saving_throw_profs  TEXT[]      NOT NULL DEFAULT '{}',
  skill_proficiencies JSONB       NOT NULL DEFAULT '{}',
  passive_perception  INT,

  -- Hit points
  hp                  INT,
  hit_points_current  INT,
  hit_points_max      INT,

  -- Movement & senses (see also add_fog_of_war migration)
  speed               INT         NOT NULL DEFAULT 30,
  vision              INT         NOT NULL DEFAULT 30,
  speed_ft            INT,
  vision_ft           INT,
  darkvision_ft       INT         NOT NULL DEFAULT 0,

  -- Armor Class
  ac                  INT         NOT NULL DEFAULT 10,

  -- Equipment
  main_weapon_key     TEXT,
  armor_key           TEXT,
  equipment_pack      TEXT,
  equipment_items     TEXT[],
  inventory_items     JSONB       NOT NULL DEFAULT '[]',

  -- Spells
  spells_known        TEXT[]      NOT NULL DEFAULT '{}',
  spells_prepared     TEXT[]      NOT NULL DEFAULT '{}',

  -- NFT link
  nft_contract        TEXT,
  nft_token_id        TEXT,
  avatar_url          TEXT,

  -- Languages & proficiencies
  languages           TEXT[]      NOT NULL DEFAULT '{}',
  tool_proficiencies  TEXT[]      NOT NULL DEFAULT '{}',
  feats               TEXT[]      NOT NULL DEFAULT '{}',

  -- CAYA / XP progression (also in add_xp_leveling_system migration — IF NOT EXISTS is safe)
  is_caya             BOOLEAN     NOT NULL DEFAULT false,
  experience_points   INT         NOT NULL DEFAULT 0,

  -- Personality
  personality_traits  TEXT,
  ideals              TEXT,
  bonds               TEXT,
  flaws               TEXT,
  notes               TEXT,

  -- Runtime action/condition state
  -- { sneak_used_turn, active_conditions, action_surge_used, second_wind_used, ... }
  action_state        JSONB       NOT NULL DEFAULT '{}',

  -- Visibility
  visibility          TEXT        NOT NULL DEFAULT 'private',  -- private | public

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS characters_wallet_address_idx ON characters(wallet_address);
CREATE INDEX IF NOT EXISTS characters_is_caya_idx        ON characters(is_caya) WHERE is_caya = true;

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Owner can do anything; anyone can see public characters.
CREATE POLICY "characters_select_own"    ON characters FOR SELECT
  USING (wallet_address = current_wallet() OR visibility = 'public');
CREATE POLICY "characters_insert_own"    ON characters FOR INSERT
  WITH CHECK (wallet_address = current_wallet());
CREATE POLICY "characters_update_own"    ON characters FOR UPDATE
  USING (wallet_address = current_wallet());
CREATE POLICY "characters_delete_own"    ON characters FOR DELETE
  USING (wallet_address = current_wallet());

CREATE TRIGGER characters_updated_at
  BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ══════════════════════════════════════════════════════════════
-- SECTION 6 — SESSION ↔ CHARACTER JUNCTION
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_characters (
  session_id     UUID NOT NULL REFERENCES sessions(id)    ON DELETE CASCADE,
  character_id   UUID NOT NULL REFERENCES characters(id)  ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, character_id)
);

CREATE INDEX IF NOT EXISTS session_characters_wallet_idx ON session_characters(wallet_address);

ALTER TABLE session_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_characters_select_open" ON session_characters FOR SELECT USING (true);
CREATE POLICY "session_characters_write_own"   ON session_characters
  FOR ALL USING (wallet_address = current_wallet());


-- ══════════════════════════════════════════════════════════════
-- SECTION 7 — CHARACTER CREATION DRAFTS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS character_drafts (
  wallet_address TEXT        PRIMARY KEY,
  draft_data     JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE character_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "character_drafts_own" ON character_drafts
  FOR ALL USING (wallet_address = current_wallet());

CREATE TRIGGER character_drafts_updated_at
  BEFORE UPDATE ON character_drafts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();


-- ══════════════════════════════════════════════════════════════
-- SECTION 8 — MAPS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS maps (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id  UUID        REFERENCES sessions(id)  ON DELETE SET NULL,
  name        TEXT        NOT NULL DEFAULT 'Unnamed Map',
  type        TEXT        NOT NULL DEFAULT 'upload',  -- upload | builder
  image_url   TEXT,
  tile_data   JSONB,      -- { cols, rows, tiles: [{x,y,color},...] }
  grid_size   INT         NOT NULL DEFAULT 50,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS maps_campaign_id_idx ON maps(campaign_id);
CREATE INDEX IF NOT EXISTS maps_session_id_idx  ON maps(session_id);

ALTER TABLE maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maps_select_open" ON maps FOR SELECT USING (true);
CREATE POLICY "maps_write_gm"    ON maps FOR ALL USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = maps.session_id AND s.gm_wallet = current_wallet()
  )
  OR
  EXISTS (
    SELECT 1 FROM campaigns c
    WHERE c.id = maps.campaign_id AND c.gm_wallet = current_wallet()
  )
);

-- Now add the FK from sessions.current_map_id → maps.id
ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_current_map
    FOREIGN KEY (current_map_id) REFERENCES maps(id) ON DELETE SET NULL
  NOT VALID;  -- NOT VALID so it doesn't scan existing rows (table is new)


-- ══════════════════════════════════════════════════════════════
-- SECTION 9 — ENCOUNTERS & INITIATIVE
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS encounters (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL DEFAULT 'Encounter',
  active_entry_id TEXT,       -- FK added below after initiative_entries
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS encounters_session_id_idx ON encounters(session_id);

ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "encounters_open" ON encounters FOR ALL USING (true) WITH CHECK (true);

-- Initiative entries
CREATE TABLE IF NOT EXISTS initiative_entries (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  encounter_id  TEXT        NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  character_id  UUID        REFERENCES characters(id) ON DELETE SET NULL,
  token_id      UUID,       -- FK added after tokens table
  name          TEXT        NOT NULL,
  init          INT         NOT NULL DEFAULT 0,
  hp            INT,
  is_pc         BOOLEAN     NOT NULL DEFAULT false,
  wallet_address TEXT,
  death_saves   JSONB       NOT NULL DEFAULT '{"s":0,"f":0}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS initiative_entries_encounter_idx ON initiative_entries(encounter_id);

ALTER TABLE initiative_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "initiative_entries_open" ON initiative_entries FOR ALL USING (true) WITH CHECK (true);

-- Close the self-referential FK on encounters
ALTER TABLE encounters
  ADD CONSTRAINT fk_encounters_active_entry
    FOREIGN KEY (active_entry_id) REFERENCES initiative_entries(id) ON DELETE SET NULL
  NOT VALID;


-- ══════════════════════════════════════════════════════════════
-- SECTION 10 — TOKENS (map pieces)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id TEXT        NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  map_id       UUID        REFERENCES maps(id) ON DELETE SET NULL,
  label        TEXT        NOT NULL DEFAULT 'T',
  name         TEXT,
  x            INT         NOT NULL DEFAULT 0,
  y            INT         NOT NULL DEFAULT 0,
  color        TEXT,
  hp           INT,
  current_hp   INT,
  ac           INT,
  type         TEXT        NOT NULL DEFAULT 'pc',  -- pc | monster | object
  monster_id   TEXT,       -- SRD monster slug if type='monster'
  owner_wallet TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tokens_encounter_id_idx ON tokens(encounter_id);
CREATE INDEX IF NOT EXISTS tokens_map_id_idx       ON tokens(map_id);

ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tokens_open" ON tokens FOR ALL USING (true) WITH CHECK (true);

-- Now close the FK from initiative_entries → tokens
ALTER TABLE initiative_entries
  ADD CONSTRAINT fk_initiative_token
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE SET NULL
  NOT VALID;


-- ══════════════════════════════════════════════════════════════
-- SECTION 11 — FOG OF WAR
-- (Duplicated here with IF NOT EXISTS so add_fog_of_war.sql is a no-op)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fog_reveals (
  encounter_id TEXT        NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  viewer_wallet TEXT        NOT NULL,
  map_id        UUID        REFERENCES maps(id) ON DELETE CASCADE,
  tile_x        INT         NOT NULL,
  tile_y        INT         NOT NULL,
  CONSTRAINT fog_reveals_unique
    UNIQUE NULLS NOT DISTINCT (encounter_id, viewer_wallet, map_id, tile_x, tile_y)
);

CREATE INDEX IF NOT EXISTS fog_reveals_enc_viewer ON fog_reveals(encounter_id, viewer_wallet);

ALTER TABLE fog_reveals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fog_reveals_open" ON fog_reveals USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- SECTION 12 — MAP TRIGGERS (traps, events)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS map_triggers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  map_id      UUID        REFERENCES maps(id) ON DELETE CASCADE,
  tile_x      INT         NOT NULL,
  tile_y      INT         NOT NULL,
  name        TEXT        NOT NULL DEFAULT 'Trap',
  save_type   TEXT        NOT NULL DEFAULT 'DEX',  -- DEX|STR|CON|INT|WIS|CHA
  dc          INT         NOT NULL DEFAULT 15,
  description TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  is_hidden   BOOLEAN     NOT NULL DEFAULT true,   -- hidden from players until triggered
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS map_triggers_session_id_idx ON map_triggers(session_id);
CREATE INDEX IF NOT EXISTS map_triggers_tile_idx       ON map_triggers(session_id, tile_x, tile_y);

ALTER TABLE map_triggers ENABLE ROW LEVEL SECURITY;

-- GM sees all; players see only revealed (not hidden) triggers
CREATE POLICY "map_triggers_gm_all" ON map_triggers FOR ALL USING (
  EXISTS (SELECT 1 FROM sessions s WHERE s.id = map_triggers.session_id AND s.gm_wallet = current_wallet())
);
CREATE POLICY "map_triggers_player_select" ON map_triggers FOR SELECT USING (
  is_hidden = false AND is_active = true
);


-- ══════════════════════════════════════════════════════════════
-- SECTION 13 — DICE ROLLS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_rolls (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  character_id    UUID        REFERENCES characters(id) ON DELETE SET NULL,
  roller_name     TEXT,
  roller_wallet   TEXT,
  label           TEXT,
  formula         TEXT        NOT NULL,
  result_total    INT         NOT NULL,
  individual_dice JSONB,      -- [{ die: 'd20', value: 14 }, ...]
  roll_type       TEXT,       -- attack | skill | save | damage | coin_flip | custom
  target_token_id UUID,
  outcome         TEXT,       -- hit | miss | crit | crit_miss | null
  advantage       BOOLEAN     NOT NULL DEFAULT false,
  disadvantage    BOOLEAN     NOT NULL DEFAULT false,
  is_whispered    BOOLEAN     NOT NULL DEFAULT false,
  whisper_to      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_rolls_session_id_idx ON session_rolls(session_id);
CREATE INDEX IF NOT EXISTS session_rolls_created_at_idx ON session_rolls(created_at DESC);

ALTER TABLE session_rolls ENABLE ROW LEVEL SECURITY;

-- Players see public rolls for their session; whispered rolls visible only to sender + recipient
CREATE POLICY "session_rolls_select" ON session_rolls FOR SELECT USING (
  is_whispered = false
  OR roller_wallet = current_wallet()
  OR whisper_to    = current_wallet()
);
CREATE POLICY "session_rolls_insert" ON session_rolls FOR INSERT WITH CHECK (
  roller_wallet = current_wallet()
);


-- ══════════════════════════════════════════════════════════════
-- SECTION 14 — SESSION CHAT
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_wallet    TEXT        NOT NULL,
  sender_name      TEXT        NOT NULL DEFAULT 'Adventurer',
  body             TEXT        NOT NULL,
  kind             TEXT        NOT NULL DEFAULT 'chat',  -- chat | system | whisper | roll_result
  whisper_to       TEXT,       -- target wallet for whisper messages
  metadata         JSONB,      -- structured data for roll_result cards
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_messages_session_id_idx ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS session_messages_created_at_idx ON session_messages(created_at DESC);

ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

-- Open chat; whispers visible only to sender + recipient (GM also sees all)
CREATE POLICY "session_messages_select" ON session_messages FOR SELECT USING (
  kind != 'whisper'
  OR sender_wallet = current_wallet()
  OR whisper_to    = current_wallet()
  OR EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_messages.session_id AND s.gm_wallet = current_wallet()
  )
);
CREATE POLICY "session_messages_insert" ON session_messages FOR INSERT WITH CHECK (
  sender_wallet = current_wallet()
);


-- ══════════════════════════════════════════════════════════════
-- SECTION 15 — HANDOUTS
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_handouts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  uploader_wallet TEXT       NOT NULL,
  title          TEXT        NOT NULL,
  content        TEXT        NOT NULL,
  content_type   TEXT        NOT NULL DEFAULT 'text',  -- text | image | url
  revealed       BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_handouts_session_id_idx ON session_handouts(session_id);

ALTER TABLE session_handouts ENABLE ROW LEVEL SECURITY;

-- GM sees all; players see only revealed handouts
CREATE POLICY "session_handouts_gm_all" ON session_handouts FOR ALL USING (
  EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_handouts.session_id AND s.gm_wallet = current_wallet())
);
CREATE POLICY "session_handouts_player_select" ON session_handouts FOR SELECT USING (
  revealed = true
);


-- ══════════════════════════════════════════════════════════════
-- SECTION 16 — RECORDINGS
-- (Base + podcast columns; add_recording_podcast.sql is a no-op)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS session_recordings (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id                  UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  room_name                   TEXT        NOT NULL,
  egress_id                   TEXT,
  status                      TEXT        NOT NULL DEFAULT 'recording',  -- recording | stopped | failed
  file_key                    TEXT,
  file_url                    TEXT,
  started_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at                  TIMESTAMPTZ,
  duration_sec                INT,
  -- Podcast pipeline columns (from add_recording_podcast migration)
  composite_transcript        TEXT,
  composite_transcript_status TEXT        NOT NULL DEFAULT 'none',  -- none|pending|done|failed
  master_script               TEXT,
  master_script_status        TEXT        NOT NULL DEFAULT 'none',
  published                   BOOLEAN     NOT NULL DEFAULT false,
  episode_number              INT,
  episode_title               TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_recordings_session_id_idx ON session_recordings(session_id);
CREATE INDEX IF NOT EXISTS session_recordings_published_idx  ON session_recordings(published) WHERE published = true;

ALTER TABLE session_recordings ENABLE ROW LEVEL SECURITY;

-- GM and participants can see recordings; only GM can create/delete
CREATE POLICY "session_recordings_gm_all" ON session_recordings FOR ALL USING (
  EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_recordings.session_id AND s.gm_wallet = current_wallet())
);
CREATE POLICY "session_recordings_participant_select" ON session_recordings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.session_id = session_recordings.session_id AND sp.wallet_address = current_wallet()
  )
);


CREATE TABLE IF NOT EXISTS recording_tracks (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id         UUID        NOT NULL REFERENCES session_recordings(id) ON DELETE CASCADE,
  session_id           UUID        NOT NULL,
  participant_identity TEXT        NOT NULL,
  egress_id            TEXT,
  file_key             TEXT,
  file_url             TEXT,
  transcript           TEXT,
  transcript_status    TEXT        NOT NULL DEFAULT 'none',  -- none|pending|done|failed
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recording_tracks_recording_id_idx ON recording_tracks(recording_id);
CREATE INDEX IF NOT EXISTS recording_tracks_egress_id_idx    ON recording_tracks(egress_id) WHERE egress_id IS NOT NULL;

ALTER TABLE recording_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recording_tracks_open" ON recording_tracks FOR ALL USING (true) WITH CHECK (true);


CREATE TABLE IF NOT EXISTS recording_markers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID        NOT NULL REFERENCES session_recordings(id) ON DELETE CASCADE,
  session_id   UUID        NOT NULL,
  label        TEXT        NOT NULL,
  offset_sec   INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recording_markers_recording_id_idx ON recording_markers(recording_id);

ALTER TABLE recording_markers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recording_markers_open" ON recording_markers FOR ALL USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════
-- SECTION 17 — SPONSORED MONSTERS (shop feature)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sponsored_monsters (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sponsor_wallet      TEXT        NOT NULL,
  monster_name        TEXT,
  monster_description TEXT,
  payment_tx_hash     TEXT,
  payment_amount      NUMERIC     NOT NULL DEFAULT 0,
  status              TEXT        NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  gm_notes            TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sponsored_monsters_session_id_idx ON sponsored_monsters(session_id);
CREATE INDEX IF NOT EXISTS sponsored_monsters_status_idx     ON sponsored_monsters(status);

ALTER TABLE sponsored_monsters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sponsored_monsters_gm_all" ON sponsored_monsters FOR ALL USING (
  EXISTS (SELECT 1 FROM sessions s WHERE s.id = sponsored_monsters.session_id AND s.gm_wallet = current_wallet())
);
CREATE POLICY "sponsored_monsters_own_select" ON sponsored_monsters FOR SELECT USING (
  sponsor_wallet = current_wallet()
);
CREATE POLICY "sponsored_monsters_own_insert" ON sponsored_monsters FOR INSERT WITH CHECK (
  sponsor_wallet = current_wallet()
);


-- ══════════════════════════════════════════════════════════════
-- SECTION 18 — HOMEBREW CONTENT
-- (IF NOT EXISTS so add_homebrew_tables.sql is a no-op)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS homebrew_weapons (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  category       TEXT,
  weapon_group   TEXT,
  damage_dice    TEXT,
  damage_type    TEXT,
  properties     TEXT[],
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE homebrew_weapons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_weapons_open" ON homebrew_weapons FOR SELECT USING (true);
CREATE POLICY "homebrew_weapons_own"  ON homebrew_weapons FOR ALL   USING (creator_wallet = current_wallet());


CREATE TABLE IF NOT EXISTS homebrew_armor (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet      TEXT        NOT NULL,
  name                TEXT        NOT NULL,
  category            TEXT,
  base_ac             INT,
  dex_cap             INT,
  str_requirement     INT,
  stealth_disadvantage BOOLEAN    DEFAULT false,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE homebrew_armor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_armor_open" ON homebrew_armor FOR SELECT USING (true);
CREATE POLICY "homebrew_armor_own"  ON homebrew_armor FOR ALL   USING (creator_wallet = current_wallet());


CREATE TABLE IF NOT EXISTS homebrew_items (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  category       TEXT,
  rarity         TEXT,
  description    TEXT,
  weight         NUMERIC,
  cost_gp        TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE homebrew_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_items_open" ON homebrew_items FOR SELECT USING (true);
CREATE POLICY "homebrew_items_own"  ON homebrew_items FOR ALL   USING (creator_wallet = current_wallet());


CREATE TABLE IF NOT EXISTS homebrew_subclasses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet TEXT        NOT NULL,
  name           TEXT        NOT NULL,
  parent_class   TEXT        NOT NULL,
  subclass_type  TEXT,
  description    TEXT,
  features       JSONB,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE homebrew_subclasses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "homebrew_subclasses_open" ON homebrew_subclasses FOR SELECT USING (true);
CREATE POLICY "homebrew_subclasses_own"  ON homebrew_subclasses FOR ALL   USING (creator_wallet = current_wallet());


-- ══════════════════════════════════════════════════════════════
-- SECTION 19 — RPCs
-- ══════════════════════════════════════════════════════════════

-- move_my_token: thin updater called by MapBoardView
-- (also defined in add_fog_of_war.sql — CREATE OR REPLACE is safe)
CREATE OR REPLACE FUNCTION move_my_token(
  p_token_id UUID,
  p_x        INT,
  p_y        INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tokens
  SET x = p_x, y = p_y
  WHERE id = p_token_id;
END;
$$;

-- start_turns: called by GMStartTurnsButton to begin the combat round
CREATE OR REPLACE FUNCTION start_turns(p_encounter_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_first_entry TEXT;
BEGIN
  -- Pick the highest-initiative entry as the first active entry
  SELECT id INTO v_first_entry
  FROM initiative_entries
  WHERE encounter_id = p_encounter_id
  ORDER BY init DESC, created_at ASC
  LIMIT 1;

  UPDATE encounters
  SET active_entry_id = v_first_entry
  WHERE id = p_encounter_id;
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- SECTION 20 — REALTIME SUBSCRIPTIONS
-- ══════════════════════════════════════════════════════════════

-- Enable Supabase Realtime on tables that need cross-client push:
ALTER PUBLICATION supabase_realtime ADD TABLE tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE encounters;
ALTER PUBLICATION supabase_realtime ADD TABLE initiative_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE session_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE session_rolls;
ALTER PUBLICATION supabase_realtime ADD TABLE fog_reveals;
ALTER PUBLICATION supabase_realtime ADD TABLE map_triggers;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE session_recordings;
