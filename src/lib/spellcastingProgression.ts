// src/lib/spellcastingProgression.ts
// 5e SRD-style spell slot progression for DND721.
// Focused on spell slots & pact magic, not spells-known/prepared counts.
//
// Supports:
// - Full casters: bard, cleric, druid, sorcerer, wizard
// - Half casters: paladin, ranger
// - Third casters (for future: eldritch knight / arcane trickster)
// - Artificer (half caster with slots at level 1)
// - Warlock pact magic

import type { ClassKey } from './subclasses'

// -----------------------------
// Types
// -----------------------------

// Spell level -> number of slots (e.g. {1: 4, 2: 3, 3: 2})
export type SpellSlots = Record<number, number>

export type CasterType =
  | 'full'
  | 'half'
  | 'third'
  | 'artificer'
  | 'none'

export type SpellcastingClassKey =
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'sorcerer'
  | 'wizard'
  | 'paladin'
  | 'ranger'
  | 'warlock'
  | 'artificer'

export type PactMagicProgressionRow = {
  level: number
  pactSlots: number
  pactSlotLevel: number
}

export type SpellcastingProgressionRow = {
  level: number
  slots: SpellSlots
}

// -----------------------------
// Core progression tables
// (2014 5e values, SRD-compatible)
// -----------------------------

/**
 * Full caster slots (bard, cleric, druid, sorcerer, wizard).
 * Index 0 is unused; levels 1–20 are populated.
 */
const FULL_CASTER_SLOTS_BY_LEVEL: SpellSlots[] = [
  {}, // 0 (unused)
  { 1: 2 }, // 1
  { 1: 3 }, // 2
  { 1: 4, 2: 2 }, // 3
  { 1: 4, 2: 3 }, // 4
  { 1: 4, 2: 3, 3: 2 }, // 5
  { 1: 4, 2: 3, 3: 3 }, // 6
  { 1: 4, 2: 3, 3: 3, 4: 1 }, // 7
  { 1: 4, 2: 3, 3: 3, 4: 2 }, // 8
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, // 9
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, // 10
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, // 11
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, // 12
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, // 13
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, // 14
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, // 15
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, // 16
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, // 17
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 }, // 18
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, // 19
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, // 20
]

/**
 * Half caster slots (paladin, ranger).
 * They start at level 2.
 */
const HALF_CASTER_SLOTS_BY_LEVEL: SpellSlots[] = [
  {}, // 0
  {}, // 1 (no slots)
  { 1: 2 }, // 2
  { 1: 3 }, // 3
  { 1: 3 }, // 4
  { 1: 4, 2: 2 }, // 5
  { 1: 4, 2: 2 }, // 6
  { 1: 4, 2: 3 }, // 7
  { 1: 4, 2: 3 }, // 8
  { 1: 4, 2: 3, 3: 2 }, // 9
  { 1: 4, 2: 3, 3: 2 }, // 10
  { 1: 4, 2: 3, 3: 3 }, // 11
  { 1: 4, 2: 3, 3: 3 }, // 12
  { 1: 4, 2: 3, 3: 3, 4: 1 }, // 13
  { 1: 4, 2: 3, 3: 3, 4: 1 }, // 14
  { 1: 4, 2: 3, 3: 3, 4: 2 }, // 15
  { 1: 4, 2: 3, 3: 3, 4: 2 }, // 16
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, // 17
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, // 18
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, // 19
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, // 20
]

/**
 * Artificer slots (half caster that begins at level 1).
 * Uses the published artificer progression.
 */
const ARTIFICER_SLOTS_BY_LEVEL: SpellSlots[] = [
  {}, // 0
  { 1: 2 }, // 1
  { 1: 2 }, // 2
  { 1: 3 }, // 3
  { 1: 3 }, // 4
  { 1: 4, 2: 2 }, // 5
  { 1: 4, 2: 2 }, // 6
  { 1: 4, 2: 3 }, // 7
  { 1: 4, 2: 3 }, // 8
  { 1: 4, 2: 3, 3: 2 }, // 9
  { 1: 4, 2: 3, 3: 2 }, // 10
  { 1: 4, 2: 3, 3: 3 }, // 11
  { 1: 4, 2: 3, 3: 3 }, // 12
  { 1: 4, 2: 3, 3: 3, 4: 1 }, // 13
  { 1: 4, 2: 3, 3: 3, 4: 1 }, // 14
  { 1: 4, 2: 3, 3: 3, 4: 2 }, // 15
  { 1: 4, 2: 3, 3: 3, 4: 2 }, // 16
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, // 17
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, // 18
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, // 19
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }, // 20
]

/**
 * Third caster slots (for subclasses like Eldritch Knight / Arcane Trickster).
 * No base class in your current list uses this yet, but it’s here for future use.
 */
