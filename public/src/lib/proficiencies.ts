// src/lib/proficiencies.ts
// Central library for languages and tools/proficiencies for DND721.
// This plays nicely with LanguageKey from races.ts and gives you
// structured data for tools, kits, instruments, and vehicles.

import type { LanguageKey } from './races'

// -----------------------------
// Languages
// -----------------------------

export type LanguageType = 'standard' | 'exotic'

export type Language = {
  key: LanguageKey
  name: string
  type: LanguageType
  /** Short, SRD-style reminder about who speaks it / what it sounds like. */
  description: string
}

export const LANGUAGES: Record<LanguageKey, Language> = {
  common: {
    key: 'common',
    name: 'Common',
    type: 'standard',
    description:
      'Shared tongue of most civilized regions; traders, townsfolk, and many adventurers speak it.',
  },
  dwarvish: {
    key: 'dwarvish',
    name: 'Dwarvish',
    type: 'standard',
    description:
      'Heavy, stone-rooted language spoken by dwarves and those who work closely with them.',
  },
  elvish: {
    key: 'elvish',
    name: 'Elvish',
    type: 'standard',
    description:
      'Flowing, melodic speech of elves, often used in poetry, music, and arcane writings.',
  },
  giant: {
    key: 'giant',
    name: 'Giant',
    type: 'standard',
    description:
      'Thunderous tongue of giants and related folk like ogres and ettins.',
  },
  gnomish: {
    key: 'gnomish',
    name: 'Gnomish',
    type: 'standard',
    description:
      'Fast, technical language of gnomes, full of borrowed words and jargon.',
  },
  goblin: {
    key: 'goblin',
    name: 'Goblin',
    type: 'standard',
    description:
      'Harsh, clipped speech used by goblins, hobgoblins, and bugbears.',
  },
  halfling: {
    key: 'halfling',
    name: 'Halfling',
    type: 'standard',
    description:
      'Warm, casual language used in halfling communities and among close friends.',
  },
  orc: {
    key: 'orc',
    name: 'Orc',
    type: 'standard',
    description:
      'Guttural language of orc clans, built around short, forceful syllables.',
  },
  draconic: {
    key: 'draconic',
    name: 'Draconic',
    type: 'exotic',
    description:
      'Ancient tongue of dragons, often used for arcane formulas and magical research.',
  },
  deepSpeech: {
    key: 'deepSpeech',
    name: 'Deep Speech',
    type: 'exotic',
    description:
      'Alien language of aberrant beings from beyond the sane world.',
  },
  infernal: {
    key: 'infernal',
    name: 'Infernal',
    type: 'exotic',
    description:
      'Precise, formal language of devils and hellish contracts.',
  },
  celestial: {
    key: 'celestial',
    name: 'Celestial',
    type: 'exotic',
    description:
      'Radiant, musical language spoken by angels and other beings of the upper planes.',
  },
  primordial: {
    key: 'primordial',
    name: 'Primordial',
    type: 'exotic',
    description:
      'Raw, elemental speech used by creatures of air, earth, fire, and water.',
  },
  sylvan: {
    key: 'sylvan',
    name: 'Sylvan',
    type: 'exotic',
    description:
      'Sing-song language of fey creatures and deep, enchanted woods.',
  },
  undercommon: {
    key: 'undercommon',
    name: 'Undercommon',
    type: 'exotic',
    description:
      'Trade tongue of the Underdark, mixing bits of many subterranean languages.',
  },
}

// Convenient ordered list for dropdowns
export const LANGUAGE_LIST: Language[] = [
  LANGUAGES.common,
  LANGUAGES.dwarvish,
  LANGUAGES.elvish,
  LANGUAGES.giant,
  LANGUAGES.gnomish,
  LANGUAGES.goblin,
  LANGUAGES.halfling,
  LANGUAGES.orc,
  LANGUAGES.draconic,
  LANGUAGES.deepSpeech,
  LANGUAGES.infernal,
  LANGUAGES.celestial,
  LANGUAGES.primordial,
  LANGUAGES.sylvan,
  LANGUAGES.undercommon,
]

// Helper lookup
export function getLanguage(key: LanguageKey): Language | undefined {
  return LANGUAGES[key]
}

// -----------------------------
// Tools & kits
// -----------------------------

export type ToolCategory =
  | 'artisanTools'
  | 'gamingSet'
  | 'musicalInstrument'
  | 'kit'
  | 'vehicle'
  | 'other'

