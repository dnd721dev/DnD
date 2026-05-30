-- Shop Gift System
-- Allows community members / players to gift C/D/E tier items to other players
-- outside of an active campaign. Gifts are pending until the recipient accepts.
--
-- Gift permanence differs from purchases:
--   C/D gifts → session-use (auto_remove_on_session_end = true)
--   E gifts   → permanent   (auto_remove_on_session_end = false)

CREATE TABLE IF NOT EXISTS shop_gifts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Gifter info
  gifter_wallet     TEXT        NOT NULL,
  tx_hash           TEXT        NOT NULL,  -- on-chain transfer proof (C/D/E require payment)

  -- Item
  item_id           TEXT        NOT NULL,
  item_name         TEXT        NOT NULL,
  tier              TEXT        NOT NULL CHECK (tier IN ('C', 'D', 'E')),
  price_usd         NUMERIC(10, 4),
  price_tokens      NUMERIC(20, 8),

  -- Recipient (character resolved at accept-time)
  recipient_wallet  TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'accepted', 'declined')),
  recipient_char_id UUID        REFERENCES characters(id) ON DELETE SET NULL,

  -- Source inventory snapshot
  inventory_id      UUID        REFERENCES shop_inventory(id) ON DELETE SET NULL,

  -- Timestamps
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at       TIMESTAMPTZ,
  -- Pending gifts auto-expire after 30 days; set at insert time by the API route
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Fast lookup: pending gifts for a given recipient
CREATE INDEX IF NOT EXISTS shop_gifts_recipient_pending_idx
  ON shop_gifts(recipient_wallet)
  WHERE status = 'pending';

-- Fast lookup: gifts sent by a given wallet
CREATE INDEX IF NOT EXISTS shop_gifts_gifter_idx
  ON shop_gifts(gifter_wallet);

-- Idempotency: each on-chain tx can only fund one gift
CREATE UNIQUE INDEX IF NOT EXISTS shop_gifts_tx_unique
  ON shop_gifts(tx_hash);

-- RLS
ALTER TABLE shop_gifts ENABLE ROW LEVEL SECURITY;

-- Gifters can see gifts they sent
CREATE POLICY "shop_gifts_gifter_select" ON shop_gifts FOR SELECT
  USING (
    gifter_wallet = lower(
      nullif(current_setting('request.headers', true)::json->>'x-wallet-address', '')
    )
  );

-- Recipients can see gifts addressed to them
CREATE POLICY "shop_gifts_recipient_select" ON shop_gifts FOR SELECT
  USING (
    recipient_wallet = lower(
      nullif(current_setting('request.headers', true)::json->>'x-wallet-address', '')
    )
  );

-- Inserts and updates go through supabaseAdmin (service role) — no player insert policy needed.

-- Enable realtime so the gift inbox badge updates instantly when a gift arrives
ALTER PUBLICATION supabase_realtime ADD TABLE shop_gifts;
