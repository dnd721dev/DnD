import type { SheetAction } from './types'

/**
 * =========================================================
 * CORE ACTIONS
 * =========================================================
 */
export const CORE_ACTIONS: SheetAction[] = [
  { id: 'core-attack', name: 'Attack', category: 'Core', gates: { kind: 'always' }, cost: { type: 'none' } },
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

/**
 * =========================================================
 * CLASS ACTIONS
 * =========================================================
 */
export const CLASS_ACTIONS: SheetAction[] = [
  { id: 'barb-rage', name: 'Rage', category: 'Class', gates: { kind: 'class', classKey: 'barbarian' }, cost: { type: 'resource', key: 'rage', amount: 1 } },
  { id: 'bard-inspiration', name: 'Bardic Inspiration', category: 'Class', gates: { kind: 'class', classKey: 'bard' }, cost: { type: 'resource', key: 'bardic_insp', amount: 1 } },
  { id: 'cleric-channel-divinity', name: 'Channel Divinity', category: 'Class', gates: { kind: 'class', classKey: 'cleric' }, cost: { type: 'resource', key: 'channel_divinity', amount: 1 } },
  { id: 'druid-wild-shape', name: 'Wild Shape', category: 'Class', gates: { kind: 'class', classKey: 'druid' }, cost: { type: 'resource', key: 'wild_shape', amount: 1 } },

  { id: 'fighter-second-wind', name: 'Second Wind', category: 'Class', gates: { kind: 'class', classKey: 'fighter' }, cost: { type: 'perRestFlag', flag: 'second_wind_used', rest: 'short' } },
  { id: 'fighter-action-surge', name: 'Action Surge', category: 'Class', gates: { kind: 'class', classKey: 'fighter' }, cost: { type: 'perRestFlag', flag: 'action_surge_used', rest: 'short' } },

  { id: 'monk-flurry', name: 'Flurry of Blows', category: 'Class', gates: { kind: 'class', classKey: 'monk' }, cost: { type: 'resource', key: 'ki', amount: 1 } },
  { id: 'monk-patient-defense', name: 'Patient Defense', category: 'Class', gates: { kind: 'class', classKey: 'monk' }, cost: { type: 'resource', key: 'ki', amount: 1 } },
  { id: 'monk-step-of-the-wind', name: 'Step of the Wind', category: 'Class', gates: { kind: 'class', classKey: 'monk' }, cost: { type: 'resource', key: 'ki', amount: 1 } },

  { id: 'paladin-lay-on-hands', name: 'Lay on Hands', category: 'Class', gates: { kind: 'class', classKey: 'paladin' }, cost: { type: 'resource', key: 'lay_on_hands', amount: 1 } },
  { id: 'paladin-divine-smite', name: 'Divine Smite', category: 'Class', gates: { kind: 'class', classKey: 'paladin' }, cost: { type: 'none' } },

  { id: 'ranger-hunters-mark', name: "Hunter's Mark", category: 'Class', gates: { kind: 'class', classKey: 'ranger' }, cost: { type: 'none' } },

  { id: 'rogue-sneak', name: 'Sneak Attack', category: 'Class', gates: { kind: 'class', classKey: 'rogue' }, cost: { type: 'perTurnFlag', flag: 'sneak_used_turn' } },
  { id: 'rogue-cunning-action', name: 'Cunning Action', category: 'Class', gates: { kind: 'class', classKey: 'rogue' }, cost: { type: 'none' } },

  { id: 'sorc-sorcery-points', name: 'Spend Sorcery Points', category: 'Class', gates: { kind: 'class', classKey: 'sorcerer' }, cost: { type: 'none' } },
  { id: 'warlock-invocation', name: 'Eldritch Invocation', category: 'Class', gates: { kind: 'class', classKey: 'warlock' }, cost: { type: 'none' } },
  { id: 'wiz-arcane-recovery', name: 'Arcane Recovery', category: 'Class', gates: { kind: 'class', classKey: 'wizard' }, cost: { type: 'perRestFlag', flag: 'arcane_recovery_used', rest: 'long' } },
]

/**
 * =========================================================
 * SUBCLASS ACTIONS (SRD + DND721 MERGED)
 * =========================================================
 */
export const SUBCLASS_ACTIONS: SheetAction[] = [
  // --- SRD SUBCLASSES ---
  { id: 'barb-berserker-frenzy', name: 'Frenzy', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'berserker' }, cost: { type: 'none' } },
  { id: 'bard-lore-cutting-words', name: 'Cutting Words', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'lore' }, cost: { type: 'resource', key: 'bardic_insp', amount: 1 } },
  { id: 'cleric-life-preserve-life', name: 'Preserve Life', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'life' }, cost: { type: 'resource', key: 'channel_divinity', amount: 1 } },
  { id: 'fighter-champion-crit', name: 'Improved Critical', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'champion' }, cost: { type: 'none' } },
  { id: 'monk-open-hand-technique', name: 'Open Hand Technique', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'open_hand' }, cost: { type: 'none' } },

  // --- DND721 SUBCLASSES ---
  { id: 'ranger-winter-frost-mark', name: 'Frost Mark', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'ranger_winter_walker' }, cost: { type: 'perTurnFlag', flag: 'winter_walker_frost_mark_used_turn' } },
  { id: 'monk-asc-dragon-breath', name: 'Breath of the Ascendant', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'monk_ascendent_dragon' }, cost: { type: 'resource', key: 'ki', amount: 2 } },
  { id: 'druid-sea-tidecall', name: 'Tidecall', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'druid_sea' }, cost: { type: 'perTurnFlag', flag: 'druid_sea_tidecall_used_turn' } },
  { id: 'bard-moon-lunar-inspiration', name: 'Lunar Inspiration', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'bard_moon' }, cost: { type: 'resource', key: 'bardic_insp', amount: 1 } },
  { id: 'rogue-scion-triad-feint', name: 'Triad Feint', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'rogue_scion_of_the_three' }, cost: { type: 'perTurnFlag', flag: 'rogue_scion_triad_feint_used_turn' } },
  { id: 'sorc-spellfire-cataclysm', name: 'Cataclysmic Release', category: 'Subclass', gates: { kind: 'subclass', subclassKey: 'sorcerer_spellfire' }, cost: { type: 'perRestFlag', flag: 'sorcerer_spellfire_cataclysm_used', rest: 'long' } },
]

/**
 * =========================================================
 * FINAL MERGED EXPORT (USE THIS EVERYWHERE)
 * =========================================================
 */
export const ALL_ACTIONS: SheetAction[] = [
  ...CORE_ACTIONS,
  ...CLASS_ACTIONS,
  ...SUBCLASS_ACTIONS,
]
