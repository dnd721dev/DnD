// src/lib/applySubclassEffects.ts
// Applies structured subclass effects to derived stats (ac, hpMax, critRange, flags)
// AND collects resources for UI (buttons + rest resets).

import type { Abilities } from './../types/character'
import type { SubclassKey } from '@/lib/subclasses'
import { getSubclassFeaturesForLevel } from '@/lib/subclassRules'

export type RechargeType = 'short_rest' | 'long_rest' | 'dawn' | 'special'

export type DerivedResource = {
  key: string
  name: string
  max: number
  current: number
  recharge: RechargeType
  die?: string
  note?: string
}

export type CharacterLikeForSubclass = {
  subclass_key?: string | null
  level?: number | null
  armor_key?: string | null
}

export type DerivedLike = {
  profBonus: number
  ac: number
  hpMax: number
  critRange?: number
  flags?: Record<string, any>
  notes?: string[]
  resources?: DerivedResource[]
}

function isWearingArmor(c: CharacterLikeForSubclass) {
  const k = String(c.armor_key ?? '').trim().toLowerCase()
  return !!k && k !== 'none'
}

function getScaledValue(
  byLevel: Array<{ level: number; value: number }>,
  classLevel: number,
) {
  let best = 0
  for (const row of byLevel) {
    if (classLevel >= row.level) best = row.value
  }
  return best
}

export function applySubclassToDerived(c: CharacterLikeForSubclass, abilities: Abilities, d: DerivedLike) {
  const subclass = (c.subclass_key ?? null) as SubclassKey | null
  if (!subclass) return d

  const classLevel = Math.max(1, Number(c.level ?? 1))
  const features = getSubclassFeaturesForLevel(subclass, classLevel)

  d.flags = d.flags ?? {}
  d.notes = d.notes ?? []
  d.critRange = d.critRange ?? 20
  d.resources = d.resources ?? []

  for (const f of features) {
    for (const eff of f.effects) {
      switch (eff.type) {
        case 'crit_range_set': {
          d.critRange = Math.min(d.critRange ?? 20, eff.range)
          break
        }

        case 'hp_bonus_per_level': {
          const bonus = Number(eff.amount || 0) * classLevel
          d.hpMax = Math.max(1, d.hpMax + bonus)
          break
        }

        case 'flag': {
          d.flags[eff.key] = eff.value ?? true
          break
        }

        case 'ac_bonus': {
          if (eff.condition?.toLowerCase().includes('base ac = 13 + dex')) break
          d.ac = d.ac + Number(eff.amount || 0)
          break
        }

        case 'resource_add': {
          const max =
            eff.scaling?.byLevel?.length
              ? getScaledValue(eff.scaling.byLevel, classLevel)
              : 1

          // avoid duplicates if multiple features touch same resource key
          const existing = d.resources.find((r) => r.key === eff.key)
          if (existing) {
            existing.max = Math.max(existing.max, max)
            existing.name = eff.name || existing.name
            existing.recharge = eff.recharge as any
            existing.die = eff.die || existing.die
            existing.note = eff.note || existing.note
            existing.current = Math.min(existing.current, existing.max)
          } else {
            d.resources.push({
              key: eff.key,
              name: eff.name,
              max,
              current: max,
              recharge: eff.recharge as any,
              die: eff.die,
              note: eff.note,
            })
          }
          break
        }

        default:
          break
      }
    }
  }

  // Special AC override: Draconic Resilience unarmored AC = 13 + DEX
  if (d.flags?.['sorcerer.draconic.unarmored_ac_13_plus_dex']) {
    if (!isWearingArmor(c)) {
      const dexMod = Math.floor((abilities.dex - 10) / 2)
      const draconicAC = 13 + dexMod
      d.ac = Math.max(d.ac, draconicAC)
    }
  }

  return d
}
