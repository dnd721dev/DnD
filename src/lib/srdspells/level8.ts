// 8th-level spells

import type { SrdSpell } from './types'

export const LEVEL8_SPELLS: SrdSpell[] = [
  {
    name: 'Earthquake',
    level: 8,
    school: 'Evocation',
    castingTime: '1 action',
    range: '500 feet',
    components: 'V, S, M',
    duration: 'Up to 1 minute (concentration)',
    notes:
      'Shakes the ground in a wide area, potentially knocking creatures prone and damaging structures. Use DM rulings for saves and damage.',
    classes: ['cleric', 'druid'],
  },
  {
    name: 'Sunburst',
    level: 8,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: 'V, S, M',
    duration: 'Instantaneous',
    saveAbility: 'con',
    damage: '12d6',
    notes:
      'Radiant explosion in a large radius. Con save for radiant damage (half on success) and potential blindness.',
    classes: ['cleric', 'druid', 'sorcerer', 'wizard'],
  },
  {
    name: 'Dominate Monster',
    level: 8,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Up to 1 hour (concentration)',
    saveAbility: 'wis',
    notes:
      'Wisdom save or the creature is charmed and you control its actions, with repeat saves in certain situations.',
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
  },
]
