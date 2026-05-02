# Shop Feature — Implementation Plan

_Read all existing files before writing this. Do not start implementation until approved._

---

## Current State (what already exists)

| File | Status | Notes |
|---|---|---|
| `src/app/shop/page.tsx` | Exists — full rewrite needed | Basic 6-item shop, fixed items, no tiers, no USD pricing, no free claims, no daily rotation |
| `src/lib/shopData.ts` | Exists — full rewrite needed | 6-item `ShopItem[]` with old schema |
| `src/lib/dnd721Token.ts` | Exists — keep as-is | `DND721_TOKEN_ADDRESS`, `DND721_TOKEN_ABI`, `toTokenWei()` all correct |
| `src/lib/appkit.ts` | Exists — no change | wagmi + AppKit already configured for Base mainnet (chainId 8453) |
| `src/components/table/tableclient/components/TableTopBar.tsx` | Exists — add Shop button | |
| `src/components/table/PlayerSidebar.tsx` | Exists — no change | Shop button goes in TableTopBar, not sidebar |
| `src/components/character-sheet/InventoryPanel.tsx` | Exists — no change | Updates `characters.inventory_items` JSONB; shop will call the same DB column |
| `vercel.json` | Does not exist — create | Needed for cron schedule |
| Any `src/app/api/shop/*` | Does not exist — create all | |

**Key decisions from code review:**
- Treasury wallet address already uses `NEXT_PUBLIC_TREASURY_WALLET` env var pattern — will keep that for the "marketing wallet" rather than hardcoding the address in spec.
- `player_inventory` table already exists for the old shop — the **new** shop writes to `characters.inventory_items` JSONB (same table as the character sheet) so items appear in-sheet automatically. Old `player_inventory` remains for any legacy data but new purchases don't use it.
- wagmi's `useWriteContract` + `useWaitForTransactionReceipt` pattern is already established in both `/shop/page.tsx` and `/sponsor/page.tsx` — follow the same pattern exactly.
- `useSwitchChain` for network switching is from wagmi — import matches existing setup.

---

## Phase 1 — Database Migration

**New file:** `supabase/migrations/019_shop_tables.sql`

```sql
-- shop_inventory: one active row at a time, regenerated daily by cron
CREATE TABLE IF NOT EXISTS shop_inventory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  list_a       JSONB NOT NULL DEFAULT '[]',  -- 1 free item (session-scoped)
  list_b       JSONB NOT NULL DEFAULT '[]',  -- 1 free item (daily)
  list_c       JSONB NOT NULL DEFAULT '[]',  -- paid tier, ~3 items
  list_d       JSONB NOT NULL DEFAULT '[]',  -- paid tier, ~3 items
  list_e       JSONB NOT NULL DEFAULT '[]',  -- paid tier, ~2 items
  is_active    BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS shop_inventory_active_idx ON shop_inventory(is_active)
  WHERE is_active = true;

-- shop_purchases: one row per completed purchase (paid or free claim)
-- Used for "already bought today" indicators and server-side verification
CREATE TABLE IF NOT EXISTS shop_purchases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  TEXT NOT NULL,
  item_id         TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  tier            TEXT NOT NULL,                   -- A | B | C | D | E
  price_usd       NUMERIC(10,4),                   -- null for free tiers
  price_tokens    NUMERIC(20,8),                   -- null for free tiers
  tx_hash         TEXT,                            -- null for free claims
  session_id      UUID REFERENCES sessions(id) ON DELETE SET NULL,
  inventory_id    UUID,                            -- shop_inventory row used
  character_id    UUID REFERENCES characters(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_purchases_wallet_idx ON shop_purchases(wallet_address);
CREATE INDEX IF NOT EXISTS shop_purchases_wallet_item_idx ON shop_purchases(wallet_address, item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS shop_purchases_tx_hash_idx ON shop_purchases(tx_hash) WHERE tx_hash IS NOT NULL;

ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;
-- Players can only see their own purchases; inserts go through supabaseAdmin (verify-purchase endpoint)
CREATE POLICY "shop_purchases_own_select" ON shop_purchases FOR SELECT
  USING (wallet_address = lower(current_setting('request.headers', true)::json->>'x-wallet-address'));
```

