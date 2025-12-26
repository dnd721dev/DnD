// src/lib/equipment.ts
// SRD-style adventuring gear and equipment packs for DND721.
// Focuses on items used in standard 5e equipment packs.
//
// This keeps item data in one place so classes/backgrounds can reference packs
// (e.g. "Explorer's Pack") instead of hardcoding lists in the UI.

export type GearCategory =
  | 'adventuring'
  | 'tool'
  | 'container'
  | 'light'
  | 'food'
  | 'utility'
  | 'clothing'
  | 'holy'
  | 'scholar'

export type GearKey =
  | 'backpack'
  | 'bedroll'
  | 'messKit'
  | 'tinderbox'
  | 'torch'
  | 'rationsDay'
  | 'waterskin'
  | 'hempenRope50'
  | 'silkRope50'
  | 'crowbar'
  | 'hammer'
  | 'piton'
  | 'hoodedLantern'
  | 'oilFlask'
  | 'flaskOrTankard'
  | 'ropeLadder25'
  | 'bagOfSand'
  | 'bell'
  | 'chain10'
  | 'lock'
  | 'manacles'
  | 'mirrorSteel'
  | 'perfumebottle'
  | 'sealingWax'
  | 'soap'
  | 'disguiseKit'
  | 'forgeryKit'
  | 'costumeClothes'
  | 'fineClothes'
  | 'commonClothes'
  | 'componentPouch'
  | 'prayerBook'
  | 'holySymbol'
  | 'incenseBlock'
  | 'vestments'
  | 'scholarsPackBook'
  | 'inkBottle'
  | 'inkPen'
  | 'parchmentSheet'
  | 'sandOrBlotter'
  | 'smallKnife'
  | 'scrollCase'
  | 'blanket'
  | 'huntingTrap'
  | 'playingCardSet'
  | 'diceSet'
  | 'pouch'
  | 'beltPouch'

// Basic gear item
export type GearItem = {
  key: GearKey
  name: string
  category: GearCategory
  /** Weight in pounds (approximate SRD values, can be ignored if you want). */
  weight: number
  /** Cost in gold pieces as a string ("0.5" for 5 sp, etc.). */
  costGp: string
  /** Short, original description for tooltips / UI. */
  description: string
}

// ------------------------------------------------------------------
// Core gear list – only items used by standard 5e equipment packs.
// You can expand this list later for a full gear table.
// ------------------------------------------------------------------

