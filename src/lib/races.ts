// src/lib/races.ts
// SRD-style race library for DND721.
// Uses 2014-style 5e mechanics (ability bonuses, speed, size, languages).
// Trait text is short/original – reminder only, not full rules text.

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type RaceSize = 'Small' | 'Medium'

export type LanguageKey =
  | 'common'
  | 'dwarvish'
  | 'elvish'
  | 'giant'
  | 'gnomish'
  | 'goblin'
  | 'halfling'
  | 'orc'
  | 'draconic'
  | 'deepSpeech'
  | 'infernal'
  | 'celestial'
  | 'primordial'
  | 'sylvan'
  | 'undercommon'

// Treat subraces as separate keys (simpler for the builder UI).
export type RaceKey =
  | 'dwarf_hill'
  | 'dwarf_mountain'
  | 'elf_high'
  | 'elf_wood'
  | 'elf_drow'
  | 'halfling_lightfoot'
  | 'halfling_stout'
  | 'human_standard'
  | 'dragonborn'
  | 'gnome_forest'
  | 'gnome_rock'
  | 'half_elf'
  | 'half_orc'
  | 'tiefling'

export type RaceTrait = {
  key: string
  name: string
  /** Short reminder of what the trait does, in your own words. */
  summary: string
}

export type Race = {
  key: RaceKey
  name: string
  /** E.g. "Dwarf", "Elf" – used if you want to group subraces in the UI. */
  family: 'Dwarf' | 'Elf' | 'Halfling' | 'Human' | 'Dragonborn' | 'Gnome' | 'Half-Elf' | 'Half-Orc' | 'Tiefling'
  size: RaceSize
  speed: number // base walking speed in feet
  /**
   * Ability score adjustments (e.g. { con: +2, wis: +1 }).
   * Use 0 for abilities that don’t change.
   */
  abilityBonuses: Record<AbilityKey, number>
  /** Darkvision vs normal vision, etc. */
  vision: 'normal' | 'darkvision'
  /** Languages granted automatically. */
  languages: LanguageKey[]
  /**
   * How many extra languages the player can choose in addition to the above.
   * (Half-elf & human typically get one extra.)
   */
  extraLanguageChoices: number
  /** Racial traits like Dwarven Resilience, Fey Ancestry, etc. */
  traits: RaceTrait[]
}

// -----------------------------
// Race definitions (5e-style)
// -----------------------------

