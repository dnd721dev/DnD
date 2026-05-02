# Shop Feature — Summary

---

## 1. How the daily inventory generation works

The shop rotates items every calendar day at midnight UTC. Generation uses a
**date-based seeded RNG** (`dateSeed = "2026-05-02"`) fed into a FNV-1a hash, which
drives a Fisher-Yates shuffle of each tier's item pool:

| Tier | Items shown | Selection rule |
|---|---|---|
| A | 1 | One random item from the Tier A pool |
| B | 1 | One random item from the Tier B pool |
| C | 3 | All `always: true` items, plus enough rotators to reach 3 total |
| D | 3 | All `always: true` items, plus enough rotators to reach 3 total |
| E | 2 | Two random items from the Tier E pool |

The same UTC date always produces the same items — server and client agree without
any coordination.

**Storage:** the inventory is saved as a `shop_inventory` DB row with `is_active = true`
by the cron job (or on-demand by the first request that day). Each row contains JSONB
arrays `list_a` through `list_e`.

**Source of truth:** `src/lib/shopData.ts` → `SHOP_POOL` array.
**Generation logic:** `src/lib/shopInventory.ts` → `generateDailyInventory()`.

---

## 2. How prices are calculated in real time

Items in Tiers C–E have a fixed `price_usd` (e.g. `$2.00`). The DND721 token
equivalent is calculated at purchase time:

```
tokenAmount = price_usd / dnd721PriceUsd   (rounded up to 6 decimal places)
```

The current DND721/USD price is fetched from the **DexScreener free API**:
```
GET https://api.dexscreener.com/latest/dex/tokens/0x85878508D21db40D53Aa38571022e6673dabe317
```
The route (`/api/shop/price`) selects the pair with the highest USD liquidity and
caches the result for 60 seconds. If DexScreener is unreachable, the last cached
price is returned with `stale: true`. If no cached price exists, the shop displays
"price loading…" and disables purchase buttons.

**The buyer always pays slightly more than the USD equivalent** (ceiling division
ensures we don't under-collect due to floating point).

**Source:** `src/lib/shopPricing.ts` → `usdToDnd721Tokens()`, `usdToDnd721Wei()`.

---

## 3. How free claims are tracked per session

| Tier | Limit |
|---|---|
| A | Once per **session** (if `sessionId` provided) OR once per **calendar day** (if no session) |
| B | Once per **calendar day** always |

The `/api/shop/claim` endpoint:
1. Reads `x-wallet-address` header for the buyer's wallet.
2. For Tier A with a session: queries `shop_purchases` for any Tier A purchase with
   the same `(wallet_address, session_id)` pair.
3. For Tier A without a session (or any Tier B): queries for any purchase since
   midnight UTC today (`created_at >= 'YYYY-MM-DDT00:00:00Z'`).
4. If a duplicate is found → returns 409 "Already claimed".

Session context is detected automatically on the shop page by querying
`session_participants` for the wallet, and shown as a "🎲 You are in: …" banner.

---

## 4. How on-chain purchases are verified server-side

The `/api/shop/verify-purchase` endpoint:

1. **Reads** the `x-wallet-address` header (required).
2. **Idempotency check**: rejects if `tx_hash` already in `shop_purchases`.
3. **Inventory check**: confirms the item is in today's active inventory.
4. **Character check**: confirms `character_id` belongs to the wallet.
5. **On-chain verification** via viem `createPublicClient` on Base:
   - Fetches the transaction receipt.
   - Checks `receipt.status === 'success'`.
   - Checks block timestamp is within the last **15 minutes** (anti-replay).
   - Finds a `Transfer(from, to, value)` event from the DND721 contract address
     where `to == TREASURY` (case-insensitive).
   - Confirms `value >= 95%` of the expected wei amount (5% tolerance for price
     fluctuation between wallet signing and server verification).
6. On success: inserts `shop_purchases` row and appends item to character inventory.

**RPC endpoint:** `NEXT_PUBLIC_BASE_RPC_URL` (defaults to `https://mainnet.base.org`).

---

## 5. How items reach the character inventory

Both the claim and verify-purchase routes call:
```typescript
addItemToCharacterInventory(characterId, item)  // src/lib/shopInventory.ts
```

This function:
1. Fetches the character's current `inventory_items` JSONB array.
2. Maps the `ShopItem` to an `InventoryItem` (`{ key, name, qty: 1, kind }`).
3. If the same `key` already exists, increments `qty` rather than duplicating.
4. Writes back via `supabaseAdmin()` (service role, bypasses RLS).

Because the `characters` table is in the Supabase realtime publication, the
character sheet's `InventoryPanel` receives the update live without a page reload.

**Character selection:** the player selects which character receives the item using
a dropdown at the top of the shop UI, populated from their characters via
`supabase.from('characters').select(...)`.

---

## 6. How to manually trigger a shop refresh

**Via the API (with the cron secret):**
```bash
curl -X POST https://<your-domain>/api/shop/refresh \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Via Supabase SQL (if you want to force a specific inventory):**
```sql
-- Expire current active inventory
UPDATE shop_inventory SET is_active = false WHERE is_active = true;

-- The next request to /api/shop/inventory will auto-generate a new one,
-- or run the cron endpoint manually as above.
```

**In development:** the shop auto-generates an inventory on the first request if
none exists. You can delete the `shop_inventory` rows and reload the shop page to
trigger regeneration.
