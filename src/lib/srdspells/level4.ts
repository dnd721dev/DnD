// 4th-level spells

import type { SrdSpell } from './types'

export const LEVEL4_SPELLS: SrdSpell[] = [
  {
    name: 'Polymorph',
    level: 4,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S, M',
    duration: 'Up to 1 hour (concentration)',
    saveAbility: 'wis',
    notes:
      'Transforms a creature into a beast form. On a failed Wisdom save, the target changes shape.',
    classes: ['bard', 'druid', 'sorcerer', 'wizard'],
  },
  {
    name: 'Dimension Door',
    level: 4,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '500 feet',
    components: 'V',
    duration: 'Instantaneous',
    notes:
      'Teleport yourself (and optionally one willing creature) to a location you can describe.',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
  },
  {
    name: 'Ice Storm',
    level: 4,
    school: 'Evocation',
    castingTime: '1 action',
    range: '300 feet',
    components: 'V, S, M',
    duration: 'Instantaneous',
    saveAbility: 'dex',
    damage: '2d8+4d6',
    notes:
      'Hailstones batter a cylinder. On a failed Dex save, the target takes bludgeoning and cold damage (use total roll as combined).',
    classes: ['druid', 'sorcerer', 'wizard'],
  },
  {
    name: 'Banishment',
    level: 4,
    school: 'Abjuration',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S, M',
    duration: 'Up to 1 minute (concentration)',
    saveAbility: 'cha',
    notes:
      'Charisma save or the target is banished to a harmless demiplane or its native plane.',
    classes: ['cleric', 'paladin', 'warlock', 'wizard'],
  },
]
