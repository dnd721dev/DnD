// 9th-level spells

import type { SrdSpell } from './types'

export const LEVEL9_SPELLS: SrdSpell[] = [
  {
    name: 'Meteor Swarm',
    level: 9,
    school: 'Evocation',
    castingTime: '1 action',
    range: '1 mile',
    components: 'V, S',
    duration: 'Instantaneous',
    saveAbility: 'dex',
    damage: '40d6',
    notes:
      'Massive explosion of blazing meteors. In rules it splits between bludgeoning and fire; here roll total damage and narrate.',
    classes: ['sorcerer', 'wizard'],
  },
  {
    name: 'Wish',
    level: 9,
    school: 'Conjuration',
    castingTime: '1 action',
    range: 'Self',
    components: 'V',
    duration: 'Instantaneous',
    notes:
      'You reshape reality with restrictions set by the table. No standard save/damage here; this is pure DM adjudication.',
    classes: ['sorcerer', 'wizard'],
  },
  {
    name: 'Mass Heal',
    level: 9,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    damage: '700',
    notes:
      'Restores a huge total pool of hit points among creatures you choose. Use roller for visualizing the pool if desired.',
    classes: ['cleric'],
  },
  {
    name: 'Power Word Kill',
    level: 9,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    notes:
      'If a creature has low enough hit points, it dies instantly with no save. Otherwise, the spell has no effect.',
    classes: ['bard', 'warlock', 'wizard'],
  },
]
