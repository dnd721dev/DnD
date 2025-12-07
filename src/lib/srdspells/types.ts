// Shared types for SRD spells

export type SpellSaveAbility = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

// Main 5e PHB casters + half-casters
export type SpellClass =
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'paladin'
  | 'ranger'
  | 'sorcerer'
  | 'warlock'
  | 'wizard'

export type SrdSpell = {
  name: string
  level: number // 0 = cantrip
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  attackRoll?: boolean
  saveAbility?: SpellSaveAbility
  damage?: string // formula e.g. "2d8+3"
  notes?: string
  classes?: SpellClass[] // NEW: which class spell lists this belongs to
}
