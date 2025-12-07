// Cantrips (level 0)

import type { SrdSpell } from './types'

export const CANTRIPS: SrdSpell[] = [
  {
    name: 'Fire Bolt',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    attackRoll: true,
    damage: '1d10',
    notes: 'Ranged spell attack, deals fire damage.',
    classes: ['sorcerer', 'wizard'],
  },
  {
    name: 'Ray of Frost',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    attackRoll: true,
    damage: '1d8',
    notes: 'Ranged spell attack, cold damage, slows target.',
    classes: ['sorcerer', 'wizard'],
  },
  {
    name: 'Sacred Flame',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    saveAbility: 'dex',
    damage: '1d8',
    notes: 'Dex save for radiant damage, no attack roll.',
    classes: ['cleric'],
  },
]
