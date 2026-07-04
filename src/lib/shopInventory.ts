// src/lib/shopInventory.ts  — SERVER ONLY (uses supabaseAdmin)
// Daily inventory generation and character inventory writes.

import { SHOP_POOL, type ShopItem } from './shopData'
import { supabaseAdmin } from './supabaseAdmin'

export type DailyInventory = {
  a: ShopItem[]   // 5 items: Potion of Healing + 4 random uniques
  b: ShopItem[]   // 5 items: Potion of Healing + 4 random uniques (no always items)
  c: ShopItem[]   // 7 items: 2 ALWAYS + 5 random uniques
  d: ShopItem[]   // 7 items: 2 ALWAYS + 5 random uniques
  e: ShopItem[]   // 5 unique permanent items
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function seededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  }
  return function () {
    h ^= h << 13
    h ^= h >> 17
    h ^= h << 5
    return ((h >>> 0) / 0xFFFFFFFF)
  }
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr]
  const rand = seededRandom(seed)
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

// ─── Generator ────────────────────────────────────────────────────────────────

/**
 * Generate today's shop inventory from the pool.
 * Uses a date-based seed so the same UTC day always yields the same items.
 *
 * Format:
 *   A: 'Potion of Healing' + 4 additional random uniques (total 5)
 *   B: 'Potion of Healing' + 4 additional random uniques (total 5, no always items)
 *   C: 2 ALWAYS items + 5 additional random uniques (total 7)
 *   D: 2 ALWAYS items + 5 additional random uniques (total 7)
 *   E: 5 unique items
 *
 * No duplicate item NAMES across lists — except 'Potion of Healing', which
 * intentionally heads both A and B. Enforced via a shared used-name set.
 */
export function generateDailyInventory(date?: Date): DailyInventory {
  const d = date ?? new Date()
  const dateSeed = d.toISOString().slice(0, 10)  // e.g. "2026-05-02"

  // Names already used today (cross-list dedupe).
  const usedNames = new Set<string>()

  /** Take the first `count` rotators from a seeded shuffle whose names are unused. */
  function pickRotators(tier: ShopItem['tier'], count: number): ShopItem[] {
    const rotators = SHOP_POOL.filter((i) => i.tier === tier && !i.always)
    const shuffled = seededShuffle(rotators, `${dateSeed}:${tier}`)
    const out: ShopItem[] = []
    for (const item of shuffled) {
      if (out.length >= count) break
      const key = item.name.toLowerCase()
      if (usedNames.has(key)) continue
      usedNames.add(key)
      out.push(item)
    }
    return out
  }

  /** Mark a list of fixed items (Potion of Healing / ALWAYS) as used and return them. */
  function claim(items: ShopItem[]): ShopItem[] {
    for (const i of items) usedNames.add(i.name.toLowerCase())
    return items
  }

  // 'Potion of Healing' heads BOTH A and B — the one allowed name overlap.
  const healingPotion = SHOP_POOL.find((i) => i.id === 'healing_potion')
  const poh = healingPotion ? [healingPotion] : []
  if (healingPotion) usedNames.add(healingPotion.name.toLowerCase())

  const listA = [...poh, ...pickRotators('A', 4)]
  const listB = [...poh, ...pickRotators('B', 4)]

  // C/D: the two ALWAYS items lead, then 5 random uniques each.
  const alwaysC = claim(SHOP_POOL.filter((i) => i.tier === 'C' && i.always).slice(0, 2))
  const alwaysD = claim(SHOP_POOL.filter((i) => i.tier === 'D' && i.always).slice(0, 2))
  const listC = [...alwaysC, ...pickRotators('C', 5)]
  const listD = [...alwaysD, ...pickRotators('D', 5)]

  // E: 5 unique permanents.
  const listE = pickRotators('E', 5)

  return { a: listA, b: listB, c: listC, d: listD, e: listE }
}

// ─── Inventory Write ──────────────────────────────────────────────────────────

type InventoryItem = {
  key:  string
  name: string
  qty:  number
  kind: 'consumable' | 'gear' | 'misc'
}

function shopItemToInventoryItem(item: ShopItem): InventoryItem {
  const kindMap: Record<string, InventoryItem['kind']> = {
    consumable: 'consumable',
    gear:       'gear',
    'magic-item': 'misc',
    cosmetic:   'misc',
  }
  return {
    key:  item.id,
    name: item.name,
    qty:  1,
    kind: kindMap[item.category] ?? 'misc',
  }
}

/**
 * Append a shop item to a character's inventory_items JSONB column.
 * Uses supabaseAdmin (service role) to bypass RLS.
 */
export async function addItemToCharacterInventory(
  characterId: string,
  item: ShopItem,
): Promise<void> {
  const db = supabaseAdmin()

  // Fetch current inventory
  const { data: char, error: fetchErr } = await db
    .from('characters')
    .select('inventory_items')
    .eq('id', characterId)
    .maybeSingle()

  if (fetchErr) throw new Error(`Failed to fetch character: ${fetchErr.message}`)
  if (!char) throw new Error('Character not found')

  const existing: InventoryItem[] = Array.isArray(char.inventory_items)
    ? (char.inventory_items as InventoryItem[])
    : []

  const newItem = shopItemToInventoryItem(item)

  // If same key already in inventory, increase qty
  const idx = existing.findIndex((i) => i.key === newItem.key)
  let next: InventoryItem[]
  if (idx >= 0) {
    next = existing.map((it, i) =>
      i === idx ? { ...it, qty: (it.qty ?? 0) + 1 } : it
    )
  } else {
    next = [newItem, ...existing]
  }

  const { error: updateErr } = await db
    .from('characters')
    .update({ inventory_items: next })
    .eq('id', characterId)

  if (updateErr) throw new Error(`Failed to update inventory: ${updateErr.message}`)
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

/** Fetch or generate the active shop inventory row */
export async function getOrCreateActiveInventory() {
  const db = supabaseAdmin()

  // Try to find an existing active row
  const { data: existing } = await db
    .from('shop_inventory')
    .select('*')
    .eq('is_active', true)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Format check: the current layout is A=5 / B=5 / C=7 / D=7 / E=5.
    // A row generated under the old 1/1/3/3/2 format is retired immediately
    // so the new lists appear on deploy instead of waiting for midnight UTC.
    const a = Array.isArray((existing as any).list_a) ? (existing as any).list_a.length : 0
    const e = Array.isArray((existing as any).list_e) ? (existing as any).list_e.length : 0
    if (a >= 5 && e >= 5) return existing
    await db.from('shop_inventory').update({ is_active: false }).eq('id', (existing as any).id)
  }

  // None exists (or the old-format row was just retired) — generate one now
  const inv = generateDailyInventory()
  const now = new Date()
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  ))

  const { data: inserted, error } = await db
    .from('shop_inventory')
    .insert({
      generated_at: now.toISOString(),
      expires_at:   midnight.toISOString(),
      list_a:       inv.a,
      list_b:       inv.b,
      list_c:       inv.c,
      list_d:       inv.d,
      list_e:       inv.e,
      is_active:    true,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create shop inventory: ${error.message}`)
  return inserted
}
