// src/lib/weapons.ts
// SRD-style weapon library for DND721.
// Names, damage dice, and properties mirror the 5e SRD weapon table.
// Descriptions are short/original so we stay clear of long rules text.

export type WeaponCategory = 'simple' | 'martial'
export type WeaponGroup = 'melee' | 'ranged'

export type DamageType = 'bludgeoning' | 'piercing' | 'slashing'

export type WeaponProperty =
  | 'ammunition'
  | 'finesse'
  | 'heavy'
  | 'light'
  | 'loading'
  | 'reach'
  | 'thrown'
  | 'twoHanded'
  | 'versatile'
  | 'special'

// Core weapon shape
export type Weapon = {
  /** Internal key you’ll store on the character (e.g. "longsword") */
  key: string
  /** Display name (e.g. "Longsword") */
  name: string
  category: WeaponCategory
  group: WeaponGroup
  damageDice: string // e.g. "1d8"
  damageType: DamageType
  /** Properties like Finesse, Reach, etc. */
  properties: WeaponProperty[]
  /** Weight in pounds (SRD values, but you can ignore them if you want). */
  weight: number
  /** Cost in gold pieces as a string; use for shop UI later if you like. */
  costGp: string
  /** Normal / long range for ranged or thrown weapons (in feet). */
  range?: {
    normal: number
    long: number
  }
}

// -------------------------------------
// Full weapon list (5e SRD weapons)
// -------------------------------------

