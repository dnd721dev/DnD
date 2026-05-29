// src/lib/levelUpRefresh.ts
// Audit Wave 2C — shared level-up patch builder. Used by both
// /api/sessions/award-xp (end of session) and /api/sessions/award-xp-mid
// (mid-session quick award). Before this extraction, award-xp-mid only
// bumped XP without ever advancing `level`, so a character could cross a
// level threshold mid-session and remain at their old level (with stale
// spell slots, save DC, HP) until the next end-of-session award ran.
//
// This module computes the patch object only. The caller decides whether
// to apply it, whether to prompt for a multiclass class-pick first, and
// how to handle errors.

import {
  getSpellSlotsForClass,
  getSlotsForCasterType,
  getWarlockPactRow,
  getDomainSpells,
  getMaxSpellLevelForClass,
  getMulticlassSlots,
  type MulticlassEntry,
} from '@/lib/spellcastingProgression'
import {
  getSpellcastingAbility,
  isSpellcaster,
  profBonus,
  abilityModifier,
} from '@/lib/spellCategories'
import type { ClassKey } from '@/lib/subclasses'
import { calcMaxHpMulticlass } from '@/lib/hitPoints'

/** Subset of the `characters` row needed to build the level-up patch. */
export type CharForLevelUp = {
  id: string
  main_job: string | null
  subclass: string | null
  secondary_class: string | null
  secondary_subclass: string | null
  secondary_level: number | null
  abilities: Record<string, number> | null
  resource_state: Record<string, any> | null
  spells_prepared: string[] | null
  spells_known: string[] | null
  hp: number | null
  hit_points_max: number | null
  hit_points_current: number | null
}

export type LevelUpPatch = {
  level: number
  spell_slots?: Record<string, number>
  resource_state?: Record<string, any>
  spell_save_dc?: number
  spell_attack_bonus?: number
  spells_prepared?: string[]
  spells_known?: string[]
  hp?: number
  hit_points_max?: number
  hit_points_current?: number
}

/**
 * Build the database patch to advance a character from oldLevel to newLevel.
 *
 * Handles, when applicable:
 *  - Spell slot recomputation (multiclass-aware, Warlock pact slots separate)
 *  - Reset of `spell_slot_used_*` counters (treats the level-up as a long rest)
 *  - Save DC + attack bonus from the new proficiency bonus
 *  - Union of newly-available subclass spells into spells_prepared / spells_known
 *  - HP recalc using the 5e average rule via calcMaxHpMulticlass
 *
 * The caller is responsible for the multiclass class-pick decision —
 * this helper assumes the primary class is the one gaining the level.
 */
export function buildLevelUpPatch(
  char: CharForLevelUp,
  newLevel: number,
): LevelUpPatch {
  const patch: LevelUpPatch = { level: newLevel }

  const classKey = String(char.main_job ?? '').toLowerCase()
  const subclassKey = String(char.subclass ?? '').toLowerCase()

  const isEK = classKey === 'fighter' && subclassKey === 'fighter_eldritch_knight' && newLevel >= 3
  const isAT = classKey === 'rogue' && subclassKey === 'rogue_arcane_trickster' && newLevel >= 3
  const isThirdCasterSubclass = isEK || isAT
  const hasCasting = isSpellcaster(classKey) || isThirdCasterSubclass

  if (hasCasting) {
    const secondaryClass = String(char.secondary_class ?? '').toLowerCase()
    const secondaryLevel = Math.max(0, Number(char.secondary_level ?? 0))
    const entries: MulticlassEntry[] = [
      { classKey: classKey as ClassKey, level: newLevel, subclassKey: subclassKey || null },
    ]
    if (secondaryClass && secondaryLevel > 0) {
      entries.push({
        classKey: secondaryClass as ClassKey,
        level: secondaryLevel,
        subclassKey: char.secondary_subclass ?? null,
      })
    }
    const isMulticlass = entries.length > 1

    let spellSlots: Record<string, number> = {}
    if (classKey === 'warlock' && !isMulticlass) {
      const pact = getWarlockPactRow(newLevel)
      if (pact) spellSlots = { [String(pact.pactSlotLevel)]: pact.pactSlots }
    } else if (isMulticlass) {
      const combined = getMulticlassSlots(entries)
      spellSlots = Object.fromEntries(
        Object.entries(combined).map(([k, v]) => [k, v as number]),
      )
    } else if (isThirdCasterSubclass) {
      const raw = getSlotsForCasterType('third', newLevel)
      spellSlots = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, v as number]),
      )
    } else if (isSpellcaster(classKey)) {
      const raw = getSpellSlotsForClass(classKey as any, newLevel)
      spellSlots = Object.fromEntries(
        Object.entries(raw).map(([k, v]) => [k, v as number]),
      )
    }

    if (Object.keys(spellSlots).length > 0) {
      patch.spell_slots = spellSlots

      const resourceState: Record<string, any> = char.resource_state ?? {}
      const nextResource = { ...resourceState }
      for (const key of Object.keys(nextResource)) {
        if (key.startsWith('spell_slot_used_')) nextResource[key] = 0
      }
      patch.resource_state = nextResource
    }

    const abilities = (char.abilities ?? {}) as Record<string, number>
    let castingAbilityKey: 'int' | 'wis' | 'cha' | null = null
    if (isSpellcaster(classKey)) {
      castingAbilityKey = getSpellcastingAbility(classKey)
    } else if (isThirdCasterSubclass) {
      castingAbilityKey = 'int'
    }
    if (castingAbilityKey) {
      const score = Number(abilities[castingAbilityKey] ?? 10)
      const mod = abilityModifier(score)
      const pb = profBonus(newLevel)
      patch.spell_save_dc = 8 + pb + mod
      patch.spell_attack_bonus = pb + mod
    }

    const maxSpellLevel = getMaxSpellLevelForClass(classKey, subclassKey, newLevel)
    const rawDomain = subclassKey ? getDomainSpells(subclassKey, maxSpellLevel) : []
    if (rawDomain.length > 0) {
      const currentPrepared: string[] = Array.isArray(char.spells_prepared) ? char.spells_prepared : []
      const currentKnown: string[] = Array.isArray(char.spells_known) ? char.spells_known : []
      patch.spells_prepared = Array.from(new Set([...currentPrepared, ...rawDomain]))
      patch.spells_known = Array.from(new Set([...currentKnown, ...rawDomain]))
    }
  }

  // HP recalc — additive (newly gained HP available immediately, no full heal).
  try {
    const abilities = (char.abilities ?? {}) as Record<string, number>
    const conScore = Number(abilities.con ?? 10)
    const newMaxHp = calcMaxHpMulticlass({
      classes: [{ classKey: classKey as ClassKey, level: newLevel }],
      conScore,
      method: 'average',
    })
    const oldMaxHp = Number(char.hit_points_max ?? char.hp ?? 0)
    const delta = Math.max(0, newMaxHp - oldMaxHp)
    const oldCurHp = Number(char.hit_points_current ?? oldMaxHp)
    patch.hp = newMaxHp
    patch.hit_points_max = newMaxHp
    patch.hit_points_current = Math.max(0, Math.min(newMaxHp, oldCurHp + delta))
  } catch (e) {
    console.error('[buildLevelUpPatch] HP recalc error', e)
  }

  return patch
}

/** Audit Wave 2B — hard cap on per-call XP to prevent rogue/grief inflation. */
export const MAX_XP_PER_AWARD = 50_000
