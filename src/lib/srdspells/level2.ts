// 2nd-level spells

import type { SrdSpell } from './types'

export const LEVEL2_SPELLS: SrdSpell[] = [
  {
    name: 'Scorching Ray',
    level: 2,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    attackRoll: true,
    damage: '2d6',
    notes: 'Multiple rays; roll per ray as needed.',
    classes: ['sorcerer', 'wizard'],
  },
  {
    name: 'Hold Person',
    level: 2,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S, M',
    duration: 'Up to 1 minute (concentration)',
    saveAbility: 'wis',
    notes: 'Paralyzes on failed Wis save.',
    classes: ['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard'],
  },
]
