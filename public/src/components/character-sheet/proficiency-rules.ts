import type { CharacterSheetData } from './types'
import { WEAPON_DB } from './equipment-db'

function norm(raw: string) {
  return (raw ?? '').trim().toLowerCase()
}

/**
 * Starter class weapon proficiency rules.
 * Uses weapon.category: 'simple' | 'martial'
 *
 * Easy to expand later with feats, race, subclass, etc.
 */
export function isProficientWithMainWeapon(c: CharacterSheetData): boolean {
  const weaponKey = norm(c.main_weapon_key ?? '')
  if (!weaponKey) return true // unarmed

  const weapon = (WEAPON_DB as any)[weaponKey]
  if (!weapon) return false

  const job = norm(c.main_job ?? '')

  // Martial classes: simple + martial
  const martial = new Set(['fighter', 'barbarian', 'paladin', 'ranger'])

  // Simple-only by default (starter)
  const simpleOnly = new Set(['wizard', 'sorcerer', 'warlock', 'cleric', 'druid', 'bard'])

  if (martial.has(job)) return true

  // Rogue: simple + some martial (rapier/shortsword/hand crossbow etc.)
  if (job === 'rogue') {
    if (weapon.category === 'simple') return true
    const k = weapon.key
    return k === 'rapier' || k === 'shortsword' || k === 'hand_crossbow'
  }

  // Monk: simple + shortsword (starter)
  if (job === 'monk') {
    if (weapon.category === 'simple') return true
    return weapon.key === 'shortsword'
  }

  if (simpleOnly.has(job)) {
    return weapon.category === 'simple'
  }

  // Unknown class: don’t break characters
  return true
}
