// src/lib/shopInventory.ts  — SERVER ONLY (uses supabaseAdmin)
// Daily inventory generation and character inventory writes.

import { SHOP_POOL, type ShopItem } from './shopData'
import { supabaseAdmin } from './supabaseAdmin'

export type DailyInventory = {
  a: ShopItem[]   // 1 item
  b: ShopItem[]   // 1 item
  c: ShopItem[]   // 3 items (always + rotators)
  d: ShopItem[]   // 3 items (always + rotators)
  e: ShopItem[]   // 2 items
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
 */
export function generateDailyInventory(date?: Date): DailyInventory {
  const d = date ?? new Date()
  const dateSeed = d.toISOString().slice(0, 10)  // e.g. "2026-05-02"

  function pick(tier: ShopItem['tier'], count: number): ShopItem[] {
    const always   = SHOP_POOL.filter((i) => i.tier === tier && i.always)
    const rotators = SHOP_POOL.filter((i) => i.tier === tier && !i.always)
    const shuffled = seededShuffle(rotators, `${dateSeed}:${tier}`)
    const extra    = shuffled.slice(0, Math.max(0, count - always.length))
    return [...always, ...extra]
  }

  return {
    a: pick('A', 1),
    b: pick('B', 1),
    c: pick('C', 3),
    d: pick('D', 3),
    e: pick('E', 2),
  }
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

  if (existing) return existing

  // None exists — generate one now
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
