export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export const ABILITIES: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export type SkillDef = {
  key: string
  name: string
  ability: AbilityKey
}

export const SKILLS: SkillDef[] = [
  { key: 'acrobatics',      name: 'Acrobatics',      ability: 'dex' },
  { key: 'animal_handling', name: 'Animal Handling',  ability: 'wis' },
  { key: 'arcana',          name: 'Arcana',           ability: 'int' },
  { key: 'athletics',       name: 'Athletics',        ability: 'str' },
  { key: 'deception',       name: 'Deception',        ability: 'cha' },
  { key: 'history',         name: 'History',          ability: 'int' },
  { key: 'insight',         name: 'Insight',          ability: 'wis' },
  { key: 'intimidation',    name: 'Intimidation',     ability: 'cha' },
  { key: 'investigation',   name: 'Investigation',    ability: 'int' },
  { key: 'medicine',        name: 'Medicine',         ability: 'wis' },
  { key: 'nature',          name: 'Nature',           ability: 'int' },
  { key: 'perception',      name: 'Perception',       ability: 'wis' },
  { key: 'performance',     name: 'Performance',      ability: 'cha' },
  { key: 'persuasion',      name: 'Persuasion',       ability: 'cha' },
  { key: 'religion',        name: 'Religion',         ability: 'int' },
  { key: 'sleight_of_hand', name: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth',         name: 'Stealth',          ability: 'dex' },
  { key: 'survival',        name: 'Survival',         ability: 'wis' },
]

export const DIE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const
export type DieSides = (typeof DIE_TYPES)[number]

export type DieConfig = {
  /** Solid fill color for the die face */
  color: string
  /** Lighter highlight color for edges and glow */
  highlight: string
  /** RGBA glow color string for text-shadow / drop-shadow */
  glow: string
  /** SVG polygon points string (80x80 viewBox) — null for d100 (uses circle) */
  polygon: string | null
  /** Shadow polygon offset points string */
  shadowPolygon: string | null
  /** Total rotation degrees for the roll animation */
  rotation: number
  /** CSS keyframe animation name */
  animName: string
}

export const DIE_CONFIG: Record<DieSides, DieConfig> = {
  4: {
    color: '#0e7490',
    highlight: '#67e8f9',
    glow: 'rgba(6,182,212,0.8)',
    polygon: '40,6 74,70 6,70',
    shadowPolygon: '43,10 77,74 9,74',
    rotation: 900,
    animName: 'diceRollD4',
  },
  6: {
    color: '#b45309',
    highlight: '#fcd34d',
    glow: 'rgba(245,158,11,0.8)',
    polygon: '12,12 68,12 68,68 12,68',
    shadowPolygon: '15,16 71,16 71,72 15,72',
    rotation: 1080,
    animName: 'diceRollD6',
  },
  8: {
    color: '#065f46',
    highlight: '#6ee7b7',
    glow: 'rgba(16,185,129,0.8)',
    polygon: '40,5 75,40 40,75 5,40',
    shadowPolygon: '43,9 78,44 43,79 8,44',
    rotation: 1440,
    animName: 'diceRollD8',
  },
  10: {
    color: '#9a3412',
    highlight: '#fdba74',
    glow: 'rgba(249,115,22,0.8)',
    polygon: '40,5 72,32 60,75 20,75 8,32',
    shadowPolygon: '43,9 75,36 63,79 23,79 11,36',
    rotation: 1080,
    animName: 'diceRollD10',
  },
  12: {
    color: '#5b21b6',
    highlight: '#c4b5fd',
    glow: 'rgba(139,92,246,0.8)',
    polygon: '40,5 73,28 62,68 18,68 7,28',
    shadowPolygon: '43,9 76,32 65,72 21,72 10,32',
    rotation: 1080,
    animName: 'diceRollD12',
  },
  20: {
    color: '#1e3a8a',
    highlight: '#a5b4fc',
    glow: 'rgba(99,102,241,0.8)',
    polygon: '40,5 64,12 76,38 64,72 40,78 16,72 4,38 16,12',
    shadowPolygon: '43,9 67,16 79,42 67,76 43,82 19,76 7,42 19,16',
    rotation: 1260,
    animName: 'diceRollD20',
  },
  100: {
    color: '#334155',
    highlight: '#e2e8f0',
    glow: 'rgba(148,163,184,0.8)',
    polygon: null,
    shadowPolygon: null,
    rotation: 720,
    animName: 'diceRollD100',
  },
}
