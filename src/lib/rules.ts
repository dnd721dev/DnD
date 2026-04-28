export function proficiencyForLevel(level: number){
if (level >= 17) return 6
if (level >= 13) return 5
if (level >= 9) return 4
if (level >= 5) return 3
return 2
}

/**
 * Returns how many ASI (Ability Score Improvement) slots a class earns
 * by the given level, following 5e SRD rules.
 * Fighter: 4,6,8,10,12,14,16,18,19
 * Rogue:   4,8,10,12,16,18,19
 * Others:  4,8,12,16,19
 */
export function asiSlotsForClassLevel(classKey: string, level: number): number {
  const cls = String(classKey ?? '').toLowerCase()
  const lvl = Math.max(1, Math.min(20, Math.floor(level || 1)))

  if (cls === 'fighter') {
    const breaks = [4, 6, 8, 10, 12, 14, 16, 18, 19]
    return breaks.filter((b) => lvl >= b).length
  }
  if (cls === 'rogue') {
    const breaks = [4, 8, 10, 12, 16, 18, 19]
    return breaks.filter((b) => lvl >= b).length
  }
  // Default (all other classes)
  const breaks = [4, 8, 12, 16, 19]
  return breaks.filter((b) => lvl >= b).length
}

// D&D 5e XP thresholds for levels 1–20
const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000,
  48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000,
  225000, 265000, 305000, 355000,
] as const

/** Returns the character level corresponding to the given XP total. */
export function levelForXp(xp: number): number {
  let level = 1
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1
  }
  return Math.min(20, level)
}

/** Returns the minimum XP required to reach the given level. */
export function xpForLevel(level: number): number {
  const idx = Math.max(1, Math.min(20, level)) - 1
  return XP_THRESHOLDS[idx]
}

/** Returns XP needed from current total to reach the next level. */
export function xpToNextLevel(xp: number): number {
  const currentLevel = levelForXp(xp)
  if (currentLevel >= 20) return 0
  return XP_THRESHOLDS[currentLevel] - xp
}

/**
 * Compute Armor Class from an equipped armor key + DEX score.
 * If acOverride is provided (non-null), that value is used as-is.
 * Uses the armor's baseAc and dexCap from src/lib/armor.ts.
 *
 * Pass opts.classKey + opts.conScore/wisScore to get correct unarmored
 * defense for Barbarian (10+DEX+CON) and Monk (10+DEX+WIS).
 */
export function calcAC(
  armorKey: string | null | undefined,
  dexScore: number,
  acOverride?: number | null,
  shieldEquipped?: boolean,
  opts?: { classKey?: string; conScore?: number; wisScore?: number },
): number {
  const shieldBonus = shieldEquipped ? 2 : 0
  if (acOverride != null) return acOverride + shieldBonus
  const dexMod = Math.floor((dexScore - 10) / 2)
  if (!armorKey) {
    const cls = String(opts?.classKey ?? '').toLowerCase()
    let base = 10 + dexMod
    if (cls === 'barbarian' && opts?.conScore != null) {
      const conMod = Math.floor((opts.conScore - 10) / 2)
      base = 10 + dexMod + conMod
    } else if (cls === 'monk' && opts?.wisScore != null) {
      const wisMod = Math.floor((opts.wisScore - 10) / 2)
      base = 10 + dexMod + wisMod
    }
    return base + shieldBonus
  }
  // Dynamic import of ARMORS to avoid circular deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ARMORS } = require('./armor') as { ARMORS: Record<string, { baseAc: number; dexCap: number | null }> }
  const armor = ARMORS[armorKey]
  if (!armor) return 10 + dexMod + shieldBonus
  const dexContrib =
    armor.dexCap === 0 ? 0
    : armor.dexCap == null ? dexMod
    : Math.min(dexMod, armor.dexCap)
  return armor.baseAc + dexContrib + shieldBonus
}