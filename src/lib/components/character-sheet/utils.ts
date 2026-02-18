export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatMod(mod: number) {
  return (mod >= 0 ? '+' : '') + mod
}
