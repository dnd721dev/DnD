export interface CharacterDraft {
  // NFT
  nft_contract?: string | null
  nft_token_id?: string | null
  avatar_url?: string | null

  // Basics
  is_caya?: boolean
  name?: string
  level?: number
  classKey?: string
  subclassKey?: string | null
  backgroundKey?: string
  raceKey?: string
  alignment?: string | ''

  /**
   * Wave 6 — Multiclass (Option A, 2-class narrow schema).
   * Total character level = `level + (secondaryLevel ?? 0)`.
   * Most characters are single-class; these fields stay unset.
   */
  secondaryClass?: string | null
  secondarySubclass?: string | null
  secondaryLevel?: number

  // Abilities
  baseAbilities?: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }

  abilityBonuses?: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  }

  proficiencyBonus?: number

  savingThrows?: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', boolean>

  skillProficiencies?: Record<string, 'none' | 'proficient' | 'expertise'>

  // Combat
  maxHp?: number
  currentHp?: number
  armorClass?: number
  acOverride?: number | null
  initiative?: number
  speed?: number

  // Equipment method (Option A = class kit, Option B = starting gold)
  startingEquipmentChoice?: 'A' | 'B'
  /** Starting gold chosen under Option B (GP). */
  startingGold?: number

  // Equipment (selected)
  packKey?: string | null
  mainWeaponKey?: string | null
  armorKey?: string | null

  // ✅ Owned item keys seeded by Step 5 (from pack + chosen weapon/armor)
  equipmentItems?: string[]

  // ✅ Inventory items that get written to DB on final save (jsonb)
  inventoryItems?: Array<{
    id: string
    key?: string | null
    name: string
    qty: number
    category?: 'weapon' | 'armor' | 'shield' | 'gear' | 'consumable' | 'treasure' | 'misc'
  }>

  // Languages (from race + extra choices)
  languages?: string[]

  // Tool proficiencies (from background)
  toolProficiencies?: string[]

  // Ability Score Improvements / Feats
  asiChoices?: Array<{
    type: 'plus2' | 'plus1plus1' | 'feat'
    ability1?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
    ability2?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
    featName?: string
  }>

  // Origin Feat (2024 rules: granted by background, not player-chosen)
  originFeat?: string

  // Weapon Masteries (2024 rules: fighters/barbarians/paladins/rangers choose mastery weapons)
  weaponMasteries?: string[]

  // Spells
  knownSpells?: string[]
  preparedSpells?: string[]
  /**
   * Wave 1B — Eldritch Knight / Arcane Trickster any-school wildcard picks.
   * Stores spell names that were picked using a wildcard slot (from any
   * school, not just the subclass-restricted ones).
   */
  wildcardSpells?: string[]
  /**
   * Wave 3 — Warlock Mystic Arcanum picks, keyed by spell level.
   * Example: { "6": "Eyebite", "7": null, "8": null, "9": null }
   * Each entry is castable 1/day (long rest) and bypasses pact slots.
   */
  mysticArcanum?: Record<string, string | null>
  /**
   * Wave 4 — Warlock Eldritch Invocations. Stored as an array of invocation
   * keys (see src/lib/invocations.ts → InvocationKey). Book of Ancient
   * Secrets enables ritual casting; other invocations are mostly passive flags.
   */
  warlockInvocations?: string[]
  /** Chosen cantrip for races with a cantrip choice (e.g. High Elf) */
  racialCantripChoice?: string

  // Personality
  notes?: string
  personalityTraits?: string
  ideals?: string
  bonds?: string
  flaws?: string
}
