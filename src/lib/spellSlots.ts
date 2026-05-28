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
 *
 * Wave 2: also resets all daily-use racial innate spell counters
 * (`racial_*_used`) and class resource counters tagged for long_rest
 * (`class_resource_*_used` — kept generic so future class features
 * can opt in without code changes).
 *
 * Wave 3: also resets Mystic Arcanum daily counters
 * (`mystic_arcanum_used_*`).
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
    else if (key.startsWith('racial_') && key.endsWith('_used')) next[key] = 0
    else if (key.startsWith('mystic_arcanum_used_')) next[key] = 0
    // class_resource_<key>_used — long-rest-recharging class features
    else if (key.startsWith('class_resource_') && key.endsWith('_used_long')) next[key] = 0
  }

  await supabase
    .from('characters')
    .update({ resource_state: next })
    .eq('id', characterId)
}

/**
 * Wave 3 — expend one daily use of a Mystic Arcanum spell.
 * Increments `resource_state.mystic_arcanum_used_<spellLevel>`.
 * Long rest resets via `longRestSlots` (which already matches the
 * `mystic_arcanum_used_` prefix).
 */
export async function expendMysticArcanum(
  supabase: SupabaseClient,
  characterId: string,
  spellLevel: number,
): Promise<boolean> {
  const { data: char } = await supabase
    .from('characters')
    .select('resource_state')
    .eq('id', characterId)
    .maybeSingle()
  if (!char) return false

  const resourceState: Record<string, any> = (char as any).resource_state ?? {}
  const key = `mystic_arcanum_used_${spellLevel}`
  const used = Number(resourceState[key] ?? 0)
  if (used >= 1) return false // already used today

  const next = { ...resourceState, [key]: 1 }
  const { error } = await supabase
    .from('characters')
    .update({ resource_state: next })
    .eq('id', characterId)
  if (error) {
    console.error('[spellSlots] expendMysticArcanum error', error)
    return false
  }
  return true
}

/**
 * Short rest — restores Warlock pact slots only (other classes do not regain
 * spell slots on a short rest). Reads the character's class to gate the
 * restoration. No-op for non-Warlocks (returns current slot data unchanged).
 *
 * Future: when Wizard's Arcane Recovery and other short-rest features land,
 * extend this helper rather than adding parallel paths.
 */
export async function shortRestSlots(
  supabase: SupabaseClient,
  characterId: string,
): Promise<SpellSlotData | null> {
  const { data: char } = await supabase
    .from('characters')
    .select('main_job, spell_slots, resource_state')
    .eq('id', characterId)
    .maybeSingle()

  if (!char) return null

  const className = String((char as any).main_job ?? '').toLowerCase().trim()
  const spellSlots: Record<string, number> = (char as any).spell_slots ?? {}
  const resourceState: Record<string, any> = (char as any).resource_state ?? {}

  // Only Warlocks regain spell slots on a short rest.
  if (className !== 'warlock') {
    return buildSlotData(spellSlots, resourceState)
  }

  const next = { ...resourceState }
  for (const key of Object.keys(next)) {
    if (key.startsWith('spell_slot_used_')) next[key] = 0
  }

  const { error } = await supabase
    .from('characters')
    .update({ resource_state: next })
    .eq('id', characterId)

  if (error) {
    console.error('[spellSlots] shortRestSlots update error', error)
    return null
  }

  return buildSlotData(spellSlots, next)
}
