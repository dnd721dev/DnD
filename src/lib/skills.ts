// src/lib/skills.ts
// SRD-style skill library for DND721.
// Includes all 5e skills, their governing ability, and short descriptive text.

// Keep this in sync with your Abilities type:
// { str, dex, con, int, wis, cha }
export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

// All 5e skills
export type SkillKey =
  | 'acrobatics'
  | 'animalHandling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleightOfHand'
  | 'stealth'
  | 'survival'

export type Skill = {
  key: SkillKey
  name: string
  ability: AbilityKey
  /** Short, paraphrased description – reminder only, not full rules text. */
  description: string
}

// -----------------------------
// Skill definitions (SRD-safe)
// -----------------------------

export const SKILLS: Record<SkillKey, Skill> = {
  acrobatics: {
    key: 'acrobatics',
    name: 'Acrobatics',
    ability: 'dex',
    description:
      'Covers balance, tumbling, flips, and staying on your feet during tricky movement or stunts.',
  },
  animalHandling: {
    key: 'animalHandling',
    name: 'Animal Handling',
    ability: 'wis',
    description:
      'Calming, guiding, or reading the moods of non-hostile animals or mounts.',
  },
  arcana: {
    key: 'arcana',
    name: 'Arcana',
    ability: 'int',
    description:
      'Knowledge about spells, magic items, symbols, and the general laws of magic.',
  },
  athletics: {
    key: 'athletics',
    name: 'Athletics',
    ability: 'str',
    description:
      'Physical feats like climbing, swimming, jumping, grappling, or shoving.',
  },
  deception: {
    key: 'deception',
    name: 'Deception',
    ability: 'cha',
    description:
      'Telling convincing lies, faking emotions, or misdirecting others.',
  },
  history: {
    key: 'history',
    name: 'History',
    ability: 'int',
    description:
      'Recall of important people, places, events, ancient empires, and lore.',
  },
  insight: {
    key: 'insight',
    name: 'Insight',
    ability: 'wis',
    description:
      'Reading body language, tone, and intent to sense lies or hidden feelings.',
  },
  intimidation: {
    key: 'intimidation',
    name: 'Intimidation',
    ability: 'cha',
    description:
      'Using threats, force of presence, or fear to get what you want.',
  },
  investigation: {
    key: 'investigation',
    name: 'Investigation',
    ability: 'int',
    description:
      'Picking apart clues, searching for hidden items, or figuring out how a puzzle or trap works.',
  },
  medicine: {
    key: 'medicine',
    name: 'Medicine',
    ability: 'wis',
    description:
      'Stabilizing the dying, reading symptoms, or providing basic non-magical care.',
  },
  nature: {
    key: 'nature',
    name: 'Nature',
    ability: 'int',
    description:
      'Knowledge of terrain, plants, animals, weather, and natural cycles.',
  },
  perception: {
    key: 'perception',
    name: 'Perception',
    ability: 'wis',
    description:
      'Noticing details, spotting hidden creatures, or hearing faint sounds.',
  },
  performance: {
    key: 'performance',
    name: 'Performance',
    ability: 'cha',
    description:
      'Entertaining an audience with music, acting, storytelling, or similar arts.',
  },
  persuasion: {
    key: 'persuasion',
    name: 'Persuasion',
    ability: 'cha',
    description:
      'Winning people over with charm, reason, or diplomacy rather than force.',
  },
  religion: {
    key: 'religion',
    name: 'Religion',
    ability: 'int',
    description:
      'Lore about gods, temples, rites, holy symbols, and religious traditions.',
  },
  sleightOfHand: {
    key: 'sleightOfHand',
    name: 'Sleight of Hand',
    ability: 'dex',
    description:
      'Palm objects, pick pockets, or perform subtle hand tricks without being noticed.',
  },
  stealth: {
    key: 'stealth',
    name: 'Stealth',
    ability: 'dex',
    description:
      'Moving quietly, staying out of sight, and avoiding detection.',
  },
  survival: {
    key: 'survival',
    name: 'Survival',
    ability: 'wis',
    description:
      'Tracking, hunting, finding shelter, and navigating the wilderness.',
  },
}

// Ordered list for UI loops (sidebars, tables, dropdowns)
export const SKILL_LIST: Skill[] = [
  SKILLS.acrobatics,
  SKILLS.animalHandling,
  SKILLS.arcana,
  SKILLS.athletics,
  SKILLS.deception,
  SKILLS.history,
  SKILLS.insight,
  SKILLS.intimidation,
  SKILLS.investigation,
  SKILLS.medicine,
  SKILLS.nature,
  SKILLS.perception,
  SKILLS.performance,
  SKILLS.persuasion,
  SKILLS.religion,
  SKILLS.sleightOfHand,
  SKILLS.stealth,
  SKILLS.survival,
]

// -----------------------------
// Optional helpers for math
// -----------------------------

// How proficient a character is in each skill
export type SkillProficiency =
  | 'none'
  | 'proficient'
  | 'expertise'

export type SkillProficiencyMap = Partial<Record<SkillKey, SkillProficiency>>

/**
 * Basic 5e ability modifier from a raw ability score.
 * (e.g. 10–11 => 0, 12–13 => +1, etc.)
 */
export function abilityScoreToModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Compute a single skill modifier, given:
 * - the skill key
 * - a map of ability scores
 * - proficiency bonus
 * - a map of skill prof/expertise
 */
export function getSkillModifier(opts: {
  skill: SkillKey
  abilities: Record<AbilityKey, number>
  proficiencyBonus: number
  proficiencies?: SkillProficiencyMap
}): number {
  const { skill, abilities, proficiencyBonus, proficiencies } = opts
  const skillDef = SKILLS[skill]
  const abilityScore = abilities[skillDef.ability] ?? 10
  const baseMod = abilityScoreToModifier(abilityScore)

  const profLevel = proficiencies?.[skill] ?? 'none'

  let bonus = 0
  if (profLevel === 'proficient') {
    bonus = proficiencyBonus
  } else if (profLevel === 'expertise') {
    bonus = proficiencyBonus * 2
  }

  return baseMod + bonus
}
