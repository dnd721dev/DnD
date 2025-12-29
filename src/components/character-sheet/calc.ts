import type { Abilities } from '../../types/character'
import type { CharacterSheetData } from './types'
import { abilityMod } from './utils'
import { proficiencyForLevel } from '@/lib/rules'
import { skillDisplay } from './skills'
import { computeArmorClass, computeMainAttack } from './equipment-calc'
import { applySubclassToDerived } from '@/lib/applySubclassEffects'
import type { DerivedResource } from '@/lib/applySubclassEffects'
import { getClassResources } from '@/lib/classResources' // ✅ NEW

export type DerivedStats = {
  level: number
  profBonus: number

  mods: Record<keyof Abilities, number>

  initiative: number
  ac: number
  hpCurrent: number
  hpMax: number
  passivePerception: number

  armorName: string | null
  shieldEquipped: boolean

  weaponName: string | null
  proficientWithMainWeapon: boolean
  attackBonus: number
  attackFormula: string
  damageFormula: string
  damageType: string | null

  // ✅ Subclass-aware fields
  critRange: number
  flags: Record<string, any>
  notes: string[]
  resources: DerivedResource[]
}

export function deriveStats(c: CharacterSheetData, abilities: Abilities): DerivedStats {
  const level = c.level ?? 1
  const profBonus = proficiencyForLevel(level)

  const mods = {
    str: abilityMod(abilities.str),
    dex: abilityMod(abilities.dex),
    con: abilityMod(abilities.con),
    int: abilityMod(abilities.int),
    wis: abilityMod(abilities.wis),
    cha: abilityMod(abilities.cha),
  } satisfies Record<keyof Abilities, number>

  // HP: prefer explicit max/current fields, otherwise fallback
  let hpMax = c.hit_points_max ?? c.hp ?? 0
  const hpCurrent =
    c.hit_points_current ??
    (c.hit_points_max != null ? c.hit_points_max : c.hp != null ? c.hp : 0)

  // Passive Perception: use stored, else compute from Perception skill
  let passivePerception = c.passive_perception ?? 0
  if (!passivePerception) {
    const perception = skillDisplay('perception', c, abilities, profBonus)
    passivePerception = 10 + perception.total
  }

  // ✅ Equipment-driven AC (authoritative)
  const armorRes = computeArmorClass(c, abilities)

  // ✅ Equipment-driven main attack (authoritative + proficiency-aware)
  const atk = computeMainAttack(c, abilities, profBonus)

  const initiative = mods.dex

  const d: DerivedStats = {
    level,
    profBonus,
    mods,
    initiative,
    ac: armorRes.ac,
    hpCurrent,
    hpMax,
    passivePerception,

    armorName: armorRes.armorName,
    shieldEquipped: armorRes.shieldEquipped,

    weaponName: atk.weaponName,
    proficientWithMainWeapon: atk.proficient,
    attackBonus: atk.attackBonus,
    attackFormula: atk.attackFormula,
    damageFormula: atk.damageFormula,
    damageType: atk.damageType,

    critRange: 20,
    flags: {},
    notes: [],
    resources: [],
  }

  // ✅ Add CORE CLASS resources (Rage, Ki, Bardic Inspiration, etc.)
  // IMPORTANT: this assumes your column is `class_key` (string like "fighter", "barbarian").
  // If yours is named differently, tell me and I’ll swap it.
  const classKey = (c as any).class_key as any
  d.resources = [...(d.resources ?? []), ...getClassResources(classKey, level)]

  // ✅ Apply subclass rules (SRD + DND721 custom)
  applySubclassToDerived(c as any, abilities as any, d as any)

  // clamp
  if (d.hpCurrent > d.hpMax) d.hpCurrent = d.hpMax
  hpMax = d.hpMax

  return d
}
