import type { Abilities } from '../../types/character'
import type { CharacterSheetData } from './types'
import { abilityMod } from './utils'
import { proficiencyForLevel } from '@/lib/rules'
import { skillDisplay } from './skills'
import { computeArmorClass, computeMainAttack } from './equipment-calc'
import { applySubclassToDerived } from '@/lib/applySubclassEffects'
import type { DerivedResource } from '@/lib/applySubclassEffects'
import { getClassResources } from '@/lib/classResources'

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

  let hpMax = c.hit_points_max ?? (c as any).hp ?? 0
  const hpCurrent =
    c.hit_points_current ??
    (c.hit_points_max != null ? c.hit_points_max : (c as any).hp != null ? (c as any).hp : 0)

  let passivePerception = (c as any).passive_perception ?? 0
  if (!passivePerception) {
    const perception = skillDisplay('perception', c, abilities, profBonus)
    passivePerception = 10 + perception.total
  }

  const armorRes = computeArmorClass(c, abilities)
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

  // ✅ FIX: use main_job as the default class key (fallback to class_key if it exists)
  const classKeyRaw = (c as any).class_key ?? (c as any).main_job ?? null
  const classKey = String(classKeyRaw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

  if (classKey) {
  d.resources = [
    ...(d.resources ?? []),
    ...getClassResources(classKey as any, level),
  ]
}
  // ✅ Apply subclass rules (these can also add resources)
  applySubclassToDerived(c as any, abilities as any, d as any)

  if (d.hpCurrent > d.hpMax) d.hpCurrent = d.hpMax
  hpMax = d.hpMax

  return d
}
