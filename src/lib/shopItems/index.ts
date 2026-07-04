// src/lib/shopItems/index.ts
// Aggregates the full Bishop's Shop catalog (500+ items).
//
// Tiers A–D are one-time-use consumables/gear. Tier E items are PERMANENT
// and minted as DND721 Item NFTs on purchase.

import type { ShopItem } from '../shopData'
import { TIER_A_ITEMS } from './tierA'
import { TIER_B_ITEMS } from './tierB'
import { TIER_C_ITEMS } from './tierC'
import { TIER_D_ITEMS } from './tierD'
import { TIER_E_ITEMS } from './tierE'
import { SCROLL_ITEMS } from './scrolls'

export const ALL_SHOP_ITEMS: ShopItem[] = [
  ...TIER_A_ITEMS,
  ...TIER_B_ITEMS,
  ...TIER_C_ITEMS,
  ...TIER_D_ITEMS,
  ...TIER_E_ITEMS,
  ...SCROLL_ITEMS,
]

// ── Catalog invariants (dev-time guard) ───────────────────────────────────────
// 1. IDs must be unique (purchases + seeded rotation reference them).
// 2. Names must be unique across the catalog — the daily lists dedupe by NAME,
//    with 'Potion of Healing' allowed in both A and B (it's a single item).
if (process.env.NODE_ENV !== 'production') {
  const ids = new Set<string>()
  const names = new Set<string>()
  for (const item of ALL_SHOP_ITEMS) {
    if (ids.has(item.id)) console.error(`[shopItems] duplicate id: ${item.id}`)
    ids.add(item.id)
    const nameKey = item.name.toLowerCase()
    if (names.has(nameKey)) console.error(`[shopItems] duplicate name: ${item.name}`)
    names.add(nameKey)
  }
  if (ALL_SHOP_ITEMS.length < 500) {
    console.warn(`[shopItems] catalog has ${ALL_SHOP_ITEMS.length} items (< 500 target)`)
  }
}