export const WEAPONS: Record<string, Weapon> = {
  // ===== SIMPLE MELEE =====
  club: {
    key: 'club',
    name: 'Club',
    category: 'simple',
    group: 'melee',
    damageDice: '1d4',
    damageType: 'bludgeoning',
    properties: ['light'],
    weight: 2,
    costGp: '0.1',
  },
  dagger: {
    key: 'dagger',
    name: 'Dagger',
    category: 'simple',
    group: 'melee',
    damageDice: '1d4',
    damageType: 'piercing',
    properties: ['finesse', 'light', 'thrown'],
    weight: 1,
    costGp: '2',
    range: { normal: 20, long: 60 },
  },
  greatclub: {
    key: 'greatclub',
    name: 'Greatclub',
    category: 'simple',
    group: 'melee',
    damageDice: '1d8',
    damageType: 'bludgeoning',
    properties: ['twoHanded'],
    weight: 10,
    costGp: '0.2',
  },
  handaxe: {
    key: 'handaxe',
    name: 'Handaxe',
    category: 'simple',
    group: 'melee',
    damageDice: '1d6',
    damageType: 'slashing',
    properties: ['light', 'thrown'],
    weight: 2,
    costGp: '5',
    range: { normal: 20, long: 60 },
  },
  javelin: {
    key: 'javelin',
    name: 'Javelin',
    category: 'simple',
    group: 'melee',
    damageDice: '1d6',
    damageType: 'piercing',
    properties: ['thrown'],
    weight: 2,
    costGp: '0.5',
    range: { normal: 30, long: 120 },
  },
  lightHammer: {
    key: 'lightHammer',
    name: 'Light Hammer',
    category: 'simple',
    group: 'melee',
    damageDice: '1d4',
    damageType: 'bludgeoning',
    properties: ['light', 'thrown'],
    weight: 2,
    costGp: '2',
    range: { normal: 20, long: 60 },
  },
  mace: {
    key: 'mace',
    name: 'Mace',
    category: 'simple',
    group: 'melee',
    damageDice: '1d6',
    damageType: 'bludgeoning',
    properties: [],
    weight: 4,
    costGp: '5',
  },
  quarterstaff: {
    key: 'quarterstaff',
    name: 'Quarterstaff',
    category: 'simple',
    group: 'melee',
    damageDice: '1d6',
    damageType: 'bludgeoning',
    properties: ['versatile'],
    weight: 4,
    costGp: '0.2',
  },
  sickle: {
    key: 'sickle',
    name: 'Sickle',
    category: 'simple',
    group: 'melee',
    damageDice: '1d4',
    damageType: 'slashing',
    properties: ['light'],
    weight: 2,
    costGp: '1',
  },
  spear: {
    key: 'spear',
    name: 'Spear',
    category: 'simple',
    group: 'melee',
    damageDice: '1d6',
    damageType: 'piercing',
    properties: ['thrown', 'versatile'],
    weight: 3,
    costGp: '1',
    range: { normal: 20, long: 60 },
  },

  // ===== SIMPLE RANGED =====
  lightCrossbow: {
    key: 'lightCrossbow',
    name: 'Light Crossbow',
    category: 'simple',
    group: 'ranged',
    damageDice: '1d8',
    damageType: 'piercing',
    properties: ['ammunition', 'loading', 'twoHanded'],
    weight: 5,
    costGp: '25',
    range: { normal: 80, long: 320 },
  },
  dart: {
    key: 'dart',
    name: 'Dart',
    category: 'simple',
    group: 'ranged',
    damageDice: '1d4',
    damageType: 'piercing',
    properties: ['finesse', 'thrown'],
    weight: 0.25,
    costGp: '0.05',
    range: { normal: 20, long: 60 },
  },
  shortbow: {
    key: 'shortbow',
    name: 'Shortbow',
    category: 'simple',
    group: 'ranged',
    damageDice: '1d6',
    damageType: 'piercing',
    properties: ['ammunition', 'twoHanded'],
    weight: 2,
    costGp: '25',
    range: { normal: 80, long: 320 },
  },
  sling: {
    key: 'sling',
    name: 'Sling',
    category: 'simple',
    group: 'ranged',
    damageDice: '1d4',
    damageType: 'bludgeoning',
    properties: ['ammunition'],
    weight: 0,
    costGp: '0.1',
    range: { normal: 30, long: 120 },
  },

  // ===== MARTIAL MELEE =====
  battleaxe: {
    key: 'battleaxe',
    name: 'Battleaxe',
    category: 'martial',
    group: 'melee',
    damageDice: '1d8',
    damageType: 'slashing',
    properties: ['versatile'],
    weight: 4,
    costGp: '10',
  },
  flail: {
    key: 'flail',
    name: 'Flail',
    category: 'martial',
    group: 'melee',
    damageDice: '1d8',
    damageType: 'bludgeoning',
    properties: [],
    weight: 2,
    costGp: '10',
  },
  glaive: {
    key: 'glaive',
    name: 'Glaive',
    category: 'martial',
    group: 'melee',
    damageDice: '1d10',
    damageType: 'slashing',
    properties: ['heavy', 'reach', 'twoHanded'],
    weight: 6,
    costGp: '20',
  },
  greataxe: {
    key: 'greataxe',
    name: 'Greataxe',
    category: 'martial',
    group: 'melee',
    damageDice: '1d12',
    damageType: 'slashing',
    properties: ['heavy', 'twoHanded'],
    weight: 7,
    costGp: '30',
  },
  greatsword: {
    key: 'greatsword',
    name: 'Greatsword',
    category: 'martial',
    group: 'melee',
    damageDice: '2d6',
    damageType: 'slashing',
    properties: ['heavy', 'twoHanded'],
    weight: 6,
    costGp: '50',
  },
  halberd: {
    key: 'halberd',
    name: 'Halberd',
    category: 'martial',
    group: 'melee',
    damageDice: '1d10',
    damageType: 'slashing',
    properties: ['heavy', 'reach', 'twoHanded'],
    weight: 6,
    costGp: '20',
  },
  lance: {
    key: 'lance',
    name: 'Lance',
    category: 'martial',
    group: 'melee',
    damageDice: '1d12',
    damageType: 'piercing',
    properties: ['reach', 'special'],
    weight: 6,
    costGp: '10',
  },
  longsword: {
    key: 'longsword',
    name: 'Longsword',
    category: 'martial',
    group: 'melee',
    damageDice: '1d8',
    damageType: 'slashing',
    properties: ['versatile'],
    weight: 3,
    costGp: '15',
  },
  maul: {
    key: 'maul',
    name: 'Maul',
    category: 'martial',
    group: 'melee',
    damageDice: '2d6',
    damageType: 'bludgeoning',
    properties: ['heavy', 'twoHanded'],
    weight: 10,
    costGp: '10',
  },
  morningstar: {
    key: 'morningstar',
    name: 'Morningstar',
    category: 'martial',
    group: 'melee',
    damageDice: '1d8',
    damageType: 'piercing',
    properties: [],
    weight: 4,
    costGp: '15',
  },
  pike: {
    key: 'pike',
    name: 'Pike',
    category: 'martial',
    group: 'melee',
    damageDice: '1d10',
    damageType: 'piercing',
    properties: ['heavy', 'reach', 'twoHanded'],
    weight: 18,
    costGp: '5',
  },
  rapier: {
    key: 'rapier',
    name: 'Rapier',
    category: 'martial',
    group: 'melee',
    damageDice: '1d8',
    damageType: 'piercing',
    properties: ['finesse'],
    weight: 2,
    costGp: '25',
  },
  scimitar: {
    key: 'scimitar',
    name: 'Scimitar',
    category: 'martial',
    group: 'melee',
    damageDice: '1d6',
    damageType: 'slashing',
    properties: ['finesse', 'light'],
    weight: 3,
    costGp: '25',
  },
  shortsword: {
    key: 'shortsword',
    name: 'Shortsword',
    category: 'martial',
    group: 'melee',
    damageDice: '1d6',
    damageType: 'piercing',
    properties: ['finesse', 'light'],
    weight: 2,
    costGp: '10',
  },
  trident: {
    key: 'trident',
    name: 'Trident',
    category: 'martial',
    group: 'melee',
    damageDice: '1d6',
    damageType: 'piercing',
    properties: ['thrown', 'versatile'],
    weight: 4,
    costGp: '5',
    range: { normal: 20, long: 60 },
  },
  warPick: {
    key: 'warPick',
    name: 'War Pick',
    category: 'martial',
    group: 'melee',
    damageDice: '1d8',
    damageType: 'piercing',
    properties: [],
    weight: 2,
    costGp: '5',
  },
  warhammer: {
    key: 'warhammer',
    name: 'Warhammer',
    category: 'martial',
    group: 'melee',
    damageDice: '1d8',
    damageType: 'bludgeoning',
    properties: ['versatile'],
    weight: 2,
    costGp: '15',
  },
  whip: {
    key: 'whip',
    name: 'Whip',
    category: 'martial',
    group: 'melee',
    damageDice: '1d4',
    damageType: 'slashing',
    properties: ['finesse', 'reach'],
    weight: 3,
    costGp: '2',
  },

  // ===== MARTIAL RANGED =====
  blowgun: {
    key: 'blowgun',
    name: 'Blowgun',
    category: 'martial',
    group: 'ranged',
    damageDice: '1',
    damageType: 'piercing',
    properties: ['ammunition', 'loading'],
    weight: 1,
    costGp: '10',
    range: { normal: 25, long: 100 },
  },
  handCrossbow: {
    key: 'handCrossbow',
    name: 'Hand Crossbow',
    category: 'martial',
    group: 'ranged',
    damageDice: '1d6',
    damageType: 'piercing',
    properties: ['ammunition', 'light', 'loading'],
    weight: 3,
    costGp: '75',
    range: { normal: 30, long: 120 },
  },
  heavyCrossbow: {
    key: 'heavyCrossbow',
    name: 'Heavy Crossbow',
    category: 'martial',
    group: 'ranged',
    damageDice: '1d10',
    damageType: 'piercing',
    properties: ['ammunition', 'heavy', 'loading', 'twoHanded'],
    weight: 18,
    costGp: '50',
    range: { normal: 100, long: 400 },
  },
  longbow: {
    key: 'longbow',
    name: 'Longbow',
    category: 'martial',
    group: 'ranged',
    damageDice: '1d8',
    damageType: 'piercing',
    properties: ['ammunition', 'heavy', 'twoHanded'],
    weight: 2,
    costGp: '50',
    range: { normal: 150, long: 600 },
  },
  net: {
    key: 'net',
    name: 'Net',
    category: 'martial',
    group: 'ranged',
    damageDice: '0',
    damageType: 'bludgeoning',
    properties: ['thrown', 'special'],
    weight: 3,
    costGp: '1',
    range: { normal: 5, long: 15 },
  },
}

// -------------------------------------
// Helper lists & filters
// -------------------------------------

export const SIMPLE_WEAPONS = Object.values(WEAPONS).filter(
  (w) => w.category === 'simple'
)

export const MARTIAL_WEAPONS = Object.values(WEAPONS).filter(
  (w) => w.category === 'martial'
)

export const SIMPLE_MELEE_WEAPONS = SIMPLE_WEAPONS.filter(
  (w) => w.group === 'melee'
)
export const SIMPLE_RANGED_WEAPONS = SIMPLE_WEAPONS.filter(
  (w) => w.group === 'ranged'
)

export const MARTIAL_MELEE_WEAPONS = MARTIAL_WEAPONS.filter(
  (w) => w.group === 'melee'
)
export const MARTIAL_RANGED_WEAPONS = MARTIAL_WEAPONS.filter(
  (w) => w.group === 'ranged'
)

/**
 * Quick lookup helper by key string.
 * Returns undefined if not found.
 */
export function getWeapon(key: string): Weapon | undefined {
  return WEAPONS[key]
}
