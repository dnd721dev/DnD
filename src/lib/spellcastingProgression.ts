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
    1: ['Guiding Bolt', 'Shield of Faith'],
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

  // ── Ranger Conclaves (Tasha's optional always-prepared spells) ───────────
  // Wave 1A: these subclasses have explicit expanded spell lists in XGtE or
  // Tasha's. Hunter / Beast Master from PHB don't have a fixed list (Tasha's
  // adds one; included here for parity).
  ranger_hunter: {
    1: ["Hunter's Mark"],
    2: ['Pass without Trace'],
    3: ['Lightning Arrow'],
    4: ['Stoneskin'],
    5: ['Swift Quiver'],
  },
  ranger_beast_master: {
    1: ['Animal Friendship'],
    2: ['Beast Sense'],
    3: ['Conjure Animals'],
    4: ['Dominate Beast'],
    5: ['Commune with Nature'],
  },
  ranger_gloom_stalker: {
    1: ['Disguise Self'],
    2: ['Rope Trick'],
    3: ['Fear'],
    4: ['Greater Invisibility'],
    5: ['Seeming'],
  },
  ranger_horizon_walker: {
    1: ['Protection from Evil and Good'],
    2: ['Misty Step'],
    3: ['Haste'],
    4: ['Banishment'],
    5: ['Teleportation Circle'],
  },
  ranger_monster_slayer: {
    1: ['Protection from Evil and Good'],
    2: ['Zone of Truth'],
    3: ['Magic Circle'],
    4: ['Banishment'],
    5: ['Hold Monster'],
  },
  ranger_fey_wanderer: {
    1: ['Charm Person'],
    2: ['Misty Step'],
    3: ['Dispel Magic'],
    4: ['Dimension Door'],
    5: ['Mislead'],
  },
  ranger_swarmkeeper: {
    1: ['Faerie Fire'],
    2: ['Web'],
    3: ['Gaseous Form'],
    4: ['Arcane Eye'],
    5: ['Insect Plague'],
  },
  ranger_drakewarden: {
    1: ['Thunderwave'],
    2: ["Aganazzar's Scorcher"],
    3: ['Fear'],
    4: ['Arcane Eye'],
    5: ['Hold Monster'],
  },

  // ── Warlock Patrons (always-prepared in addition to spells known) ────────
  warlock_fiend: {
    1: ['Burning Hands', 'Command'],
    2: ['Blindness/Deafness', 'Scorching Ray'],
    3: ['Fireball', 'Stinking Cloud'],
    4: ['Fire Shield', 'Wall of Fire'],
    5: ['Flame Strike', 'Hallow'],
  },
  warlock_archfey: {
    1: ['Faerie Fire', 'Sleep'],
    2: ['Calm Emotions', 'Phantasmal Force'],
    3: ['Blink', 'Plant Growth'],
    4: ['Dominate Beast', 'Greater Invisibility'],
    5: ['Dominate Person', 'Seeming'],
  },
  warlock_great_old_one: {
    1: ['Dissonant Whispers', "Tasha's Hideous Laughter"],
    2: ['Detect Thoughts', 'Phantasmal Force'],
    3: ['Clairvoyance', 'Sending'],
    4: ["Evard's Black Tentacles", 'Dominate Beast'],
    5: ['Dominate Person', 'Telekinesis'],
  },
  warlock_celestial: {
    1: ['Cure Wounds', 'Guiding Bolt'],
    2: ['Flaming Sphere', 'Lesser Restoration'],
    3: ['Daylight', 'Revivify'],
    4: ['Guardian of Faith', 'Wall of Fire'],
    5: ['Flame Strike', 'Greater Restoration'],
  },
  warlock_hexblade: {
    1: ['Shield', 'Wrathful Smite'],
    2: ['Blur', 'Branding Smite'],
    3: ['Blink', 'Elemental Weapon'],
    4: ['Phantasmal Killer', 'Staggering Smite'],
    5: ['Banishing Smite', 'Cone of Cold'],
  },
  warlock_fathomless: {
    1: ['Create or Destroy Water', 'Thunderwave'],
    2: ['Gust of Wind', 'Silence'],
    3: ['Lightning Bolt', 'Sleet Storm'],
    4: ['Control Water', 'Summon Elemental'],
    5: ["Bigby's Hand", 'Cone of Cold'],
  },
  warlock_genie: {
    1: ['Detect Evil and Good', 'Phantom Steed'],
    2: ['Phantasmal Force', 'Protection from Evil and Good'],
    3: ['Create Food and Water', 'Sending'],
    4: ['Phantasmal Killer', 'Stoneskin'],
    5: ['Creation', 'Wall of Stone'],
  },
  warlock_undying: {
    1: ['False Life', 'Ray of Sickness'],
    2: ['Blindness/Deafness', 'Silence'],
    3: ['Feign Death', 'Speak with Dead'],
    4: ['Aura of Life', 'Death Ward'],
    5: ['Contagion', 'Legend Lore'],
  },
  warlock_undead: {
    1: ['Bane', 'False Life'],
    2: ['Blindness/Deafness', 'Phantasmal Force'],
    3: ['Phantom Steed', 'Speak with Dead'],
    4: ['Death Ward', 'Greater Invisibility'],
    5: ['Antilife Shell', 'Cloudkill'],
  },

  // ── Sorcerous Origins with explicit expanded spell lists (Tasha's) ───────
  // 2014 PHB Draconic Bloodline / Wild Magic have no expanded list.
  // Divine Soul: picks from cleric — handled differently, no fixed list here.
  sorcerer_aberrant_mind: {
    1: ['Arms of Hadar', 'Dissonant Whispers'],
    2: ['Calm Emotions', 'Detect Thoughts'],
    3: ['Hunger of Hadar', 'Sending'],
    4: ["Evard's Black Tentacles", 'Summon Aberration'],
    5: ["Rary's Telepathic Bond", 'Telekinesis'],
  },
  sorcerer_clockwork_soul: {
    1: ['Alarm', 'Protection from Evil and Good'],
    2: ['Aid', 'Lesser Restoration'],
    3: ['Dispel Magic', 'Protection from Energy'],
    4: ['Freedom of Movement', 'Summon Construct'],
    5: ['Greater Restoration', 'Wall of Force'],
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

// -----------------------------
// Wave 6 — Multiclass support
// -----------------------------

/**
 * One class entry for a multiclass character.
 * Single-class characters are represented as a single-element array.
 */
export type MulticlassEntry = {
  classKey: ClassKey
  level: number
  subclassKey?: string | null
}

/**
 * PHB p.165 — multiclass ability score prerequisites. Each entry lists the
 * minimum ability score(s) you need to take a level in that class.
 *
 * Special cases:
 * - Fighter: STR OR DEX 13 (`anyOf`)
 * - Monk: DEX AND WIS 13
 * - Paladin: STR AND CHA 13
 * - Ranger: DEX AND WIS 13
 */
export const MULTICLASS_PREREQS: Partial<Record<ClassKey, {
  all?: Array<{ ability: 'str'|'dex'|'con'|'int'|'wis'|'cha', min: number }>
  anyOf?: Array<{ ability: 'str'|'dex'|'con'|'int'|'wis'|'cha', min: number }>
}>> = {
  barbarian: { all: [{ ability: 'str', min: 13 }] },
  bard:      { all: [{ ability: 'cha', min: 13 }] },
  cleric:    { all: [{ ability: 'wis', min: 13 }] },
  druid:     { all: [{ ability: 'wis', min: 13 }] },
  fighter:   { anyOf: [{ ability: 'str', min: 13 }, { ability: 'dex', min: 13 }] },
  monk:      { all: [{ ability: 'dex', min: 13 }, { ability: 'wis', min: 13 }] },
  paladin:   { all: [{ ability: 'str', min: 13 }, { ability: 'cha', min: 13 }] },
  ranger:    { all: [{ ability: 'dex', min: 13 }, { ability: 'wis', min: 13 }] },
  rogue:     { all: [{ ability: 'dex', min: 13 }] },
  sorcerer:  { all: [{ ability: 'cha', min: 13 }] },
  warlock:   { all: [{ ability: 'cha', min: 13 }] },
  wizard:    { all: [{ ability: 'int', min: 13 }] },
  artificer: { all: [{ ability: 'int', min: 13 }] },
}

/**
 * Check whether a character with the given ability scores can multiclass
 * INTO `targetClass`. Per PHB, BOTH the current class and the target class
 * must satisfy their respective prereqs (i.e. you can't multiclass FROM
 * a class you no longer qualify for either, but in practice this is checked
 * at the target-class side since the starting class has no prereq).
 *
 * Returns:
 *   { ok: true } on success
 *   { ok: false, reason: '...' } with a player-readable explanation
 */
export function canMulticlassInto(
  targetClass: ClassKey,
  abilities: Partial<Record<'str'|'dex'|'con'|'int'|'wis'|'cha', number>>,
  currentClass?: ClassKey,
): { ok: true } | { ok: false, reason: string } {
  function check(cls: ClassKey): string | null {
    const req = MULTICLASS_PREREQS[cls]
    if (!req) return null
    if (req.all) {
      for (const c of req.all) {
        const score = Number(abilities[c.ability] ?? 0)
        if (score < c.min) {
          return `${cls} requires ${c.ability.toUpperCase()} ${c.min}+ (has ${score})`
        }
      }
    }
    if (req.anyOf) {
      const matched = req.anyOf.some(c => Number(abilities[c.ability] ?? 0) >= c.min)
      if (!matched) {
        const list = req.anyOf.map(c => `${c.ability.toUpperCase()} ${c.min}`).join(' or ')
        return `${cls} requires ${list}`
      }
    }
    return null
  }

  // Target class must satisfy prereqs.
  const targetErr = check(targetClass)
  if (targetErr) return { ok: false, reason: targetErr }
  // Original (current) class also must satisfy prereqs to multiclass.
  if (currentClass && currentClass !== targetClass) {
    const currentErr = check(currentClass)
    if (currentErr) return { ok: false, reason: `Current class — ${currentErr}` }
  }
  return { ok: true }
}

/**
 * Compute combined spell slots for a multiclass spellcaster per PHB p.164.
 *
 * Caster-level contribution:
 *   - Full caster (Bard/Cleric/Druid/Sorcerer/Wizard): full level
 *   - Half caster (Paladin/Ranger): floor(level / 2), but counted only at
 *     level 2+ (level 1 contributes nothing)
 *   - Artificer: ceil(level / 2) — half-caster that rounds up
 *   - Third caster (EK / AT subclasses): floor(level / 3) at level 3+
 *
 * Warlocks are NOT combined here — Warlock pact magic is a separate slot
 * pool and stays the way it is. Callers handle Warlock separately.
 *
 * Returns the slots from the FULL_CASTER_SLOTS_BY_LEVEL table at the
 * computed combined caster level. Returns {} for non-casters.
 */
export function getMulticlassSlots(entries: MulticlassEntry[]): SpellSlots {
  let casterLevels = 0
  for (const e of entries) {
    const cls = e.classKey
    const lvl = Math.max(0, Math.floor(e.level))
    if (lvl === 0) continue
    const casterType = CLASS_CASTER_TYPE[cls]
    // Warlocks not combined.
    if (cls === 'warlock') continue
    // Third-caster contribution (EK / AT) — only when subclass actually grants it
    if (casterType === 'none') {
      const sub = (e.subclassKey ?? '').toLowerCase()
      const isEK = cls === 'fighter' && sub === 'fighter_eldritch_knight'
      const isAT = cls === 'rogue' && sub === 'rogue_arcane_trickster'
      if ((isEK || isAT) && lvl >= 3) casterLevels += Math.floor(lvl / 3)
      continue
    }
    if (casterType === 'full') casterLevels += lvl
    else if (casterType === 'half') {
      // Paladin/Ranger: level 1 contributes 0 (no slots yet); level 2+ contributes floor(level/2)
      if (lvl >= 2) casterLevels += Math.floor(lvl / 2)
    }
    else if (casterType === 'artificer') casterLevels += Math.ceil(lvl / 2)
    else if (casterType === 'third') casterLevels += Math.floor(lvl / 3)
  }
  if (casterLevels <= 0) return {}
  // Use the full-caster table at the combined level.
  return getSlotsForCasterType('full', casterLevels)
}

// -----------------------------
// Wave 3 — Warlock Mystic Arcanum (PHB)
// -----------------------------

/**
 * Returns the list of Mystic Arcanum spell levels a Warlock has unlocked.
 * - 6th-level Arcanum at character level 11
 * - 7th-level at 13
 * - 8th-level at 15
 * - 9th-level at 17
 *
 * Each arcanum is castable 1/day (long rest). For non-Warlocks, returns [].
 */
export function getMysticArcanumLevels(
  classKey: string | null | undefined,
  level: number,
): number[] {
  if ((classKey ?? '').toLowerCase() !== 'warlock') return []
  const unlocked: number[] = []
  if (level >= 11) unlocked.push(6)
  if (level >= 13) unlocked.push(7)
  if (level >= 15) unlocked.push(8)
  if (level >= 17) unlocked.push(9)
  return unlocked
}

// -----------------------------
// Wave 1B — EK/AT any-school wildcard picks
// -----------------------------

/**
 * Eldritch Knight and Arcane Trickster gain one any-school spell pick at
 * character levels 3, 8, 14, and 20 (per the PHB rules for these subclasses).
 * Returns the total number of wildcard picks available at the given level,
 * or 0 for any other subclass / classKey.
 *
 * Players can use a wildcard to add a leveled spell from any school
 * (otherwise restricted by `getAllowedSchoolsForSubclass`).
 */
export function getWildcardCountForSubclass(
  classKey: string | null | undefined,
  subclassKey: string | null | undefined,
  level: number,
): number {
  const cls = (classKey ?? '').toLowerCase()
  const sub = (subclassKey ?? '').toLowerCase()
  const isEK = cls === 'fighter' && sub === 'fighter_eldritch_knight'
  const isAT = cls === 'rogue' && sub === 'rogue_arcane_trickster'
  if (!isEK && !isAT) return 0
  // Milestones: 3, 8, 14, 20
  let count = 0
  if (level >= 3) count++
  if (level >= 8) count++
  if (level >= 14) count++
  if (level >= 20) count++
  return count
}

// -----------------------------
// Section D — Subclass school restrictions (EK / AT)
// -----------------------------

/**
 * Returns the spell schools an EK / AT must restrict their non-cantrip picks
 * to, or `null` for any class without a school restriction.
 *
 * - Eldritch Knight (fighter_eldritch_knight): Abjuration, Evocation
 * - Arcane Trickster (rogue_arcane_trickster): Enchantment, Illusion
 *
 * Note: 5e gives EK/AT one any-school "wildcard" pick at levels 3, 8, 14, 20.
 * This V1 implementation does not enforce wildcards — picks are limited
 * to the listed schools regardless of level. The wildcard is tracked as a
 * deferred improvement in the audit plan.
 */
export function getAllowedSchoolsForSubclass(
  classKey: string | null | undefined,
  subclassKey: string | null | undefined,
): string[] | null {
  const cls = (classKey ?? '').toLowerCase()
  const sub = (subclassKey ?? '').toLowerCase()
  if (cls === 'fighter' && sub === 'fighter_eldritch_knight') {
    return ['Abjuration', 'Evocation']
  }
  if (cls === 'rogue' && sub === 'rogue_arcane_trickster') {
    return ['Enchantment', 'Illusion']
  }
  return null
}

// -----------------------------
// Section A / F — Max spell level + spells-known unified helpers
// -----------------------------

/**
 * The highest spell level a character can cast at the given level/class/subclass.
 * Returns 0 if the character is not a spellcaster.
 *
 * - Warlocks use pact magic (returns the pactSlotLevel).
 * - Half-casters (paladin/ranger) at level 1 have no slots yet — but per the
 *   character-creation step (`isHalfCasterNoSlotsYet`), they can already pick
 *   level-1 spells they'll cast at level 2. Pass `treatLevel1HalfCasterAsLevel1`
 *   = true to opt into that behavior; otherwise the slot table is followed.
 * - EK / AT at level 1–2 have no slots and no third-caster spellcasting yet.
 */
export function getMaxSpellLevelForClass(
  classKey: string | null | undefined,
  subclassKey: string | null | undefined,
  level: number,
  treatLevel1HalfCasterAsLevel1 = false,
): number {
  const cls = (classKey ?? '').toLowerCase()
  const sub = (subclassKey ?? '').toLowerCase()
  if (cls === 'warlock') {
    return getWarlockPactRow(level)?.pactSlotLevel ?? 1
  }
  const isEK = cls === 'fighter' && sub === 'fighter_eldritch_knight' && level >= 3
  const isAT = cls === 'rogue' && sub === 'rogue_arcane_trickster' && level >= 3
  const slots = isEK || isAT
    ? getSlotsForCasterType('third', level)
    : getSpellSlotsForClass(cls as ClassKey, level)
  const keys = Object.keys(slots).map(Number).filter(k => slots[k] > 0)
  if (keys.length > 0) return Math.max(...keys)
  if (treatLevel1HalfCasterAsLevel1 && (cls === 'paladin' || cls === 'ranger')) return 1
  return 0
}

/**
 * Max leveled spells known for known-spell casters, OR the Wizard spellbook
 * size when the class is Wizard. Returns null for prepared casters
 * (cleric / druid / paladin / artificer) — those use prepared-formula instead.
 *
 * Cantrips are NOT counted in this number — use `getCantripsKnown` for those.
 */
export function getMaxLeveledSpellsKnown(
  classKey: string | null | undefined,
  level: number,
): number | null {
  const cls = (classKey ?? '').toLowerCase() as SpellcastingClassKey
  if (cls === 'wizard') return getWizardSpellbookSize(level)
  return getSpellsKnown(cls, level) // null for prepared casters
}
