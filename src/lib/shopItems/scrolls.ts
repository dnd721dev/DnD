// src/lib/shopItems/scrolls.ts
// Spell scrolls generated from the SRD spell database. One-time-use by
// nature: casting from a scroll consumes it.
//
//   Levels 1–2 → tier C ($1.50 / $3.00)
//   Levels 3–4 → tier D ($5.00 / $8.00)
//
// IDs derive deterministically from the spell name so the daily seeded
// rotation and purchase records stay stable across deploys.

import { SRD_SPELLS } from '../srdspells'
import type { ShopItem, ShopTier } from '../shopData'

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

const PRICE_BY_LEVEL: Record<number, number> = { 1: 1.50, 2: 3.00, 3: 5.00, 4: 8.00 }
const TIER_BY_LEVEL:  Record<number, ShopTier> = { 1: 'C', 2: 'C', 3: 'D', 4: 'D' }

/** Build the scroll catalog once at module load. */
function buildScrolls(): ShopItem[] {
  const seen = new Set<string>()
  const out: ShopItem[] = []

  for (const spell of SRD_SPELLS) {
    const lvl = spell.level
    if (lvl < 1 || lvl > 4) continue
    const name = `Scroll of ${spell.name}`
    const key = name.toLowerCase()
    if (seen.has(key)) continue // srd + class-gap sources can overlap
    seen.add(key)

    const ord = lvl === 1 ? '1st' : lvl === 2 ? '2nd' : lvl === 3 ? '3rd' : '4th'
    out.push({
      id:        `scroll_${slug(spell.name)}`,
      tier:      TIER_BY_LEVEL[lvl]!,
      name,
      desc:      `A ${ord}-level ${spell.school.toLowerCase()} spell scroll. Cast ${spell.name} once without expending a slot, then the scroll crumbles.${spell.notes ? ` (${spell.notes.slice(0, 120)})` : ''}`,
      price_usd: PRICE_BY_LEVEL[lvl]!,
      category:  'consumable',
      url:       null,
    })
  }
  return out
}

export const SCROLL_ITEMS: ShopItem[] = buildScrolls()