export const GEAR: Record<GearKey, GearItem> = {
  backpack: {
    key: 'backpack',
    name: 'Backpack',
    category: 'container',
    weight: 5,
    costGp: '2',
    description: 'Rugged pack with straps for carrying gear on your back.',
  },
  bedroll: {
    key: 'bedroll',
    name: 'Bedroll',
    category: 'adventuring',
    weight: 5,
    costGp: '1',
    description: 'Roll of blankets or padding for sleeping in the wild.',
  },
  messKit: {
    key: 'messKit',
    name: 'Mess Kit',
    category: 'adventuring',
    weight: 1,
    costGp: '0.2',
    description: 'Small metal dishware for eating and cooking simple meals.',
  },
  tinderbox: {
    key: 'tinderbox',
    name: 'Tinderbox',
    category: 'adventuring',
    weight: 1,
    costGp: '0.5',
    description: 'Flint, steel, and tinder for starting fires.',
  },
  torch: {
    key: 'torch',
    name: 'Torch',
    category: 'light',
    weight: 1,
    costGp: '0.01',
    description: 'Wooden torch that burns for a short while and sheds light.',
  },
  rationsDay: {
    key: 'rationsDay',
    name: 'Rations (1 day)',
    category: 'food',
    weight: 2,
    costGp: '0.5',
    description: 'Dry, preserved food meant to last on the road.',
  },
  waterskin: {
    key: 'waterskin',
    name: 'Waterskin',
    category: 'container',
    weight: 5,
    costGp: '0.2',
    description: 'Leather container for carrying water or other drinks.',
  },
  hempenRope50: {
    key: 'hempenRope50',
    name: '50 ft. Hempen Rope',
    category: 'adventuring',
    weight: 10,
    costGp: '1',
    description: 'Sturdy rope useful for climbing, tying, or hauling.',
  },
  silkRope50: {
    key: 'silkRope50',
    name: '50 ft. Silk Rope',
    category: 'adventuring',
    weight: 5,
    costGp: '10',
    description: 'Light but strong rope favored by climbers and rogues.',
  },
  crowbar: {
    key: 'crowbar',
    name: 'Crowbar',
    category: 'tool',
    weight: 5,
    costGp: '2',
    description: 'Metal bar for prying open doors, lids, and crates.',
  },
  hammer: {
    key: 'hammer',
    name: 'Hammer',
    category: 'tool',
    weight: 3,
    costGp: '1',
    description: 'Sturdy hammer for nails, spikes, and general work.',
  },
  piton: {
    key: 'piton',
    name: 'Piton',
    category: 'tool',
    weight: 0.25,
    costGp: '0.05',
    description: 'Metal spike hammered into stone to anchor rope.',
  },
  hoodedLantern: {
    key: 'hoodedLantern',
    name: 'Hooded Lantern',
    category: 'light',
    weight: 2,
    costGp: '5',
    description:
      'Lantern with a shuttered hood to direct or block the light it sheds.',
  },
  oilFlask: {
    key: 'oilFlask',
    name: 'Flask of Oil',
    category: 'utility',
    weight: 1,
    costGp: '0.1',
    description:
      'Small flask of oil used for lamps, lanterns, or more creative uses.',
  },
  flaskOrTankard: {
    key: 'flaskOrTankard',
    name: 'Flask or Tankard',
    category: 'container',
    weight: 1,
    costGp: '0.02',
    description: 'Simple container for carrying drink.',
  },
  ropeLadder25: {
    key: 'ropeLadder25',
    name: '25 ft. Rope Ladder',
    category: 'adventuring',
    weight: 10,
    costGp: '1',
    description: 'Rope ladder with wooden rungs for climbing.',
  },
  bagOfSand: {
    key: 'bagOfSand',
    name: 'Small Bag of Sand',
    category: 'utility',
    weight: 1,
    costGp: '0.01',
    description: 'A pouch of sand used for weighing, marking, or extinguishing.',
  },
  bell: {
    key: 'bell',
    name: 'Bell',
    category: 'utility',
    weight: 0,
    costGp: '1',
    description: 'Small metal bell, useful for alarms or signals.',
  },
  chain10: {
    key: 'chain10',
    name: '10 ft. Chain',
    category: 'utility',
    weight: 10,
    costGp: '5',
    description: 'Heavy iron chain used to secure or bind heavy objects.',
  },
  lock: {
    key: 'lock',
    name: 'Lock',
    category: 'utility',
    weight: 1,
    costGp: '10',
    description: 'Lock with key, used to secure chests, doors, or gates.',
  },
  manacles: {
    key: 'manacles',
    name: 'Manacles',
    category: 'utility',
    weight: 6,
    costGp: '2',
    description: 'Metal restraints for securing a creature’s wrists or ankles.',
  },
  mirrorSteel: {
    key: 'mirrorSteel',
    name: 'Steel Mirror',
    category: 'utility',
    weight: 0.5,
    costGp: '5',
    description:
      'Polished steel reflecting surface, useful for viewing around corners or signaling.',
  },
  perfumebottle: {
    key: 'perfumebottle',
    name: 'Perfume (vial)',
    category: 'scholar',
    weight: 0,
    costGp: '5',
    description: 'Small vial of scented oils or perfume.',
  },
  sealingWax: {
    key: 'sealingWax',
    name: 'Sealing Wax',
    category: 'utility',
    weight: 0,
    costGp: '0.5',
    description: 'Wax for sealing letters or documents with a stamp.',
  },
  soap: {
    key: 'soap',
    name: 'Soap',
    category: 'utility',
    weight: 0,
    costGp: '0.02',
    description: 'Simple bar of soap for cleaning.',
  },
  disguiseKit: {
    key: 'disguiseKit',
    name: 'Disguise Kit',
    category: 'tool',
    weight: 3,
    costGp: '25',
    description: 'Cosmetics, wigs, and props used to alter your appearance.',
  },
  forgeryKit: {
    key: 'forgeryKit',
    name: 'Forgery Kit',
    category: 'tool',
    weight: 5,
    costGp: '15',
    description: 'Tools for imitating handwriting, seals, and documents.',
  },
  costumeClothes: {
    key: 'costumeClothes',
    name: 'Costume Clothes',
    category: 'clothing',
    weight: 4,
    costGp: '5',
    description: 'Flamboyant or themed clothing for performances.',
  },
  fineClothes: {
    key: 'fineClothes',
    name: 'Fine Clothes',
    category: 'clothing',
    weight: 6,
    costGp: '15',
    description: 'Quality garments suitable for formal events and nobility.',
  },
  commonClothes: {
    key: 'commonClothes',
    name: 'Common Clothes',
    category: 'clothing',
    weight: 3,
    costGp: '0.5',
    description: 'Simple clothing worn by most everyday folk.',
  },
  componentPouch: {
    key: 'componentPouch',
    name: 'Component Pouch',
    category: 'adventuring',
    weight: 2,
    costGp: '25',
    description:
      'Small pouches and vials holding the everyday ingredients needed for many spells.',
  },
  prayerBook: {
    key: 'prayerBook',
    name: 'Prayer Book',
    category: 'holy',
    weight: 2,
    costGp: '1',
    description: 'Book of prayers, hymns, or religious teachings.',
  },
  holySymbol: {
    key: 'holySymbol',
    name: 'Holy Symbol',
    category: 'holy',
    weight: 1,
    costGp: '5',
    description: 'Amulet, emblem, or reliquary representing a deity or faith.',
  },
  incenseBlock: {
    key: 'incenseBlock',
    name: 'Incense Block',
    category: 'holy',
    weight: 0,
    costGp: '0.1',
    description: 'Fragrant block burned during ceremonies and rituals.',
  },
  vestments: {
    key: 'vestments',
    name: 'Vestments',
    category: 'holy',
    weight: 4,
    costGp: '1',
    description: 'Religious robes and garments worn during services.',
  },
  scholarsPackBook: {
    key: 'scholarsPackBook',
    name: 'Scholar’s Reference Book',
    category: 'scholar',
    weight: 5,
    costGp: '25',
    description:
      'Tome or volume related to your area of study or research.',
  },
  inkBottle: {
    key: 'inkBottle',
    name: 'Bottle of Ink (1 oz.)',
    category: 'scholar',
    weight: 0,
    costGp: '10',
    description: 'Small bottle of ink for writing or drawing.',
  },
  inkPen: {
    key: 'inkPen',
    name: 'Ink Pen',
    category: 'scholar',
    weight: 0,
    costGp: '0.02',
    description: 'Simple pen for writing, usually a quill.',
  },
  parchmentSheet: {
    key: 'parchmentSheet',
    name: 'Sheet of Parchment',
    category: 'scholar',
    weight: 0,
    costGp: '0.02',
    description: 'A.limit(1).maybeSingle() sheet of parchment suitable for writing.',
  },
  sandOrBlotter: {
    key: 'sandOrBlotter',
    name: 'Blotting Sand or Blotter',
    category: 'scholar',
    weight: 0,
    costGp: '0.02',
    description: 'Used to dry ink on parchment or paper.',
  },
  smallKnife: {
    key: 'smallKnife',
    name: 'Small Knife',
    category: 'utility',
    weight: 0.5,
    costGp: '0.1',
    description: 'Small blade used as a tool or last-resort weapon.',
  },
  scrollCase: {
    key: 'scrollCase',
    name: 'Scroll Case',
    category: 'container',
    weight: 1,
    costGp: '1',
    description: 'Tube or case to protect scrolls, maps, and documents.',
  },
  blanket: {
    key: 'blanket',
    name: 'Blanket',
    category: 'adventuring',
    weight: 3,
    costGp: '0.5',
    description: 'Warm blanket for sleeping or staying warm.',
  },
  huntingTrap: {
    key: 'huntingTrap',
    name: 'Hunting Trap',
    category: 'adventuring',
    weight: 25,
    costGp: '5',
    description: 'Metal trap used to catch animals or intruders.',
  },
  playingCardSet: {
    key: 'playingCardSet',
    name: 'Playing Card Set',
    category: 'tool',
    weight: 0,
    costGp: '0.5',
    description: 'Deck of cards used for games or gambling.',
  },
  diceSet: {
    key: 'diceSet',
    name: 'Dice Set',
    category: 'tool',
    weight: 0,
    costGp: '0.1',
    description: 'Set of dice used for games or chance.',
  },
  pouch: {
    key: 'pouch',
    name: 'Pouch',
    category: 'container',
    weight: 1,
    costGp: '0.5',
    description: 'Small leather pouch that can hold coins or tiny items.',
  },
  beltPouch: {
    key: 'beltPouch',
    name: 'Belt Pouch',
    category: 'container',
    weight: 1,
    costGp: '0.5',
    description: 'Pouch that hangs from a belt for quick access to gear.',
  },
}