const THIRD_CASTER_SLOTS_BY_LEVEL: SpellSlots[] = [
  {}, // 0
  {}, // 1
  { 1: 2 }, // 2
  { 1: 3 }, // 3
  { 1: 3 }, // 4
  { 1: 4, 2: 2 }, // 5
  { 1: 4, 2: 2 }, // 6
  { 1: 4, 2: 2 }, // 7
  { 1: 4, 2: 2 }, // 8
  { 1: 4, 2: 2, 3: 2 }, // 9
  { 1: 4, 2: 3, 3: 2 }, // 10
  { 1: 4, 2: 3, 3: 2 }, // 11
  { 1: 4, 2: 3, 3: 2 }, // 12
  { 1: 4, 2: 3, 3: 2, 4: 1 }, // 13
  { 1: 4, 2: 3, 3: 2, 4: 1 }, // 14
  { 1: 4, 2: 3, 3: 2, 4: 1 }, // 15
  { 1: 4, 2: 3, 3: 2, 4: 1 }, // 16
  { 1: 4, 2: 3, 3: 3, 4: 1 }, // 17
  { 1: 4, 2: 3, 3: 3, 4: 1 }, // 18
  { 1: 4, 2: 3, 3: 3, 4: 2 }, // 19
  { 1: 4, 2: 3, 3: 3, 4: 2 }, // 20
]

/**
 * Warlock pact magic (not normal slots).
 * Level, number of pact slots, and the slot level they always cast at.
 */
export const WARLOCK_PACT_MAGIC: PactMagicProgressionRow[] = [
  { level: 1, pactSlots: 1, pactSlotLevel: 1 },
  { level: 2, pactSlots: 2, pactSlotLevel: 1 },
  { level: 3, pactSlots: 2, pactSlotLevel: 2 },
  { level: 4, pactSlots: 2, pactSlotLevel: 2 },
  { level: 5, pactSlots: 2, pactSlotLevel: 3 },
  { level: 6, pactSlots: 2, pactSlotLevel: 3 },
  { level: 7, pactSlots: 2, pactSlotLevel: 4 },
  { level: 8, pactSlots: 2, pactSlotLevel: 4 },
  { level: 9, pactSlots: 2, pactSlotLevel: 5 },
  { level: 10, pactSlots: 2, pactSlotLevel: 5 },
  { level: 11, pactSlots: 3, pactSlotLevel: 5 },
  { level: 12, pactSlots: 3, pactSlotLevel: 5 },
  { level: 13, pactSlots: 3, pactSlotLevel: 5 },
  { level: 14, pactSlots: 3, pactSlotLevel: 5 },
  { level: 15, pactSlots: 3, pactSlotLevel: 5 },
  { level: 16, pactSlots: 3, pactSlotLevel: 5 },
  { level: 17, pactSlots: 4, pactSlotLevel: 5 },
  { level: 18, pactSlots: 4, pactSlotLevel: 5 },
  { level: 19, pactSlots: 4, pactSlotLevel: 5 },
  { level: 20, pactSlots: 4, pactSlotLevel: 5 },
]

// -----------------------------
// Mapping classes -> caster type
// -----------------------------

export const CLASS_CASTER_TYPE: Partial<Record<ClassKey, CasterType>> = {
  barbarian: 'none',
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  fighter: 'none', // Eldritch Knight is a subclass & would use 'third'
  monk: 'none',
  paladin: 'half',
  ranger: 'half',
  rogue: 'none', // Arcane Trickster is a subclass & would use 'third'
  sorcerer: 'full',
  warlock: 'none', // handled separately by pact magic
  wizard: 'full',
  artificer: 'artificer',
}

// -----------------------------
// Helpers
// -----------------------------

/**
 * Returns the spell slots for a given caster type and level.
 * For warlocks, this will always be an empty object – use getWarlockPactMagic instead.
 */
export function getSlotsForCasterType(
  casterType: CasterType,
  level: number
): SpellSlots {
  const safeLevel = Math.min(Math.max(level, 1), 20)

  switch (casterType) {
    case 'full':
      return FULL_CASTER_SLOTS_BY_LEVEL[safeLevel] ?? {}
    case 'half':
      return HALF_CASTER_SLOTS_BY_LEVEL[safeLevel] ?? {}
    case 'third':
      return THIRD_CASTER_SLOTS_BY_LEVEL[safeLevel] ?? {}
    case 'artificer':
      return ARTIFICER_SLOTS_BY_LEVEL[safeLevel] ?? {}
    case 'none':
    default:
      return {}
  }
}

/**
 * High-level helper: give it a class and level,
 * it gives you the spell slots that class should have
 * according to 2014 5e rules (excluding warlock).
 */
export function getSpellSlotsForClass(
  classKey: ClassKey,
  level: number
): SpellSlots {
  const casterType = CLASS_CASTER_TYPE[classKey] ?? 'none'
  return getSlotsForCasterType(casterType, level)
}

/**
 * Get the warlock pact magic row for a given level, or undefined if out of range.
 */
export function getWarlockPactRow(level: number): PactMagicProgressionRow | undefined {
  const safeLevel = Math.min(Math.max(level, 1), 20)
  return WARLOCK_PACT_MAGIC.find((row) => row.level === safeLevel)
}