export type ToolKey =
  // Artisan’s tools
  | 'alchemistsSupplies'
  | 'brewersSupplies'
  | 'calligraphersSupplies'
  | 'carpentersTools'
  | 'cartographersTools'
  | 'cobblersTools'
  | 'cooksUtensils'
  | 'glassblowersTools'
  | 'jewelersTools'
  | 'leatherworkersTools'
  | 'masonsTools'
  | 'paintersSupplies'
  | 'pottersTools'
  | 'smithsTools'
  | 'tinkersTools'
  | 'weaversTools'
  | 'woodcarversTools'
  // Gaming sets
  | 'diceSet'
  | 'playingCardSet'
  | 'threeDragonAnteSet'
  // Musical instruments
  | 'bagpipes'
  | 'drum'
  | 'dulcimer'
  | 'flute'
  | 'lute'
  | 'lyre'
  | 'horn'
  | 'panFlute'
  | 'shawm'
  | 'viol'
  // Kits & special tools
  | 'disguiseKit'
  | 'forgeryKit'
  | 'herbalismKit'
  | 'navigatorTools'
  | 'poisonersKit'
  | 'thievesTools'
  // Vehicles
  | 'vehiclesLand'
  | 'vehiclesWater'

export type Tool = {
  key: ToolKey
  name: string
  category: ToolCategory
  /** Short description of what the tool does in play. */
  description: string
}

