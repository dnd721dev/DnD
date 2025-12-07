export interface CharacterDraft {
  // NFT
  nft_contract?: string | null
  nft_token_id?: string | null
  avatar_url?: string | null

  // Basics
  name?: string
  level?: number
  classKey?: string
  subclassKey?: string | null
  backgroundKey?: string
  raceKey?: string
  alignment?: string | ''

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

  savingThrows?: Record<
    'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha',
    boolean
  >

  skillProficiencies?: Record<string, 'none' | 'proficient' | 'expertise'>

  // Combat
  maxHp?: number
  currentHp?: number
  armorClass?: number
  initiative?: number
  speed?: number

  // Equipment
  packKey?: string | null
  mainWeaponKey?: string | null
  armorKey?: string | null

  // Spells
  knownSpells?: string[]
  preparedSpells?: string[]

  // Personality
  notes?: string
  personalityTraits?: string
  ideals?: string
  bonds?: string
  flaws?: string
}
