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

/**
 * Wave 6 — Multiclass-aware HP calculation.
 *
 * 5e rules:
 *   - The FIRST class level grants the max hit die (no CON multiplier
 *     beyond the single CON mod for that level).
 *   - Every subsequent level grants the chosen class's per-level HP
 *     (average or max) PLUS CON mod.
 *   - "First class" = the class you took at character creation (`classes[0]`).
 *
 * Example: Fighter 5 / Wizard 3, CON +2
 *   Lvl 1 (Fighter): 10 + 2 = 12
 *   Lvl 2-5 (Fighter avg = 6): 4 × (6 + 2) = 32
 *   Lvl 6-8 (Wizard avg = 4):  3 × (4 + 2) = 18
 *   Total = 62 HP
 *
 * `classes[0]` is treated as the first class.
 */
export function calcMaxHpMulticlass(args: {
  classes: Array<{ classKey: ClassKey, level: number }>
  conScore: number
  method?: HpCalcMethod
}): number {
  if (!args.classes.length) return 1
  const conMod = abilityMod(args.conScore)
  const method: HpCalcMethod = args.method ?? 'average'

  // First class level 1: max hit die + CON
  const firstHitDie = hitDieForClass(args.classes[0].classKey)
  let hp = firstHitDie + conMod

  // Remaining levels: cycle through classes in order, summing per-level HP
  // (average or max) + CON mod for each level beyond the very first.
  let levelIndex = 0
  for (let ci = 0; ci < args.classes.length; ci++) {
    const entry = args.classes[ci]
    const hitDie = hitDieForClass(entry.classKey)
    const perLevel = method === 'max' ? hitDie : averageHpPerLevel(hitDie)
    const startInClass = (ci === 0) ? 1 : 0 // skip the first-class level-1 we already counted
    for (let lvl = startInClass; lvl < entry.level; lvl++) {
      levelIndex++
      if (ci === 0 && lvl === 0) continue // already counted (the level-1 in first class)
      hp += perLevel + conMod
    }
  }

  return Math.max(1, hp)
}
