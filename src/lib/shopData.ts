// src/lib/shopData.ts
// Daily rotating shop — item catalog.
// IDs must match the Python bot's item references exactly.
// Update names/IDs/prices here to keep in sync with the bot.

export type ShopTier = 'A' | 'B' | 'C' | 'D' | 'E'

export type ShopItemCategory = 'consumable' | 'gear' | 'magic-item' | 'cosmetic'

export type ShopItem = {
  /** Stable ID — must match Python bot references */
  id: string
  name: string
  tier: ShopTier
  desc: string
  /** DnDBeyond URL, or null if no reference page */
  url: string | null
  /** USD price. Absent / undefined for free tiers A and B. */
  price_usd?: number
  /** If true: always included in daily rotation regardless of seed (e.g. signature potions) */
  always?: boolean
  category: ShopItemCategory
}

// ─── Item Pool ────────────────────────────────────────────────────────────────
// Tier A: free once per session  (1 shown daily, rotates from this pool)
// Tier B: free once per day      (1 shown daily, rotates from this pool)
// Tier C: paid ~$1–3             (3 shown daily; always items always included)
// Tier D: paid ~$4–8             (3 shown daily; always items always included)
// Tier E: paid premium $15–35    (2 shown daily, rotates from this pool)

export const SHOP_POOL: ShopItem[] = [
  // ── Tier A ──────────────────────────────────────────────────────────────────
  {
    id:       'healing_potion',
    tier:     'A',
    name:     'Potion of Healing',
    desc:     'Drink to regain 2d4+2 hit points.',
    category: 'consumable',
    url:      'https://www.dndbeyond.com/magic-items/8960-potion-of-healing',
  },
  {
    id:       'holy_water',
    tier:     'A',
    name:     'Holy Water',
    desc:     'Deals 2d6 radiant damage to undead or fiends on a hit.',
    category: 'consumable',
    url:      'https://www.dndbeyond.com/equipment/507-holy-water',
  },
  {
    id:       'antitoxin',
    tier:     'A',
    name:     'Antitoxin',
    desc:     'Advantage on saving throws against poison for 1 hour.',
    category: 'consumable',
    url:      'https://www.dndbeyond.com/equipment/488-antitoxin',
  },

  // ── Tier B ──────────────────────────────────────────────────────────────────
  {
    id:       'torch_bundle',
    tier:     'B',
    name:     'Bundle of Torches',
    desc:     'Five torches, each burning 20 ft bright + 20 ft dim light for 1 hour.',
    category: 'gear',
    url:      null,
  },
  {
    id:       'trail_rations',
    tier:     'B',
    name:     'Trail Rations',
    desc:     'One day of rations — keeps an adventurer going on the road.',
    category: 'consumable',
    url:      null,
  },
  {
    id:       'rope_hempen',
    tier:     'B',
    name:     'Hempen Rope (50 ft)',
    desc:     'Strong rope bearing up to 900 lbs. An adventurer staple.',
    category: 'gear',
    url:      null,
  },

  // ── Tier C — always items ───────────────────────────────────────────────────
  {
    id:       'gender_bender',
    tier:     'C',
    name:     'Gender Bender Potion',
    desc:     'Alters the drinker\'s physical gender for 24 hours. Fully reversible.',
    price_usd: 2.00,
    always:   true,
    category: 'consumable',
    url:      null,
  },
  {
    id:       'potion_climbing',
    tier:     'C',
    name:     'Potion of Climbing',
    desc:     'Gain a climbing speed equal to your walking speed for 1 hour.',
    price_usd: 1.50,
    always:   true,
    category: 'consumable',
    url:      'https://www.dndbeyond.com/magic-items/4704-potion-of-climbing',
  },
  // ── Tier C — rotators ───────────────────────────────────────────────────────
  {
    id:       'smoke_bomb',
    tier:     'C',
    name:     'Smoke Bomb',
    desc:     'Creates a 10-ft sphere of heavy obscurement for 1 minute when thrown.',
    price_usd: 1.50,
    category: 'consumable',
    url:      null,
  },
  {
    id:       'caltrops',
    tier:     'C',
    name:     'Bag of Caltrops',
    desc:     'Scatter to create difficult terrain in a 5-ft square. Stepping creatures take 1 piercing.',
    price_usd: 1.00,
    category: 'gear',
    url:      null,
  },
  {
    id:       'alchemists_fire',
    tier:     'C',
    name:     "Alchemist's Fire",
    desc:     "Ranged attack — target takes 1d4 fire damage at start of each turn until an action extinguishes it.",
    price_usd: 1.50,
    category: 'consumable',
    url:      null,
  },
  {
    id:       'tanglefoot_bag',
    tier:     'C',
    name:     'Tanglefoot Bag',
    desc:     'Hit a creature to reduce its speed to 0 for 1 minute (Str DC 13 ends early).',
    price_usd: 2.00,
    category: 'consumable',
    url:      null,
  },

  // ── Tier D — always items ───────────────────────────────────────────────────
  {
    id:       'potion_water_breathing',
    tier:     'D',
    name:     'Potion of Water Breathing',
    desc:     'Breathe underwater for 1 hour.',
    price_usd: 5.00,
    always:   true,
    category: 'consumable',
    url:      'https://www.dndbeyond.com/magic-items/5357-potion-of-water-breathing',
  },
  {
    id:       'potion_heroism',
    tier:     'D',
    name:     'Potion of Heroism',
    desc:     'Gain 10 temporary HP and the effects of the bless spell for 1 hour.',
    price_usd: 4.00,
    always:   true,
    category: 'consumable',
    url:      'https://www.dndbeyond.com/magic-items/4702-potion-of-heroism',
  },
  // ── Tier D — rotators ───────────────────────────────────────────────────────
  {
    id:       'potion_fire_resistance',
    tier:     'D',
    name:     'Potion of Fire Resistance',
    desc:     'Resistance to fire damage for 1 hour.',
    price_usd: 4.50,
    category: 'consumable',
    url:      null,
  },
  {
    id:       'philter_of_love',
    tier:     'D',
    name:     'Philter of Love',
    desc:     'The first creature the drinker sees becomes the subject of a charmed condition for 1 hour.',
    price_usd: 6.00,
    category: 'consumable',
    url:      null,
  },
  {
    id:       'potion_of_flying',
    tier:     'D',
    name:     'Potion of Flying',
    desc:     'A flying speed of 60 ft for 1 hour.',
    price_usd: 8.00,
    category: 'consumable',
    url:      'https://www.dndbeyond.com/magic-items/4706-potion-of-flying',
  },
  {
    id:       'potion_of_growth',
    tier:     'D',
    name:     'Potion of Growth',
    desc:     'You grow large for 1d4 hours — larger space, +1d4 to Strength checks, +1d4 damage.',
    price_usd: 5.00,
    category: 'consumable',
    url:      null,
  },

  // ── Tier E ──────────────────────────────────────────────────────────────────
  {
    id:       'bag_of_holding',
    tier:     'E',
    name:     'Bag of Holding',
    desc:     'Holds up to 500 lbs in a 64-cubic-foot extradimensional space. Weighs 15 lbs.',
    price_usd: 25.00,
    category: 'magic-item',
    url:      'https://www.dndbeyond.com/magic-items/4581-bag-of-holding',
  },
  {
    id:       'cloak_elvenkind',
    tier:     'E',
    name:     'Cloak of Elvenkind',
    desc:     'Advantage on Stealth checks. Disadvantage on Perception checks to detect you.',
    price_usd: 20.00,
    category: 'magic-item',
    url:      'https://www.dndbeyond.com/magic-items/4610-cloak-of-elvenkind',
  },
  {
    id:       'pearl_of_power',
    tier:     'E',
    name:     'Pearl of Power',
    desc:     'Once per day, recover one expended spell slot of 3rd level or lower.',
    price_usd: 15.00,
    category: 'magic-item',
    url:      null,
  },
  {
    id:       'necklace_of_fireballs',
    tier:     'E',
    name:     'Necklace of Fireballs',
    desc:     'Up to 9 beads — detach and throw to trigger a fireball (DC 15 Dex, 3d6 per bead).',
    price_usd: 35.00,
    category: 'magic-item',
    url:      'https://www.dndbeyond.com/magic-items/4672-necklace-of-fireballs',
  },
  {
    id:       'cape_of_mountebank',
    tier:     'E',
    name:     'Cape of the Mountebank',
    desc:     'Cast Dimension Door once per day (recharges at dawn).',
    price_usd: 30.00,
    category: 'magic-item',
    url:      'https://www.dndbeyond.com/magic-items/4597-cape-of-the-mountebank',
  },
]

/** Lookup a shop item by ID */
export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_POOL.find((i) => i.id === id)
}