// ------------------------------------------------------------------
// Equipment packs – standard 5e-style packs
// ------------------------------------------------------------------

export type PackKey =
  | 'burglars'
  | 'diplomats'
  | 'dungeoneers'
  | 'entertainers'
  | 'explorers'
  | 'priests'
  | 'scholars'

export type PackItemRef = {
  item: GearKey
  quantity: number
}

export type Pack = {
  key: PackKey
  name: string
  /** Cost in gold pieces as a string (SRD value). */
  costGp: string
  /** Items in the pack (with quantity). */
  items: PackItemRef[]
  /** Short description for UI. */
  description: string
}

export const PACKS: Record<PackKey, Pack> = {
  burglars: {
    key: 'burglars',
    name: "Burglar's Pack",
    costGp: '16',
    description:
      'Tools and gear for a stealthy intruder: ropes, lights, and ways to get into places.',
    items: [
      { item: 'backpack', quantity: 1 },
      { item: 'ballOfSand' as any, quantity: 0 }, // placeholder if needed later
      { item: 'crowbar', quantity: 1 },
      { item: 'hammer', quantity: 1 },
      { item: 'piton', quantity: 10 },
      { item: 'hoodedLantern', quantity: 1 },
      { item: 'oilFlask', quantity: 2 },
      { item: 'rationsDay', quantity: 5 },
      { item: 'waterskin', quantity: 1 },
      { item: 'silkRope50', quantity: 1 },
    ],
  },
  diplomats: {
    key: 'diplomats',
    name: "Diplomat's Pack",
    costGp: '39',
    description:
      'Finery, paper, and tools to look important and handle official business.',
    items: [
      { item: 'chest10' as any, quantity: 0 }, // if you later add a chest item
      { item: 'fineClothes', quantity: 2 }, // usually 1 set; you can tweak this
      { item: 'perfumebottle', quantity: 1 },
      { item: 'sealingWax', quantity: 1 },
      { item: 'soap', quantity: 1 },
      { item: 'inkBottle', quantity: 1 },
      { item: 'inkPen', quantity: 1 },
      { item: 'parchmentSheet', quantity: 5 },
      { item: 'scrollCase', quantity: 2 },
    ],
  },
  dungeoneers: {
    key: 'dungeoneers',
    name: "Dungeoneer's Pack",
    costGp: '12',
    description:
      'Classic gear for exploring underground: rope, torches, and basic tools.',
    items: [
      { item: 'backpack', quantity: 1 },
      { item: 'crowbar', quantity: 1 },
      { item: 'hammer', quantity: 1 },
      { item: 'piton', quantity: 10 },
      { item: 'torch', quantity: 10 },
      { item: 'tinderbox', quantity: 1 },
      { item: 'rationsDay', quantity: 10 },
      { item: 'waterskin', quantity: 1 },
      { item: 'hempenRope50', quantity: 1 },
    ],
  },
  entertainers: {
    key: 'entertainers',
    name: "Entertainer's Pack",
    costGp: '40',
    description:
      'Costumes and props for a performer who travels from town to town.',
    items: [
      { item: 'backpack', quantity: 1 },
      { item: 'bedroll', quantity: 1 },
      { item: 'costumeClothes', quantity: 2 },
      { item: 'disguiseKit', quantity: 1 },
      { item: 'candle' as any, quantity: 5 }, // add candle later if you want full detail
      { item: 'rationsDay', quantity: 5 },
      { item: 'waterskin', quantity: 1 },
    ],
  },
  explorers: {
    key: 'explorers',
    name: "Explorer's Pack",
    costGp: '10',
    description:
      'Standard adventurer kit: backpack, bedroll, mess kit, rations, and basic survival tools.',
    items: [
      { item: 'backpack', quantity: 1 },
      { item: 'bedroll', quantity: 1 },
      { item: 'messKit', quantity: 1 },
      { item: 'tinderbox', quantity: 1 },
      { item: 'torch', quantity: 10 },
      { item: 'rationsDay', quantity: 10 },
      { item: 'waterskin', quantity: 1 },
      { item: 'hempenRope50', quantity: 1 },
    ],
  },
  priests: {
    key: 'priests',
    name: "Priest's Pack",
    costGp: '19',
    description:
      'Ceremonial and travel supplies for a wandering clergy member.',
    items: [
      { item: 'backpack', quantity: 1 },
      { item: 'blanket', quantity: 1 },
      { item: 'candle' as any, quantity: 10 }, // placeholder
      { item: 'incenseBlock', quantity: 2 },
      { item: 'prayerBook', quantity: 1 },
      { item: 'vestments', quantity: 1 },
      { item: 'rationsDay', quantity: 2 },
      { item: 'waterskin', quantity: 1 },
    ],
  },
  scholars: {
    key: 'scholars',
    name: "Scholar's Pack",
    costGp: '40',
    description:
      'Books, ink, and supplies for someone who lives in libraries or laboratories.',
    items: [
      { item: 'backpack', quantity: 1 },
      { item: 'scholarsPackBook', quantity: 1 },
      { item: 'inkBottle', quantity: 1 },
      { item: 'inkPen', quantity: 1 },
      { item: 'parchmentSheet', quantity: 10 },
      { item: 'sandOrBlotter', quantity: 1 },
      { item: 'smallKnife', quantity: 1 },
    ],
  },
}

// Simple lists for UI
export const PACK_LIST: Pack[] = [
  PACKS.burglars,
  PACKS.diplomats,
  PACKS.dungeoneers,
  PACKS.entertainers,
  PACKS.explorers,
  PACKS.priests,
  PACKS.scholars,
]

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

export function getGear(key: GearKey): GearItem | undefined {
  return GEAR[key]
}

export function getPack(key: PackKey): Pack | undefined {
  return PACKS[key]
}
