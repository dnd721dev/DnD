-- ============================================================
-- Migration 057 — Marketplace v2: sell/rent the NFT itself
-- ------------------------------------------------------------
-- Replaces the inventory-item listings with DND721 NFT listings:
--   • kind='nft'      — sell an owned DND721 NFT for DND721 tokens or ETH.
--     Settlement is two-step: buyer pays the seller (verified), the listing
--     becomes 'awaiting_transfer', then the seller transfers the ERC-721 to
--     the buyer and the transfer tx is verified to close the sale.
--   • kind='nft_rent' — rent an NFT out: the renter can BUILD a character
--     with that NFT (it appears in their character-creation NFT picker)
--     until the rental ends; at expiry the character's NFT link is released.
-- ============================================================

-- Listings: NFT reference + two-step settlement fields
ALTER TABLE market_listings
  ADD COLUMN IF NOT EXISTS nft_contract TEXT,
  ADD COLUMN IF NOT EXISTS nft_token_id TEXT,
  ADD COLUMN IF NOT EXISTS nft_name     TEXT,
  ADD COLUMN IF NOT EXISTS nft_image    TEXT,
  ADD COLUMN IF NOT EXISTS buyer_wallet TEXT,
  ADD COLUMN IF NOT EXISTS transfer_tx  TEXT UNIQUE;

-- Widen kind + status checks (keep legacy kinds so old rows stay valid)
ALTER TABLE market_listings DROP CONSTRAINT IF EXISTS market_listings_kind_check;
ALTER TABLE market_listings ADD CONSTRAINT market_listings_kind_check
  CHECK (kind IN ('item', 'character_rent', 'map', 'nft', 'nft_rent'));

ALTER TABLE market_listings DROP CONSTRAINT IF EXISTS market_listings_status_check;
ALTER TABLE market_listings ADD CONSTRAINT market_listings_status_check
  CHECK (status IN ('active', 'awaiting_transfer', 'sold', 'cancelled'));

-- Rentals: NFT rentals have no character row at rent time
ALTER TABLE market_rentals
  ADD COLUMN IF NOT EXISTS nft_contract TEXT,
  ADD COLUMN IF NOT EXISTS nft_token_id TEXT;
ALTER TABLE market_rentals ALTER COLUMN character_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS market_rentals_nft_idx
  ON market_rentals(renter_wallet, nft_contract, nft_token_id);
