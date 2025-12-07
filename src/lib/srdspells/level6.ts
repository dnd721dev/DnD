// 6th-level spells

import type { SrdSpell } from './types'

export const LEVEL6_SPELLS: SrdSpell[] = [
  {
    name: 'Disintegrate',
    level: 6,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S, M',
    duration: 'Instantaneous',
    saveAbility: 'dex',
    damage: '10d6+40',
    notes:
      'On a failed Dex save, the target takes massive force damage. On success, it takes no damage.',
    classes: ['sorcerer', 'wizard'],
  },
  {
    name: 'Chain Lightning',
    level: 6,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: 'V, S, M',
    duration: 'Instantaneous',
    saveAbility: 'dex',
    damage: '10d8',
    notes:
      'A bolt arcs to multiple targets. Each target makes a Dex save for lightning damage (half on success).',
    classes: ['sorcerer', 'wizard'],
  },
  {
    name: 'Heal',
    level: 6,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damage: '70',
    notes:
      'Restores a large flat amount of hit points. Use the roller to show the healing amount, though it is not actually random.',
    classes: ['cleric', 'druid'],
  },
  {
    name: 'Globe of Invulnerability',
    level: 6,
    school: 'Abjuration',
    castingTime: '1 action',
    range: 'Self (10-foot radius)',
    components: 'V, S, M',
    duration: 'Up to 1 minute (concentration)',
    notes:
      'Creates a barrier that blocks lower-level spells targeting creatures inside.',
    classes: ['wizard'],
  },
]
