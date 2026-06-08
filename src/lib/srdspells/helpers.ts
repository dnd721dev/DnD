// Pure helpers for reading SrdSpell records.
// All helpers are non-throwing and fall back gracefully so existing rows that
// don't yet have the new optional fields keep working.

import type { SrdSpell } from './types'

/** True if the spell requires concentration. Prefers explicit flag. */
export function isConcentration(s: Pick<SrdSpell, 'concentration' | 'duration'>): boolean {
  if (typeof s.concentration === 'boolean') return s.concentration
  return /concentration/i.test(s.duration ?? '')
}

/** True if the spell can be cast as a ritual. Prefers explicit flag. */
export function isRitual(s: Pick<SrdSpell, 'ritual' | 'castingTime'>): boolean {
  if (typeof s.ritual === 'boolean') return s.ritual
  return /ritual/i.test(s.castingTime ?? '')
}

/**
 * Returns the active cantrip damage dice for a given caster (character) level
 * using the 5/11/17 breakpoints. Falls back to the row's `damage` field.
 * Returns null if the spell has no damage at all.
 */
export function getCantripDice(
  s: Pick<SrdSpell, 'level' | 'damage' | 'cantripScaling'>,
  casterLevel: number,
): string | null {
  // Only cantrips scale this way.
  if (s.level !== 0) return s.damage ?? null
  const t = s.cantripScaling
  if (t) {
    if (casterLevel >= 17) return t.l17
    if (casterLevel >= 11) return t.l11
    if (casterLevel >= 5)  return t.l5
  }
  return s.damage ?? null
}

/** Human label for an area of effect — "20-ft sphere", "60-ft cone", etc. */
export function formatAreaOfEffect(s: Pick<SrdSpell, 'areaOfEffect'>): string | null {
  const a = s.areaOfEffect
  if (!a) return null
  switch (a.shape) {
    case 'sphere':   return `${a.sizeFt}-ft radius sphere`
    case 'cylinder': return `${a.sizeFt}-ft radius cylinder${a.heightFt ? `, ${a.heightFt} ft tall` : ''}`
    case 'cone':     return `${a.sizeFt}-ft cone`
    case 'line':     return `${a.sizeFt}-ft line${a.widthFt ? `, ${a.widthFt} ft wide` : ''}`
    case 'cube':     return `${a.sizeFt}-ft cube`
    case 'square':   return `${a.sizeFt}-ft square`
  }
}

/** Pretty cap-cased damage type label. */
export function formatDamageType(s: Pick<SrdSpell, 'damageType'>): string | null {
  if (!s.damageType) return null
  return s.damageType.charAt(0).toUpperCase() + s.damageType.slice(1)
}

/** Prefer fullDescription, fall back to legacy notes. */
export function getDescription(s: Pick<SrdSpell, 'fullDescription' | 'notes'>): string {
  return s.fullDescription ?? s.notes ?? ''
}