---

## Phase 2 — Item Data (`src/lib/shopData.ts` — full rewrite)

**New `ShopItem` type:**
```typescript
export type ShopTier = 'A' | 'B' | 'C' | 'D' | 'E'

export type ShopItem = {
  id: string
  name: string
  tier: ShopTier
  desc: string
  /** DnDBeyond URL, or null if no reference page */
  url: string | null
  /** USD price — undefined/null for free tiers A and B */
  price_usd?: number
  /** If true: always in the daily rotation (never excluded), used for C/D special potions */
  always?: boolean
  /** Item category for inventory tagging */
  category: 'consumable' | 'gear' | 'magic-item' | 'cosmetic'
}
```

**Pool structure:**

| Tier | Count shown daily | Free? | Notes |
|---|---|---|---|
| A | 1 | Free, once per session | Rotates from A pool |
| B | 1 | Free, once per day | Rotates from B pool |
| C | 3 | Paid | `always: true` items always included; rest rotate |
| D | 3 | Paid | Same; `always: true` potions always in |
| E | 2 | Paid premium | Rotates from E pool |

**Item IDs must match the Python bot exactly.** The placeholder catalog below uses the IDs from the spec — update with the full list before approval:

```typescript
// Tier A — free per session (1 shown daily from this pool)
{ id: 'healing_potion',   tier: 'A', name: 'Healing Potion', price_usd: undefined, ... }

// Tier B — free per day (1 shown daily from this pool)
{ id: 'torch',            tier: 'B', name: 'Torch', ... }

// Tier C — paid, always items + rotators
{ id: 'gender_bender',    tier: 'C', name: 'Gender Bender Potion', price_usd: 2.00, always: true, ... }
// ... more C items

// Tier D — paid premium
// ... D items

// Tier E — paid high-end
// ... E items
```

**⚠️ ACTION NEEDED before Phase 2 implementation:** Provide the full item list from the Python bot (names, IDs, URLs, prices). I will populate the catalog exactly as provided.

---

## Phase 3 — API Routes

### `GET /api/shop/inventory`
- Returns the active `shop_inventory` row (or generates one on-the-fly if none exists)
- Returns: `{ inventory, expiresAt, refreshesIn }`

### `GET /api/shop/price`
- Fetches DND721/USD price from DexScreener free API:
  `https://api.dexscreener.com/latest/dex/tokens/0x85878508D21db40D53Aa38571022e6673dabe317`
- Caches result for 60 seconds (in-memory, keyed by Next.js route cache)
- Returns: `{ priceUsd: number, source: 'dexscreener' | 'fallback' }`
- Fallback: if DexScreener is down, returns last known price or a configured static fallback

### `POST /api/shop/claim`
- Body: `{ itemId, tier, sessionId? }`
- Auth: reads `x-wallet-address` header (existing RLS pattern)
- Validates: tier must be A or B; item must be in active inventory
- Checks daily/session limit:
  - Tier A: one per session (if sessionId) OR one per calendar day if no session
  - Tier B: one per calendar day
- Inserts into `shop_purchases`
- Adds item to `characters.inventory_items` JSONB for the player's active character (looks up character by wallet)
- Returns: `{ ok: true, item }` or error

### `POST /api/shop/verify-purchase`
- Body: `{ txHash, itemId, tier, sessionId? }`
- Auth: reads `x-wallet-address`
- Validates:
  1. `txHash` not already in `shop_purchases` (idempotency)
  2. Item is in active inventory
  3. Tier must be C, D, or E
- Verifies on-chain via Base RPC: calls `eth_getTransactionReceipt` on the tx, checks:
  - Transaction success (`status: 1`)
  - `to` address is `DND721_TOKEN_ADDRESS`
  - Decoded `transfer(to=TREASURY_WALLET, amount≥expected)` from logs
  - Block is recent (within 10 minutes, anti-replay)
