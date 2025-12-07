// 3rd-level spells

import type { SrdSpell } from './types'

export const LEVEL3_SPELLS: SrdSpell[] = [
  {
    name: 'Fireball',
    level: 3,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: 'V, S, M',
    duration: 'Instantaneous',
    saveAbility: 'dex',
    damage: '8d6',
    notes: 'Dex save for half, big boom.',
    classes: ['sorcerer', 'wizard'],
  },
]
