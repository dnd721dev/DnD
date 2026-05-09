-- 026_homebrew_monsters.sql
--
-- Creates the homebrew_monsters table with a full D&D 5e stat block schema,
-- using creator_wallet (TEXT) to match the wallet-based auth used by all
-- other homebrew tables (homebrew_weapons, homebrew_armor, etc.).
--
-- Also adds homebrew_monster_id to the tokens table so MapBoard can
-- distinguish homebrew tokens from SRD tokens at runtime.

-- ── homebrew_monsters ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.homebrew_monsters (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_wallet          TEXT        NOT NULL,

  -- Basic info
  name                    TEXT        NOT NULL,
  cr                      TEXT        NOT NULL DEFAULT '0', -- stored as text: '0','1/8','1/4','1/2','1'...'30'
  xp                      INT,
  size                    TEXT,
  type                    TEXT,
  subtype                 TEXT,
  alignment               TEXT,

  -- Combat stats
  ac                      INT,
  hp                      INT,
  hit_dice                TEXT,
  speed                   TEXT,

  -- Ability scores
  str                     INT         NOT NULL DEFAULT 10,
  dex                     INT         NOT NULL DEFAULT 10,
  con                     INT         NOT NULL DEFAULT 10,
  int_score               INT         NOT NULL DEFAULT 10,
  wis                     INT         NOT NULL DEFAULT 10,
  cha                     INT         NOT NULL DEFAULT 10,

  -- Proficiencies & defenses (JSONB for flexibility)
  saving_throws           JSONB       NOT NULL DEFAULT '{}',  -- { str: true, dex: false, ... }
  skills                  JSONB       NOT NULL DEFAULT '[]',  -- [{ name, bonus }]
  damage_resistances      TEXT,
  damage_immunities       TEXT,
  damage_vulnerabilities  TEXT,
  condition_immunities    JSONB       NOT NULL DEFAULT '[]',  -- string[]

  -- Flavor
  senses                  TEXT,
  languages               TEXT,

  -- Stat block entries (JSONB arrays)
  traits                  JSONB       NOT NULL DEFAULT '[]',
  actions                 JSONB       NOT NULL DEFAULT '[]',
  bonus_actions           JSONB       NOT NULL DEFAULT '[]',
  reactions               JSONB       NOT NULL DEFAULT '[]',
  legendary_actions       JSONB       NOT NULL DEFAULT '[]',
  legendary_action_count  INT         NOT NULL DEFAULT 3,

  -- Presentation
  token_image_url         TEXT,
  description             TEXT,

  -- Metadata
  is_published            BOOLEAN     NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homebrew_monsters_creator_idx    ON homebrew_monsters(creator_wallet);
CREATE INDEX IF NOT EXISTS homebrew_monsters_name_idx       ON homebrew_monsters(name);
CREATE INDEX IF NOT EXISTS homebrew_monsters_published_idx  ON homebrew_monsters(is_published) WHERE is_published = true;

ALTER TABLE public.homebrew_monsters ENABLE ROW LEVEL SECURITY;

-- Drop policies before (re)creating so the migration is idempotent
DROP POLICY IF EXISTS "homebrew_monsters_select_published" ON homebrew_monsters;
DROP POLICY IF EXISTS "homebrew_monsters_insert_own"       ON homebrew_monsters;
DROP POLICY IF EXISTS "homebrew_monsters_update_own"       ON homebrew_monsters;
DROP POLICY IF EXISTS "homebrew_monsters_delete_own"       ON homebrew_monsters;

-- Anyone can read published monsters (or their own drafts)
CREATE POLICY "homebrew_monsters_select_published"
  ON homebrew_monsters FOR SELECT
  USING (is_published = true OR creator_wallet = lower(
    coalesce(current_setting('request.headers', true)::json->>'x-wallet-address', '')
  ));

-- Only the creator can insert
CREATE POLICY "homebrew_monsters_insert_own"
  ON homebrew_monsters FOR INSERT
  WITH CHECK (
    creator_wallet = lower(
      coalesce(current_setting('request.headers', true)::json->>'x-wallet-address', '')
    )
  );

-- Only the creator can update
CREATE POLICY "homebrew_monsters_update_own"
  ON homebrew_monsters FOR UPDATE
  USING (
    creator_wallet = lower(
      coalesce(current_setting('request.headers', true)::json->>'x-wallet-address', '')
    )
  );

-- Only the creator can delete
CREATE POLICY "homebrew_monsters_delete_own"
  ON homebrew_monsters FOR DELETE
  USING (
    creator_wallet = lower(
      coalesce(current_setting('request.headers', true)::json->>'x-wallet-address', '')
    )
  );

-- ── tokens — add homebrew_monster_id ──────────────────────────────────────────
-- Allows tokens to reference homebrew monsters separately from SRD monster slugs.
-- monster_id holds SRD slug (string); homebrew_monster_id holds homebrew UUID.

ALTER TABLE tokens
  ADD COLUMN IF NOT EXISTS homebrew_monster_id UUID REFERENCES homebrew_monsters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tokens_homebrew_monster_id_idx ON tokens(homebrew_monster_id);
