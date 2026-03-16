export type MonsterSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan'
export type MonsterType =
  | 'aberration'
  | 'beast'
  | 'celestial'
  | 'construct'
  | 'dragon'
  | 'elemental'
  | 'fey'
  | 'fiend'
  | 'giant'
  | 'humanoid'
  | 'monstrosity'
  | 'ooze'
  | 'plant'
  | 'undead'

export type AbilityScores = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type MonsterAction = {
  name: string
  type: 'attack' | 'ability' | 'trait'
  description: string
  attackBonus?: number
  damage?: string
  saveDc?: number
  saveType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
}

export type Monster = {
  id: string
  name: string
  cr: number
  size: MonsterSize
  type: MonsterType
  alignment: string
  armorClass: number
  hitPoints: number
  hitDice: string
  speed: string
  abilities: AbilityScores
  skills?: string[]
  senses?: string[]
  languages?: string[]
  traits?: MonsterAction[]
  actions: MonsterAction[]
  legendaryActions?: MonsterAction[]
  tokenImage?: string
  tags?: string[]
}
