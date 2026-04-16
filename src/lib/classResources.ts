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
  // Optional overrides resolved at runtime
  dieAtLevel?: (level: number) => string
  rechargeAtLevel?: (level: number) => RechargeType
}

function profBonusForLevel(level: number) {
  if (level >= 17) return 6
  if (level >= 13) return 5
  if (level >= 9) return 4
  if (level >= 5) return 3
  return 2
}

// Hit die size per class (SRD)
export const CLASS_HIT_DIE: Partial<Record<ClassKey, string>> = {
  barbarian: 'd12',
  fighter: 'd10',
  paladin: 'd10',
  rogue: 'd10',
  artificer: 'd8',
  cleric: 'd8',
  druid: 'd8',
  monk: 'd8',
  ranger: 'd8',
  bard: 'd6',
  sorcerer: 'd6',
  warlock: 'd6',
  wizard: 'd6',
}

export const CLASS_RESOURCES: Partial<Record<ClassKey, ClassResourceDef[]>> = {
  barbarian: [
    { key: 'hit_die', name: 'Hit Dice (d12)', recharge: 'long_rest', die: 'd12', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
    {
      key: 'barbarian.rage',
      name: 'Rage',
      recharge: 'long_rest',
      note: 'Uses per long rest.',
      maxAtLevel: (lvl) => {
        if (lvl >= 20) return 999 // unlimited (we'll show as 999/999)
        if (lvl >= 17) return 6
        if (lvl >= 12) return 5
        if (lvl >= 6) return 4
        if (lvl >= 3) return 3
        return 2
      },
    },
  ],

  bard: [
    { key: 'hit_die', name: 'Hit Dice (d6)', recharge: 'long_rest', die: 'd6', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
    {
      key: 'bard.bardic_inspiration',
      name: 'Bardic Inspiration',
      recharge: 'long_rest',
      rechargeAtLevel: (lvl) => lvl >= 5 ? 'short_rest' : 'long_rest',
      die: 'd6',
      dieAtLevel: (lvl) => {
        if (lvl >= 15) return 'd12'
        if (lvl >= 10) return 'd10'
        if (lvl >= 5)  return 'd8'
        return 'd6'
      },
      note: 'Uses = proficiency bonus. Die scales d6→d8→d10→d12. Short rest at level 5+.',
      maxAtLevel: (lvl) => (lvl >= 1 ? profBonusForLevel(lvl) : 0),
    },
  ],

  cleric: [
    { key: 'hit_die', name: 'Hit Dice (d8)', recharge: 'long_rest', die: 'd8', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
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
    { key: 'hit_die', name: 'Hit Dice (d8)', recharge: 'long_rest', die: 'd8', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
    {
      key: 'druid.wild_shape',
      name: 'Wild Shape',
      recharge: 'short_rest',
      note: 'Uses per short or long rest.',
      maxAtLevel: (lvl) => (lvl >= 2 ? 2 : 0),
    },
  ],

  fighter: [
    { key: 'hit_die', name: 'Hit Dice (d10)', recharge: 'long_rest', die: 'd10', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
    {
      key: 'fighter.second_wind',
      name: 'Second Wind',
      recharge: 'short_rest',
      note: 'Uses per short or long rest.',
      maxAtLevel: (lvl) => (lvl >= 1 ? profBonusForLevel(lvl) : 0),
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
    {
      key: 'fighter.indomitable',
      name: 'Indomitable',
      recharge: 'long_rest',
      note: 'Reroll a failed saving throw.',
      maxAtLevel: (lvl) => {
        if (lvl >= 17) return 3
        if (lvl >= 13) return 2
        if (lvl >= 9)  return 1
        return 0
      },
    },
  ],

  monk: [
    { key: 'hit_die', name: 'Hit Dice (d8)', recharge: 'long_rest', die: 'd8', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
    {
      key: 'monk.ki',
      name: 'Ki Points',
      recharge: 'short_rest',
      note: 'Points per short or long rest.',
      maxAtLevel: (lvl) => (lvl >= 2 ? lvl : 0),
    },
  ],

  paladin: [
    { key: 'hit_die', name: 'Hit Dice (d10)', recharge: 'long_rest', die: 'd10', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
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
    {
      key: 'paladin.channel_divinity',
      name: 'Channel Divinity',
      recharge: 'short_rest',
      note: '2 uses per short rest. Choose effect from your oath.',
      maxAtLevel: (lvl) => (lvl >= 3 ? 2 : 0),
    },
  ],

  ranger: [
    { key: 'hit_die', name: 'Hit Dice (d8)', recharge: 'long_rest', die: 'd8', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
  ],

  rogue: [
    { key: 'hit_die', name: 'Hit Dice (d8)', recharge: 'long_rest', die: 'd8', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
  ],

  sorcerer: [
    { key: 'hit_die', name: 'Hit Dice (d6)', recharge: 'long_rest', die: 'd6', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
    {
      key: 'sorcerer.sorcery_points',
      name: 'Sorcery Points',
      recharge: 'long_rest',
      note: 'Points per long rest.',
      maxAtLevel: (lvl) => (lvl >= 2 ? lvl : 0),
    },
  ],

  warlock: [
    { key: 'hit_die', name: 'Hit Dice (d8)', recharge: 'long_rest', die: 'd8', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
    {
      key: 'warlock.pact_magic',
      name: 'Pact Magic Slots',
      recharge: 'short_rest',
      note: 'Spell slots recharge on short or long rest. Slot level scales with Warlock level.',
      maxAtLevel: (lvl) => {
        if (lvl >= 11) return 3
        if (lvl >= 2)  return 2
        if (lvl >= 1)  return 1
        return 0
      },
    },
  ],

  artificer: [
    { key: 'hit_die', name: 'Hit Dice (d8)', recharge: 'long_rest', die: 'd8', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
    {
      key: 'artificer.flash_of_genius',
      name: 'Flash of Genius',
      recharge: 'long_rest',
      note: 'Uses = Intelligence modifier (base 3). Add Int modifier to a failed ability check or saving throw.',
      maxAtLevel: (lvl) => (lvl >= 7 ? 3 : 0),
    },
  ],

  wizard: [
    { key: 'hit_die', name: 'Hit Dice (d6)', recharge: 'long_rest', die: 'd6', note: 'Spend during short rest to heal.', maxAtLevel: (lvl) => lvl },
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
    const die = def.dieAtLevel ? def.dieAtLevel(level) : def.die
    const recharge = def.rechargeAtLevel ? def.rechargeAtLevel(level) : def.recharge
    out.push({
      key: def.key,
      name: def.name,
      max,
      current: max,
      recharge,
      die,
      note: def.note,
    })
  }

  return out
}
