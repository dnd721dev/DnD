import type { SheetAction } from './types'

// NOTE: paste your current arrays here if you want — for now,
// keep your existing content and export a single list.

export const CORE_ACTIONS: SheetAction[] = [
  { id: 'core-attack', name: 'Attack', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' }, effects: [{ type: 'rollAttack' }] },
  { id: 'core-cast', name: 'Cast a Spell', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-dash', name: 'Dash', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-dodge', name: 'Dodge', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-disengage', name: 'Disengage', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-help', name: 'Help', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-hide', name: 'Hide', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-ready', name: 'Ready', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-search', name: 'Search', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-use-object', name: 'Use an Object', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
]

// --- keep your existing lists as-is (paste yours below) ---
export const CLASS_ACTIONS: SheetAction[] = [
  { id: 'barb-rage', name: 'Rage', category: 'Class', gates: { kind: 'class', classKey: 'barbarian' }, cost: { type: 'resource', key: 'rage', amount: 1 }, description: 'Enter a rage (spend 1 Rage).' },
  { id: 'bard-inspiration', name: 'Bardic Inspiration', category: 'Class', gates: { kind: 'class', classKey: 'bard' }, cost: { type: 'resource', key: 'bardic_insp', amount: 1 }, description: 'Inspire an ally (spend 1 inspiration die).' },
  { id: 'cleric-channel-divinity', name: 'Channel Divinity', category: 'Class', gates: { kind: 'class', classKey: 'cleric' }, cost: { type: 'resource', key: 'channel_divinity', amount: 1 }, description: 'Use Channel Divinity (spend 1).' },
  { id: 'druid-wild-shape', name: 'Wild Shape', category: 'Class', gates: { kind: 'class', classKey: 'druid' }, cost: { type: 'resource', key: 'wild_shape', amount: 1 }, description: 'Transform using Wild Shape (spend 1).' },

  { id: 'fighter-second-wind', name: 'Second Wind', category: 'Class', gates: { kind: 'class', classKey: 'fighter' }, cost: { type: 'perRestFlag', flag: 'second_wind_used', rest: 'short' }, effects: [{ type: 'setFlag', flag: 'second_wind_used', value: true }], description: 'Once per short rest.' },
  { id: 'fighter-action-surge', name: 'Action Surge', category: 'Class', gates: { kind: 'class', classKey: 'fighter' }, cost: { type: 'perRestFlag', flag: 'action_surge_used', rest: 'short' }, effects: [{ type: 'setFlag', flag: 'action_surge_used', value: true }], description: 'Once per short rest.' },

  { id: 'monk-flurry', name: 'Flurry of Blows', category: 'Class', gates: { kind: 'class', classKey: 'monk' }, cost: { type: 'resource', key: 'ki', amount: 1 } },
  { id: 'monk-patient-defense', name: 'Patient Defense', category: 'Class', gates: { kind: 'class', classKey: 'monk' }, cost: { type: 'resource', key: 'ki', amount: 1 } },
  { id: 'monk-step-of-the-wind', name: 'Step of the Wind', category: 'Class', gates: { kind: 'class', classKey: 'monk' }, cost: { type: 'resource', key: 'ki', amount: 1 } },

  { id: 'paladin-lay-on-hands', name: 'Lay on Hands', category: 'Class', gates: { kind: 'class', classKey: 'paladin' }, cost: { type: 'resource', key: 'lay_on_hands', amount: 1 }, description: 'Spend points from your pool (we’ll make a UI picker next).' },
  { id: 'paladin-divine-smite', name: 'Divine Smite', category: 'Class', gates: { kind: 'class', classKey: 'paladin' }, cost: { type: 'none' }, description: 'Consume a spell slot after a hit (we’ll wire to spells later).' },

  { id: 'ranger-hunters-mark', name: "Hunter's Mark", category: 'Class', gates: { kind: 'class', classKey: 'ranger' }, cost: { type: 'none' } },

  { id: 'rogue-sneak', name: 'Sneak Attack', category: 'Class', gates: { kind: 'class', classKey: 'rogue' }, cost: { type: 'perTurnFlag', flag: 'sneak_used_turn' }, effects: [{ type: 'setFlag', flag: 'sneak_used_turn', value: true }], description: 'Once per turn.' },
  { id: 'rogue-cunning-action', name: 'Cunning Action', category: 'Class', gates: { kind: 'class', classKey: 'rogue' }, cost: { type: 'none' } },

  { id: 'sorc-sorcery-points', name: 'Spend Sorcery Points', category: 'Class', gates: { kind: 'class', classKey: 'sorcerer' }, cost: { type: 'none' }, description: 'We’ll add a picker (metamagic / slot convert) next.' },

  { id: 'warlock-invocation', name: 'Eldritch Invocation', category: 'Class', gates: { kind: 'class', classKey: 'warlock' }, cost: { type: 'none' } },

  { id: 'wiz-arcane-recovery', name: 'Arcane Recovery', category: 'Class', gates: { kind: 'class', classKey: 'wizard' }, cost: { type: 'perRestFlag', flag: 'arcane_recovery_used', rest: 'long' }, effects: [{ type: 'setFlag', flag: 'arcane_recovery_used', value: true }], description: 'Once per day.' },
]

export const SUBCLASS_ACTIONS: SheetAction[] = [
  { id: 'barb-berserker-frenzy', name: 'Frenzy', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'berserker' }, cost: { type: 'none' } },
  { id: 'barb-totem-spirit', name: 'Totem Spirit', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'totem_warrior' }, cost: { type: 'none' } },

  { id: 'bard-lore-cutting-words', name: 'Cutting Words', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'lore' }, cost: { type: 'resource', key: 'bardic_insp', amount: 1 } },
  { id: 'bard-valor-combat-insp', name: 'Combat Inspiration', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'valor' }, cost: { type: 'none' } },

  { id: 'cleric-life-preserve-life', name: 'Preserve Life', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'life' }, cost: { type: 'resource', key: 'channel_divinity', amount: 1 } },
  { id: 'cleric-light-radiance-dawn', name: 'Radiance of the Dawn', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'light' }, cost: { type: 'resource', key: 'channel_divinity', amount: 1 } },

  { id: 'druid-land-recovery', name: 'Natural Recovery', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'land' }, cost: { type: 'none' } },
  { id: 'druid-moon-combat-shape', name: 'Combat Wild Shape', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'moon' }, cost: { type: 'none' } },

  { id: 'fighter-champion-crit', name: 'Improved Critical', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'champion' }, cost: { type: 'none' } },

  { id: 'monk-open-hand-technique', name: 'Open Hand Technique', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'open_hand' }, cost: { type: 'none' } },
  { id: 'monk-shadow-arts', name: 'Shadow Arts', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'shadow' }, cost: { type: 'resource', key: 'ki', amount: 2 } },

  { id: 'paladin-devotion-sacred-weapon', name: 'Sacred Weapon', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'devotion' }, cost: { type: 'none' } },
  { id: 'paladin-vengeance-vow', name: 'Vow of Enmity', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'vengeance' }, cost: { type: 'none' } },

  { id: 'ranger-hunter-colossus', name: 'Colossus Slayer', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'hunter' }, cost: { type: 'perTurnFlag', flag: 'colossus_slayer_used_turn' }, effects: [{ type: 'setFlag', flag: 'colossus_slayer_used_turn', value: true }] },

  { id: 'rogue-thief-fast-hands', name: 'Fast Hands', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'thief' }, cost: { type: 'none' } },
  { id: 'rogue-assassin-assassinate', name: 'Assassinate', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'assassin' }, cost: { type: 'none' } },

  { id: 'sorc-wild-tides', name: 'Tides of Chaos', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'wild_magic' }, cost: { type: 'perRestFlag', flag: 'tides_of_chaos_used', rest: 'long' }, effects: [{ type: 'setFlag', flag: 'tides_of_chaos_used', value: true }] },

  { id: 'warlock-fiend-blessing', name: "Dark One's Blessing", category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'fiend' }, cost: { type: 'none' } },

  { id: 'wiz-div-portent', name: 'Portent', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'divination' }, cost: { type: 'none' } },
]

