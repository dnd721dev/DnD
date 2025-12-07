// 5th-level spells

import type { SrdSpell } from './types'

export const LEVEL5_SPELLS: SrdSpell[] = [
  {
    name: 'Cone of Cold',
    level: 5,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self (60-foot cone)',
    components: 'V, S, M',
    duration: 'Instantaneous',
    saveAbility: 'con',
    damage: '8d8',
    notes: 'Creatures in the cone make a Con save for cold damage (half on success).',
    classes: ['sorcerer', 'wizard'],
  },
  {
    name: 'Wall of Force',
    level: 5,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S, M',
    duration: 'Up to 10 minutes (concentration)',
    notes:
      'Invisible wall of force that is nearly impossible to break. No save here in sheet; use DM ruling.',
    classes: ['wizard'],
  },
  {
    name: 'Hold Monster',
    level: 5,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '90 feet',
    components: 'V, S, M',
    duration: 'Up to 1 minute (concentration)',
    saveAbility: 'wis',
    notes:
      'Wisdom save or the creature is paralyzed. It can repeat the save at the end of its turns.',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
  },
  {
    name: 'Raise Dead',
    level: 5,
    school: 'Necromancy',
    castingTime: '1 hour',
    range: 'Touch',
    components: 'V, S, M',
    duration: 'Instantaneous',
    notes:
      'Returns a dead creature to life with penalties until it finishes long rests. No save or damage roll.',
    classes: ['bard', 'cleric', 'paladin'],
  },
]
