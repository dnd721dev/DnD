// Re-export all types so existing imports like `import { Monster } from '@/lib/monsters'` still work
export type { MonsterSize, MonsterType, AbilityScores, MonsterAction, Monster } from './monstersData/types'

import type { Monster } from './monstersData/types'
import { ALL_SRD_MONSTERS } from './monstersData'

// The three original starter monsters (kept for any legacy token/image references)
const STARTER_MONSTERS: Monster[] = [
  {
    id: 'goblin',
    name: 'Goblin',
    cr: 0.25,
    size: 'Small',
    type: 'humanoid',
    alignment: 'neutral evil',
    armorClass: 15,
    hitPoints: 7,
    hitDice: '2d6',
    speed: '30 ft.',
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    skills: ['Stealth +6'],
    senses: ['Darkvision 60 ft.', 'Passive Perception 9'],
    languages: ['Common', 'Goblin'],
    traits: [
      {
        name: 'Nimble Escape',
        type: 'trait',
        description: 'The goblin can take the Disengage or Hide action as a bonus action on each of its turns.',
      },
    ],
    actions: [
      {
        name: 'Scimitar',
        type: 'attack',
        description: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6+2) slashing damage.',
        attackBonus: 4,
        damage: '1d6+2 slashing',
      },
      {
        name: 'Shortbow',
        type: 'attack',
        description: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6+2) piercing damage.',
        attackBonus: 4,
        damage: '1d6+2 piercing',
      },
    ],
    tokenImage: '/tokens/goblin.png',
    tags: ['low level', 'humanoid', 'sneaky'],
  },
  {
    id: 'bandit',
    name: 'Bandit',
    cr: 0.125,
    size: 'Medium',
    type: 'humanoid',
    alignment: 'any non-lawful alignment',
    armorClass: 12,
    hitPoints: 11,
    hitDice: '2d8+2',
    speed: '30 ft.',
    abilities: { str: 11, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
    actions: [
      {
        name: 'Scimitar',
        type: 'attack',
        description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6+1) slashing damage.',
        attackBonus: 3,
        damage: '1d6+1 slashing',
      },
      {
        name: 'Light Crossbow',
        type: 'attack',
        description: 'Ranged Weapon Attack: +3 to hit, range 80/320 ft., one target. Hit: 5 (1d8+1) piercing damage.',
        attackBonus: 3,
        damage: '1d8+1 piercing',
      },
    ],
    tokenImage: '/tokens/bandit.png',
    tags: ['low level', 'humanoid'],
  },
  {
    id: 'orc',
    name: 'Orc',
    cr: 0.5,
    size: 'Medium',
    type: 'humanoid',
    alignment: 'chaotic evil',
    armorClass: 13,
    hitPoints: 15,
    hitDice: '2d8+6',
    speed: '30 ft.',
    abilities: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
    skills: ['Intimidation +2'],
    senses: ['Darkvision 60 ft.', 'Passive Perception 10'],
    languages: ['Common', 'Orc'],
    traits: [
      {
        name: 'Aggressive',
        type: 'trait',
        description: 'As a bonus action, the orc can move up to its speed toward a hostile creature that it can see.',
      },
    ],
    actions: [
      {
        name: 'Greataxe',
        type: 'attack',
        description: 'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12+3) slashing damage.',
        attackBonus: 5,
        damage: '1d12+3 slashing',
      },
      {
        name: 'Javelin',
        type: 'attack',
        description: 'Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 6 (1d6+3) piercing damage.',
        attackBonus: 5,
        damage: '1d6+3 piercing',
      },
    ],
    tokenImage: '/tokens/orc.png',
    tags: ['mid level', 'brute'],
  },
]

// Merge: starter monsters first (with token images), then all SRD monsters
// Deduplicate by name so goblin/bandit/orc don't appear twice
const srdIds = new Set(STARTER_MONSTERS.map((m) => m.name.toLowerCase()))

export const MONSTERS: Monster[] = [
  ...STARTER_MONSTERS,
  ...ALL_SRD_MONSTERS.filter((m) => !srdIds.has(m.name.toLowerCase())),
]
