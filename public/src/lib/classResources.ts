// src/lib/classResources.ts
// Core 5e class resources for buttons (SRD-ish).
// This is NOT rules text — just counts + recharge to power the UI.

import type { ClassKey } from '@/lib/subclasses'
import type { RechargeType, DerivedResource } from '@/lib/applySubclassEffects'

export type ClassResourceDef = {
  key: string
  name: string
  recharge: RechargeType
  die?: string
  note?: string
  // Returns max uses at a given class level (or 0 if not available yet)
  maxAtLevel: (level: number) => number
}

function profBonusForLevel(level: number) {
  if (level >= 17) return 6
  if (level >= 13) return 5
  if (level >= 9) return 4
  if (level >= 5) return 3
  return 2
}

export const CLASS_RESOURCES: Partial<Record<ClassKey, ClassResourceDef[]>> = {
  barbarian: [
    {
      key: 'barbarian.rage',
      name: 'Rage',
      recharge: 'long_rest',
      note: 'Uses per long rest.',
      maxAtLevel: (lvl) => {
        if (lvl >= 20) return 999 // unlimited (we’ll show as 999/999)
        if (lvl >= 17) return 6
        if (lvl >= 12) return 5
        if (lvl >= 6) return 4
        if (lvl >= 3) return 3
        return 2
      },
    },
  ],

  bard: [
    {
      key: 'bard.bardic_inspiration',
      name: 'Bardic Inspiration',
      recharge: 'long_rest',
      die: 'd6',
      note: 'Uses per long rest.',
      maxAtLevel: (lvl) => (lvl >= 1 ? Math.max(1, profBonusForLevel(lvl)) : 0),
    },
  ],

  cleric: [
    {
      key: 'cleric.channel_divinity',
      name: 'Channel Divinity',
      recharge: 'short_rest',
      note: 'Uses per short or long rest.',
      maxAtLevel: (lvl) => {
        if (lvl >= 18) return 3
        if (lvl >= 6) return 2
        if (lvl >= 2) return 1
        return 0
      },
    },
  ],

  druid: [
    {
      key: 'druid.wild_shape',
      name: 'Wild Shape',
      recharge: 'short_rest',
      note: 'Uses per short or long rest.',
      maxAtLevel: (lvl) => (lvl >= 2 ? 2 : 0),
    },
  ],

  fighter: [
    {
      key: 'fighter.second_wind',
      name: 'Second Wind',
      recharge: 'short_rest',
      note: 'Uses per short or long rest.',
      maxAtLevel: (lvl) => (lvl >= 1 ? 1 : 0),
    },
    {
      key: 'fighter.action_surge',
      name: 'Action Surge',
      recharge: 'short_rest',
      note: 'Uses per short or long rest.',
      maxAtLevel: (lvl) => {
        if (lvl >= 17) return 2
        if (lvl >= 2) return 1
        return 0
      },
    },
  ],

  monk: [
    {
      key: 'monk.ki',
      name: 'Ki Points',
      recharge: 'short_rest',
      note: 'Points per short or long rest.',
      maxAtLevel: (lvl) => (lvl >= 2 ? lvl : 0),
    },
  ],

  paladin: [
    {
      key: 'paladin.divine_sense',
      name: 'Divine Sense',
      recharge: 'long_rest',
      note: 'Uses per long rest.',
      maxAtLevel: (lvl) => (lvl >= 1 ? Math.max(1, profBonusForLevel(lvl)) : 0),
    },
    {
      key: 'paladin.lay_on_hands',
      name: 'Lay on Hands (Pool)',
      recharge: 'long_rest',
      note: 'Healing pool per long rest (points).',
      maxAtLevel: (lvl) => (lvl >= 1 ? lvl * 5 : 0),
    },
  ],

  ranger: [
    // Keeping this minimal for now; optional to add more later.
  ],

  rogue: [
    // Rogue is mostly passive until later features; we’ll add more when needed.
  ],

  sorcerer: [
    {
      key: 'sorcerer.sorcery_points',
      name: 'Sorcery Points',
      recharge: 'long_rest',
      note: 'Points per long rest.',
      maxAtLevel: (lvl) => (lvl >= 2 ? lvl : 0),
    },
  ],

  warlock: [
    // Pact Magic is slots, not a “button resource” in the same sense; we can add later if you want.
  ],

  wizard: [
    {
      key: 'wizard.arcane_recovery',
      name: 'Arcane Recovery',
      recharge: 'long_rest',
      note: 'Uses per long rest.',
      maxAtLevel: (lvl) => (lvl >= 1 ? 1 : 0),
    },
  ],
}

export function getClassResources(classKey: ClassKey | null | undefined, level: number): DerivedResource[] {
  if (!classKey) return []
  const defs = CLASS_RESOURCES[classKey] ?? []
  const out: DerivedResource[] = []

  for (const def of defs) {
    const max = def.maxAtLevel(level)
    if (!max) continue
    out.push({
      key: def.key,
      name: def.name,
      max,
      current: max,
      recharge: def.recharge,
      die: def.die,
      note: def.note,
    })
  }

  return out
}
