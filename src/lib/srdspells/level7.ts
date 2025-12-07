// 7th-level spells

import type { SrdSpell } from './types'

export const LEVEL7_SPELLS: SrdSpell[] = [
  {
    name: 'Finger of Death',
    level: 7,
    school: 'Necromancy',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    saveAbility: 'con',
    damage: '7d8+30',
    notes:
      'On a failed Con save, the target takes necrotic damage; on success, half damage.',
    classes: ['warlock', 'wizard'],
  },
  {
    name: 'Plane Shift',
    level: 7,
    school: 'Conjuration',
    castingTime: '1 action',
    range: 'Touch or 60 feet',
    components: 'V, S, M',
    duration: 'Instantaneous',
    saveAbility: 'cha',
    notes:
      'Used either for travel between planes or to banish a target to another plane (Charisma save to resist).',
    classes: ['cleric', 'warlock', 'wizard'],
  },
  {
    name: 'Teleport',
    level: 7,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '10 feet',
    components: 'V',
    duration: 'Instantaneous',
    notes:
      'Instantly transports you and willing creatures to a known destination. No save; mishaps are DM territory.',
    classes: ['bard', 'sorcerer', 'wizard'],
  },
  {
    name: 'Fire Storm',
    level: 7,
    school: 'Evocation',
    castingTime: '1 action',
    range: '150 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    saveAbility: 'dex',
    damage: '7d10',
    notes:
      'Creatures in a series of fiery cubes make Dex saves for fire damage (half on success).',
    classes: ['cleric', 'druid'],
  },
]
