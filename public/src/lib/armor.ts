// src/lib/armor.ts
// SRD-style armor library for DND721.
// AC values, weights, and categories follow the 5e SRD table.

export type ArmorCategory = 'light' | 'medium' | 'heavy' | 'shield'

export type Armor = {
  /** Internal key, e.g. "leather" */
  key: string
  /** Display name, e.g. "Leather Armor" */
  name: string
  category: ArmorCategory
  /**
   * Base AC. For formulas like "12 + Dex (max 2)" we store:
   * - baseAc: 12
   * - dexCap: 2 (or null if no cap, or 0 if Dex doesn't apply)
   */
  baseAc: number
  /** Maximum Dexterity bonus to AC (null = no cap, 0 = Dex not applied). */
  dexCap: number | null
  /** Whether this armor requires a minimum Strength score to wear comfortably. */
  strengthRequirement: number | null
  /** Whether it imposes disadvantage on Stealth checks. */
  disadvantageOnStealth: boolean
  /** Weight in pounds (SRD value). */
  weight: number
  /** Cost in gold pieces as a string. */
  costGp: string
}

// -------------------------------------
// Armor List (5e SRD)
// -------------------------------------

export const ARMORS: Record<string, Armor> = {
  // ===== LIGHT ARMOR =====
  padded: {
    key: 'padded',
    name: 'Padded Armor',
    category: 'light',
    baseAc: 11,
    dexCap: null, // 11 + Dex mod
    strengthRequirement: null,
    disadvantageOnStealth: true,
    weight: 8,
    costGp: '5',
  },
  leather: {
    key: 'leather',
    name: 'Leather Armor',
    category: 'light',
    baseAc: 11,
    dexCap: null, // 11 + Dex mod
    strengthRequirement: null,
    disadvantageOnStealth: false,
    weight: 10,
    costGp: '10',
  },
  studdedLeather: {
    key: 'studdedLeather',
    name: 'Studded Leather Armor',
    category: 'light',
    baseAc: 12,
    dexCap: null, // 12 + Dex mod
    strengthRequirement: null,
    disadvantageOnStealth: false,
    weight: 13,
    costGp: '45',
  },

  // ===== MEDIUM ARMOR =====
  hide: {
    key: 'hide',
    name: 'Hide Armor',
    category: 'medium',
    baseAc: 12,
    dexCap: 2, // 12 + Dex (max +2)
    strengthRequirement: null,
    disadvantageOnStealth: false,
    weight: 12,
    costGp: '10',
  },
  chainShirt: {
    key: 'chainShirt',
    name: 'Chain Shirt',
    category: 'medium',
    baseAc: 13,
    dexCap: 2, // 13 + Dex (max +2)
    strengthRequirement: null,
    disadvantageOnStealth: false,
    weight: 20,
    costGp: '50',
  },
  scaleMail: {
    key: 'scaleMail',
    name: 'Scale Mail',
    category: 'medium',
    baseAc: 14,
    dexCap: 2, // 14 + Dex (max +2)
    strengthRequirement: null,
    disadvantageOnStealth: true,
    weight: 45,
    costGp: '50',
  },
  breastplate: {
    key: 'breastplate',
    name: 'Breastplate',
    category: 'medium',
    baseAc: 14,
    dexCap: 2, // 14 + Dex (max +2)
    strengthRequirement: null,
    disadvantageOnStealth: false,
    weight: 20,
    costGp: '400',
  },
  halfPlate: {
    key: 'halfPlate',
    name: 'Half Plate',
    category: 'medium',
    baseAc: 15,
    dexCap: 2, // 15 + Dex (max +2)
    strengthRequirement: null,
    disadvantageOnStealth: true,
    weight: 40,
    costGp: '750',
  },

  // ===== HEAVY ARMOR =====
  ringMail: {
    key: 'ringMail',
    name: 'Ring Mail',
    category: 'heavy',
    baseAc: 14,
    dexCap: 0, // no Dex bonus
    strengthRequirement: null,
    disadvantageOnStealth: true,
    weight: 40,
    costGp: '30',
  },
  chainMail: {
    key: 'chainMail',
    name: 'Chain Mail',
    category: 'heavy',
    baseAc: 16,
    dexCap: 0, // no Dex bonus
    strengthRequirement: 13,
    disadvantageOnStealth: true,
    weight: 55,
    costGp: '75',
  },
  splint: {
    key: 'splint',
    name: 'Splint Armor',
    category: 'heavy',
    baseAc: 17,
    dexCap: 0, // no Dex bonus
    strengthRequirement: 15,
    disadvantageOnStealth: true,
    weight: 60,
    costGp: '200',
  },
  plate: {
    key: 'plate',
    name: 'Plate Armor',
    category: 'heavy',
    baseAc: 18,
    dexCap: 0, // no Dex bonus
    strengthRequirement: 15,
    disadvantageOnStealth: true,
    weight: 65,
    costGp: '1500',
  },

  // ===== SHIELD =====
  shield: {
    key: 'shield',
    name: 'Shield',
    category: 'shield',
    baseAc: 2, // standard 5e: +2 AC when wielded
    dexCap: null, // shields don’t care about Dex; this is a flat bonus
    strengthRequirement: null,
    disadvantageOnStealth: false,
    weight: 6,
    costGp: '10',
  },
}

// -------------------------------------
// Helper lists & utilities
// -------------------------------------

export const LIGHT_ARMOR = Object.values(ARMORS).filter(
  (a) => a.category === 'light'
)

export const MEDIUM_ARMOR = Object.values(ARMORS).filter(
  (a) => a.category === 'medium'
)

export const HEAVY_ARMOR = Object.values(ARMORS).filter(
  (a) => a.category === 'heavy'
)

export const SHIELDS = Object.values(ARMORS).filter(
  (a) => a.category === 'shield'
)

/**
 * Get armor definition by key, or undefined if not found.
 */
export function getArmor(key: string): Armor | undefined {
  return ARMORS[key]
}

/**
 * Given an armor key and the wearer’s Dexterity modifier,
 * return the total AC *from that armor alone* (not counting shields or other buffs).
 *
 * You can use this helper inside your character sheet derived stats.
 */
export function getArmorAcFromDex(
  armor: Armor,
  dexModifier: number
): number {
  if (armor.category === 'shield') {
    // Shields are usually applied separately as a flat +2 bonus,
    // so we just return baseAc here and let the caller add it on.
    return armor.baseAc
  }

  const dexBonus =
    armor.dexCap === null
      ? dexModifier
      : Math.min(dexModifier, armor.dexCap)

  return armor.baseAc + (armor.dexCap === 0 ? 0 : dexBonus)
}
