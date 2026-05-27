// src/lib/spellSlots.ts
// Centralised helpers for reading and writing spell slot state.
//
// DB layout (two separate JSONB columns on `characters`):
//   spell_slots    — max slots per level  { "1": 4, "2": 3, "3": 2 }
//   resource_state — used counts          { "spell_slot_used_1": 2, "spell_slot_used_2": 1 }
//
// There is NO sheet_data column. Do not look for one.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CLASS_CASTER_TYPE,
  getSlotsForCasterType,
  getWarlockPactRow,
} from '@/lib/spellcastingProgression'
import type { ClassKey } from '@/lib/subclasses'

// Combined view that the dashboard works with
export interface SpellSlotData {
  [level: string]: { max: number; used: number }
}

// ── Build ──────────────────────────────────────────────────────────────────────

/**
 * Merge the two DB columns into a single SpellSlotData map.
 * This is a pure helper — no network calls.
 */
export function buildSlotData(
  spellSlots: Record<string, number> | null,
  resourceState: Record<string, any> | null,
): SpellSlotData {
  const result: SpellSlotData = {}
  for (const [level, max] of Object.entries(spellSlots ?? {})) {
    if (!max || max <= 0) continue
    const used = Math.min(
      Number(resourceState?.[`spell_slot_used_${level}`] ?? 0),
      max,
    )
    result[level] = { max, used }
  }
  return result
}

/**
 * Initialize spell slots from class progression table.
 * Returns just the max-slots map (the spell_slots column shape).
 */
export function initializeSpellSlots(
  className: string,
  level: number,
): Record<string, number> {
  const classKey = className.toLowerCase().trim() as ClassKey
  const casterType = CLASS_CASTER_TYPE[classKey]

  // Warlock pact magic
  if (classKey === 'warlock') {
    const row = getWarlockPactRow(level)
    if (!row) return {}
    const slots: Record<string, number> = {}
    slots[String(row.pactSlotLevel)] = row.pactSlots
    return slots
  }

  if (!casterType || casterType === 'none') return {}

  const rawSlots = getSlotsForCasterType(casterType, level)
  const result: Record<string, number> = {}
  for (const [lvl, count] of Object.entries(rawSlots)) {
    if (count > 0) result[String(lvl)] = count
  }
  return result
}

// ── Mutations (DB read-modify-write) ──────────────────────────────────────────

/**
 * Expend one spell slot. Increments resource_state.spell_slot_used_N.
 * Returns the updated SpellSlotData or null on failure.
 */
export async function expendSlot(
  supabase: SupabaseClient,
  characterId: string,
  slotLevel: number,
): Promise<SpellSlotData | null> {
  const { data: char, error } = await supabase
    .from('characters')
    .select('spell_slots, resource_state')
    .eq('id', characterId)
    .maybeSingle()

  if (error || !char) {
    console.error('[spellSlots] expendSlot fetch error', error)
    return null
  }

  const spellSlots: Record<string, number> = (char as any).spell_slots ?? {}
  const resourceState: Record<string, any> = (char as any).resource_state ?? {}
  const key = `spell_slot_used_${slotLevel}`
  const max = spellSlots[String(slotLevel)] ?? 0
  const used = Number(resourceState[key] ?? 0)

  if (used >= max) {
    console.warn('[spellSlots] No available slot at level', slotLevel)
    return buildSlotData(spellSlots, resourceState)
  }

  const nextResourceState = { ...resourceState, [key]: used + 1 }

  const { error: updateErr } = await supabase
    .from('characters')
    .update({ resource_state: nextResourceState })
    .eq('id', characterId)

  if (updateErr) {
    console.error('[spellSlots] expendSlot update error', updateErr)
    return null
  }

  return buildSlotData(spellSlots, nextResourceState)
}

/**
 * Restore one spell slot. Decrements resource_state.spell_slot_used_N (min 0).
 */
export async function restoreSlot(
  supabase: SupabaseClient,
  characterId: string,
  slotLevel: number,
): Promise<SpellSlotData | null> {
  const { data: char, error } = await supabase
    .from('characters')
    .select('spell_slots, resource_state')
    .eq('id', characterId)
    .maybeSingle()

  if (error || !char) return null

  const spellSlots: Record<string, number> = (char as any).spell_slots ?? {}
  const resourceState: Record<string, any> = (char as any).resource_state ?? {}
  const key = `spell_slot_used_${slotLevel}`
  const used = Number(resourceState[key] ?? 0)

  if (used <= 0) return buildSlotData(spellSlots, resourceState)

  const nextResourceState = { ...resourceState, [key]: used - 1 }

  await supabase
    .from('characters')
    .update({ resource_state: nextResourceState })
    .eq('id', characterId)

  return buildSlotData(spellSlots, nextResourceState)
}

/**
 * Long rest — zeros all spell_slot_used_N keys in resource_state.
 */
export async function longRestSlots(
  supabase: SupabaseClient,
  characterId: string,
): Promise<void> {
  const { data: char } = await supabase
    .from('characters')
    .select('resource_state')
    .eq('id', characterId)
    .maybeSingle()

  if (!char) return

  const resourceState: Record<string, any> = (char as any).resource_state ?? {}
  const next = { ...resourceState }

  for (const key of Object.keys(next)) {
    if (key.startsWith('spell_slot_used_')) next[key] = 0
  }

  await supabase
    .from('characters')
    .update({ resource_state: next })
    .eq('id', characterId)
}
