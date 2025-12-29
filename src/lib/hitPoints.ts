// src/lib/hitPoints.ts
// Simple, consistent HP math for the character builder.
// We use the common 5e default: max HP at level 1, then average on level-up.

import type { ClassKey } from './subclasses'

export type HpCalcMethod = 'average' | 'max'

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function hitDieForClass(classKey: ClassKey): number {
  switch (classKey) {
    case 'barbarian':
      return 12
    case 'fighter':
    case 'paladin':
    case 'ranger':
      return 10
    case 'sorcerer':
    case 'wizard':
      return 6
    case 'bard':
    case 'cleric':
    case 'druid':
    case 'monk':
    case 'rogue':
    case 'warlock':
    case 'artificer':
    default:
      return 8
  }
}

export function averageHpPerLevel(hitDie: number): number {
  // 5e “average” is (die/2 + 1), rounded down.
  // d6=4, d8=5, d10=6, d12=7
  return Math.floor(hitDie / 2) + 1
}

export function calcMaxHp(args: {
  classKey: ClassKey
  level: number
  conScore: number
  method?: HpCalcMethod
}): number {
  const level = Math.max(1, Math.min(20, Math.floor(args.level || 1)))
  const hitDie = hitDieForClass(args.classKey)
  const conMod = abilityMod(args.conScore)
  const method: HpCalcMethod = args.method ?? 'average'

  // Level 1: max hit die + CON
  const level1 = hitDie + conMod
  if (level === 1) return Math.max(1, level1)

  const perLevel = method === 'max' ? hitDie : averageHpPerLevel(hitDie)
  const laterLevels = (level - 1) * (perLevel + conMod)

  return Math.max(1, level1 + laterLevels)
}
