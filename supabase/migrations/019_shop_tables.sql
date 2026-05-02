-- Migration 019: daily rotating shop tables
--
-- shop_inventory: one active row per day, each tier is a JSONB array of ShopItem objects.
-- shop_purchases: one row per completed purchase (free claim or paid tx).

CREATE TABLE IF NOT EXISTS shop_inventory (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  list_a       JSONB       NOT NULL DEFAULT '[]',
  list_b       JSONB       NOT NULL DEFAULT '[]',
  list_c       JSONB       NOT NULL DEFAULT '[]',
  list_d       JSONB       NOT NULL DEFAULT '[]',
  list_e       JSONB       NOT NULL DEFAULT '[]',
  is_active    BOOLEAN     NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS shop_inventory_active_idx ON shop_inventory(is_active)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS shop_purchases (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT        NOT NULL,
  item_id        TEXT        NOT NULL,
  item_name      TEXT        NOT NULL,
  tier           TEXT        NOT NULL,  -- A | B | C | D | E
  price_usd      NUMERIC(10,4),         -- null for free tiers
  price_tokens   NUMERIC(20,8),         -- null for free tiers
  tx_hash        TEXT,                  -- null for free claims
  session_id     UUID        REFERENCES sessions(id) ON DELETE SET NULL,
  inventory_id   UUID        REFERENCES shop_inventory(id) ON DELETE SET NULL,
  character_id   UUID        REFERENCES characters(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_purchases_wallet_idx      ON shop_purchases(wallet_address);
CREATE INDEX IF NOT EXISTS shop_purchases_wallet_day_idx  ON shop_purchases(wallet_address, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_purchases_tx_hash_idx     ON shop_purchases(tx_hash) WHERE tx_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS shop_purchases_tx_unique ON shop_purchases(tx_hash) WHERE tx_hash IS NOT NULL;

ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_purchases_own_select" ON shop_purchases FOR SELECT
  USING (wallet_address = lower(
    nullif(current_setting('request.headers', true)::json->>'x-wallet-address', '')
  ));
