import type { Abilities } from '../../../types/character'
import type { CharacterSheetData } from './types'
import { abilityMod } from './utils'

export type SkillDef = { key: string; label: string; ability: keyof Abilities }

export const ALL_SKILLS: SkillDef[] = [
  { key: 'acrobatics', label: 'Acrobatics', ability: 'dex' },
  { key: 'animal_handling', label: 'Animal Handling', ability: 'wis' },
  { key: 'arcana', label: 'Arcana', ability: 'int' },
  { key: 'athletics', label: 'Athletics', ability: 'str' },
  { key: 'deception', label: 'Deception', ability: 'cha' },
  { key: 'history', label: 'History', ability: 'int' },
  { key: 'insight', label: 'Insight', ability: 'wis' },
  { key: 'intimidation', label: 'Intimidation', ability: 'cha' },
  { key: 'investigation', label: 'Investigation', ability: 'int' },
  { key: 'medicine', label: 'Medicine', ability: 'wis' },
  { key: 'nature', label: 'Nature', ability: 'int' },
  { key: 'perception', label: 'Perception', ability: 'wis' },
  { key: 'performance', label: 'Performance', ability: 'cha' },
  { key: 'persuasion', label: 'Persuasion', ability: 'cha' },
  { key: 'religion', label: 'Religion', ability: 'int' },
  { key: 'sleight_of_hand', label: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', label: 'Stealth', ability: 'dex' },
  { key: 'survival', label: 'Survival', ability: 'wis' },
]

export function skillDisplay(
  key: string,
  c: CharacterSheetData | null,
  abilities: Abilities,
  profBonus: number,
) {
  const def = ALL_SKILLS.find((s) => s.key === key)
  if (!def) return { label: key, total: 0, mark: '', ability: undefined as any }

  const profsRaw = c?.skill_proficiencies ?? {}
  const profState = profsRaw[key] ?? 'none'

  const base = abilityMod(abilities[def.ability])
  let bonus = 0
  let mark = ''

  if (profState === 'proficient') {
    bonus = profBonus
    mark = '•'
  } else if (profState === 'expertise') {
    bonus = profBonus * 2
    mark = '••'
  }

  return {
    label: def.label,
    ability: def.ability,
    total: base + bonus,
    mark,
  }
}
