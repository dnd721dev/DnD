// src/lib/shopData.ts
// Bishop's Shop — item catalog types + pool.
// The full 500+ item database lives in src/lib/shopItems/ (tier files +
// generated spell scrolls); this module re-exports it as SHOP_POOL so all
// existing imports keep working. IDs are stable — the Python bot and past
// purchase rows reference them.

export type ShopTier = 'A' | 'B' | 'C' | 'D' | 'E'

export type ShopItemCategory = 'consumable' | 'gear' | 'magic-item' | 'cosmetic'

export type ShopItem = {
  /** Stable ID — must match Python bot references */
  id: string
  name: string
  tier: ShopTier
  desc: string
  /** DnDBeyond URL, or null if no reference page */
  url: string | null
  /** USD price. Absent / undefined for free tiers A and B. */
  price_usd?: number
  /** If true: always included in daily rotation regardless of seed (e.g. signature potions) */
  always?: boolean
  category: ShopItemCategory
  /** Tier E only: the item is permanent (not consumed on use). */
  permanent?: boolean
  /** Tier E only: purchase mints a DND721 Item NFT with generated art. */
  nft?: boolean
}

// The aggregated catalog. Import placed below the type declarations because
// the tier files import `type { ShopItem }` from this module (type-only
// circularity — erased at compile time, safe at runtime).
import { ALL_SHOP_ITEMS } from './shopItems'

export const SHOP_POOL: ShopItem[] = ALL_SHOP_ITEMS

/** Lookup a shop item by ID */
export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_POOL.find((i) => i.id === id)
}
