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

// -----------------------------
// Cantrips & Spells Known tables
// (2014 5e SRD values)
// -----------------------------

/**
 * How many cantrips a class can know at each level.
 * Index 0 unused; indices 1–20 = character level.
 * Paladin and Ranger get 0 cantrips in 2014 5e.
 */
export const CANTRIPS_KNOWN_BY_CLASS: Partial<Record<SpellcastingClassKey, readonly number[]>> = {
  bard:     [0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  cleric:   [0, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  druid:    [0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  sorcerer: [0, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  warlock:  [0, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  wizard:   [0, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  paladin:  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ranger:   [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}

/**
 * How many leveled spells a known-spell caster can know at each level.
 * Index 0 unused; indices 1–20 = character level.
 * Prepared casters (cleric, druid, wizard, paladin) are NOT in this table —
 * their prepared-spell count is computed dynamically from ability mod + level.
 * 2014 5e SRD values.
 */
export const SPELLS_KNOWN_BY_CLASS: Partial<Record<SpellcastingClassKey, readonly number[]>> = {
  bard:    [0,  4,  5,  6,  7,  8,  9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  sorcerer:[0,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  ranger:  [0,  0,  2,  3,  3,  4,  4,  5,  5,  6,  6,  7,  7,  8,  8,  9,  9, 10, 10, 11, 11],
  warlock: [0,  2,  3,  4,  5,  6,  7,  8,  9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
}

/**
 * Domain / oath / circle spells granted by subclass, keyed by SubclassKey.
 * Nested by spell level (1–5).
 * Spell names that are not present in SRD_SPELLS will be silently filtered at runtime.
 */
export const DOMAIN_SPELLS_BY_SUBCLASS: Partial<Record<string, Record<number, string[]>>> = {
  // ── Cleric domains ────────────────────────────────────────────────────────
  cleric_life: {
    1: ['Bless', 'Cure Wounds'],
    2: ['Lesser Restoration', 'Spiritual Weapon'],
    3: ['Beacon of Hope', 'Revivify'],
    4: ['Death Ward', 'Guardian of Faith'],
    5: ['Mass Cure Wounds', 'Raise Dead'],
  },
  cleric_light: {
    1: ['Burning Hands', 'Faerie Fire'],
    2: ['Flaming Sphere', 'Scorching Ray'],
    3: ['Daylight', 'Fireball'],
    4: ['Guardian of Faith', 'Wall of Fire'],
    5: ['Flame Strike', 'Scrying'],
  },
  cleric_knowledge: {
    1: ['Command', 'Identify'],
    2: ['Augury', 'Suggestion'],
    3: ['Nondetection', 'Speak with Dead'],
    4: ['Arcane Eye', 'Confusion'],
    5: ['Legend Lore', 'Scrying'],
  },
  cleric_tempest: {
    1: ['Fog Cloud', 'Thunderwave'],
    2: ['Gust of Wind', 'Shatter'],
    3: ['Call Lightning', 'Sleet Storm'],
    4: ['Control Water', 'Ice Storm'],
    5: ['Destructive Wave', 'Insect Plague'],
  },
  cleric_trickery: {
    1: ['Charm Person', 'Disguise Self'],
    2: ['Mirror Image', 'Pass without Trace'],
    3: ['Blink', 'Dispel Magic'],
    4: ['Dimension Door', 'Polymorph'],
    5: ['Dominate Person', 'Modify Memory'],
  },
  cleric_war: {
    1: ['Divine Favor', 'Shield of Faith'],
    2: ['Magic Weapon', 'Spiritual Weapon'],
    3: ["Crusader's Mantle", 'Spirit Guardians'],
    4: ['Freedom of Movement', 'Stoneskin'],
    5: ['Flame Strike', 'Hold Monster'],
  },
  cleric_nature: {
    1: ['Animal Friendship', 'Speak with Animals'],
    2: ['Barkskin', 'Spike Growth'],
    3: ['Plant Growth', 'Wind Wall'],
    4: ['Dominate Beast', 'Grasping Vine'],
    5: ['Insect Plague', 'Tree Stride'],
  },
  cleric_forge: {
    1: ['Identify', 'Searing Smite'],
    2: ['Heat Metal', 'Magic Weapon'],
    3: ['Elemental Weapon', 'Protection from Energy'],
    4: ['Fabricate', 'Wall of Fire'],
    5: ['Animate Objects', 'Creation'],
  },
  cleric_grave: {
    1: ['Bane', 'False Life'],
    2: ['Gentle Repose', 'Ray of Enfeeblement'],
    3: ['Revivify', 'Vampiric Touch'],
    4: ['Blight', 'Death Ward'],
    5: ['Antilife Shell', 'Raise Dead'],
  },
  cleric_death: {
    1: ['False Life', 'Ray of Sickness'],
    2: ['Blindness/Deafness', 'Ray of Enfeeblement'],
    3: ['Animate Dead', 'Vampiric Touch'],
    4: ['Blight', 'Death Ward'],
    5: ['Antilife Shell', 'Cloudkill'],
  },
  cleric_order: {
    1: ['Command', 'Heroism'],
    2: ['Hold Person', 'Zone of Truth'],
    3: ['Mass Healing Word', 'Slow'],
    4: ['Compulsion', 'Locate Creature'],
    5: ['Commune', 'Dominate Person'],
  },
  cleric_peace: {
    1: ['Heroism', 'Sanctuary'],
    2: ['Aid', 'Warding Bond'],
    3: ['Beacon of Hope', 'Sending'],
    4: ['Aura of Purity', "Otiluke's Resilient Sphere"],
    5: ['Greater Restoration', "Rary's Telepathic Bond"],
  },
  cleric_twilight: {
    1: ['Faerie Fire', 'Sleep'],
    2: ['Moonbeam', 'See Invisibility'],
    3: ['Aura of Vitality', "Leomund's Tiny Hut"],
    4: ['Aura of Life', 'Greater Invisibility'],
    5: ['Circle of Power', 'Mislead'],
  },
  cleric_arcana: {
    1: ['Detect Magic', 'Magic Missile'],
    2: ['Magic Weapon', "Nystul's Magic Aura"],
    3: ['Dispel Magic', 'Magic Circle'],
    4: ['Arcane Eye', "Leomund's Secret Chest"],
    5: ['Planar Binding', 'Teleportation Circle'],
  },
  // ── Paladin oaths ─────────────────────────────────────────────────────────
  paladin_devotion: {
    1: ['Protection from Evil and Good', 'Sanctuary'],
    2: ['Lesser Restoration', 'Zone of Truth'],
    3: ['Beacon of Hope', 'Dispel Magic'],
    4: ['Freedom of Movement', 'Guardian of Faith'],
    5: ['Commune', 'Flame Strike'],
  },
  paladin_ancients: {
    1: ['Ensnaring Strike', 'Speak with Animals'],
    2: ['Misty Step', 'Moonbeam'],
    3: ['Plant Growth', 'Protection from Energy'],
    4: ['Ice Storm', 'Stoneskin'],
    5: ['Commune with Nature', 'Tree Stride'],
  },
  paladin_vengeance: {
    1: ['Bane', "Hunter's Mark"],
    2: ['Hold Person', 'Misty Step'],
    3: ['Haste', 'Protection from Energy'],
    4: ['Banishment', 'Dimension Door'],
    5: ['Hold Monster', 'Scrying'],
  },
  paladin_conquest: {
    1: ['Armor of Agathys', 'Command'],
    2: ['Hold Person', 'Spiritual Weapon'],
    3: ['Bestow Curse', 'Fear'],
    4: ['Dominate Beast', 'Stoneskin'],
    5: ['Cloudkill', 'Dominate Person'],
  },
  paladin_oathbreaker: {
    1: ['Hellish Rebuke', 'Inflict Wounds'],
    2: ['Crown of Madness', 'Darkness'],
    3: ['Animate Dead', 'Bestow Curse'],
    4: ['Blight', 'Confusion'],
    5: ['Contagion', 'Dominate Person'],
  },
  paladin_redemption: {
    1: ['Sanctuary', 'Sleep'],
    2: ['Calm Emotions', 'Hold Person'],
    3: ['Counterspell', 'Hypnotic Pattern'],
    4: ['Otiluke\'s Resilient Sphere', 'Stoneskin'],
    5: ['Hold Monster', 'Wall of Force'],
  },
  // ── Druid circles ─────────────────────────────────────────────────────────
  druid_wildfire: {
    1: ['Burning Hands', 'Cure Wounds'],
    2: ['Flaming Sphere', 'Scorching Ray'],
    3: ['Plant Growth', 'Revivify'],
    4: ['Aura of Life', 'Fire Shield'],
    5: ['Flame Strike', 'Mass Cure Wounds'],
  },
  druid_spores: {
    1: ['Blindness/Deafness', 'Gentle Repose'],
    2: ['Animate Dead', 'Gaseous Form'],
    3: ['Blight', 'Confusion'],
    4: ['Cloudkill', 'Contagion'],
    5: [],
  },
  druid_stars: {
    1: ['Guiding Bolt', 'Healing Word'],
    2: ['Moonbeam', 'Silence'],
    3: ['Aura of Glory', 'Death Ward'],
    4: ['Greater Invisibility', 'Resistance'],
    5: ['Mass Cure Wounds', 'Mislead'],
  },
  druid_shepherd: {
    1: ['Animal Friendship', 'Speak with Animals'],
    2: ['Beast Sense', 'Spike Growth'],
    3: ['Conjure Animals', 'Dispel Magic'],
    4: ['Conjure Woodland Beings', 'Dominate Beast'],
    5: ['Conjure Celestial', 'Insect Plague'],
  },
}

// -----------------------------
// Helper functions for limits
// -----------------------------

/**
 * Max cantrips a class can know at a given level.
 * Returns 0 for non-cantrip classes (paladin, ranger) or unknown classes.
 */
export function getCantripsKnown(classKey: SpellcastingClassKey, level: number): number {
  const table = CANTRIPS_KNOWN_BY_CLASS[classKey]
  if (!table) return 0
  const safeLevel = Math.min(Math.max(level, 1), 20)
  return table[safeLevel] ?? 0
}

/**
 * Max leveled spells a known-spell caster can know at a given level.
 * Returns null for prepared casters (cleric, druid, wizard, paladin) — use
 * ability mod + level formula for those instead.
 */
export function getSpellsKnown(classKey: SpellcastingClassKey, level: number): number | null {
  const table = SPELLS_KNOWN_BY_CLASS[classKey]
  if (!table) return null // prepared caster — no spells-known table
  const safeLevel = Math.min(Math.max(level, 1), 20)
  return table[safeLevel] ?? 0
}

/**
 * Wizard spellbook size: leveled spells (not cantrips) the Wizard can record.
 * Starts with 6 at level 1, gains 2 per level after.
 */
export function getWizardSpellbookSize(level: number): number {
  return 6 + (Math.max(Math.min(level, 20), 1) - 1) * 2
}

/**
 * Returns the domain/oath/circle spell names granted by a subclass up to
 * the given maxSpellLevel (1–5). Spell names are raw strings — filter against
 * SRD_SPELLS at the call site to drop non-SRD entries.
 *
 * Returns an empty array when the subclass has no domain spells or is unknown.
 */
export function getDomainSpells(subclassKey: string, maxSpellLevel: number): string[] {
  const map = DOMAIN_SPELLS_BY_SUBCLASS[subclassKey]
  if (!map) return []
  const result: string[] = []
  for (let lvl = 1; lvl <= Math.min(maxSpellLevel, 5); lvl++) {
    result.push(...(map[lvl] ?? []))
  }
  return result
}
