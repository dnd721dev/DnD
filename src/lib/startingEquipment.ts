// src/lib/startingEquipment.ts
// 2024 D&D 5e starting equipment options per class.
// Option A = the class's prescribed starting kit.
// Option B = a gold amount the player spends themselves.

export type ClassStartingKit = {
  /** Short human-readable description of Option A shown in the UI. */
  optionALabel: string
  /** Suggested main weapon key (from WEAPONS). Can be overridden by the player. */
  defaultWeaponKey: string
  /** Suggested armor key (from ARMORS), or null for unarmored classes. */
  defaultArmorKey: string | null
  /** Suggested equipment pack key (from PACKS). */
  defaultPackKey: string
  /** Starting gold for Option B. */
  optionBGold: number
}

export const CLASS_STARTING_EQUIPMENT: Record<string, ClassStartingKit> = {
  barbarian: {
    optionALabel: "Greataxe, 4 javelins, explorer's pack",
    defaultWeaponKey: 'greataxe',
    defaultArmorKey: 'hide',
    defaultPackKey: 'explorers',
    optionBGold: 75,
  },
  bard: {
    optionALabel: "Rapier, leather armor, entertainer's pack",
    defaultWeaponKey: 'rapier',
    defaultArmorKey: 'leather',
    defaultPackKey: 'entertainers',
    optionBGold: 125,
  },
  cleric: {
    optionALabel: "Mace, chain mail, holy symbol, priest's pack",
    defaultWeaponKey: 'mace',
    defaultArmorKey: 'chainMail',
    defaultPackKey: 'priests',
    optionBGold: 125,
  },
  druid: {
    optionALabel: "Scimitar, leather armor, explorer's pack",
    defaultWeaponKey: 'scimitar',
    defaultArmorKey: 'leather',
    defaultPackKey: 'explorers',
    optionBGold: 50,
  },
  fighter: {
    optionALabel: "Longsword + shield, chain mail, dungeoneer's pack",
    defaultWeaponKey: 'longsword',
    defaultArmorKey: 'chainMail',
    defaultPackKey: 'dungeoneers',
    optionBGold: 175,
  },
  monk: {
    optionALabel: "Shortsword, dungeoneer's pack, 10 darts",
    defaultWeaponKey: 'shortsword',
    defaultArmorKey: null,
    defaultPackKey: 'dungeoneers',
    optionBGold: 50,
  },
  paladin: {
    optionALabel: "Longsword + shield, chain mail, priest's pack",
    defaultWeaponKey: 'longsword',
    defaultArmorKey: 'chainMail',
    defaultPackKey: 'priests',
    optionBGold: 175,
  },
  ranger: {
    optionALabel: "Shortsword + longbow, scale mail, explorer's pack",
    defaultWeaponKey: 'longbow',
    defaultArmorKey: 'scaleMail',
    defaultPackKey: 'explorers',
    optionBGold: 150,
  },
  rogue: {
    optionALabel: "Rapier, leather armor, burglar's pack, 2 daggers",
    defaultWeaponKey: 'rapier',
    defaultArmorKey: 'leather',
    defaultPackKey: 'burglars',
    optionBGold: 100,
  },
  sorcerer: {
    optionALabel: "Dagger, component pouch, dungeoneer's pack",
    defaultWeaponKey: 'dagger',
    defaultArmorKey: null,
    defaultPackKey: 'dungeoneers',
    optionBGold: 50,
  },
  warlock: {
    optionALabel: "Rapier, leather armor, scholar's pack, component pouch",
    defaultWeaponKey: 'rapier',
    defaultArmorKey: 'leather',
    defaultPackKey: 'scholars',
    optionBGold: 100,
  },
  wizard: {
    optionALabel: "Quarterstaff, component pouch, scholar's pack, spellbook",
    defaultWeaponKey: 'quarterstaff',
    defaultArmorKey: null,
    defaultPackKey: 'scholars',
    optionBGold: 50,
  },
}
