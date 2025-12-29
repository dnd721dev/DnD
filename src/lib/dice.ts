export type RollResult = {
  formula: string
  d: number[]
  kept: number[]
  mod: number
  total: number

  // ✅ NEW (optional, backwards-compatible)
  isCrit?: boolean
  critRange?: number
  natural?: number // the kept d20 value (if this was a d20 roll)
}

export function roll(formula: string): RollResult {
  // supports: 1d20+5, 2d20kh1+3, 2d6+2
  const m = formula.match(/(\d+)d(\d+)(kh1|kl1)?(?:([+-])(\d+))?/)
  if (!m) return { formula, d: [], kept: [], mod: 0, total: 0 }

  const [, dCountStr, dSidesStr, keep, sign, modStr] = m
  const dCount = Number(dCountStr)
  const dSides = Number(dSidesStr)
  const mod = modStr ? (sign === '-' ? -Number(modStr) : Number(modStr)) : 0

  const rolls = Array.from({ length: dCount }, () => 1 + Math.floor(Math.random() * dSides))
  let kept = rolls
  if (keep === 'kh1') kept = [Math.max(...rolls)]
  if (keep === 'kl1') kept = [Math.min(...rolls)]

  const total = kept.reduce((a, b) => a + b, 0) + mod

  return {
    formula,
    d: rolls,
    kept,
    mod,
    total,
  }
}

/**
 * ✅ 5e-aware d20 attack roll with crit detection
 */
export function rollD20WithCrit(formula: string, critRange = 20): RollResult {
  const res = roll(formula)

  // only applies to d20 rolls
  if (!res.kept.length) return res
  const natural = res.kept[0]

  const isCrit = natural >= critRange

  return {
    ...res,
    natural,
    critRange,
    isCrit,
  }
}

/**
 * ✅ Roll damage, optionally doubling dice on crit
 */
export function rollDamageWithCrit(formula: string, isCrit?: boolean): RollResult {
  if (!isCrit) return roll(formula)

  // Double ONLY dice, not modifiers
  // Example: 1d8+3 → 2d8+3
  const m = formula.match(/(\d+)d(\d+)(.*)/)
  if (!m) return roll(formula)

  const [, countStr, sidesStr, rest] = m
  const doubledFormula = `${Number(countStr) * 2}d${sidesStr}${rest}`

  return roll(doubledFormula)
}