- On success:
  - Inserts `shop_purchases` row
  - Appends item to `characters.inventory_items` for the player's linked character
- Returns: `{ ok: true, characterId }` or error

### `POST /api/shop/refresh`
- Called by Vercel Cron daily at midnight UTC
- Auth: checks `Authorization: Bearer ${CRON_SECRET}` header
- Expires current active inventory rows
- Generates new inventory using `generateDailyInventory()` from `src/lib/shopInventory.ts`
- Inserts new row into `shop_inventory`
- Returns: `{ ok: true }`

---

## Phase 4 — Pricing Utilities (`src/lib/shopPricing.ts` — new file)

```typescript
/** Convert a USD price to DND721 token units given the current token price in USD */
export function usdToDnd721Tokens(priceUsd: number, tokenPriceUsd: number): bigint

/** Format token amount for display: e.g. 12.45 DND721 */
export function formatTokenAmount(wei: bigint): string

/** Fetch current DND721/USD price (calls /api/shop/price) */
export async function fetchDnd721Price(): Promise<number>
```

---

## Phase 5 — Inventory Integration (`src/lib/shopInventory.ts` — new file)

```typescript
/** 
 * Deterministically select today's shop items from the pool.
 * Uses a date seed so the same day always shows the same items server-side.
 */
export function generateDailyInventory(pool: ShopItem[], seed?: string): DailyInventory

export type DailyInventory = {
  a: ShopItem[]   // 1 item
  b: ShopItem[]   // 1 item
  c: ShopItem[]   // 3 items (always items + rotators)
  d: ShopItem[]   // 3 items
  e: ShopItem[]   // 2 items
}
```

Also: `addItemToCharacterInventory(walletAddress, item)` helper used by both `/claim` and `/verify-purchase` routes:
- Looks up the player's primary character (most recently created/active)
- Appends to `characters.inventory_items` JSONB
- Notifies via Supabase realtime automatically (table already has realtime enabled)

---

## Phase 6 — Shop UI (`src/app/shop/page.tsx` — full rewrite + new `ShopModal` component)

**New component:** `src/components/shop/ShopModal.tsx`
- Wraps the shop UI in a modal overlay for table use
- Accepts optional `sessionId` prop
- Full-screen bottom sheet on mobile

**Rewritten `src/app/shop/page.tsx`:**
- Uses `ShopModal` as the standalone page or renders inline

**Purchase flow:**
1. Load active inventory from `/api/shop/inventory`
2. Load DND721 price from `/api/shop/price`
3. Load today's purchases for the wallet from `shop_purchases`
4. For each item: show name (link if URL), tier badge, USD + DND721 amount, buy/claim button, "claimed today" indicator
5. Claim (A/B): POST `/api/shop/claim`, show success toast
6. Buy (C/D/E):
   - Check wagmi chain — if not Base, show "Switch to Base" + `useSwitchChain`
   - `writeContract` → DND721 `transfer(TREASURY, amount)` on Base
   - State: Idle → Pending signature → Submitted → Confirming → Verified → Done
   - POST `/api/shop/verify-purchase` with tx hash
   - On success: show "✓ Item added to [character]'s inventory!"
7. Daily refresh countdown (`setInterval` every second, auto-refetch at 0)
8. Session indicator: "🎲 You are in: [Session Title] — Free items available"

**Mobile responsive:**
- Vertical stacks
- Buy buttons: full width, min 44px tall
- Bottom-sheet modal on mobile

---

## Phase 7 — Session Integration

**In `/api/shop/claim` and `/api/shop/verify-purchase`:**
- Optional `sessionId` in request body
- If `sessionId` provided: check `session_participants` to confirm wallet is in that session
- Tier A free claim: one per `session_id` (tracked in `shop_purchases`)

