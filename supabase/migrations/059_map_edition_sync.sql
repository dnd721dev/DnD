-- ============================================================
-- Migration 059 — map edition access follows the NFT
-- ------------------------------------------------------------
-- Once an edition is minted as a DND721Maps token, platform access must
-- track the token's CURRENT on-chain holder: selling the NFT (here or on
-- OpenSea) moves the edition's owner_wallet to the buyer and revokes the
-- seller — the edition count (rarity) stays intact, it just changes hands.
-- `synced_at` throttles the on-chain ownerOf() reconciliation sweeps.
-- ============================================================

ALTER TABLE map_editions
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS map_editions_minted_idx
  ON map_editions(synced_at) WHERE token_id IS NOT NULL;