export const TOOLS: Record<ToolKey, Tool> = {
  // ===== Artisan’s tools =====
  alchemistsSupplies: {
    key: 'alchemistsSupplies',
    name: "Alchemist's Supplies",
    category: 'artisanTools',
    description:
      'Beakers, burners, and reagents for brewing acids, alchemical items, and strange concoctions.',
  },
  brewersSupplies: {
    key: 'brewersSupplies',
    name: "Brewer's Supplies",
    category: 'artisanTools',
    description:
      'Vessels and tools for making beer, ale, and similar drinks.',
  },
  calligraphersSupplies: {
    key: 'calligraphersSupplies',
    name: "Calligrapher's Supplies",
    category: 'artisanTools',
    description:
      'Ink, brushes, and fine paper for elegant writing and scrolls.',
  },
  carpentersTools: {
    key: 'carpentersTools',
    name: "Carpenter's Tools",
    category: 'artisanTools',
    description:
      'Saw, hammer, nails, and planes used for building and repairing wooden structures.',
  },
  cartographersTools: {
    key: 'cartographersTools',
    name: "Cartographer's Tools",
    category: 'artisanTools',
    description:
      'Maps, compasses, and drafting tools for charting land and drawing maps.',
  },
  cobblersTools: {
    key: 'cobblersTools',
    name: "Cobbler's Tools",
    category: 'artisanTools',
    description:
      'Awls, thread, and leather pieces for crafting and repairing shoes.',
  },
  cooksUtensils: {
    key: 'cooksUtensils',
    name: "Cook's Utensils",
    category: 'artisanTools',
    description:
      'Pots, pans, and utensils for preparing meals on the road or in a kitchen.',
  },
  glassblowersTools: {
    key: 'glassblowersTools',
    name: "Glassblower's Tools",
    category: 'artisanTools',
    description:
      'Furnace tools and molds for forming molten glass.',
  },
  jewelersTools: {
    key: 'jewelersTools',
    name: "Jeweler's Tools",
    category: 'artisanTools',
    description:
      'Tiny pliers, files, and magnifiers for crafting fine jewelry and setting gems.',
  },
  leatherworkersTools: {
    key: 'leatherworkersTools',
    name: "Leatherworker's Tools",
    category: 'artisanTools',
    description:
      'Punches, needles, and dyes for working leather and hide.',
  },
  masonsTools: {
    key: 'masonsTools',
    name: "Mason's Tools",
    category: 'artisanTools',
    description:
      'Chisels and hammers for shaping and setting stone.',
  },
  paintersSupplies: {
    key: 'paintersSupplies',
    name: "Painter's Supplies",
    category: 'artisanTools',
    description:
      'Brushes, pigments, and canvas for artwork or signs.',
  },
  pottersTools: {
    key: 'pottersTools',
    name: "Potter's Tools",
    category: 'artisanTools',
    description:
      'Clay, wheels, and firing tools for shaping ceramics.',
  },
  smithsTools: {
    key: 'smithsTools',
    name: "Smith's Tools",
    category: 'artisanTools',
    description:
      'Forge tools like hammers, tongs, and tongs for working metal.',
  },
  tinkersTools: {
    key: 'tinkersTools',
    name: "Tinker’s Tools",
    category: 'artisanTools',
    description:
      'Small tools and parts for repairing metal objects and clockwork devices.',
  },
  weaversTools: {
    key: 'weaversTools',
    name: "Weaver's Tools",
    category: 'artisanTools',
    description:
      'Loom tools and thread for weaving cloth, rugs, and similar goods.',
  },
  woodcarversTools: {
    key: 'woodcarversTools',
    name: "Woodcarver's Tools",
    category: 'artisanTools',
    description:
      'Knives and carving tools for shaping wooden figures and small items.',
  },

  // ===== Gaming sets =====
  diceSet: {
    key: 'diceSet',
    name: 'Dice Set',
    category: 'gamingSet',
    description:
      'A handful of dice for gambling games or passing the time.',
  },
  playingCardSet: {
    key: 'playingCardSet',
    name: 'Playing Card Set',
    category: 'gamingSet',
    description:
      'Deck of cards used in taverns and back-room games.',
  },
  threeDragonAnteSet: {
    key: 'threeDragonAnteSet',
    name: 'Three-Dragon Ante Set',
    category: 'gamingSet',
    description:
      'Specialty card set for a popular fantasy card game.',
  },

  // ===== Musical instruments =====
  bagpipes: {
    key: 'bagpipes',
    name: 'Bagpipes',
    category: 'musicalInstrument',
    description:
      'Loud, droning instrument that can carry over long distances.',
  },
  drum: {
    key: 'drum',
    name: 'Drum',
    category: 'musicalInstrument',
    description:
      'Rhythmic percussion instrument used in marches and performances.',
  },
  dulcimer: {
    key: 'dulcimer',
    name: 'Dulcimer',
    category: 'musicalInstrument',
    description:
      'Stringed instrument played by striking or plucking the strings.',
  },
  flute: {
    key: 'flute',
    name: 'Flute',
    category: 'musicalInstrument',
    description:
      'Light wind instrument used in many folk tunes.',
  },
  lute: {
    key: 'lute',
    name: 'Lute',
    category: 'musicalInstrument',
    description:
      'Common stringed instrument favored by bards.',
  },
  lyre: {
    key: 'lyre',
    name: 'Lyre',
    category: 'musicalInstrument',
    description:
      'Small harp-like instrument with a clear, bright sound.',
  },
  horn: {
    key: 'horn',
    name: 'Horn',
    category: 'musicalInstrument',
    description:
      'Brass instrument used for signals and bold fanfares.',
  },
  panFlute: {
    key: 'panFlute',
    name: 'Pan Flute',
    category: 'musicalInstrument',
    description:
      'Set of small pipes that produce airy, haunting melodies.',
  },
  shawm: {
    key: 'shawm',
    name: 'Shawm',
    category: 'musicalInstrument',
    description:
      'Reed instrument, ancestor of the modern oboe, with a piercing sound.',
  },
  viol: {
    key: 'viol',
    name: 'Viol',
    category: 'musicalInstrument',
    description:
      'Bowed string instrument with a rich, resonant tone.',
  },

  // ===== Kits & special tools =====
  disguiseKit: {
    key: 'disguiseKit',
    name: 'Disguise Kit',
    category: 'kit',
    description:
      'Makeup, wigs, and props used to change your appearance.',
  },
  forgeryKit: {
    key: 'forgeryKit',
    name: 'Forgery Kit',
    category: 'kit',
    description:
      'Inks and templates used to imitate handwriting, seals, and official papers.',
  },
  herbalismKit: {
    key: 'herbalismKit',
    name: 'Herbalism Kit',
    category: 'kit',
    description:
      'Pouches, shears, and vials for preparing herbal remedies and salves.',
  },
  navigatorTools: {
    key: 'navigatorTools',
    name: "Navigator's Tools",
    category: 'kit',
    description:
      'Charts, compasses, and instruments for steering ships and charting routes.',
  },
  poisonersKit: {
    key: 'poisonersKit',
    name: "Poisoner's Kit",
    category: 'kit',
    description:
      'Vials, glassware, and reagents for handling and crafting poisons.',
  },
  thievesTools: {
    key: 'thievesTools',
    name: "Thieves' Tools",
    category: 'kit',
    description:
      'Picks, tension wrenches, and small tools for opening locks and disabling simple traps.',
  },

  // ===== Vehicles =====
  vehiclesLand: {
    key: 'vehiclesLand',
    name: 'Vehicles (Land)',
    category: 'vehicle',
    description:
      'Carts, wagons, and other land-based vehicles; covers handling and driving them.',
  },
  vehiclesWater: {
    key: 'vehiclesWater',
    name: 'Vehicles (Water)',
    category: 'vehicle',
    description:
      'Rowboats, ships, and other watercraft; covers steering and managing them.',
  },
}

// Simple lists for UI usage
export const TOOL_LIST: Tool[] = Object.values(TOOLS)

export const ARTISAN_TOOL_LIST = TOOL_LIST.filter(
  (t) => t.category === 'artisanTools'
)
export const GAMING_SET_LIST = TOOL_LIST.filter(
  (t) => t.category === 'gamingSet'
)
export const MUSICAL_INSTRUMENT_LIST = TOOL_LIST.filter(
  (t) => t.category === 'musicalInstrument'
)
export const KIT_TOOL_LIST = TOOL_LIST.filter(
  (t) => t.category === 'kit'
)
export const VEHICLE_TOOL_LIST = TOOL_LIST.filter(
  (t) => t.category === 'vehicle'
)

// Helper lookup
export function getTool(key: ToolKey): Tool | undefined {
  return TOOLS[key]
}
