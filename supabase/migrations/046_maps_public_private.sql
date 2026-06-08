-- 046_maps_public_private.sql
-- Promotes the `maps` table to a platform-wide library with per-map privacy and
-- the schema needed to mint private maps as NFTs in a follow-up wave.

-- 1. New columns -------------------------------------------------------------
ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS owner_wallet           TEXT,
  ADD COLUMN IF NOT EXISTS visibility             TEXT       NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'private')),
  -- NFT mint-tracking columns (populated by the future /api/maps/mint route).
  ADD COLUMN IF NOT EXISTS mint_status            TEXT       NOT NULL DEFAULT 'unminted'
    CHECK (mint_status IN ('unminted', 'pending', 'minted')),
  ADD COLUMN IF NOT EXISTS mint_token_id          TEXT,
  ADD COLUMN IF NOT EXISTS mint_tx_hash           TEXT       UNIQUE,
  ADD COLUMN IF NOT EXISTS mint_contract_address  TEXT,
  ADD COLUMN IF NOT EXISTS mint_chain             TEXT       NOT NULL DEFAULT 'base',
  ADD COLUMN IF NOT EXISTS minted_at              TIMESTAMPTZ;

-- 2. Backfill owner_wallet from each map's owning session/campaign so the
-- platform library can attribute previously-uploaded maps to a GM.
UPDATE maps m
   SET owner_wallet = s.gm_wallet
  FROM sessions s
 WHERE m.session_id = s.id
   AND m.owner_wallet IS NULL;

UPDATE maps m
   SET owner_wallet = c.gm_wallet
  FROM campaigns c
 WHERE m.campaign_id = c.id
   AND m.owner_wallet IS NULL;

CREATE INDEX IF NOT EXISTS maps_owner_wallet_idx ON maps(owner_wallet);
CREATE INDEX IF NOT EXISTS maps_visibility_idx   ON maps(visibility);

-- 3. RLS — open the library to all (public) + the GM's own private maps.
DROP POLICY IF EXISTS "maps_select_open" ON maps;
CREATE POLICY "maps_select_library" ON maps FOR SELECT USING (
  visibility = 'public'
  OR lower(owner_wallet) = current_wallet()
);
-- Writes remain GM-of-owning-session/campaign (unchanged from 002).