export const RACES: Record<RaceKey, Race> = {
  // ===== DWARVES =====
  dwarf_hill: {
    key: 'dwarf_hill',
    name: 'Hill Dwarf',
    family: 'Dwarf',
    size: 'Medium',
    speed: 25,
    abilityBonuses: {
      str: 0,
      dex: 0,
      con: 2,
      int: 0,
      wis: 1,
      cha: 0,
    },
    vision: 'darkvision',
    languages: ['common', 'dwarvish'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'dwarven_resilience',
        name: 'Dwarven Resilience',
        summary:
          'You are naturally tough against poison, both resisting its effects and its damage more easily.',
      },
      {
        key: 'dwarven_combat_training',
        name: 'Dwarven Combat Training',
        summary:
          'You are familiar with traditional dwarf weapons like battleaxes, handaxes, light hammers, and warhammers.',
      },
      {
        key: 'tool_proficiency_dwarf',
        name: 'Tool Proficiency',
        summary:
          'You gain proficiency with a set of artisan’s tools from the classic dwarf crafts (such as smithing, brewing, or stonework).',
      },
      {
        key: 'stonecunning',
        name: 'Stonecunning',
        summary:
          'You have a practiced eye for stonework and can recall details about stone structures more easily.',
      },
      {
        key: 'dwarven_toughness',
        name: 'Dwarven Toughness',
        summary:
          'Your hardy hill dwarf build gives you a small boost to your maximum hit points.',
      },
    ],
  },

  dwarf_mountain: {
    key: 'dwarf_mountain',
    name: 'Mountain Dwarf',
    family: 'Dwarf',
    size: 'Medium',
    speed: 25,
    abilityBonuses: {
      str: 2,
      dex: 0,
      con: 2,
      int: 0,
      wis: 0,
      cha: 0,
    },
    vision: 'darkvision',
    languages: ['common', 'dwarvish'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'dwarven_resilience',
        name: 'Dwarven Resilience',
        summary:
          'You are naturally tough against poison, both resisting its effects and its damage more easily.',
      },
      {
        key: 'dwarven_combat_training',
        name: 'Dwarven Combat Training',
        summary:
          'You are familiar with traditional dwarf weapons like battleaxes, handaxes, light hammers, and warhammers.',
      },
      {
        key: 'tool_proficiency_dwarf',
        name: 'Tool Proficiency',
        summary:
          'You gain proficiency with a set of artisan’s tools from the classic dwarf crafts (such as smithing, brewing, or stonework).',
      },
      {
        key: 'stonecunning',
        name: 'Stonecunning',
        summary:
          'You have a practiced eye for stonework and can recall details about stone structures more easily.',
      },
      {
        key: 'dwarven_armor_training',
        name: 'Dwarven Armor Training',
        summary:
          'You are comfortable fighting in light and medium armor thanks to harsh mountain battles.',
      },
    ],
  },

  // ===== ELVES =====
  elf_high: {
    key: 'elf_high',
    name: 'High Elf',
    family: 'Elf',
    size: 'Medium',
    speed: 30,
    abilityBonuses: {
      str: 0,
      dex: 2,
      con: 0,
      int: 1,
      wis: 0,
      cha: 0,
    },
    vision: 'darkvision',
    languages: ['common', 'elvish'],
    extraLanguageChoices: 1,
    traits: [
      {
        key: 'fey_ancestry',
        name: 'Fey Ancestry',
        summary:
          'Your fey blood makes it harder for magic to charm you, and you are difficult to magically put to sleep.',
      },
      {
        key: 'trance',
        name: 'Trance',
        summary:
          'Instead of sleeping, you enter a light meditative state and recover from rest more quickly than humans.',
      },
      {
        key: 'keen_senses',
        name: 'Keen Senses',
        summary:
          'Elven training gives you proficiency in Perception.',
      },
      {
        key: 'elf_weapon_training',
        name: 'Elf Weapon Training',
        summary:
          'You are practiced with the classic elven weapons like the longsword, shortsword, shortbow, and longbow.',
      },
      {
        key: 'cantrip_high_elf',
        name: 'High Elf Cantrip',
        summary:
          'You know a simple arcane cantrip, hinting at your people’s deep magical tradition.',
      },
    ],
  },

  elf_wood: {
    key: 'elf_wood',
    name: 'Wood Elf',
    family: 'Elf',
    size: 'Medium',
    speed: 35,
    abilityBonuses: {
      str: 0,
      dex: 2,
      con: 0,
      int: 0,
      wis: 1,
      cha: 0,
    },
    vision: 'darkvision',
    languages: ['common', 'elvish'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'fey_ancestry',
        name: 'Fey Ancestry',
        summary:
          'Your fey blood makes it harder for magic to charm you, and you are difficult to magically put to sleep.',
      },
      {
        key: 'trance',
        name: 'Trance',
        summary:
          'Instead of sleeping, you enter a light meditative state and recover from rest more quickly than humans.',
      },
      {
        key: 'keen_senses',
        name: 'Keen Senses',
        summary:
          'Elven training gives you proficiency in Perception.',
      },
      {
        key: 'elf_weapon_training',
        name: 'Elf Weapon Training',
        summary:
          'You are practiced with the classic elven weapons like the longsword, shortsword, shortbow, and longbow.',
      },
      {
        key: 'fleet_of_foot',
        name: 'Fleet of Foot',
        summary:
          'You move faster on foot than most humanoids.',
      },
      {
        key: 'mask_of_the_wild',
        name: 'Mask of the Wild',
        summary:
          'You can attempt to hide even when lightly obscured by natural features like leaves or mist.',
      },
    ],
  },

  elf_drow: {
    key: 'elf_drow',
    name: 'Drow (Dark Elf)',
    family: 'Elf',
    size: 'Medium',
    speed: 30,
    abilityBonuses: {
      str: 0,
      dex: 2,
      con: 0,
      int: 0,
      wis: 0,
      cha: 1,
    },
    vision: 'darkvision',
    languages: ['common', 'elvish'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'fey_ancestry',
        name: 'Fey Ancestry',
        summary:
          'Your fey blood makes it harder for magic to charm you, and you are difficult to magically put to sleep.',
      },
      {
        key: 'trance',
        name: 'Trance',
        summary:
          'Instead of sleeping, you enter a light meditative state and recover from rest more quickly than humans.',
      },
      {
        key: 'keen_senses',
        name: 'Keen Senses',
        summary:
          'Elven training gives you proficiency in Perception.',
      },
      {
        key: 'superior_darkvision',
        name: 'Superior Darkvision',
        summary:
          'You see very well in darkness, farther than typical darkvision.',
      },
      {
        key: 'sunlight_sensitivity',
        name: 'Sunlight Sensitivity',
        summary:
          'Bright sunlight is harsh for you and can make it harder to fight or notice details.',
      },
      {
        key: 'drow_magic',
        name: 'Drow Magic',
        summary:
          'You know a few innate spells tied to shadow and darkness.',
      },
      {
        key: 'drow_weapon_training',
        name: 'Drow Weapon Training',
        summary:
          'You are proficient with rapiers, shortswords, and hand crossbows.',
      },
    ],
  },

  // ===== HALFLINGS =====
  halfling_lightfoot: {
    key: 'halfling_lightfoot',
    name: 'Lightfoot Halfling',
    family: 'Halfling',
    size: 'Small',
    speed: 25,
    abilityBonuses: {
      str: 0,
      dex: 2,
      con: 0,
      int: 0,
      wis: 0,
      cha: 1,
    },
    vision: 'normal',
    languages: ['common', 'halfling'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'lucky',
        name: 'Lucky',
        summary:
          'When you roll poorly on key d20 rolls, you have a knack for getting one more chance.',
      },
      {
        key: 'brave',
        name: 'Brave',
        summary:
          'You are especially hard to frighten.',
      },
      {
        key: 'halfling_nimbleness',
        name: 'Halfling Nimbleness',
        summary:
          'You can move through the space of creatures larger than you as if they weren’t full obstacles.',
      },
      {
        key: 'naturally_stealthy',
        name: 'Naturally Stealthy',
        summary:
          'You can try to hide even when lightly obscured by a creature that is bigger than you.',
      },
    ],
  },

  halfling_stout: {
    key: 'halfling_stout',
    name: 'Stout Halfling',
    family: 'Halfling',
    size: 'Small',
    speed: 25,
    abilityBonuses: {
      str: 0,
      dex: 2,
      con: 1,
      int: 0,
      wis: 0,
      cha: 0,
    },
    vision: 'normal',
    languages: ['common', 'halfling'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'lucky',
        name: 'Lucky',
        summary:
          'When you roll poorly on key d20 rolls, you have a knack for getting one more chance.',
      },
      {
        key: 'brave',
        name: 'Brave',
        summary:
          'You are especially hard to frighten.',
      },
      {
        key: 'halfling_nimbleness',
        name: 'Halfling Nimbleness',
        summary:
          'You can move through the space of creatures larger than you as if they weren’t full obstacles.',
      },
      {
        key: 'stout_resilience',
        name: 'Stout Resilience',
        summary:
          'You have dwarflike hardiness against poison.',
      },
    ],
  },

  // ===== HUMAN =====
  human_standard: {
    key: 'human_standard',
    name: 'Human',
    family: 'Human',
    size: 'Medium',
    speed: 30,
    abilityBonuses: {
      str: 1,
      dex: 1,
      con: 1,
      int: 1,
      wis: 1,
      cha: 1,
    },
    vision: 'normal',
    languages: ['common'],
    extraLanguageChoices: 1,
    traits: [
      {
        key: 'versatile',
        name: 'Versatile',
        summary:
          'Humans are broadly capable; every ability score improves slightly.',
      },
    ],
  },

  // ===== DRAGONBORN =====
  dragonborn: {
    key: 'dragonborn',
    name: 'Dragonborn',
    family: 'Dragonborn',
    size: 'Medium',
    speed: 30,
    abilityBonuses: {
      str: 2,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 1,
    },
    vision: 'normal',
    languages: ['common', 'draconic'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'draconic_ancestry',
        name: 'Draconic Ancestry',
        summary:
          'You have a link to a type of dragon that shapes your elemental breath and resistance.',
      },
      {
        key: 'breath_weapon',
        name: 'Breath Weapon',
        summary:
          'You can exhale elemental energy in a short-range blast or line, usable between rests.',
      },
      {
        key: 'damage_resistance_dragonborn',
        name: 'Damage Resistance',
        summary:
          'You resist damage of the same type as your draconic ancestry.',
      },
    ],
  },

  // ===== GNOMES =====
  gnome_forest: {
    key: 'gnome_forest',
    name: 'Forest Gnome',
    family: 'Gnome',
    size: 'Small',
    speed: 25,
    abilityBonuses: {
      str: 0,
      dex: 1,
      con: 0,
      int: 2,
      wis: 0,
      cha: 0,
    },
    vision: 'darkvision',
    languages: ['common', 'gnomish'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'gnome_cunning',
        name: 'Gnome Cunning',
        summary:
          'You are mentally resilient against many magical effects.',
      },
      {
        key: 'natural_illusionist',
        name: 'Natural Illusionist',
        summary:
          'You know a minor illusion cantrip innately.',
      },
      {
        key: 'speak_with_small_beasts',
        name: 'Speak with Small Beasts',
        summary:
          'Small forest animals tend to understand your simple speech and gestures.',
      },
    ],
  },

  gnome_rock: {
    key: 'gnome_rock',
    name: 'Rock Gnome',
    family: 'Gnome',
    size: 'Small',
    speed: 25,
    abilityBonuses: {
      str: 0,
      dex: 0,
      con: 1,
      int: 2,
      wis: 0,
      cha: 0,
    },
    vision: 'darkvision',
    languages: ['common', 'gnomish'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'gnome_cunning',
        name: 'Gnome Cunning',
        summary:
          'You are mentally resilient against many magical effects.',
      },
      {
        key: 'artificers_lore',
        name: 'Artificer’s Lore',
        summary:
          'You have extra insight into magic items, alchemy, and technical objects.',
      },
      {
        key: 'tinker',
        name: 'Tinker',
        summary:
          'You have a knack for small mechanical devices like toys and gadgets.',
      },
    ],
  },

  // ===== HALF-ELF =====
  half_elf: {
    key: 'half_elf',
    name: 'Half-Elf',
    family: 'Half-Elf',
    size: 'Medium',
    speed: 30,
    abilityBonuses: {
      str: 0,
      dex: 0,
      con: 0,
      int: 0,
      wis: 0,
      cha: 2, // plus two other ability scores of your choice (handled in UI)
    },
    vision: 'darkvision',
    languages: ['common', 'elvish'],
    extraLanguageChoices: 1,
    traits: [
      {
        key: 'ability_versatility_half_elf',
        name: 'Ability Versatility',
        summary:
          'Your mixed heritage lets you boost Charisma and two other abilities of your choice.',
      },
      {
        key: 'fey_ancestry_half_elf',
        name: 'Fey Ancestry',
        summary:
          'You gain some of the elf resistance against charm and magical sleep.',
      },
      {
        key: 'skill_versatility_half_elf',
        name: 'Skill Versatility',
        summary:
          'You gain proficiency in two extra skills of your choice.',
      },
    ],
  },

  // ===== HALF-ORC =====
  half_orc: {
    key: 'half_orc',
    name: 'Half-Orc',
    family: 'Half-Orc',
    size: 'Medium',
    speed: 30,
    abilityBonuses: {
      str: 2,
      dex: 0,
      con: 1,
      int: 0,
      wis: 0,
      cha: 0,
    },
    vision: 'darkvision',
    languages: ['common', 'orc'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'menacing',
        name: 'Menacing',
        summary:
          'Your presence is intimidating; you gain proficiency in Intimidation.',
      },
      {
        key: 'relentless_endurance',
        name: 'Relentless Endurance',
        summary:
          'Once per rest, when you would drop to 0 hit points, you can cling to life at a sliver instead.',
      },
      {
        key: 'savage_attacks',
        name: 'Savage Attacks',
        summary:
          'When you land a critical hit with a melee weapon, you hit especially hard.',
      },
    ],
  },

  // ===== TIEFLING =====
  tiefling: {
    key: 'tiefling',
    name: 'Tiefling',
    family: 'Tiefling',
    size: 'Medium',
    speed: 30,
    abilityBonuses: {
      str: 0,
      dex: 0,
      con: 0,
      int: 1,
      wis: 0,
      cha: 2,
    },
    vision: 'darkvision',
    languages: ['common', 'infernal'],
    extraLanguageChoices: 0,
    traits: [
      {
        key: 'hellish_resistance',
        name: 'Hellish Resistance',
        summary:
          'Your fiendish blood protects you somewhat from fire.',
      },
      {
        key: 'infernal_legacy',
        name: 'Infernal Legacy',
        summary:
          'You know a few innate spells flavored by infernal magic.',
      },
    ],
  },
}

// Ordered list for UI loops
export const RACE_LIST: Race[] = [
  RACES.dwarf_hill,
  RACES.dwarf_mountain,
  RACES.elf_high,
  RACES.elf_wood,
  RACES.elf_drow,
  RACES.halfling_lightfoot,
  RACES.halfling_stout,
  RACES.human_standard,
  RACES.dragonborn,
  RACES.gnome_forest,
  RACES.gnome_rock,
  RACES.half_elf,
  RACES.half_orc,
  RACES.tiefling,
]

// -----------------------------
// Helpers
// -----------------------------

export function getRace(key: RaceKey): Race | undefined {
  return RACES[key]
}
