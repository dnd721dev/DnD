// src/lib/racialResources.ts
// Wave 2 — Racial innate spell daily-use tracking.
//
// Race data (`races.ts → innateSpells.auto`) now carries `usesPerDay` and
// `rechargeType` fields. This module surfaces those entries as
// "racial resources" the dashboard and sheet can render and mutate.
//
// Persistence: each daily-use innate spell stores its used count in
// `characters.resource_state` under the key `racial_<spellSlug>_used`,
// where `spellSlug` is the spell name lowercased with non-alphanumeric
// characters replaced by underscores.
//
// At-will innates (cantrips, Forest Gnome Minor Illusion, etc.) have no
// `usesPerDay` field — they don't get a tracker.

import type { SupabaseClient } from '@supabase/supabase-js'
import { RACES, type RaceKey } from '@/lib/races'

export type RacialResource = {
  /** Storage key in `resource_state` — e.g. "racial_hellish_rebuke_used" */
  key: string
  /** Display name — usually the spell name */
  name: string
  /** Originating spell name (matches SRD) */
  spellName: string
  /** Max uses per recharge cycle (always a positive number for tracked resources) */
  max: number
  /** Recharge cycle */
  recharge: 'long_rest' | 'short_rest'
  /** Subset of source race that granted this */
  raceKey: string
}

/**
 * Convert a spell name to a stable slug for resource_state keys.
 * "Hellish Rebuke" -> "hellish_rebuke"
 */
export function spellSlug(spellName: string): string {
  return spellName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

/**
 * Returns the daily-use racial resources a character has unlocked at their
 * current level. At-will / cantrip innates are excluded — they have no
 * `usesPerDay` and don't need tracking.
 */
export function getRacialResources(
  raceKey: string | null | undefined,
  level: number,
): RacialResource[] {
  if (!raceKey) return []
  const race = (RACES as any)[raceKey as RaceKey]
  const entries = race?.innateSpells?.auto ?? []
  const result: RacialResource[] = []
  for (const e of entries) {
    if (typeof e.usesPerDay !== 'number' || e.usesPerDay <= 0) continue
    if (typeof e.unlocksAtLevel === 'number' && level < e.unlocksAtLevel) continue
    result.push({
      key: `racial_${spellSlug(e.spellName)}_used`,
      name: e.spellName,
      spellName: e.spellName,
      max: e.usesPerDay,
      recharge: (e.rechargeType ?? 'long_rest') as 'long_rest' | 'short_rest',
      raceKey,
    })
  }
  return result
}

/**
 * Expend one use of a racial innate spell. Increments
 * `resource_state.racial_<slug>_used`. Returns the new used count, or
 * null on failure (e.g., no uses left).
 */
export async function expendRacialResource(
  supabase: SupabaseClient,
  characterId: string,
  resourceKey: string,
  max: number,
): Promise<number | null> {
  const { data: char } = await supabase
    .from('characters')
    .select('resource_state')
    .eq('id', characterId)
    .maybeSingle()
  if (!char) return null

  const resourceState: Record<string, any> = (char as any).resource_state ?? {}
  const used = Number(resourceState[resourceKey] ?? 0)
  if (used >= max) return null // already exhausted

  const next = { ...resourceState, [resourceKey]: used + 1 }
  const { error } = await supabase
    .from('characters')
    .update({ resource_state: next })
    .eq('id', characterId)
  if (error) {
    console.error('[racialResources] expend error', error)
    return null
  }
  return used + 1
}

/**
 * Restore one use (manual + button) of a racial innate spell. Used count
 * floors at 0.
 */
export async function restoreRacialResource(
  supabase: SupabaseClient,
  characterId: string,
  resourceKey: string,
): Promise<number | null> {
  const { data: char } = await supabase
    .from('characters')
    .select('resource_state')
    .eq('id', characterId)
    .maybeSingle()
  if (!char) return null

  const resourceState: Record<string, any> = (char as any).resource_state ?? {}
  const used = Number(resourceState[resourceKey] ?? 0)
  if (used <= 0) return 0

  const next = { ...resourceState, [resourceKey]: used - 1 }
  await supabase
    .from('characters')
    .update({ resource_state: next })
    .eq('id', characterId)
  return used - 1
}
