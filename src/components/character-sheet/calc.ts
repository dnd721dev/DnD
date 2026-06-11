import type { Abilities } from '../../types/character'
import type { CharacterSheetData } from './types'
import { abilityMod } from './utils'
import { proficiencyForLevel } from '@/lib/rules'
import { skillDisplay } from './skills'
import { computeArmorClass, computeMainAttack } from './equipment-calc'
import { applySubclassToDerived } from '@/lib/applySubclassEffects'
import type { DerivedResource } from '@/lib/applySubclassEffects'
import { getClassResources } from '@/lib/classResources'
import { getRace, type RaceKey } from '@/lib/races'
import { CLASS_DATA, type ClassKey } from '@/lib/classes'

export type DerivedStats = {
  level: number
  profBonus: number

  mods: Record<keyof Abilities, number>

  initiative: number
  ac: number
  hpCurrent: number
  hpMax: number
  passivePerception: number

  // ✅ NEW: movement + vision (what the table will enforce later)
  speedFt: number
  visionFt: number
  darkvisionFt: number

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

  /** Rogue Sneak Attack: number of d6s (0 for non-rogues). Formula: Math.ceil(level / 2) */
  sneakAttackDice: number

  // ── Wave AC1: derived spellcasting numbers ─────────────────────────────
  /** Casting ability inferred from CLASS_DATA (per-class). null if non-caster. */
  castingAbility: keyof Abilities | null
  /** 8 + profBonus + casting mod. null if non-caster. */
  spellSaveDc: number | null
  /** profBonus + casting mod. null if non-caster. */
  spellAttackBonus: number | null

  // ── Wave AC2: initiative attribution sources ────────────────────────────
  /** Human-readable list like ["+3 DEX", "+1 Bard JoaT"] for the UI tooltip. */
  initiativeBonusSources: string[]
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

  // ── Initiative (base) — see Wave AC2 for bonus-source attribution below.
  let initiative = mods.dex
  const initiativeBonusSources: string[] = [`${mods.dex >= 0 ? '+' : ''}${mods.dex} DEX`]

  // ✅ Race defaults (used if DB fields are missing)
  const raceKey = String((c as any)?.race ?? '').trim().toLowerCase() as RaceKey
  const race = raceKey ? getRace(raceKey as any) : undefined

  // ✅ Speed: prefer DB value → fallback to race → fallback 30
  const speedFt =
    Number((c as any)?.speed_ft ?? (c as any)?.speed ?? 0) ||
    Number(race?.speed ?? 0) ||
    30

  // ✅ Vision used for fog-of-war later:
  // - visionFt: default 60 (VTT-friendly)
  // - darkvisionFt: race darkvision defaults to 60
  const visionFt = Number((c as any)?.vision_ft ?? 0) || 60

  const dvRaw = (c as any)?.darkvision_ft
  const darkvisionFt =
    (typeof dvRaw === 'number' && dvRaw > 0)
      ? dvRaw
      : (race?.vision === 'darkvision' ? 60 : 0)

  // ✅ FIX: use main_job as the default class key (fallback to class_key if it exists)
  const classKeyRaw = (c as any).class_key ?? (c as any).main_job ?? null
  const classKey = String(classKeyRaw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

  const d: DerivedStats = {
    level,
    profBonus,
    mods,
    initiative,
    ac: armorRes.ac,
    hpCurrent,
    hpMax,
    passivePerception,

    speedFt,
    visionFt,
    darkvisionFt,

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

    // Rogue Sneak Attack: 1d6 at level 1, +1d6 every 2 levels (max 10d6 at level 19)
    sneakAttackDice: classKey === 'rogue' ? Math.ceil(level / 2) : 0,

    // Wave AC1: derive spell save DC + attack from CLASS_DATA.
    castingAbility: null,
    spellSaveDc: null,
    spellAttackBonus: null,
    initiativeBonusSources,
  }

  if (classKey) {
    d.resources = [...(d.resources ?? []), ...getClassResources(classKey as any, level)]
  }

  // ── Wave AC1: derive spell save DC + spell attack from primary class ───
  // For multiclass we prefer an explicit `spellcasting_class` column if the
  // character has one (Wave 6K populates it), else fall back to main_job.
  // This makes DC/attack auto-update with ability score / level changes.
  {
    const explicitCasting = String((c as any)?.spellcasting_class ?? '').trim().toLowerCase()
    const castingClassKey = (explicitCasting || classKey) as ClassKey
    const def = castingClassKey ? (CLASS_DATA as any)[castingClassKey] : null
    const ability = def?.spellcasting?.ability as keyof Abilities | undefined
    if (ability && mods[ability] != null) {
      const castMod = mods[ability]
      d.castingAbility    = ability
      d.spellSaveDc       = 8 + profBonus + castMod
      d.spellAttackBonus  =     profBonus + castMod
    }
  }

  // ── Wave AC2: initiative + passive perception bonuses ────────────────────
  // Bard's Jack of All Trades (L2+) adds half prof to any check that doesn't
  // already include prof — initiative is a Dex check, so it qualifies.
  if (classKey === 'bard' && level >= 2) {
    const half = Math.floor(profBonus / 2)
    if (half > 0) {
      initiative += half
      initiativeBonusSources.push(`+${half} Bard JoaT`)
    }
  }
  // Champion fighters at L7+ gain Remarkable Athlete (+half prof to Str/Dex/Con
  // checks). Initiative is Dex.
  const subclassKey = String((c as any)?.subclass ?? '').trim().toLowerCase()
  if (classKey === 'fighter' && subclassKey === 'fighter_champion' && level >= 7) {
    const half = Math.ceil(profBonus / 2) // Remarkable Athlete rounds UP
    if (half > 0) {
      initiative += half
      initiativeBonusSources.push(`+${half} Remarkable Athlete`)
    }
  }
  // Alert feat — 2024 PHB adds prof bonus to initiative. We treat the feat as a
  // string in c.feats (case-insensitive).
  const feats: string[] = Array.isArray((c as any)?.feats) ? (c as any).feats.map((x: any) => String(x).toLowerCase()) : []
  if (feats.some((f) => f === 'alert')) {
    initiative += profBonus
    initiativeBonusSources.push(`+${profBonus} Alert feat`)
  }
  d.initiative = initiative
  d.initiativeBonusSources = initiativeBonusSources

  // Passive perception bonuses — Observant grants +5 PP/PInvestigation (2014)
  // or +prof bonus (2024). Default to +prof.
  if (feats.some((f) => f === 'observant')) {
    d.passivePerception += profBonus
  }
  // "Advantage on Perception" flag: +5 to passive Perception per PHB.
  if ((c as any)?.flags?.perception_advantage) {
    d.passivePerception += 5
  }

  // ✅ Apply subclass rules (these can also add resources)
  applySubclassToDerived(c as any, abilities as any, d as any)

  if (d.hpCurrent > d.hpMax) d.hpCurrent = d.hpMax
  hpMax = d.hpMax

  return d
}