// Your DND721 subclasses are ALSO just subclass-gated actions.
// Keep SRD separate by category label only.
export const DND721_ACTIONS: SheetAction[] = [
  // Ranger — Winter Walker
  {
    id: 'ranger-winter-walker-frost-mark',
    name: 'Frost Mark',
    category: 'DND721',
    gates: { kind: 'subclass', subclassKey: 'ranger_winter_walker' },
    cost: { type: 'perTurnFlag', flag: 'winter_walker_frost_mark_used_turn' },
    effects: [{ type: 'setFlag', flag: 'winter_walker_frost_mark_used_turn', value: true }],
    description: 'Mark a target with biting cold (once per turn).',
  },

  // Monk — Ascendent Dragon
  {
    id: 'monk-asc-dragon-breath',
    name: 'Breath of the Ascendent',
    category: 'DND721',
    gates: { kind: 'subclass', subclassKey: 'monk_ascendent_dragon' },
    cost: { type: 'resource', key: 'ki', amount: 2 },
    description: 'Expend ki to unleash a short breath burst.',
  },
]

// ✅ single merged list (what ActionsPanel should use)
export const ALL_ACTIONS: SheetAction[] = [
  ...CORE_ACTIONS,
  ...CLASS_ACTIONS,
  ...SUBCLASS_ACTIONS,
  ...DND721_ACTIONS,
]
