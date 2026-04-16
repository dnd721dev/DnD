import type { SheetAction } from './types'

export const CORE_ACTIONS: SheetAction[] = [
  { id: 'core-attack',     name: 'Attack',         category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' }, effects: [{ type: 'rollAttack' }] },
  { id: 'core-cast',       name: 'Cast a Spell',   category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-dash',       name: 'Dash',           category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-dodge',      name: 'Dodge',          category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-disengage',  name: 'Disengage',      category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-help',       name: 'Help',           category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-hide',       name: 'Hide',           category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-ready',      name: 'Ready',          category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-search',     name: 'Search',         category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' } },
  { id: 'core-use-object', name: 'Use an Object',  category: 'Core', actionType: 'action', gates: { kind: 'always' }, cost: { type: 'none' } },
]

export const CLASS_ACTIONS: SheetAction[] = [
  // ── Barbarian ────────────────────────────────────────────────────────────────
  {
    id: 'barb-rage', name: 'Rage', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'barbarian' },
    cost: { type: 'resource', key: 'barbarian.rage', amount: 1 },
    description: 'Enter a rage (1 Rage use). Lasts 1 minute.',
  },

  // ── Bard ─────────────────────────────────────────────────────────────────────
  {
    id: 'bard-inspiration', name: 'Bardic Inspiration', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'bard' },
    cost: { type: 'resource', key: 'bard.bardic_inspiration', amount: 1 },
    description: 'Inspire an ally (spend 1 Bardic Inspiration die).',
  },

  // ── Cleric ───────────────────────────────────────────────────────────────────
  {
    id: 'cleric-channel-divinity', name: 'Channel Divinity', category: 'Class',
    actionType: 'action',
    gates: { kind: 'class', classKey: 'cleric' },
    cost: { type: 'resource', key: 'cleric.channel_divinity', amount: 1 },
    description: 'Use Channel Divinity (spend 1 use).',
  },

  // ── Druid ────────────────────────────────────────────────────────────────────
  {
    id: 'druid-wild-shape', name: 'Wild Shape', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'druid' },
    cost: { type: 'resource', key: 'druid.wild_shape', amount: 1 },
    description: 'Transform into a beast as a Bonus Action (2024 PHB).',
  },

  // ── Fighter ──────────────────────────────────────────────────────────────────
  {
    id: 'fighter-second-wind', name: 'Second Wind', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'fighter' },
    cost: { type: 'resource', key: 'fighter.second_wind', amount: 1 },
    description: 'Regain 1d10 + Fighter level HP (once per short rest).',
  },
  {
    id: 'fighter-action-surge', name: 'Action Surge', category: 'Class',
    actionType: 'free',
    gates: { kind: 'class', classKey: 'fighter' },
    cost: { type: 'resource', key: 'fighter.action_surge', amount: 1 },
    description: 'Take one additional Action this turn (once per short rest). Costs no action slot.',
  },

  // ── Monk ─────────────────────────────────────────────────────────────────────
  {
    id: 'monk-flurry', name: 'Flurry of Blows', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'monk' },
    cost: { type: 'resource', key: 'monk.ki', amount: 1 },
    description: 'Make two unarmed strikes as a Bonus Action (1 Ki).',
  },
  {
    id: 'monk-patient-defense', name: 'Patient Defense', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'monk' },
    cost: { type: 'resource', key: 'monk.ki', amount: 1 },
    description: 'Take the Dodge action as a Bonus Action (1 Ki).',
  },
  {
    id: 'monk-step-of-the-wind', name: 'Step of the Wind', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'monk' },
    cost: { type: 'resource', key: 'monk.ki', amount: 1 },
    description: 'Dash or Disengage as a Bonus Action; jump distance doubled (1 Ki).',
  },

  // ── Paladin ──────────────────────────────────────────────────────────────────
  {
    id: 'paladin-lay-on-hands', name: 'Lay on Hands', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'paladin' },
    cost: { type: 'resource', key: 'paladin.lay_on_hands', amount: 5 },
    description: 'Restore HP from your healing pool (5 pts) as a Bonus Action (2024 PHB).',
  },
  {
    id: 'paladin-divine-smite', name: 'Divine Smite', category: 'Class',
    actionType: 'reaction',
    gates: { kind: 'class', classKey: 'paladin' },
    cost: { type: 'none' },
    description: 'After hitting, expend a spell slot to deal radiant damage (Reaction, 2024 PHB).',
  },

  // ── Ranger ───────────────────────────────────────────────────────────────────
  {
    id: 'ranger-hunters-mark', name: "Hunter's Mark", category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'ranger' },
    cost: { type: 'none' },
    description: "Mark a creature; deal +1d6 on hits against it.",
  },

  // ── Rogue ────────────────────────────────────────────────────────────────────
  {
    id: 'rogue-sneak', name: 'Sneak Attack', category: 'Class',
    actionType: 'free',
    gates: { kind: 'class', classKey: 'rogue' },
    cost: { type: 'perTurnFlag', flag: 'sneak_used_turn' },
    effects: [{ type: 'setFlag', flag: 'sneak_used_turn', value: true }],
    description: 'Add Sneak Attack dice to one attack per turn (free — part of the attack roll).',
  },
  {
    id: 'rogue-cunning-action', name: 'Cunning Action', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'rogue' },
    cost: { type: 'none' },
    description: 'Dash, Disengage, or Hide as a Bonus Action.',
  },

  // ── Sorcerer ─────────────────────────────────────────────────────────────────
  {
    id: 'sorc-sorcery-points', name: 'Spend Sorcery Points', category: 'Class',
    actionType: 'bonus_action',
    gates: { kind: 'class', classKey: 'sorcerer' },
    cost: { type: 'resource', key: 'sorcerer.sorcery_points', amount: 1 },
    description: 'Use Font of Magic — convert points to/from spell slots or apply Metamagic.',
  },

  // ── Warlock ──────────────────────────────────────────────────────────────────
  {
    id: 'warlock-invocation', name: 'Eldritch Invocation', category: 'Class',
    actionType: 'special',
    gates: { kind: 'class', classKey: 'warlock' },
    cost: { type: 'none' },
    description: 'Invoke a chosen Eldritch Invocation effect (timing varies by invocation).',
  },

  // ── Wizard ───────────────────────────────────────────────────────────────────
  {
    id: 'wiz-arcane-recovery', name: 'Arcane Recovery', category: 'Class',
    actionType: 'free',
    gates: { kind: 'class', classKey: 'wizard' },
    cost: { type: 'resource', key: 'wizard.arcane_recovery', amount: 1 },
    description: 'Recover spell slots on a short rest (once per long rest). No action cost.',
  },
]

