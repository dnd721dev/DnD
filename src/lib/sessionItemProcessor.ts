// src/lib/sessionItemProcessor.ts  — SERVER ONLY (uses supabaseAdmin)
//
// Classifies shop items for session tracking and processes auto-removal
// of eligible items from character inventories at session end.

import { supabaseAdmin } from './supabaseAdmin'
import type { ShopItem } from './shopData'

// ─── Classification ───────────────────────────────────────────────────────────

export type ItemType = 'consumable' | 'gear' | 'magic_item' | 'cosmetic'

export type SessionItemClassification = {
  item_type:                 ItemType
  auto_remove_on_session_end: boolean
}

/**
 * Determine item_type and whether the item is auto-removed at session end.
 *
 * Rules:
 *  - Tier A / B (free claims) → auto_remove = true  (session-limited bonuses)
 *  - Tier C–E (paid)          → auto_remove = false (player paid, item persists)
 *  - category mapping: consumable→consumable, gear→gear,
 *                      magic-item→magic_item, cosmetic→cosmetic
 */
export function classifyShopItem(item: ShopItem): SessionItemClassification {
  const categoryMap: Record<ShopItem['category'], ItemType> = {
    consumable:   'consumable',
    gear:         'gear',
    'magic-item': 'magic_item',
    cosmetic:     'cosmetic',
  }

  return {
    item_type:                 categoryMap[item.category] ?? 'consumable',
    auto_remove_on_session_end: item.tier === 'A' || item.tier === 'B',
  }
}

// ─── session_items insert helper ─────────────────────────────────────────────

export type SessionItemInsert = {
  sessionId:    string
  characterId:  string
  walletAddress: string
  item:         ShopItem
}

/**
 * Insert a record into session_items after a successful shop claim/purchase.
 * Silently logs errors — caller should not fail the purchase if this errors.
 */
export async function recordSessionItem({
  sessionId,
  characterId,
  walletAddress,
  item,
}: SessionItemInsert): Promise<void> {
  const db = supabaseAdmin()
  const { item_type, auto_remove_on_session_end } = classifyShopItem(item)

  const { error } = await db.from('session_items').insert({
    session_id:               sessionId,
    character_id:             characterId,
    wallet_address:           walletAddress.toLowerCase(),
    item_id:                  item.id,
    item_name:                item.name,
    item_tier:                item.tier,
    item_type,
    source:                   'shop',
    auto_remove_on_session_end,
  })

  if (error) {
    console.error('[sessionItemProcessor] recordSessionItem error:', error.message)
  }
}

// ─── Session end processing ───────────────────────────────────────────────────

type SessionItemRow = {
  id:                       string
  character_id:             string
  item_id:                  string
  item_name:                string
  auto_remove_on_session_end: boolean
}

type InventoryItem = {
  key:      string
  name:     string
  qty:      number
  kind:     string
  [key: string]: unknown
}

/**
 * At session end, remove all auto_remove_on_session_end items from
 * character inventories for the given session.
 *
 * Strategy:
 *  1. Fetch all session_items for the session where auto_remove = true
 *  2. Group by character_id
 *  3. For each character, decrement qty of matching inventory items
 *     (remove the entry entirely when qty reaches 0)
 */
export async function processSessionEndItems(sessionId: string): Promise<void> {
  const db = supabaseAdmin()

  // Fetch items to remove
  const { data: items, error: fetchErr } = await db
    .from('session_items')
    .select('id, character_id, item_id, item_name, auto_remove_on_session_end')
    .eq('session_id', sessionId)
    .eq('auto_remove_on_session_end', true)

  if (fetchErr) {
    throw new Error(`Failed to fetch session_items: ${fetchErr.message}`)
  }
  if (!items || items.length === 0) return

  const rows = items as SessionItemRow[]

  // Group removals by character_id: { characterId → { itemId → count } }
  const byCharacter = new Map<string, Map<string, number>>()
  for (const row of rows) {
    if (!byCharacter.has(row.character_id)) {
      byCharacter.set(row.character_id, new Map())
    }
    const counts = byCharacter.get(row.character_id)!
    counts.set(row.item_id, (counts.get(row.item_id) ?? 0) + 1)
  }

  // Process each character
  const errors: string[] = []

  for (const [characterId, removals] of byCharacter) {
    // Fetch current inventory
    const { data: char, error: charErr } = await db
      .from('characters')
      .select('inventory_items')
      .eq('id', characterId)
      .maybeSingle()

    if (charErr || !char) {
      errors.push(`Character ${characterId}: ${charErr?.message ?? 'not found'}`)
      continue
    }

    const inventory: InventoryItem[] = Array.isArray(char.inventory_items)
      ? (char.inventory_items as InventoryItem[])
      : []

    // Apply removals
    let next = [...inventory]
    for (const [itemId, countToRemove] of removals) {
      let remaining = countToRemove
      next = next.reduce<InventoryItem[]>((acc, entry) => {
        if (entry.key === itemId && remaining > 0) {
          const newQty = (entry.qty ?? 1) - remaining
          remaining = 0
          if (newQty > 0) acc.push({ ...entry, qty: newQty })
          // If qty <= 0, drop the entry
        } else {
          acc.push(entry)
        }
        return acc
      }, [])
    }

    // Write back
    const { error: updateErr } = await db
      .from('characters')
      .update({ inventory_items: next })
      .eq('id', characterId)

    if (updateErr) {
      errors.push(`Character ${characterId} update: ${updateErr.message}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`processSessionEndItems partial failure:\n${errors.join('\n')}`)
  }
}

// ─── Preview helper (used by DM end-session modal) ────────────────────────────

export type SessionItemPreview = {
  character_id:  string
  item_id:       string
  item_name:     string
  item_tier:     string
  item_type:     string
  auto_remove:   boolean
}

/**
 * Returns a list of session items for the DM end-session confirmation modal,
 * split into two groups: items that will be removed and items that persist.
 */
export async function getSessionItemPreview(sessionId: string): Promise<{
  toRemove: SessionItemPreview[]
  toKeep:   SessionItemPreview[]
}> {
  const db = supabaseAdmin()

  const { data, error } = await db
    .from('session_items')
    .select('character_id, item_id, item_name, item_tier, item_type, auto_remove_on_session_end')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch session item preview: ${error.message}`)

  const rows = (data ?? []) as Array<{
    character_id:             string
    item_id:                  string
    item_name:                string
    item_tier:                string
    item_type:                string
    auto_remove_on_session_end: boolean
  }>

  const toRemove: SessionItemPreview[] = []
  const toKeep:   SessionItemPreview[] = []

  for (const r of rows) {
    const entry: SessionItemPreview = {
      character_id: r.character_id,
      item_id:      r.item_id,
      item_name:    r.item_name,
      item_tier:    r.item_tier,
      item_type:    r.item_type,
      auto_remove:  r.auto_remove_on_session_end,
    }
    if (r.auto_remove_on_session_end) toRemove.push(entry)
    else toKeep.push(entry)
  }

  return { toRemove, toKeep }
}
