-- ============================================================
-- Migration 058 — record on-chain mints of map edition NFTs
-- ------------------------------------------------------------
-- Map NFTs are now real ERC-721 tokens on the DND721Maps contract
-- (contracts/DND721Maps.sol). The creator's own mint is tracked on the
-- maps table (mint_* columns from 046); each BUYER's edition mint is
-- tracked here so the numbered edition maps 1:1 to a token id.
-- ============================================================

ALTER TABLE map_editions
  ADD COLUMN IF NOT EXISTS token_id TEXT,
  ADD COLUMN IF NOT EXISTS mint_tx  TEXT UNIQUE;
