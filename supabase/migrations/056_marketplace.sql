-- ============================================================
-- Migration 056 — DND721 Marketplace
-- ------------------------------------------------------------
-- P2P marketplace where players:
--   • SELL owned NFT-class assets (tier-E shop items held in a character's
--     inventory, and private map NFTs) for DND721 or ETH.
--   • RENT OUT characters for DND721: the owner sets a per-day price and a
--     maximum rental length; at the end of a rental the renter may submit a
--     bid to RE-RENT or BUY the character, which the owner accepts/declines.
--   • Map NFTs: when an owner privates a map they choose its RARITY — the
--     edition size (1 = a true 1:1, 2000 = 1-of-2000, etc.). Each sale
--     allocates one numbered edition; owning ANY edition grants the right to
--     use the map in campaigns/sessions.
--
-- Payments settle wallet-to-wallet on Base (DND721 ERC-20 transfer or native
-- ETH). The server verifies the tx on-chain (same pattern as the shop) and
-- then applies the DB-side effects. All writes go through service-role API
-- routes; RLS keeps tables read-only for clients.
-- ============================================================

-- ── Listings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_listings (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           TEXT        NOT NULL CHECK (kind IN ('item', 'character_rent', 'map')),
  seller_wallet  TEXT        NOT NULL,

  -- item listings: an item held in one of the seller's characters' inventories
  item_key       TEXT,
  item_name      TEXT,
  source_character_id UUID   REFERENCES characters(id) ON DELETE SET NULL,

  -- character rental listings
  character_id   UUID        REFERENCES characters(id) ON DELETE CASCADE,
  rent_per_day   NUMERIC,          -- DND721 tokens per day
  rent_max_days  INT,

  -- map listings
  map_id         UUID        REFERENCES maps(id) ON DELETE CASCADE,
  map_rarity     INT,              -- edition size: 1 → 1:1, 2000 → 1:2000
  editions_sold  INT         NOT NULL DEFAULT 0,

  -- pricing (sales; rentals price via rent_per_day)
  currency       TEXT        NOT NULL DEFAULT 'dnd721' CHECK (currency IN ('dnd721', 'eth')),
  price_tokens   NUMERIC,          -- DND721 whole tokens (currency='dnd721')
  price_eth      NUMERIC,          -- ETH (currency='eth')

  status         TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sold', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_listings_kind_status_idx ON market_listings(kind, status);
CREATE INDEX IF NOT EXISTS market_listings_seller_idx      ON market_listings(seller_wallet);

-- ── Rentals ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_rentals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     UUID        NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  character_id   UUID        NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  owner_wallet   TEXT        NOT NULL,
  renter_wallet  TEXT        NOT NULL,
  per_day        NUMERIC     NOT NULL,
  days           INT         NOT NULL,
  total_tokens   NUMERIC     NOT NULL,
  tx_hash        TEXT        UNIQUE,
  starts_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at        TIMESTAMPTZ NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_rentals_renter_idx  ON market_rentals(renter_wallet, status);
CREATE INDEX IF NOT EXISTS market_rentals_listing_idx ON market_rentals(listing_id);

-- ── End-of-rental bids (re-rent or buy) ──────────────────────
CREATE TABLE IF NOT EXISTS market_bids (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     UUID        NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  rental_id      UUID        REFERENCES market_rentals(id) ON DELETE SET NULL,
  bidder_wallet  TEXT        NOT NULL,
  kind           TEXT        NOT NULL CHECK (kind IN ('re_rent', 'buy')),
  -- re_rent: amount = tokens/day offer, days = length. buy: amount = total offer.
  amount         NUMERIC     NOT NULL,
  days           INT,
  message        TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_bids_listing_idx ON market_bids(listing_id, status);

-- ── Map editions (numbered ownership) ────────────────────────
CREATE TABLE IF NOT EXISTS map_editions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id         UUID        NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
  listing_id     UUID        REFERENCES market_listings(id) ON DELETE SET NULL,
  owner_wallet   TEXT        NOT NULL,
  edition_no     INT         NOT NULL,
  edition_size   INT         NOT NULL,
  tx_hash        TEXT        UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (map_id, edition_no)
);

CREATE INDEX IF NOT EXISTS map_editions_owner_idx ON map_editions(owner_wallet);
CREATE INDEX IF NOT EXISTS map_editions_map_idx   ON map_editions(map_id);

-- ── Character rental columns ─────────────────────────────────
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS rented_to_wallet TEXT,
  ADD COLUMN IF NOT EXISTS rental_ends_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS characters_rented_to_idx ON characters(rented_to_wallet);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_rentals  ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_bids     ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_editions    ENABLE ROW LEVEL SECURITY;

-- Read-open; all writes flow through service-role API routes.
CREATE POLICY "market_listings_select" ON market_listings FOR SELECT USING (true);
CREATE POLICY "market_rentals_select"  ON market_rentals  FOR SELECT USING (true);
CREATE POLICY "market_bids_select"     ON market_bids     FOR SELECT USING (true);
CREATE POLICY "map_editions_select"    ON map_editions    FOR SELECT USING (true);

-- An active renter may play the character: extend owner-only writes to the
-- renter while the rental is live (action_state, HP, etc.).
DROP POLICY IF EXISTS "characters_update_own" ON characters;
CREATE POLICY "characters_update_own_or_renter" ON characters FOR UPDATE USING (
  lower(wallet_address) = current_wallet()
  OR (lower(coalesce(rented_to_wallet, '')) = current_wallet() AND rental_ends_at > now())
) WITH CHECK (
  lower(wallet_address) = current_wallet()
  OR (lower(coalesce(rented_to_wallet, '')) = current_wallet() AND rental_ends_at > now())
);

-- Renters can also read rented characters (if a prior policy restricted reads).
-- maps: owning ANY edition of a private map grants library access for
-- campaign use (extends the 046 policy).
DROP POLICY IF EXISTS "maps_select_library" ON maps;
CREATE POLICY "maps_select_library" ON maps FOR SELECT USING (
  visibility = 'public'
  OR lower(owner_wallet) = current_wallet()
  OR EXISTS (
    SELECT 1 FROM map_editions me
    WHERE me.map_id = maps.id
      AND lower(me.owner_wallet) = current_wallet()
  )
);