export const SUBCLASS_ACTIONS: SheetAction[] = [
  { id: 'barb-berserker-frenzy',      name: 'Frenzy',              category: 'Subclass', actionType: 'special',       gates: { kind: 'subclass', subclassKey: 'barbarian_berserker' },    cost: { type: 'none' } },
  { id: 'barb-totem-spirit',          name: 'Totem Spirit',        category: 'Subclass', actionType: 'special',       gates: { kind: 'subclass', subclassKey: 'barbarian_totem_warrior' }, cost: { type: 'none' } },

  { id: 'bard-lore-cutting-words',    name: 'Cutting Words',       category: 'Subclass', actionType: 'reaction',      gates: { kind: 'subclass', subclassKey: 'bard_lore' },              cost: { type: 'resource', key: 'bard.bardic_inspiration', amount: 1 } },
  { id: 'bard-valor-combat-insp',     name: 'Combat Inspiration',  category: 'Subclass', actionType: 'special',       gates: { kind: 'subclass', subclassKey: 'bard_valor' },             cost: { type: 'none' } },

  { id: 'cleric-life-preserve-life',  name: 'Preserve Life',       category: 'Subclass', actionType: 'action',        gates: { kind: 'subclass', subclassKey: 'cleric_life' },            cost: { type: 'resource', key: 'cleric.channel_divinity', amount: 1 } },
  { id: 'cleric-light-radiance',      name: 'Radiance of the Dawn',category: 'Subclass', actionType: 'action',        gates: { kind: 'subclass', subclassKey: 'cleric_light' },           cost: { type: 'resource', key: 'cleric.channel_divinity', amount: 1 } },

  { id: 'druid-land-recovery',        name: 'Natural Recovery',    category: 'Subclass', actionType: 'free',          gates: { kind: 'subclass', subclassKey: 'druid_land' },             cost: { type: 'none' } },
  { id: 'druid-moon-combat-shape',    name: 'Combat Wild Shape',   category: 'Subclass', actionType: 'bonus_action',  gates: { kind: 'subclass', subclassKey: 'druid_moon' },             cost: { type: 'none' } },

  { id: 'fighter-champion-crit',      name: 'Improved Critical',   category: 'Subclass', actionType: 'free',          gates: { kind: 'subclass', subclassKey: 'fighter_champion' },       cost: { type: 'none' } },

  { id: 'monk-open-hand-technique',   name: 'Open Hand Technique', category: 'Subclass', actionType: 'free',          gates: { kind: 'subclass', subclassKey: 'monk_open_hand' },         cost: { type: 'none' } },
  { id: 'monk-shadow-arts',           name: 'Shadow Arts',         category: 'Subclass', actionType: 'action',        gates: { kind: 'subclass', subclassKey: 'monk_shadow' },            cost: { type: 'resource', key: 'monk.ki', amount: 2 } },

  { id: 'paladin-devotion-sacred',    name: 'Sacred Weapon',       category: 'Subclass', actionType: 'action',        gates: { kind: 'subclass', subclassKey: 'paladin_devotion' },       cost: { type: 'none' } },
  { id: 'paladin-vengeance-vow',      name: 'Vow of Enmity',       category: 'Subclass', actionType: 'bonus_action',  gates: { kind: 'subclass', subclassKey: 'paladin_vengeance' },      cost: { type: 'none' } },

  { id: 'ranger-hunter-colossus',     name: 'Colossus Slayer',     category: 'Subclass', actionType: 'free',          gates: { kind: 'subclass', subclassKey: 'ranger_hunter' },          cost: { type: 'perTurnFlag', flag: 'colossus_slayer_used_turn' }, effects: [{ type: 'setFlag', flag: 'colossus_slayer_used_turn', value: true }] },

  { id: 'rogue-thief-fast-hands',     name: 'Fast Hands',          category: 'Subclass', actionType: 'bonus_action',  gates: { kind: 'subclass', subclassKey: 'rogue_thief' },            cost: { type: 'none' } },
  { id: 'rogue-assassin-assassinate', name: 'Assassinate',         category: 'Subclass', actionType: 'special',       gates: { kind: 'subclass', subclassKey: 'rogue_assassin' },         cost: { type: 'none' } },

  { id: 'sorc-wild-tides',            name: 'Tides of Chaos',      category: 'Subclass', actionType: 'action',        gates: { kind: 'subclass', subclassKey: 'sorcerer_wild_magic' },    cost: { type: 'perRestFlag', flag: 'tides_of_chaos_used', rest: 'long' }, effects: [{ type: 'setFlag', flag: 'tides_of_chaos_used', value: true }] },

  { id: 'warlock-fiend-blessing',     name: "Dark One's Blessing", category: 'Subclass', actionType: 'free',          gates: { kind: 'subclass', subclassKey: 'warlock_fiend' },          cost: { type: 'none' } },

  { id: 'wiz-div-portent',            name: 'Portent',             category: 'Subclass', actionType: 'free',          gates: { kind: 'subclass', subclassKey: 'wizard_divination' },      cost: { type: 'none' } },
]

export const DND721_ACTIONS: SheetAction[] = [
  {
    id: 'ranger-winter-walker-frost-mark',
    name: 'Frost Mark',
    category: 'DND721',
    actionType: 'bonus_action',
    gates: { kind: 'subclass', subclassKey: 'ranger_winter_walker' },
    cost: { type: 'perTurnFlag', flag: 'winter_walker_frost_mark_used_turn' },
    effects: [{ type: 'setFlag', flag: 'winter_walker_frost_mark_used_turn', value: true }],
    description: 'Mark a target with biting cold (once per turn).',
  },
  {
    id: 'monk-asc-dragon-breath',
    name: 'Breath of the Ascendent',
    category: 'DND721',
    actionType: 'action',
    gates: { kind: 'subclass', subclassKey: 'monk_ascendent_dragon' },
    cost: { type: 'resource', key: 'monk.ki', amount: 2 },
    description: 'Expend ki to unleash a short breath burst.',
  },
]

export const ALL_ACTIONS: SheetAction[] = [
  ...CORE_ACTIONS,
  ...CLASS_ACTIONS,
  ...SUBCLASS_ACTIONS,
  ...DND721_ACTIONS,
]
