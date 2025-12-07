export type RollResult = {
formula: string
d: number[]
kept: number[]
mod: number
total: number
}


export function roll(formula: string): RollResult {
// supports like: 1d20+5, 2d20kh1+3, 2d6+2
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
return { formula, d: rolls, kept, mod, total }
}