// src/lib/diceNotation.ts
// Shared dice-notation parsing for MULTI-GROUP formulas, e.g. "1d8 + 2d6 + 3"
// (weapon + sneak attack + modifier). Pure parsing only — no RNG — so the server
// (crypto.randomInt) and client (crypto.getRandomValues) can each roll with their
// own generator while agreeing on how a formula decomposes.

export interface DiceGroup { count: number; sides: number }
export interface ParsedDice { groups: DiceGroup[]; mod: number }

/**
 * Loose validation pattern for zod/string guards. Full validation (ranges, token
 * sanity) is done by `parseDiceFormula` — use that for the authoritative parse.
 * Accepts: a leading dice group, then any number of `± NdM` or `± N` terms.
 */
export const DICE_FORMULA_REGEX =
  /^\s*\d+[dD]\d+(\s*[+-]\s*(\d+[dD]\d+|\d+))*\s*$/

/**
 * Decompose a formula into its dice groups + net flat modifier.
 * Dice terms are additive (a leading `-` on a dice term is treated as `+`);
 * integer terms are signed. Returns null on any unrecognized token or when totals
 * fall outside sane bounds (≤30 dice total, sides 2–100, ≤20 dice per group).
 */
export function parseDiceFormula(raw: string): ParsedDice | null {
  const s = (raw ?? '').replace(/\s+/g, '').toLowerCase()
  if (!s) return null
  // Split into signed terms: "1d8+2d6-1" → ["1d8", "+2d6", "-1"].
  const tokens = s.match(/[+-]?[^+-]+/g)
  if (!tokens) return null

  const groups: DiceGroup[] = []
  let mod = 0
  for (const tok of tokens) {
    const sign = tok.startsWith('-') ? -1 : 1
    const body = tok.replace(/^[+-]/, '')

    const dm = body.match(/^(\d+)d(\d+)$/)
    if (dm) {
      const count = parseInt(dm[1], 10)
      const sides = parseInt(dm[2], 10)
      if (count < 1 || count > 20 || sides < 2 || sides > 100) return null
      groups.push({ count, sides }) // dice are additive regardless of sign
      continue
    }

    const im = body.match(/^(\d+)$/)
    if (im) { mod += sign * parseInt(im[1], 10); continue }

    return null // unrecognized token
  }

  const totalDice = groups.reduce((a, g) => a + g.count, 0)
  if (totalDice < 1 || totalDice > 30) return null
  return { groups, mod }
}
