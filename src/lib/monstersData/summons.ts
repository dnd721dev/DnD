import type { Monster } from './types'

// Spell-summoned creatures (2024 rules). Their AC, HP, and attack bonus scale
// with the spell slot / the caster's spell attack modifier — the numbers here
// are the BASE spell level with a typical caster (spell attack +7, save DC 15).
// Each statblock's traits spell out the scaling so the DM can adjust the token.

export const SUMMONS: Monster[] = [
  {
    id: 'draconic-spirit',
    name: 'Draconic Spirit',
    cr: 5,
    size: 'Large',
    type: 'dragon',
    alignment: 'neutral',
    armorClass: 19,
    hitPoints: 50,
    hitDice: '—',
    speed: '30 ft., fly 60 ft., swim 30 ft.',
    abilities: { str: 19, dex: 14, con: 17, int: 10, wis: 14, cha: 14 },
    senses: ['Blindsight 30 ft.', 'Darkvision 60 ft.', 'Passive Perception 12'],
    languages: ['Draconic', 'understands the languages you speak'],
    traits: [
      {
        name: 'Summoned Creature (Summon Dragon, 5th+)',
        type: 'trait',
        description:
          'Shown at a 5th-level slot with a typical caster. Scaling: AC = 14 + spell level; HP = 50 + 10 per level above 5th; attack bonus = your spell attack modifier; save DC = your spell save DC. The spirit shares your initiative, acts right after you, and obeys your commands.',
      },
      {
        name: 'Shared Resistances',
        type: 'trait',
        description: 'When you summon the spirit, choose a damage type: Acid, Cold, Fire, Lightning, or Poison. The spirit has Resistance to that type, and so do you while it is within 30 feet of you.',
      },
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'ability',
        description: 'The spirit makes a number of Rend attacks equal to half the spell level (rounded down) — two at 5th level.',
      },
      {
        name: 'Rend',
        type: 'attack',
        description: 'Melee Attack Roll: your spell attack modifier (+7 typical), reach 10 ft. Hit: 1d6 + 4 + the spell\'s level Piercing damage.',
        attackBonus: 7,
        damage: '1d6+9 piercing',
      },
      {
        name: 'Breath Weapon (Recharge 5–6)',
        type: 'ability',
        description: 'Dexterity Saving Throw vs your spell save DC (DC 15 typical), each creature in a 30-foot Cone. Failure: 2d6 + the spell\'s level damage of the type chosen for Shared Resistances. Success: half damage.',
        saveDc: 15,
        saveType: 'dex',
      },
    ],
    tags: ['dragon', 'summon'],
  },
  {
    id: 'chittering-horror',
    name: 'Chittering Horror',
    cr: 4,
    size: 'Medium',
    type: 'aberration',
    alignment: 'neutral',
    armorClass: 15,
    hitPoints: 40,
    hitDice: '—',
    speed: '30 ft., fly 30 ft. (hover)',
    abilities: { str: 16, dex: 10, con: 15, int: 16, wis: 10, cha: 6 },
    senses: ['Darkvision 60 ft.', 'Passive Perception 10'],
    languages: ['Deep Speech', 'understands the languages you speak', 'telepathy 60 ft.'],
    traits: [
      {
        name: 'Summoned Creature (Summon Aberration, 4th+)',
        type: 'trait',
        description:
          'An aberrant spirit in its chittering, many-mouthed aspect. Shown at a 4th-level slot with a typical caster. Scaling: AC = 11 + spell level; HP = 40 + 10 per level above 4th; attack bonus = your spell attack modifier; number of attacks = half the spell level. It shares your initiative, acts right after you, and obeys your commands.',
      },
      {
        name: 'Whispering Aura',
        type: 'trait',
        description: 'At the start of each of the spirit\'s turns, each creature within 5 feet of it that isn\'t protected from telepathy takes 2d6 Psychic damage (Wisdom save vs your spell DC for half, DC 15 typical).',
      },
    ],
    actions: [
      {
        name: 'Multiattack',
        type: 'ability',
        description: 'The spirit makes a number of Claw attacks equal to half the spell level (rounded down) — two at 4th level.',
      },
      {
        name: 'Claws',
        type: 'attack',
        description: 'Melee Attack Roll: your spell attack modifier (+7 typical), reach 5 ft. Hit: 1d8 + 3 + the spell\'s level Slashing damage.',
        attackBonus: 7,
        damage: '1d8+7 slashing',
      },
    ],
    tags: ['aberration', 'summon'],
  },
  {
    id: 'otherworldly-steed',
    name: 'Otherworldly Steed',
    cr: 2,
    size: 'Large',
    type: 'celestial',
    alignment: 'neutral',
    armorClass: 12,
    hitPoints: 25,
    hitDice: '—',
    speed: '60 ft.',
    abilities: { str: 18, dex: 12, con: 14, int: 6, wis: 12, cha: 8 },
    senses: ['Passive Perception 11'],
    languages: ['understands the languages you speak', 'telepathy 1 mile (rider only)'],
    traits: [
      {
        name: 'Summoned Creature (Find Steed, 2nd+)',
        type: 'trait',
        description:
          'Shown at a 2nd-level slot with a typical caster. Choose Celestial, Fey, or Fiend when summoned. Scaling: AC = 10 + spell level; HP = 5 + 10 per spell level; damage bonus = the spell\'s level. While mounted, any spell you cast that targets only you can also target the steed.',
      },
      {
        name: 'Life Bond',
        type: 'trait',
        description: 'When your steed drops to 0 Hit Points it vanishes, leaving behind anything it was wearing or carrying. Casting the spell again summons it fully healed.',
      },
    ],
    actions: [
      {
        name: 'Otherworldly Slam',
        type: 'attack',
        description: 'Melee Attack Roll: your spell attack modifier (+7 typical), reach 5 ft. Hit: 1d8 + the spell\'s level damage — Radiant (Celestial), Psychic (Fey), or Necrotic (Fiend).',
        attackBonus: 7,
        damage: '1d8+2 radiant',
      },
    ],
    tags: ['celestial', 'summon', 'mount'],
  },
  {
    id: 'animated-object',
    name: 'Animated Object',
    cr: 1,
    size: 'Medium',
    type: 'construct',
    alignment: 'unaligned',
    armorClass: 16,
    hitPoints: 15,
    hitDice: '—',
    speed: '30 ft., fly 30 ft. (hover)',
    abilities: { str: 14, dex: 12, con: 12, int: 3, wis: 3, cha: 1 },
    senses: ['Blindsight 30 ft.', 'Passive Perception 6'],
    languages: [],
    traits: [
      {
        name: 'Summoned Creature (Animate Objects, 5th+)',
        type: 'trait',
        description:
          'One animated object from the Animate Objects spell (up to ten Medium-or-smaller objects at 5th level; larger slots animate bigger or more objects). Shown as a Medium object with a typical caster. Attack bonus = your spell attack modifier. The objects act on your initiative and obey your commands; when the spell ends or an object drops to 0 HP it becomes inanimate again.',
      },
    ],
    actions: [
      {
        name: 'Slam',
        type: 'attack',
        description: 'Melee Attack Roll: your spell attack modifier (+7 typical), reach 5 ft. Hit: 1d4 + 4 Force damage (bigger objects hit harder at the DM\'s discretion).',
        attackBonus: 7,
        damage: '1d4+4 force',
      },
    ],
    tags: ['construct', 'summon'],
  },
]
