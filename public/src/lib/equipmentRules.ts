// src/lib/equipmentRules.ts
import type { CharacterDraft } from './../types/characterDraft'

type ClassKey = string

// Simple baseline class profs (SRD-ish).
// We can expand this later (racial profs, background, feats, custom house rules).
const CLASS_PROFS: Record<
  ClassKey,
  {
    weapons: ('simple' | 'martial' | 'all')[]
    armor: ('light' | 'medium' | 'heavy' | 'shields' | 'all' | 'none')[]
  }
> = {
  barbarian: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shields'] },
  bard: { weapons: ['simple'], armor: ['light'] },
  cleric: { weapons: ['simple'], armor: ['light', 'medium', 'shields'] },
  druid: { weapons: ['simple'], armor: ['light', 'medium', 'shields'] },
  fighter: { weapons: ['all'], armor: ['all'] },
  monk: { weapons: ['simple'], armor: ['none'] },
  paladin: { weapons: ['all'], armor: ['all'] },
  ranger: { weapons: ['simple', 'martial'], armor: ['light', 'medium', 'shields'] },
  rogue: { weapons: ['simple'], armor: ['light'] },
  sorcerer: { weapons: ['simple'], armor: ['none'] },
  warlock: { weapons: ['simple'], armor: ['light'] },
  wizard: { weapons: ['simple'], armor: ['none'] },
}

// Normalize helpers
function norm(v: any) {
  return String(v ?? '').trim().toLowerCase()
}

// Detect weapon “type” from your WEAPONS item shape.
// We try a bunch of common keys to avoid breaking if your data uses different field names.
function weaponGroup(weapon: any): 'simple' | 'martial' | null {
  const g =
    norm(weapon?.group) ||
    norm(weapon?.weaponGroup) ||
    norm(weapon?.category) ||
    norm(weapon?.type)

  if (g.includes('martial')) return 'martial'
  if (g.includes('simple')) return 'simple'
  return null
}

// Detect armor “type” from your ARMORS item shape.
function armorGroup(armor: any): 'light' | 'medium' | 'heavy' | 'shield' | null {
  const cat = norm(armor?.category) || norm(armor?.type) || norm(armor?.armorType)

  if (cat.includes('shield')) return 'shield'
  if (cat.includes('light')) return 'light'
  if (cat.includes('medium')) return 'medium'
  if (cat.includes('heavy')) return 'heavy'
  return null
}

export function classCanUseWeapon(classKeyRaw: any, weapon: any): boolean {
  const classKey = norm(classKeyRaw) || 'fighter'
  const prof = CLASS_PROFS[classKey] ?? CLASS_PROFS.fighter

  if (prof.weapons.includes('all')) return true

  const g = weaponGroup(weapon)
  if (!g) return true // if we can't detect, don't hide it (safe default)

  return prof.weapons.includes(g)
}

export function classCanUseArmor(classKeyRaw: any, armor: any): boolean {
  const classKey = norm(classKeyRaw) || 'fighter'
  const prof = CLASS_PROFS[classKey] ?? CLASS_PROFS.fighter

  if (prof.armor.includes('all')) return true
  if (prof.armor.includes('none')) return false

  const g = armorGroup(armor)
  if (!g) return true // if we can't detect, don't hide it (safe default)

  if (g === 'shield') return prof.armor.includes('shields')
  return prof.armor.includes(g)
}

// Convenience: filter lists based on current draft
export function filterWeaponsForDraft(draft: CharacterDraft | null, weaponsMap: any) {
  const classKey = draft?.classKey ?? 'fighter'
  const out: any[] = []
  for (const w of Object.values(weaponsMap ?? {})) {
    if (classCanUseWeapon(classKey, w)) out.push(w)
  }
  return out
}

export function filterArmorsForDraft(draft: CharacterDraft | null, armorsMap: any) {
  const classKey = draft?.classKey ?? 'fighter'
  const out: any[] = []
  for (const a of Object.values(armorsMap ?? {})) {
    // we usually don't want to show shields in “armor” dropdown unless you have one.
    // If you DO want shields, remove the next line.
    // if (String(a?.category ?? '').toLowerCase() === 'shield') continue
    if (classCanUseArmor(classKey, a)) out.push(a)
  }
  return out
}
