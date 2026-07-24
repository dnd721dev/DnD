import type { Abilities } from '../../types/character'
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

function normJob(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

/**
 * Half-proficiency features, applied ONLY to skills with no proficiency:
 *   • Jack of All Trades — Bard 2+: +⌊prof/2⌋ to every non-proficient check.
 *   • Remarkable Athlete — Champion Fighter 7+: +⌈prof/2⌉ to non-proficient
 *     STR/DEX/CON checks.
 * Returns the larger applicable half bonus (they don't stack).
 */
function halfProficiencyBonus(
  c: CharacterSheetData | null,
  ability: keyof Abilities,
  profBonus: number,
): { bonus: number; source: string } | null {
  if (!c) return null
  const job = normJob((c as any).main_job)
  const job2 = normJob((c as any).secondary_class)
  const level = Math.max(1, Number((c as any).level ?? 1))
  const level2 = Math.max(0, Number((c as any).secondary_level ?? 0))
  const sub = normJob((c as any).subclass)
  const sub2 = normJob((c as any).secondary_subclass)

  const isBard2 = (job === 'bard' && level >= 2) || (job2 === 'bard' && level2 >= 2)
  const champLevel = job === 'fighter' ? level : job2 === 'fighter' ? level2 : 0
  const isChampion7 =
    champLevel >= 7 && (sub === 'fighter_champion' || sub2 === 'fighter_champion')
  const physical = ability === 'str' || ability === 'dex' || ability === 'con'

  const jack = isBard2 ? Math.floor(profBonus / 2) : 0
  const athlete = isChampion7 && physical ? Math.ceil(profBonus / 2) : 0
  if (jack === 0 && athlete === 0) return null
  return athlete >= jack
    ? { bonus: athlete || jack, source: athlete >= jack && athlete > 0 ? 'Remarkable Athlete' : 'Jack of All Trades' }
    : { bonus: jack, source: 'Jack of All Trades' }
}

export function skillDisplay(
  key: string,
  c: CharacterSheetData | null,
  abilities: Abilities,
  profBonus: number,
) {
  const def = ALL_SKILLS.find((s) => s.key === key)
  if (!def) return { label: key, total: 0, mark: '', ability: undefined as any, halfSource: null as string | null }

  const profsRaw = c?.skill_proficiencies ?? {}
  const profState = profsRaw[key] ?? 'none'

  const base = abilityMod(abilities[def.ability])
  let bonus = 0
  let mark = ''
  let halfSource: string | null = null

  if (profState === 'proficient') {
    bonus = profBonus
    mark = '•'
  } else if (profState === 'expertise') {
    bonus = profBonus * 2
    mark = '••'
  } else {
    // No proficiency — check for half-proficiency features.
    const half = halfProficiencyBonus(c, def.ability, profBonus)
    if (half) {
      bonus = half.bonus
      mark = '◐'
      halfSource = half.source
    }
  }

  return {
    label: def.label,
    ability: def.ability,
    total: base + bonus,
    mark,
    halfSource,
  }
}