**In shop page/modal:**
- On mount: `supabase.from('session_participants').select('session_id, sessions(title)').eq('wallet_address', wallet).eq('sessions.status', 'active')` to find active session
- Show "🎲 You are in: [title]" banner if found
- Pass `sessionId` to all claim/purchase calls

---

## Phase 8 — Table Integration

**Modified:** `src/components/table/tableclient/components/TableTopBar.tsx`
- Add `showShop: boolean` + `onToggleShop: () => void` props
- Add `🏪 Shop` button in the top-right button row (after SRD button)

**Modified:** `src/app/sessions/[id]/table/TableClient.tsx`
- Add `showShop` state
- Pass props to `TableTopBar`
- Render `<ShopModal sessionId={sessionId} onClose={...} />` when `showShop` is true

**Purchase toast:**
- When `ShopModal` emits a purchase event: show a table toast "🏪 [Name] purchased [Item]!"
- Character inventory updates automatically via Supabase realtime (already subscribed on `characters` table)

---

## Phase 9 — Cron Refresh

**New file:** `vercel.json`
```json
{
  "crons": [
    { "path": "/api/shop/refresh", "schedule": "0 0 * * *" }
  ]
}
```

**New env vars to add to `.env.example`:**
```
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
CRON_SECRET=<generate a random secret>
NEXT_PUBLIC_TREASURY_WALLET=0x03477126328150f175f4e9919ebed7Ef9eFB91a3
```
(`NEXT_PUBLIC_TREASURY_WALLET` already exists in codebase; just confirming the address from the spec.)

---

## Complete File List

### Create (new files)
| File | Purpose |
|---|---|
| `supabase/migrations/019_shop_tables.sql` | DB schema |
| `src/lib/shopPricing.ts` | USD↔token conversion |
| `src/lib/shopInventory.ts` | Daily generation logic |
| `src/app/api/shop/inventory/route.ts` | GET active inventory |
| `src/app/api/shop/price/route.ts` | GET DND721 USD price |
| `src/app/api/shop/claim/route.ts` | POST free claim |
| `src/app/api/shop/verify-purchase/route.ts` | POST on-chain verification + inventory write |
| `src/app/api/shop/refresh/route.ts` | POST cron refresh |
| `src/components/shop/ShopModal.tsx` | Reusable shop UI (page + table modal) |
| `vercel.json` | Cron schedule |

### Rewrite (existing files replaced)
| File | Change |
|---|---|
| `src/lib/shopData.ts` | New `ShopItem` type + full tier-based catalog |
| `src/app/shop/page.tsx` | Full rewrite — wraps `ShopModal` |

### Modify (surgical additions)
| File | Change |
|---|---|
| `src/components/table/tableclient/components/TableTopBar.tsx` | Add `🏪 Shop` button + props |
| `src/app/sessions/[id]/table/TableClient.tsx` | Add `showShop` state + `ShopModal` render |

---

## Open Questions / Blockers

1. **Item catalog** — The spec says items must match the Python bot exactly. Please provide the full list (name, id, URL, price_usd, tier, always?, desc) before Phase 2 implementation begins. A placeholder catalog can be shipped and updated in place.

2. **Treasury wallet** — The spec hardcodes `0x03477126328150f175f4e9919ebed7Ef9eFB91a3` as the "marketing wallet". Existing code uses `NEXT_PUBLIC_TREASURY_WALLET` env var. I'll use the env var and add the address to `.env.example`; confirm this is correct.

3. **DND721 price fallback** — If DexScreener is down, should the shop be disabled or use a hard-coded fallback price? Recommend: static fallback of last known price (stored in DB) with a "prices may be approximate" notice.

4. **Character selection** — When a purchase is made, which character receives the item? The verify-purchase endpoint needs to know. Options:
   - Always the player's most-recently-updated character
   - A character the player selects in the shop UI
   I'll implement "most recently updated character" unless you specify otherwise.

5. **Free claim limits without a session** — The spec says "one free A and one free B per calendar day per wallet" when not in a session. Confirm this is the correct fallback.
