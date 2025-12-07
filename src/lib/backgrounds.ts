// src/lib/backgrounds.ts
// SRD-style backgrounds for DND721.
// Uses 2014 5e-style backgrounds with:
// - skill proficiencies
// - tool proficiencies
// - language choices
// - starting equipment summary
// - a short, original "feature" summary

import type { SkillKey } from './skills'
import type { LanguageKey } from './races'

export type BackgroundKey =
  | 'acolyte'
  | 'charlatan'
  | 'criminal'
  | 'entertainer'
  | 'folkHero'
  | 'guildArtisan'
  | 'hermit'
  | 'noble'
  | 'outlander'
  | 'sage'
  | 'soldier'
  | 'urchin'

export type BackgroundFeature = {
  name: string
  /** Short reminder text, not full rules. */
  summary: string
}

export type Background = {
  key: BackgroundKey
  name: string
  /** Skill proficiencies granted by this background. */
  skillProficiencies: SkillKey[]
  /**
   * Tool proficiencies or vehicles. These are simple strings for now;
   * later you can point them at a tools lib if you like.
   */
  toolProficiencies: string[]
  /** Extra languages the character can choose (in addition to their race). */
  extraLanguageChoices: number
  /**
   * Simple equipment summary; you can expand this into real items
   * once your equipment lib is ready.
   */
  startingEquipment: string[]
  /** The unique background feature. */
  feature: BackgroundFeature
}

// ------------------------------------
// Background definitions (5e-style)
// ------------------------------------

export const BACKGROUNDS: Record<BackgroundKey, Background> = {
  // ===== ACOLYTE =====
  acolyte: {
    key: 'acolyte',
    name: 'Acolyte',
    skillProficiencies: ['insight', 'religion'],
    toolProficiencies: [],
    extraLanguageChoices: 2,
    startingEquipment: [
      'Holy symbol',
      'Prayer book or prayer wheel',
      '5 sticks of incense',
      'Vestments',
      'Set of common clothes',
      '15 gp',
    ],
    feature: {
      name: 'Shelter of the Faithful',
      summary:
        'You belong to a religious community that offers you modest shelter, support, and guidance at temples of your faith.',
    },
  },

  // ===== CHARLATAN =====
  charlatan: {
    key: 'charlatan',
    name: 'Charlatan',
    skillProficiencies: ['deception', 'sleightOfHand'],
    toolProficiencies: ['Disguise kit', 'Forgery kit'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Fine clothes',
      'Disguise kit',
      'A favorite con prop (e.g., weighted dice, fake signet ring)',
      '15 gp',
    ],
    feature: {
      name: 'False Identity',
      summary:
        'You maintain a well-developed second persona, complete with forged papers and disguises, that can pass casual scrutiny.',
    },
  },

  // ===== CRIMINAL / SPY =====
  criminal: {
    key: 'criminal',
    name: 'Criminal / Spy',
    skillProficiencies: ['deception', 'stealth'],
    toolProficiencies: ['One type of gaming set', 'Thieves’ tools'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Crowbar',
      'Dark common clothes with hood',
      'Belts or pouches for stashing small items',
      '15 gp',
    ],
    feature: {
      name: 'Criminal Contact',
      summary:
        'You have a reliable underworld contact who can pass messages and help you find illicit information or goods.',
    },
  },

  // ===== ENTERTAINER =====
  entertainer: {
    key: 'entertainer',
    name: 'Entertainer',
    skillProficiencies: ['acrobatics', 'performance'],
    toolProficiencies: ['Disguise kit', 'One musical instrument'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'One musical instrument',
      'Theatrical costume',
      'Token of admiration from a fan',
      '15 gp',
    ],
    feature: {
      name: 'By Popular Demand',
      summary:
        'You can usually find a place to perform, earning food and lodging in exchange for your talents.',
    },
  },

  // ===== FOLK HERO =====
  folkHero: {
    key: 'folkHero',
    name: 'Folk Hero',
    skillProficiencies: ['animalHandling', 'survival'],
    toolProficiencies: ['One type of artisan’s tools', 'Vehicles (land)'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Set of artisan’s tools',
      'Shovel or farming implement',
      'Common clothes',
      'Token marking you as a local hero',
      '10 gp',
    ],
    feature: {
      name: 'Rustic Hospitality',
      summary:
        'Common folk recognize you as one of their own and are inclined to shelter you and your companions, as long as you don’t abuse their trust.',
    },
  },

  // ===== GUILD ARTISAN =====
  guildArtisan: {
    key: 'guildArtisan',
    name: 'Guild Artisan',
    skillProficiencies: ['insight', 'persuasion'],
    toolProficiencies: ['One type of artisan’s tools'],
    extraLanguageChoices: 1,
    startingEquipment: [
      'Set of artisan’s tools',
      'Letter of introduction from your guild',
      'Traveler’s clothes',
      '15 gp',
    ],
    feature: {
      name: 'Guild Membership',
      summary:
        'You belong to a trade guild that offers support, legal help, and contacts in exchange for dues and obligations.',
    },
  },

  // ===== HERMIT =====
  hermit: {
    key: 'hermit',
    name: 'Hermit',
    skillProficiencies: ['medicine', 'religion'],
    toolProficiencies: ['Herbalism kit'],
    extraLanguageChoices: 1,
    startingEquipment: [
      'Scroll case with notes on your studies or revelation',
      'Winter blanket',
      'Common clothes',
      'Herbalism kit',
      '5 gp',
    ],
    feature: {
      name: 'Discovery',
      summary:
        'During your isolation, you uncovered a significant insight or secret that shapes your path in the world.',
    },
  },

  // ===== NOBLE =====
  noble: {
    key: 'noble',
    name: 'Noble',
    skillProficiencies: ['history', 'persuasion'],
    toolProficiencies: ['One type of gaming set'],
    extraLanguageChoices: 1,
    startingEquipment: [
      'Fine clothes',
      'Signet ring or family emblem',
      'Scroll of pedigree',
      '25 gp',
    ],
    feature: {
      name: 'Position of Privilege',
      summary:
        'Your noble birth opens doors: many commoners defer to you, and you can often secure audiences with local leaders.',
    },
  },

  // ===== OUTLANDER =====
  outlander: {
    key: 'outlander',
    name: 'Outlander',
    skillProficiencies: ['athletics', 'survival'],
    toolProficiencies: ['One type of musical instrument'],
    extraLanguageChoices: 1,
    startingEquipment: [
      'Staff',
      'Hunting trap',
      'Trophy from an animal you killed',
      'Traveler’s clothes',
      '10 gp',
    ],
    feature: {
      name: 'Wanderer',
      summary:
        'You have a strong memory for maps and terrain and can usually find food and fresh water for yourself and companions in the wild.',
    },
  },

  // ===== SAGE =====
  sage: {
    key: 'sage',
    name: 'Sage',
    skillProficiencies: ['arcana', 'history'],
    toolProficiencies: [],
    extraLanguageChoices: 2,
    startingEquipment: [
      'Bottle of ink and quill',
      'Small knife',
      'Letter from a colleague or institution',
      'Common clothes',
      '10 gp',
    ],
    feature: {
      name: 'Researcher',
      summary:
        'You know how to track down lore: if you don’t know an answer, you often know where or whom to ask.',
    },
  },

  // ===== SOLDIER =====
  soldier: {
    key: 'soldier',
    name: 'Soldier',
    skillProficiencies: ['athletics', 'intimidation'],
    toolProficiencies: ['One type of gaming set', 'Vehicles (land)'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Rank insignia',
      'Trophy from a fallen enemy',
      'Set of bone dice or deck of cards',
      'Common clothes',
      '10 gp',
    ],
    feature: {
      name: 'Military Rank',
      summary:
        'You carry a rank from your service; soldiers of lower rank, and sometimes civilians, recognize your authority in military matters.',
    },
  },

  // ===== URCHIN =====
  urchin: {
    key: 'urchin',
    name: 'Urchin',
    skillProficiencies: ['sleightOfHand', 'stealth'],
    toolProficiencies: ['Disguise kit', 'Thieves’ tools'],
    extraLanguageChoices: 0,
    startingEquipment: [
      'Small knife',
      'Map of the city where you grew up',
      'Pet mouse or similar small creature',
      'Common clothes',
      '10 gp',
    ],
    feature: {
      name: 'City Secrets',
      summary:
        'You know hidden paths and shortcuts through urban environments, letting you travel quickly through back streets and alleys.',
    },
  },
}

// Ordered list for dropdowns / UI
export const BACKGROUND_LIST: Background[] = [
  BACKGROUNDS.acolyte,
  BACKGROUNDS.charlatan,
  BACKGROUNDS.criminal,
  BACKGROUNDS.entertainer,
  BACKGROUNDS.folkHero,
  BACKGROUNDS.guildArtisan,
  BACKGROUNDS.hermit,
  BACKGROUNDS.noble,
  BACKGROUNDS.outlander,
  BACKGROUNDS.sage,
  BACKGROUNDS.soldier,
  BACKGROUNDS.urchin,
]

// ------------------------------------
// Helpers
// ------------------------------------

export function getBackground(key: BackgroundKey): Background | undefined {
  return BACKGROUNDS[key]
}
