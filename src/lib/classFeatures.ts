// src/lib/classFeatures.ts
// Unified class-feature library, mirroring the spell library's pattern.
// Each entry carries readable rules text (shortDescription / fullDescription),
// per-level scaling, action economy, recharge, and source-edition provenance.
//
// All fields beyond { id, name, classKey, levelGained, type, shortDescription, source }
// are optional so callers can render gracefully even where data is sparse.

import type { ClassKey, SubclassKey } from '@/lib/subclasses'
import type { RechargeType } from '@/lib/applySubclassEffects'

export type ClassFeatureActionType =
  | 'action'
  | 'bonus_action'
  | 'reaction'
  | 'free'
  | 'passive'
  | 'special'

export type ClassFeatureUses = {
  /** Max uses at a given class level (0 = not yet available). */
  count: (level: number) => number
  recharge: RechargeType
  /** Optional die expression used per-use (e.g. Bardic Inspiration 'd6'). */
  die?: string
}

export type ClassFeatureSource = 'phb-2014' | 'phb-2024' | 'class-gap'

export type ClassFeatureCategory =
  | 'combat'
  | 'utility'
  | 'social'
  | 'exploration'
  | 'defensive'
  | 'spellcasting'

export type ClassFeatureDetail = {
  /** Stable id, e.g. 'paladin.lay_on_hands' or 'barbarian.berserker.frenzy'. */
  id: string
  name: string
  classKey: ClassKey
  /** Subclass id (only for subclass features). */
  subclassKey?: SubclassKey
  /** Class level at which the feature is gained. */
  levelGained: number
  type: ClassFeatureActionType
  uses?: ClassFeatureUses
  /** 1–2 sentence summary shown on action buttons + level-up preview. */
  shortDescription: string
  /** Full 2024 PHB rules text shown on tap/expand. */
  fullDescription?: string
  /** "At Higher Levels" / progression callout (e.g. Sneak Attack die scaling). */
  scalingNotes?: string
  source: ClassFeatureSource
  category?: ClassFeatureCategory
}

// ────────────────────────────────────────────────────────────────────────
// CLASS_FEATURES — all base-class features (2024 PHB)
// ────────────────────────────────────────────────────────────────────────

export const CLASS_FEATURES: ClassFeatureDetail[] = [
  // ── Barbarian ─────────────────────────────────────────────────────────
  {
    id: 'barbarian.rage',
    name: 'Rage',
    classKey: 'barbarian',
    levelGained: 1,
    type: 'bonus_action',
    uses: {
      count: (lvl) => (lvl >= 20 ? 999 : lvl >= 17 ? 6 : lvl >= 12 ? 5 : lvl >= 6 ? 4 : lvl >= 3 ? 3 : 2),
      recharge: 'long_rest',
    },
    shortDescription: 'Bonus action: enter rage. Advantage on Strength checks/saves, +rage damage on Strength melee, resistance to bludgeoning/piercing/slashing. Lasts 10 minutes (2024).',
    fullDescription:
      'On your turn you can enter a rage as a bonus action. While raging you gain the following benefits if you aren\'t wearing heavy armor: advantage on Strength checks and Strength saving throws; +2/+3/+4 bonus to Strength weapon damage at levels 1/9/16; resistance to bludgeoning, piercing, and slashing damage. Your rage lasts for 10 minutes (2024 PHB). It ends early if you are incapacitated or if you choose to end it as a bonus action.',
    scalingNotes: 'Uses per long rest: L1–2: 2, L3–5: 3, L6–11: 4, L12–16: 5, L17–19: 6, L20: unlimited. Rage damage: +2 (L1–8), +3 (L9–15), +4 (L16+).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'barbarian.unarmored_defense',
    name: 'Unarmored Defense',
    classKey: 'barbarian',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'While not wearing armor, your AC = 10 + Dex mod + Con mod. You can use a shield and still gain this benefit.',
    fullDescription:
      'While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'barbarian.reckless_attack',
    name: 'Reckless Attack',
    classKey: 'barbarian',
    levelGained: 2,
    type: 'free',
    shortDescription: 'On your first attack of the turn, choose to attack recklessly: advantage on Str melee attacks this turn, but attacks against you have advantage until your next turn.',
    fullDescription:
      'Starting at 2nd level, when you make your first attack on your turn, you can decide to attack recklessly. Doing so gives you advantage on melee weapon attack rolls using Strength during this turn, but attack rolls against you have advantage until your next turn.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'barbarian.danger_sense',
    name: 'Danger Sense',
    classKey: 'barbarian',
    levelGained: 2,
    type: 'passive',
    shortDescription: 'Advantage on Dexterity saving throws against effects you can see (traps, spells, etc.) while not blinded, deafened, or incapacitated.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'barbarian.extra_attack',
    name: 'Extra Attack',
    classKey: 'barbarian',
    levelGained: 5,
    type: 'passive',
    shortDescription: 'You can attack twice when you take the Attack action.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'barbarian.fast_movement',
    name: 'Fast Movement',
    classKey: 'barbarian',
    levelGained: 5,
    type: 'passive',
    shortDescription: 'Your walking speed increases by 10 ft while not wearing heavy armor.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'barbarian.feral_instinct',
    name: 'Feral Instinct',
    classKey: 'barbarian',
    levelGained: 7,
    type: 'passive',
    shortDescription: 'Advantage on initiative rolls. If you are surprised at start of combat and not incapacitated, you can act normally on your first turn (only if you rage first).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'barbarian.brutal_critical',
    name: 'Brutal Critical',
    classKey: 'barbarian',
    levelGained: 9,
    type: 'passive',
    shortDescription: 'On a critical hit with a melee weapon, roll one additional damage die. (Two at L13, three at L17.)',
    scalingNotes: 'L9: +1 die · L13: +2 dice · L17: +3 dice.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'barbarian.relentless_rage',
    name: 'Relentless Rage',
    classKey: 'barbarian',
    levelGained: 11,
    type: 'special',
    shortDescription: 'If you drop to 0 HP while raging and don\'t die outright, Con save DC 10 or +5 each subsequent use — on success drop to 1 HP instead.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'barbarian.persistent_rage',
    name: 'Persistent Rage',
    classKey: 'barbarian',
    levelGained: 15,
    type: 'passive',
    shortDescription: 'Your rage no longer ends early from incapacitation, only from unconsciousness or your choice.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'barbarian.indomitable_might',
    name: 'Indomitable Might',
    classKey: 'barbarian',
    levelGained: 18,
    type: 'passive',
    shortDescription: 'When you make a Strength check, any total below your Strength score becomes your Strength score.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'barbarian.primal_champion',
    name: 'Primal Champion',
    classKey: 'barbarian',
    levelGained: 20,
    type: 'passive',
    shortDescription: 'Your Strength and Constitution scores increase by 4. Your max for those scores becomes 24.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Bard ──────────────────────────────────────────────────────────────
  {
    id: 'bard.bardic_inspiration',
    name: 'Bardic Inspiration',
    classKey: 'bard',
    levelGained: 1,
    type: 'bonus_action',
    uses: {
      count: (lvl) => Math.max(1, lvl < 5 ? 0 : 1), // simplified – real count = Cha mod (min 1)
      recharge: 'long_rest', // becomes short rest at L5 via Font of Inspiration
    },
    shortDescription: 'Bonus action: give an ally within 60 ft a Bardic Inspiration die. They add it to one ability check, attack, or save within 10 minutes.',
    fullDescription:
      'You can inspire others through stirring words or music. To do so, you use a bonus action on your turn to choose one creature other than yourself within 60 feet of you who can hear you. That creature gains one Bardic Inspiration die, a d6. Once within the next 10 minutes, the creature can roll the die and add the number rolled to one ability check, attack roll, or saving throw it makes. The creature can wait until after it rolls the d20 before deciding to use the Bardic Inspiration die, but must decide before the GM says whether the roll succeeds or fails.',
    scalingNotes: 'Die size: d6 (L1) → d8 (L5) → d10 (L10) → d12 (L15). Uses = your Charisma modifier (minimum 1) per long rest, or short rest from L5 onward (Font of Inspiration).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'bard.jack_of_all_trades',
    name: 'Jack of All Trades',
    classKey: 'bard',
    levelGained: 2,
    type: 'passive',
    shortDescription: 'Add half your proficiency bonus (rounded down) to any ability check you make that doesn\'t already include your proficiency bonus.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'bard.song_of_rest',
    name: 'Song of Rest',
    classKey: 'bard',
    levelGained: 2,
    type: 'special',
    shortDescription: 'During a short rest, you and allies who hear you regain extra HP — +1d6 at L2, scaling to +1d12 at L17.',
    scalingNotes: 'd6 (L2) · d8 (L9) · d10 (L13) · d12 (L17).',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'bard.expertise',
    name: 'Expertise',
    classKey: 'bard',
    levelGained: 3,
    type: 'passive',
    shortDescription: 'Choose two skills you are proficient in. Your proficiency bonus is doubled for any check using either. Two more skills at L10.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'bard.font_of_inspiration',
    name: 'Font of Inspiration',
    classKey: 'bard',
    levelGained: 5,
    type: 'passive',
    shortDescription: 'You regain all expended uses of Bardic Inspiration when you finish a short or long rest (instead of only a long rest).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'bard.countercharm',
    name: 'Countercharm',
    classKey: 'bard',
    levelGained: 6,
    type: 'reaction',
    shortDescription: 'Reaction: when you or an ally within 30 ft must make a save against being frightened or charmed, they have advantage on that save.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'bard.magical_secrets',
    name: 'Magical Secrets',
    classKey: 'bard',
    levelGained: 10,
    type: 'passive',
    shortDescription: 'Choose two spells from any class lists. They count as bard spells for you and are added to your spells known. Repeat at L14 and L18.',
    scalingNotes: 'L10, L14, L18: pick 2 spells each time from any class list.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'bard.superior_inspiration',
    name: 'Superior Inspiration',
    classKey: 'bard',
    levelGained: 20,
    type: 'passive',
    shortDescription: 'When you roll initiative and have no Bardic Inspiration uses left, you regain one use.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Cleric ────────────────────────────────────────────────────────────
  {
    id: 'cleric.channel_divinity',
    name: 'Channel Divinity',
    classKey: 'cleric',
    levelGained: 2,
    type: 'action',
    uses: {
      count: (lvl) => (lvl >= 18 ? 3 : lvl >= 6 ? 2 : 1),
      recharge: 'short_rest',
    },
    shortDescription: 'Action: channel divine energy. Always includes Turn Undead; subclass adds at least one more option.',
    fullDescription:
      'You gain the ability to channel divine energy directly from your deity, using that energy to fuel magical effects. When you use your Channel Divinity, you choose which effect to create. You must then finish a short or long rest to use your Channel Divinity again. The DC of a Channel Divinity save equals 8 + your proficiency bonus + your Wisdom modifier.',
    scalingNotes: 'Uses per short rest: 1 (L2), 2 (L6), 3 (L18).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'cleric.turn_undead',
    name: 'Channel Divinity: Turn Undead',
    classKey: 'cleric',
    levelGained: 2,
    type: 'action',
    shortDescription: 'Spend a Channel Divinity use. Each undead within 30 ft that sees/hears you: Wis save or flee for 1 minute. Damage breaks the effect.',
    fullDescription:
      'As an action, you present your holy symbol and speak a prayer censuring the undead. Each undead that can see or hear you within 30 feet must make a Wisdom saving throw. If the creature fails, it is turned for 1 minute or until it takes any damage. A turned creature must spend its turns trying to move as far away from you as it can, and it can\'t willingly move to a space within 30 feet of you. It also can\'t take reactions. For its action, it can use only the Dash action or try to escape from an effect that prevents it from moving.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'cleric.divine_intervention',
    name: 'Divine Intervention',
    classKey: 'cleric',
    levelGained: 10,
    type: 'action',
    uses: { count: () => 1, recharge: 'long_rest' },
    shortDescription: 'Action: implore your deity to intervene. Roll a d100; on a result ≤ your cleric level, the deity acts. Auto-succeeds at L20.',
    scalingNotes: 'L20: automatically succeeds (no d100 roll needed).',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'cleric.destroy_undead',
    name: 'Destroy Undead',
    classKey: 'cleric',
    levelGained: 5,
    type: 'passive',
    shortDescription: 'When an undead fails its save vs Turn Undead and its CR is at or below a threshold, it is instantly destroyed.',
    scalingNotes: 'L5: CR 1/2 · L8: CR 1 · L11: CR 2 · L14: CR 3 · L17: CR 4.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Druid ─────────────────────────────────────────────────────────────
  {
    id: 'druid.wild_shape',
    name: 'Wild Shape',
    classKey: 'druid',
    levelGained: 2,
    type: 'bonus_action',
    uses: {
      count: (lvl) => (lvl >= 20 ? 999 : 2),
      recharge: 'short_rest',
    },
    shortDescription: 'Bonus action (2024): transform into a beast you have seen. Spend Wild Shape uses; lasts hours = half your druid level.',
    fullDescription:
      'You can use a bonus action to magically assume the shape of a beast that you have seen before (2024 PHB; was an action in 2014). You can use this feature twice. You regain expended uses when you finish a short or long rest. Your druid level determines the beasts you can transform into. You can stay in beast shape for a number of hours equal to half your druid level (rounded down). You then revert to your normal form unless you expend another use of this feature. While transformed, your game statistics are replaced by the statistics of the beast, but you retain your alignment, personality, Intelligence, Wisdom, and Charisma scores. You also retain your skill and saving throw proficiencies.',
    scalingNotes: 'Beast max CR: L2 = 1/4 (no fly/swim) · L4 = 1/2 (no fly) · L8 = 1 (any). Uses: 2/short rest; unlimited at L20.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'druid.druidic',
    name: 'Druidic',
    classKey: 'druid',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'You know Druidic, the secret druid tongue. You can hide a message in a non-druidic-readable form for 24 hours.',
    source: 'phb-2024',
    category: 'social',
  },
  {
    id: 'druid.wild_companion',
    name: 'Wild Companion',
    classKey: 'druid',
    levelGained: 4,
    type: 'action',
    shortDescription: 'Spend a Wild Shape use to cast Find Familiar (no material components). Familiar is a fey that lasts 1 hour.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'druid.timeless_body',
    name: 'Timeless Body',
    classKey: 'druid',
    levelGained: 18,
    type: 'passive',
    shortDescription: 'For every 10 years that pass, your body ages only 1 year.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'druid.beast_spells',
    name: 'Beast Spells',
    classKey: 'druid',
    levelGained: 18,
    type: 'passive',
    shortDescription: 'While in Wild Shape you can cast druid spells (verbal/somatic components fine even without humanoid form).',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'druid.archdruid',
    name: 'Archdruid',
    classKey: 'druid',
    levelGained: 20,
    type: 'passive',
    shortDescription: 'You can use Wild Shape unlimited times. You ignore verbal/somatic/cheap-material components on druid spells.',
    source: 'phb-2024',
    category: 'spellcasting',
  },

  // ── Fighter ───────────────────────────────────────────────────────────
  {
    id: 'fighter.second_wind',
    name: 'Second Wind',
    classKey: 'fighter',
    levelGained: 1,
    type: 'bonus_action',
    uses: {
      count: (lvl) => (lvl >= 17 ? 3 : lvl >= 13 ? 3 : lvl >= 10 ? 2 : 1),
      recharge: 'short_rest',
      die: '1d10',
    },
    shortDescription: 'Bonus action: regain 1d10 + fighter level HP. Uses recharge on a short/long rest.',
    fullDescription:
      'You have a limited well of stamina that you can draw on to protect yourself from harm. On your turn, you can use a bonus action to regain hit points equal to 1d10 + your fighter level. Once you use this feature, you must finish a short or long rest before you can use it again.',
    scalingNotes: '2024 PHB grants additional uses: 1 (L1) · 2 (L10) · 3 (L13+).',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'fighter.action_surge',
    name: 'Action Surge',
    classKey: 'fighter',
    levelGained: 2,
    type: 'free',
    uses: {
      count: (lvl) => (lvl >= 17 ? 2 : 1),
      recharge: 'short_rest',
    },
    shortDescription: 'Once per short rest, take one additional action on your turn. Two uses at L17.',
    fullDescription:
      'Starting at 2nd level, you can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action. Once you use this feature, you must finish a short or long rest before you can use it again. Starting at 17th level, you can use it twice before a rest, but only once on the same turn.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'fighter.extra_attack',
    name: 'Extra Attack',
    classKey: 'fighter',
    levelGained: 5,
    type: 'passive',
    shortDescription: 'You can attack twice when you take the Attack action. Goes to 3 attacks at L11 and 4 attacks at L20.',
    scalingNotes: 'L5: ×2 · L11: ×3 · L20: ×4.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'fighter.indomitable',
    name: 'Indomitable',
    classKey: 'fighter',
    levelGained: 9,
    type: 'special',
    uses: {
      count: (lvl) => (lvl >= 17 ? 3 : lvl >= 13 ? 2 : 1),
      recharge: 'long_rest',
    },
    shortDescription: 'Reroll a failed saving throw. Must use the new roll. Uses: 1 (L9) → 2 (L13) → 3 (L17).',
    source: 'phb-2024',
    category: 'defensive',
  },

  // ── Monk ──────────────────────────────────────────────────────────────
  {
    id: 'monk.martial_arts',
    name: 'Martial Arts',
    classKey: 'monk',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'Use Dex instead of Str for unarmed strikes & monk weapons; unarmed strike die scales; one unarmed strike as bonus action after attacking.',
    fullDescription:
      'Your practice of martial arts gives you mastery of combat styles that use unarmed strikes and monk weapons. You gain the following benefits while you are unarmed or wielding only monk weapons and not wearing armor or wielding a shield: you can use Dexterity instead of Strength for the attack and damage rolls of unarmed strikes and monk weapons; you can roll a d6 in place of the normal damage of your unarmed strike or monk weapon; when you use the Attack action with an unarmed strike or a monk weapon on your turn, you can make one unarmed strike as a bonus action.',
    scalingNotes: 'Martial Arts die: d6 (L1) · d8 (L5) · d10 (L11) · d12 (L17).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'monk.ki_points',
    name: 'Discipline Points',
    classKey: 'monk',
    levelGained: 2,
    type: 'special',
    uses: { count: (lvl) => lvl, recharge: 'short_rest' },
    shortDescription: 'You gain Discipline Points equal to your monk level. Spend them on Flurry of Blows, Patient Defense, Step of the Wind, and other monk features.',
    scalingNotes: '2024 PHB rename of "Ki Points." Pool = monk level. Recharges on short rest.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'monk.unarmored_defense',
    name: 'Unarmored Defense',
    classKey: 'monk',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'While unarmored and not wielding a shield, AC = 10 + Dex mod + Wis mod.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'monk.unarmored_movement',
    name: 'Unarmored Movement',
    classKey: 'monk',
    levelGained: 2,
    type: 'passive',
    shortDescription: 'Speed increases while unarmored and not wielding a shield. At L9, you can move along vertical surfaces and across liquids.',
    scalingNotes: '+10 ft (L2) · +15 (L6) · +20 (L10) · +25 (L14) · +30 (L18).',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'monk.deflect_missiles',
    name: 'Deflect Missiles',
    classKey: 'monk',
    levelGained: 3,
    type: 'reaction',
    shortDescription: 'Reaction when hit by a ranged weapon attack: reduce damage by 1d10 + Dex mod + monk level. If reduced to 0, optionally catch it and throw it back.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'monk.slow_fall',
    name: 'Slow Fall',
    classKey: 'monk',
    levelGained: 4,
    type: 'reaction',
    shortDescription: 'Reaction when falling: reduce falling damage by 5 × monk level.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'monk.stunning_strike',
    name: 'Stunning Strike',
    classKey: 'monk',
    levelGained: 5,
    type: 'free',
    shortDescription: 'When you hit a creature with a melee weapon attack, spend 1 Discipline Point — Con save or stunned until end of your next turn.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'monk.stillness_of_mind',
    name: 'Stillness of Mind',
    classKey: 'monk',
    levelGained: 7,
    type: 'action',
    shortDescription: 'Action: end one effect that\'s charming or frightening you.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'monk.diamond_soul',
    name: 'Diamond Soul',
    classKey: 'monk',
    levelGained: 14,
    type: 'passive',
    shortDescription: 'Proficient in all saves. If you fail a save, spend 1 Discipline Point to reroll and use the new result.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'monk.empty_body',
    name: 'Empty Body',
    classKey: 'monk',
    levelGained: 18,
    type: 'action',
    shortDescription: 'Action, 4 Discipline: become invisible for 1 minute with resistance to all damage except force. Or, 8 Discipline: cast Astral Projection on yourself (no components).',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'monk.perfect_self',
    name: 'Perfect Self',
    classKey: 'monk',
    levelGained: 20,
    type: 'passive',
    shortDescription: 'When you roll initiative and have no Discipline Points, you regain 4.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Paladin ───────────────────────────────────────────────────────────
  {
    id: 'paladin.divine_sense',
    name: 'Divine Sense',
    classKey: 'paladin',
    levelGained: 1,
    type: 'action',
    uses: { count: (lvl) => 1 + Math.max(0, Math.floor((lvl >= 1 ? 1 : 0))), recharge: 'long_rest' },
    shortDescription: 'Action: detect celestial / fiend / undead within 60 ft (around corners) until end of next turn. Uses = 1 + Cha mod per long rest.',
    fullDescription:
      'As an action, you can open your awareness to detect strong evil and powerful good. Until the end of your next turn, you know the location of any celestial, fiend, or undead within 60 feet of you that is not behind total cover. You can use this feature a number of times equal to 1 + your Charisma modifier. You regain expended uses when you finish a long rest.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'paladin.lay_on_hands',
    name: 'Lay on Hands',
    classKey: 'paladin',
    levelGained: 1,
    type: 'bonus_action',
    uses: { count: (lvl) => lvl * 5, recharge: 'long_rest' },
    shortDescription: 'Bonus action (2024): touch a creature to restore HP from your pool (5 × paladin level). Spend 5 to also cure one disease/poison.',
    fullDescription:
      "You have a pool of healing power that replenishes when you take a long rest. With that pool, you can restore a total number of hit points equal to your paladin level × 5. As a bonus action (2024 PHB; was an action in 2014), you can touch a creature and draw power from the pool to restore a number of hit points to that creature, up to the maximum amount remaining in your pool. Alternatively, you can expend 5 hit points from your pool of healing to cure the target of one disease or neutralize one poison affecting it. You can cure multiple diseases and neutralize multiple poisons with a single use of Lay on Hands, expending hit points separately for each one. This feature has no effect on undead and constructs.",
    scalingNotes: 'Pool = paladin level × 5 (e.g. L5 = 25, L10 = 50, L20 = 100). Refreshes on long rest.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'paladin.divine_smite',
    name: 'Divine Smite',
    classKey: 'paladin',
    levelGained: 1,
    type: 'bonus_action',
    shortDescription: '2024: cast as a spell. After a hit with a weapon, expend a spell slot to add 2d8 radiant damage (+1d8 per slot above 1st, max 5d8). +1d8 vs fiends/undead.',
    fullDescription:
      'In the 2024 PHB Divine Smite was reworked into a 1st-level paladin spell (no longer an action-economy-free toggle on a hit). Cast it as a bonus action on a melee weapon hit; the target takes an extra 2d8 radiant damage, increasing by 1d8 for each slot level above 1st up to a max of 5d8. The damage increases by an additional 1d8 if the target is an undead or a fiend.',
    scalingNotes: 'Base: 2d8 (1st slot). +1d8 per slot above 1st up to 5d8. +1d8 vs fiend/undead.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'paladin.aura_of_protection',
    name: 'Aura of Protection',
    classKey: 'paladin',
    levelGained: 6,
    type: 'passive',
    shortDescription: 'You and allies within 10 ft add your Cha mod (min +1) to all saving throws. Range expands to 30 ft at L18.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'paladin.aura_of_courage',
    name: 'Aura of Courage',
    classKey: 'paladin',
    levelGained: 10,
    type: 'passive',
    shortDescription: 'You and allies within your Aura cannot be frightened while you are conscious.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'paladin.cleansing_touch',
    name: 'Cleansing Touch',
    classKey: 'paladin',
    levelGained: 14,
    type: 'action',
    uses: { count: (lvl) => Math.max(1, Math.floor(lvl / 7)), recharge: 'long_rest' },
    shortDescription: 'Action: end one spell on yourself or a willing creature you touch. Uses = your Cha mod (min 1), recharge on long rest.',
    source: 'phb-2024',
    category: 'utility',
  },

  // ── Ranger ────────────────────────────────────────────────────────────
  {
    id: 'ranger.favored_enemy',
    name: 'Favored Enemy (Hunter\'s Mark)',
    classKey: 'ranger',
    levelGained: 1,
    type: 'bonus_action',
    uses: { count: (lvl) => (lvl >= 17 ? 6 : lvl >= 13 ? 5 : lvl >= 9 ? 4 : lvl >= 5 ? 3 : 2), recharge: 'long_rest' },
    shortDescription: '2024: Hunter\'s Mark is always prepared. You get a fixed number of free casts per long rest without spending a slot.',
    fullDescription:
      '2024 PHB reworks Favored Enemy: Hunter\'s Mark is always prepared (does not count against your prepared spells). You can also cast it a number of times equal to a fixed table without expending a spell slot: 2 (L1) → 3 (L5) → 4 (L9) → 5 (L13) → 6 (L17). These extra casts refresh on a long rest. You can still spend slots to cast it for the longer-concentration upcast effect.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'ranger.deft_explorer',
    name: 'Deft Explorer',
    classKey: 'ranger',
    levelGained: 1,
    type: 'passive',
    shortDescription: '2024: Expertise in one skill of your choice + you know one extra language.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'ranger.extra_attack',
    name: 'Extra Attack',
    classKey: 'ranger',
    levelGained: 5,
    type: 'passive',
    shortDescription: 'You can attack twice when you take the Attack action.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'ranger.feral_senses',
    name: 'Feral Senses',
    classKey: 'ranger',
    levelGained: 18,
    type: 'passive',
    shortDescription: 'You don\'t need sight to make attacks against invisible enemies within 30 ft (no disadvantage; they get no advantage on attacks against you).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'ranger.foe_slayer',
    name: 'Foe Slayer',
    classKey: 'ranger',
    levelGained: 20,
    type: 'passive',
    shortDescription: 'Once per turn, you can add your Wis mod to an attack roll or damage roll vs your Hunter\'s Mark target.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Rogue ─────────────────────────────────────────────────────────────
  {
    id: 'rogue.sneak_attack',
    name: 'Sneak Attack',
    classKey: 'rogue',
    levelGained: 1,
    type: 'free',
    shortDescription: 'Once per turn, deal +Nd6 damage when you have advantage OR an ally is within 5 ft of the target and you don\'t have disadvantage.',
    fullDescription:
      'Beginning at 1st level, you know how to strike subtly and exploit a foe\'s distraction. Once per turn, you can deal an extra Xd6 damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon. You don\'t need advantage on the attack roll if another enemy of the target is within 5 feet of it, that enemy isn\'t incapacitated, and you don\'t have disadvantage on the attack roll.',
    scalingNotes: 'Dice scale by rogue level: 1d6 (L1) · 2d6 (L3) · 3d6 (L5) · 4d6 (L7) · 5d6 (L9) · 6d6 (L11) · 7d6 (L13) · 8d6 (L15) · 9d6 (L17) · 10d6 (L19).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'rogue.cunning_action',
    name: 'Cunning Action',
    classKey: 'rogue',
    levelGained: 2,
    type: 'bonus_action',
    shortDescription: 'Bonus action: Dash, Disengage, or Hide.',
    fullDescription:
      'Starting at 2nd level, your quick thinking and agility allow you to move and act swiftly. You can take a bonus action on each of your turns in combat. This action can be used only to take the Dash, Disengage, or Hide action.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'rogue.thieves_cant',
    name: "Thieves' Cant",
    classKey: 'rogue',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'You know the secret rogue cipher of slang and symbols. Use it to hide messages in conversation or scrawled marks.',
    source: 'phb-2024',
    category: 'social',
  },
  {
    id: 'rogue.uncanny_dodge',
    name: 'Uncanny Dodge',
    classKey: 'rogue',
    levelGained: 5,
    type: 'reaction',
    shortDescription: 'Reaction when an attacker you can see hits you: halve the damage.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'rogue.evasion',
    name: 'Evasion',
    classKey: 'rogue',
    levelGained: 7,
    type: 'passive',
    shortDescription: 'When you make a Dex save against an effect that allows half damage on a successful save, you take no damage on success and half on failure.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'rogue.reliable_talent',
    name: 'Reliable Talent',
    classKey: 'rogue',
    levelGained: 11,
    type: 'passive',
    shortDescription: 'When you make an ability check that includes your full proficiency bonus, treat a d20 roll of 9 or lower as 10.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'rogue.blindsense',
    name: 'Blindsense',
    classKey: 'rogue',
    levelGained: 14,
    type: 'passive',
    shortDescription: 'If you can hear, you are aware of the location of any hidden or invisible creature within 10 ft of you.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'rogue.slippery_mind',
    name: 'Slippery Mind',
    classKey: 'rogue',
    levelGained: 15,
    type: 'passive',
    shortDescription: 'Gain proficiency in Wisdom saving throws.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'rogue.elusive',
    name: 'Elusive',
    classKey: 'rogue',
    levelGained: 18,
    type: 'passive',
    shortDescription: 'While not incapacitated, no attack roll has advantage against you.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'rogue.stroke_of_luck',
    name: 'Stroke of Luck',
    classKey: 'rogue',
    levelGained: 20,
    type: 'special',
    uses: { count: () => 1, recharge: 'short_rest' },
    shortDescription: 'Once per short rest: turn a missed attack into a hit, or a failed ability check into a 20.',
    source: 'phb-2024',
    category: 'utility',
  },

  // ── Sorcerer ──────────────────────────────────────────────────────────
  {
    id: 'sorcerer.sorcery_points',
    name: 'Sorcery Points',
    classKey: 'sorcerer',
    levelGained: 2,
    type: 'special',
    uses: { count: (lvl) => lvl, recharge: 'long_rest' },
    shortDescription: 'You gain Sorcery Points = your sorcerer level. Spend them on Metamagic and Flexible Casting.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'sorcerer.font_of_magic',
    name: 'Font of Magic',
    classKey: 'sorcerer',
    levelGained: 2,
    type: 'special',
    shortDescription: 'Convert Sorcery Points into spell slots or convert spell slots into Sorcery Points (bonus action).',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'sorcerer.metamagic',
    name: 'Metamagic',
    classKey: 'sorcerer',
    levelGained: 3,
    type: 'special',
    shortDescription: 'You learn two Metamagic options. Spend Sorcery Points to twin, quicken, subtle, distant, careful, empower, extend, or heighten spells. More known at L10 (3) and L17 (4).',
    scalingNotes: 'Metamagic options known: 2 (L3), 3 (L10), 4 (L17). Each option costs Sorcery Points.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'sorcerer.sorcerous_restoration',
    name: 'Sorcerous Restoration',
    classKey: 'sorcerer',
    levelGained: 20,
    type: 'passive',
    shortDescription: 'You regain 4 expended Sorcery Points whenever you finish a short rest.',
    source: 'phb-2024',
    category: 'spellcasting',
  },

  // ── Warlock ───────────────────────────────────────────────────────────
  {
    id: 'warlock.pact_magic',
    name: 'Pact Magic',
    classKey: 'warlock',
    levelGained: 1,
    type: 'special',
    shortDescription: 'Spell slots all recharge on a short rest. Slot level scales with you (always cast at highest available level).',
    fullDescription:
      'Your arcane research and the magic bestowed on you by your patron grant you special spell slots. All your spell slots are the same level (the highest you can cast), and you regain them when you finish a short or long rest. Slot scaling: 1 slot L1 → 2 slots L2 → 2 slots @ 2nd-level L3 → 2 @ 3rd L5 → 2 @ 4th L7 → 2 @ 5th L9 → 3 @ 5th L11 → 4 @ 5th L17.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'warlock.eldritch_invocations',
    name: 'Eldritch Invocations',
    classKey: 'warlock',
    levelGained: 2,
    type: 'passive',
    shortDescription: 'You learn Eldritch Invocations: special abilities (Agonizing Blast, Devil\'s Sight, Pact of the Chain familiar boosts, etc.). Learn more as you level.',
    scalingNotes: 'Invocations known: 1 (L1) · 2 (L2) · 3 (L5) · 4 (L7) · 5 (L9) · 6 (L12) · 7 (L15) · 8 (L18).',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'warlock.mystic_arcanum',
    name: 'Mystic Arcanum',
    classKey: 'warlock',
    levelGained: 11,
    type: 'special',
    shortDescription: 'Choose one 6th-level warlock spell. You can cast it once per long rest without expending a slot. Add 7th (L13), 8th (L15), 9th (L17).',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'warlock.eldritch_master',
    name: 'Eldritch Master',
    classKey: 'warlock',
    levelGained: 20,
    type: 'action',
    uses: { count: () => 1, recharge: 'long_rest' },
    shortDescription: 'Action: spend 1 minute entreating your patron to regain all expended pact magic spell slots.',
    source: 'phb-2024',
    category: 'spellcasting',
  },

  // ── Wizard ────────────────────────────────────────────────────────────
  {
    id: 'wizard.arcane_recovery',
    name: 'Arcane Recovery',
    classKey: 'wizard',
    levelGained: 1,
    type: 'special',
    uses: { count: () => 1, recharge: 'long_rest' },
    shortDescription: 'Once per long rest, when you finish a short rest, recover spell slot levels equal to half your wizard level (rounded up). No slot above 5th.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'wizard.spell_mastery',
    name: 'Spell Mastery',
    classKey: 'wizard',
    levelGained: 18,
    type: 'passive',
    shortDescription: 'Choose a 1st-level and a 2nd-level wizard spell in your book. You can cast each at its lowest level without expending a slot.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'wizard.signature_spells',
    name: 'Signature Spells',
    classKey: 'wizard',
    levelGained: 20,
    type: 'special',
    shortDescription: 'Choose two 3rd-level wizard spells. Always prepared. Cast each once per short rest at 3rd level without expending a slot.',
    source: 'phb-2024',
    category: 'spellcasting',
  },

  // ── Artificer ─────────────────────────────────────────────────────────
  {
    id: 'artificer.magical_tinkering',
    name: 'Magical Tinkering',
    classKey: 'artificer',
    levelGained: 1,
    type: 'action',
    shortDescription: 'Touch a Tiny nonmagical object to imbue it with a minor magical property (light, sound, message, image, smell).',
    source: 'phb-2014',
    category: 'utility',
  },
  {
    id: 'artificer.infuse_item',
    name: 'Infuse Item',
    classKey: 'artificer',
    levelGained: 2,
    type: 'special',
    shortDescription: 'You know infusions. After a long rest you can infuse up to (Int mod + 2) nonmagical items as magic items (subject to infusion list).',
    scalingNotes: 'Infusions known: 4 (L2) · 6 (L6) · 8 (L10) · 10 (L14) · 12 (L18). Items infused: 2 (L2) · 3 (L6) · 4 (L10) · 5 (L14) · 6 (L18).',
    source: 'phb-2014',
    category: 'utility',
  },
  {
    id: 'artificer.flash_of_genius',
    name: 'Flash of Genius',
    classKey: 'artificer',
    levelGained: 7,
    type: 'reaction',
    uses: { count: (lvl) => Math.max(1, Math.floor((lvl - 1) / 6) + 1), recharge: 'long_rest' },
    shortDescription: 'Reaction when you or an ally within 30 ft makes a check or save: add your Int mod to the roll.',
    source: 'phb-2014',
    category: 'utility',
  },

  // ════════════════════════════════════════════════════════════════════
  // SUBCLASS FEATURES — most-played subclasses, organized by class
  // ════════════════════════════════════════════════════════════════════

  // ── Barbarian: Path of the Berserker ────────────────────────────────
  {
    id: 'barbarian.berserker.frenzy',
    name: 'Frenzy',
    classKey: 'barbarian',
    subclassKey: 'barbarian_berserker',
    levelGained: 3,
    type: 'special',
    shortDescription: 'Choose to frenzy while raging: make one melee attack as a bonus action each turn for the rage\'s duration. (2024: no exhaustion penalty.)',
    fullDescription:
      "While raging, you can choose to go into a frenzy. While frenzied, you can make a single melee weapon attack as a bonus action on each of your turns after this one for the duration of your rage. (2024 PHB removes the exhaustion clause that ended 2014's Frenzy.)",
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'barbarian.berserker.mindless_rage',
    name: 'Mindless Rage',
    classKey: 'barbarian',
    subclassKey: 'barbarian_berserker',
    levelGained: 6,
    type: 'passive',
    shortDescription: 'You can\'t be charmed or frightened while raging. If you are charmed/frightened when you enter rage, the effect ends.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'barbarian.berserker.intimidating_presence',
    name: 'Intimidating Presence',
    classKey: 'barbarian',
    subclassKey: 'barbarian_berserker',
    levelGained: 10,
    type: 'action',
    shortDescription: 'Action: choose a creature within 30 ft. Wis save (DC 8 + prof + Cha) or frightened of you until end of your next turn (or longer if repeated).',
    source: 'phb-2024',
    category: 'social',
  },
  {
    id: 'barbarian.berserker.retaliation',
    name: 'Retaliation',
    classKey: 'barbarian',
    subclassKey: 'barbarian_berserker',
    levelGained: 14,
    type: 'reaction',
    shortDescription: 'Reaction when a creature within 5 ft deals damage to you: make a melee weapon attack against that creature.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Barbarian: Path of the Beast (2024) ─────────────────────────────
  {
    id: 'barbarian.beast.form_of_the_beast',
    name: 'Form of the Beast',
    classKey: 'barbarian',
    subclassKey: 'barbarian_beast',
    levelGained: 3,
    type: 'free',
    shortDescription: 'When you rage, manifest a Bite (1d8 piercing + heal Con mod on hit, once per turn), Claws (one extra attack on Attack action), or Tail (1d8 + reaction +1d8 AC).',
    fullDescription:
      'When you enter your rage, you can manifest a beastly weapon. Choose one of the following options; each manifestation lasts until your rage ends. The damage die is a d8 and the weapon type is your choice. Bite: melee attacks deal 1d8 piercing; once per turn, when you hit a creature with this attack and you are below your hit point maximum, you can regain hit points equal to 1 + your Constitution modifier. Claws: melee attacks deal 1d8 slashing, and once per turn when you take the Attack action you can make one additional Claw attack. Tail: melee attacks deal 1d8 piercing with 10-ft reach; as a reaction when a creature within 10 ft hits you with an attack, you can give yourself a +1d8 bonus to AC against that attack.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Bard: College of Lore ───────────────────────────────────────────
  {
    id: 'bard.lore.cutting_words',
    name: 'Cutting Words',
    classKey: 'bard',
    subclassKey: 'bard_lore',
    levelGained: 3,
    type: 'reaction',
    shortDescription: 'Reaction when a creature within 60 ft makes an attack, ability check, or damage roll: spend 1 Bardic Inspiration and subtract the die from the roll.',
    fullDescription:
      "Also at 3rd level, you learn how to use your wit to distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your reaction to expend one of your uses of Bardic Inspiration, rolling a Bardic Inspiration die and subtracting the number rolled from the creature's roll. You can choose to use this feature after the creature makes its roll, but before the GM determines whether the attack roll or ability check succeeds or fails, or before the creature deals its damage. The creature is immune if it can't hear you or if it's immune to being charmed.",
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'bard.lore.additional_magical_secrets',
    name: 'Additional Magical Secrets',
    classKey: 'bard',
    subclassKey: 'bard_lore',
    levelGained: 6,
    type: 'passive',
    shortDescription: 'Learn two spells from any class. They count as bard spells and don\'t count against your spells known.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'bard.lore.peerless_skill',
    name: 'Peerless Skill',
    classKey: 'bard',
    subclassKey: 'bard_lore',
    levelGained: 14,
    type: 'free',
    shortDescription: 'When you make an ability check, spend 1 Bardic Inspiration to add it to the roll (before knowing if it succeeds).',
    source: 'phb-2024',
    category: 'utility',
  },

  // ── Cleric: Life Domain ─────────────────────────────────────────────
  {
    id: 'cleric.life.disciple_of_life',
    name: 'Disciple of Life',
    classKey: 'cleric',
    subclassKey: 'cleric_life',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'When you cast a spell of 1st level or higher that restores HP, the target regains an additional 2 + the spell\'s level.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'cleric.life.preserve_life',
    name: 'Channel Divinity: Preserve Life',
    classKey: 'cleric',
    subclassKey: 'cleric_life',
    levelGained: 2,
    type: 'action',
    shortDescription: 'Spend a Channel Divinity use: choose creatures within 30 ft, distribute HP = 5 × cleric level among them. Can\'t restore above half max HP.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'cleric.life.blessed_healer',
    name: 'Blessed Healer',
    classKey: 'cleric',
    subclassKey: 'cleric_life',
    levelGained: 6,
    type: 'passive',
    shortDescription: 'When you cast a spell with a spell slot that restores HP to another creature, you regain HP = 2 + spell\'s level.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'cleric.life.supreme_healing',
    name: 'Supreme Healing',
    classKey: 'cleric',
    subclassKey: 'cleric_life',
    levelGained: 17,
    type: 'passive',
    shortDescription: 'When you would normally roll dice to restore HP with a spell, treat each die as if it rolled its maximum.',
    source: 'phb-2024',
    category: 'spellcasting',
  },

  // ── Druid: Circle of the Moon ──────────────────────────────────────
  {
    id: 'druid.moon.combat_wild_shape',
    name: 'Combat Wild Shape',
    classKey: 'druid',
    subclassKey: 'druid_moon',
    levelGained: 2,
    type: 'special',
    shortDescription: 'You can Wild Shape into beasts with CR up to your druid level / 3 (min 1). While transformed, expend a spell slot as a bonus action to heal 1d8 per slot level.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'druid.moon.primal_strike',
    name: 'Primal Strike',
    classKey: 'druid',
    subclassKey: 'druid_moon',
    levelGained: 6,
    type: 'passive',
    shortDescription: 'Your attacks in beast form count as magical for overcoming resistance to nonmagical attacks.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Fighter: Battle Master ─────────────────────────────────────────
  {
    id: 'fighter.battle_master.combat_superiority',
    name: 'Combat Superiority',
    classKey: 'fighter',
    subclassKey: 'fighter_battle_master',
    levelGained: 3,
    type: 'special',
    uses: { count: (lvl) => (lvl >= 15 ? 6 : lvl >= 7 ? 5 : 4), recharge: 'short_rest', die: 'd8' },
    shortDescription: 'You learn three Maneuvers + gain Superiority Dice (d8 → d10 @ L10 → d12 @ L18). Spend a die to fuel a Maneuver.',
    scalingNotes: 'Dice: 4 (L3) · 5 (L7) · 6 (L15). Die size: d8 → d10 (L10) → d12 (L18). Maneuvers known: 3 → 5 (L7) → 7 (L10) → 9 (L15).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'fighter.battle_master.know_your_enemy',
    name: 'Know Your Enemy',
    classKey: 'fighter',
    subclassKey: 'fighter_battle_master',
    levelGained: 7,
    type: 'special',
    shortDescription: 'After 1 minute observing a creature, learn whether it is your equal, superior, or inferior on 2 of: Str, Dex, Con, AC, HP, levels, prof bonus.',
    source: 'phb-2024',
    category: 'utility',
  },

  // ── Fighter: Champion ──────────────────────────────────────────────
  {
    id: 'fighter.champion.improved_critical',
    name: 'Improved Critical',
    classKey: 'fighter',
    subclassKey: 'fighter_champion',
    levelGained: 3,
    type: 'passive',
    shortDescription: 'Your weapon attacks score a critical hit on a roll of 19 or 20.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'fighter.champion.remarkable_athlete',
    name: 'Remarkable Athlete',
    classKey: 'fighter',
    subclassKey: 'fighter_champion',
    levelGained: 7,
    type: 'passive',
    shortDescription: 'Add half your proficiency bonus to Str, Dex, or Con checks. Your long-jump distance increases by your Str mod (in ft).',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'fighter.champion.superior_critical',
    name: 'Superior Critical',
    classKey: 'fighter',
    subclassKey: 'fighter_champion',
    levelGained: 15,
    type: 'passive',
    shortDescription: 'Your weapon attacks score a critical hit on a roll of 18-20.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Fighter: Eldritch Knight ───────────────────────────────────────
  {
    id: 'fighter.eldritch_knight.weapon_bond',
    name: 'Weapon Bond',
    classKey: 'fighter',
    subclassKey: 'fighter_eldritch_knight',
    levelGained: 3,
    type: 'special',
    shortDescription: 'Bond with up to two weapons (1-hour ritual each). Bonus action to summon a bonded weapon to your hand from any plane.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'fighter.eldritch_knight.war_magic',
    name: 'War Magic',
    classKey: 'fighter',
    subclassKey: 'fighter_eldritch_knight',
    levelGained: 7,
    type: 'passive',
    shortDescription: 'When you take the Attack action, you can replace one attack with a cantrip cast (action). At L18, the cantrip becomes a bonus action.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'fighter.eldritch_knight.eldritch_strike',
    name: 'Eldritch Strike',
    classKey: 'fighter',
    subclassKey: 'fighter_eldritch_knight',
    levelGained: 10,
    type: 'passive',
    shortDescription: 'When you hit a creature with a weapon attack, it has disadvantage on the next save vs a spell you cast before end of your next turn.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Fighter: Echo Knight (Wildemount / 2024) ────────────────────────
  {
    id: 'fighter.echo_knight.manifest_echo',
    name: 'Manifest Echo',
    classKey: 'fighter',
    subclassKey: 'fighter_echo_knight',
    levelGained: 3,
    type: 'bonus_action',
    shortDescription: 'Bonus action: summon an Echo (AC=14+prof, 1 HP, 30-ft move). Make attacks originating from it; swap places with it 30 ft once per turn.',
    fullDescription:
      'You can use a bonus action to magically manifest a translucent, gray image of yourself within 15 feet of you. This echo is a magical, partially real Tiny construct, and it lasts until it is destroyed, until you dismiss it as a bonus action, until you manifest another echo, or until you\'re incapacitated. Your echo has AC equal to 14 + your proficiency bonus, 1 hit point, and immunity to all conditions. When you take the Attack action, any attack you make can originate from your space or the echo\'s space (your choice). When you move on your turn, you can also move the echo up to your speed. Once on each of your turns, when your echo is within 30 feet, you can swap places with it (no action).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'fighter.echo_knight.unleash_incarnation',
    name: 'Unleash Incarnation',
    classKey: 'fighter',
    subclassKey: 'fighter_echo_knight',
    levelGained: 3,
    type: 'free',
    uses: { count: (lvl) => Math.max(1, Math.floor(lvl / 4)), recharge: 'long_rest' },
    shortDescription: 'Whenever you take the Attack action, make one additional melee attack from your echo\'s space. Uses = Con mod per long rest.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Rogue: Thief ────────────────────────────────────────────────────
  {
    id: 'rogue.thief.fast_hands',
    name: 'Fast Hands',
    classKey: 'rogue',
    subclassKey: 'rogue_thief',
    levelGained: 3,
    type: 'bonus_action',
    shortDescription: 'Use Cunning Action to: Use an Object, make a Sleight of Hand check, use thieves\' tools to disarm a trap or open a lock.',
    source: 'phb-2024',
    category: 'utility',
  },
  {
    id: 'rogue.thief.second_story_work',
    name: 'Second-Story Work',
    classKey: 'rogue',
    subclassKey: 'rogue_thief',
    levelGained: 3,
    type: 'passive',
    shortDescription: 'Climbing no longer costs extra movement. Running jumps grant + Dex mod ft of distance.',
    source: 'phb-2024',
    category: 'exploration',
  },
  {
    id: 'rogue.thief.use_magic_device',
    name: 'Use Magic Device',
    classKey: 'rogue',
    subclassKey: 'rogue_thief',
    levelGained: 13,
    type: 'passive',
    shortDescription: 'Ignore all class, race, and level requirements on the use of magic items.',
    source: 'phb-2024',
    category: 'utility',
  },

  // ── Rogue: Arcane Trickster ────────────────────────────────────────
  {
    id: 'rogue.arcane_trickster.mage_hand_legerdemain',
    name: 'Mage Hand Legerdemain',
    classKey: 'rogue',
    subclassKey: 'rogue_arcane_trickster',
    levelGained: 3,
    type: 'passive',
    shortDescription: 'Your Mage Hand becomes invisible. Use it (as a bonus action) to stow items, plant items, pick locks, and disarm traps.',
    source: 'phb-2024',
    category: 'utility',
  },

  // ── Rogue: Soulknife (TCoE) ────────────────────────────────────────
  {
    id: 'rogue.soulknife.psychic_blades',
    name: 'Psychic Blades',
    classKey: 'rogue',
    subclassKey: 'rogue_soulknife',
    levelGained: 3,
    type: 'passive',
    shortDescription: 'Manifest psychic blades as weapons (finesse, thrown 60/120 ft, psychic damage). Bonus action attack with the off-hand blade.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'rogue.soulknife.psionic_power',
    name: 'Psionic Power',
    classKey: 'rogue',
    subclassKey: 'rogue_soulknife',
    levelGained: 3,
    type: 'special',
    uses: { count: (lvl) => lvl * 2, recharge: 'long_rest', die: 'd6' },
    shortDescription: 'You have Psionic Energy dice (Nd6 = 2× rogue level). Spend them for Psi-Bolstered Knack (boost a check), Psychic Whispers (telepathy), etc. Die size grows.',
    scalingNotes: 'Die size: d6 (L3) · d8 (L5) · d10 (L11) · d12 (L17). Dice pool = rogue level × 2.',
    source: 'phb-2024',
    category: 'utility',
  },

  // ── Sorcerer: Draconic Bloodline ────────────────────────────────────
  {
    id: 'sorcerer.draconic.dragon_ancestor',
    name: 'Dragon Ancestor',
    classKey: 'sorcerer',
    subclassKey: 'sorcerer_draconic_bloodline',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'Choose a dragon type. Learn Draconic and double Cha for haggling with dragons.',
    source: 'phb-2024',
    category: 'social',
  },
  {
    id: 'sorcerer.draconic.draconic_resilience',
    name: 'Draconic Resilience',
    classKey: 'sorcerer',
    subclassKey: 'sorcerer_draconic_bloodline',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'Max HP increases by 1 each sorcerer level. Unarmored AC = 13 + Dex mod.',
    source: 'phb-2024',
    category: 'defensive',
  },
  {
    id: 'sorcerer.draconic.elemental_affinity',
    name: 'Elemental Affinity',
    classKey: 'sorcerer',
    subclassKey: 'sorcerer_draconic_bloodline',
    levelGained: 6,
    type: 'passive',
    shortDescription: 'When casting spells dealing your draconic damage type, add Cha mod to one damage roll. Spend 1 Sorcery Point for 1 hour of resistance to that damage type.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'sorcerer.draconic.dragon_wings',
    name: 'Dragon Wings',
    classKey: 'sorcerer',
    subclassKey: 'sorcerer_draconic_bloodline',
    levelGained: 14,
    type: 'bonus_action',
    shortDescription: 'Bonus action: grow dragon wings; gain a fly speed equal to your speed. Lasts until you dismiss them.',
    source: 'phb-2024',
    category: 'utility',
  },

  // ── Sorcerer: Aberrant Mind (TCoE) ──────────────────────────────────
  {
    id: 'sorcerer.aberrant_mind.telepathic_speech',
    name: 'Telepathic Speech',
    classKey: 'sorcerer',
    subclassKey: 'sorcerer_aberrant_mind',
    levelGained: 1,
    type: 'special',
    shortDescription: 'You can speak telepathically with one creature within 30 ft (sorcerer level minutes / day). Must share a language.',
    source: 'phb-2024',
    category: 'social',
  },
  {
    id: 'sorcerer.aberrant_mind.psionic_spells',
    name: 'Psionic Spells',
    classKey: 'sorcerer',
    subclassKey: 'sorcerer_aberrant_mind',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'You always have certain psionic spells prepared (Mind Sliver, Dissonant Whispers, Sending, etc., scaling with level). They count as sorcerer spells.',
    source: 'phb-2024',
    category: 'spellcasting',
  },
  {
    id: 'sorcerer.aberrant_mind.psionic_sorcery',
    name: 'Psionic Sorcery',
    classKey: 'sorcerer',
    subclassKey: 'sorcerer_aberrant_mind',
    levelGained: 6,
    type: 'free',
    shortDescription: 'Cast any of your Psionic spells by spending Sorcery Points = the slot level (no V/S components, no spell slot needed).',
    source: 'phb-2024',
    category: 'spellcasting',
  },

  // ── Warlock: The Hexblade ──────────────────────────────────────────
  {
    id: 'warlock.hexblade.hexblades_curse',
    name: "Hexblade's Curse",
    classKey: 'warlock',
    subclassKey: 'warlock_hexblade',
    levelGained: 1,
    type: 'bonus_action',
    uses: { count: () => 1, recharge: 'short_rest' },
    shortDescription: 'Bonus action: curse a creature within 30 ft for 1 minute. +prof to damage rolls vs it, 19-20 crit range vs it, regain HP = warlock level + Cha mod if it dies.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'warlock.hexblade.hex_warrior',
    name: 'Hex Warrior',
    classKey: 'warlock',
    subclassKey: 'warlock_hexblade',
    levelGained: 1,
    type: 'passive',
    shortDescription: 'Proficiency in medium armor, shields, martial weapons. Use Cha instead of Str/Dex on attacks/damage with one weapon you touch each long rest.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'warlock.hexblade.accursed_specter',
    name: 'Accursed Specter',
    classKey: 'warlock',
    subclassKey: 'warlock_hexblade',
    levelGained: 6,
    type: 'special',
    uses: { count: () => 1, recharge: 'long_rest' },
    shortDescription: 'When you slay a humanoid, you can curse its soul to rise as a specter under your control for 1 hour.',
    source: 'phb-2024',
    category: 'combat',
  },

  // ── Wizard: Bladesinger ────────────────────────────────────────────
  {
    id: 'wizard.bladesinger.bladesong',
    name: 'Bladesong',
    classKey: 'wizard',
    subclassKey: 'wizard_bladesinger',
    levelGained: 3,
    type: 'bonus_action',
    uses: { count: () => 2, recharge: 'short_rest' },
    shortDescription: 'Bonus action: enter Bladesong for 1 minute. +Int mod AC, +10 walking speed, concentration advantage on saves, +Int mod to one weapon damage roll per turn.',
    fullDescription:
      'You can invoke an elven magic called the Bladesong as a bonus action, provided that you aren\'t wearing medium or heavy armor or using a shield. It lasts for 1 minute. It ends early if you are incapacitated, if you don the disallowed armor or shield, or if you use two hands to make an attack with a weapon. You can also dismiss the Bladesong at any time you choose (no action required). While your Bladesong is active, you gain the following benefits: you gain a bonus to your AC equal to your Intelligence modifier (minimum +1); your walking speed increases by 10 ft; you have advantage on Dexterity (Acrobatics) checks; you gain a bonus to any Constitution saving throw you make to maintain your concentration on a spell, equal to your Int mod (min +1).',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'wizard.bladesinger.extra_attack',
    name: 'Extra Attack',
    classKey: 'wizard',
    subclassKey: 'wizard_bladesinger',
    levelGained: 6,
    type: 'passive',
    shortDescription: 'You can attack twice when you take the Attack action. You can replace one attack with a cantrip cast.',
    source: 'phb-2024',
    category: 'combat',
  },
  {
    id: 'wizard.bladesinger.song_of_defense',
    name: 'Song of Defense',
    classKey: 'wizard',
    subclassKey: 'wizard_bladesinger',
    levelGained: 10,
    type: 'reaction',
    shortDescription: 'Reaction when you take damage while Bladesong is active: expend a spell slot to reduce the damage by 5 × the slot\'s level.',
    source: 'phb-2024',
    category: 'defensive',
  },

  // ════════════════════════════════════════════════════════════════════
  // BROAD SUBCLASS COVERAGE — signature features per remaining build
  // (One per subclass for the most-played remaining options. Each carries
  //  shortDescription + 2024 PHB tag so all UI consumers light up.)
  // ════════════════════════════════════════════════════════════════════

  // ── Barbarian ───────────────────────────────────────────────────────
  { id: 'barbarian.zealot.divine_fury', name: 'Divine Fury', classKey: 'barbarian', subclassKey: 'barbarian_zealot', levelGained: 3, type: 'free', shortDescription: 'While raging, the first creature you hit on your turn takes +1d6 + half barbarian level radiant or necrotic damage.', fullDescription: 'Starting when you choose this path at 3rd level, you can channel divine fury into your weapon strikes. While you\'re raging, the first creature you hit on each of your turns with a weapon attack takes extra damage equal to 1d6 + half your barbarian level (rounded down) of either radiant or necrotic damage (your choice when you gain this feature).', source: 'phb-2024', category: 'combat' },
  { id: 'barbarian.zealot.warrior_of_the_gods', name: 'Warrior of the Gods', classKey: 'barbarian', subclassKey: 'barbarian_zealot', levelGained: 3, type: 'passive', shortDescription: 'Spells that restore you to life (Revivify, Raise Dead, etc.) require no material components when cast on you.', source: 'phb-2024', category: 'defensive' },
  { id: 'barbarian.wild_magic.magic_awareness', name: 'Magic Awareness', classKey: 'barbarian', subclassKey: 'barbarian_wild_magic', levelGained: 3, type: 'action', shortDescription: 'Action: detect schools and locations of any spells/magic items within 60 ft. Uses = prof bonus per long rest.', source: 'phb-2024', category: 'utility' },
  { id: 'barbarian.wild_magic.wild_surge', name: 'Wild Surge', classKey: 'barbarian', subclassKey: 'barbarian_wild_magic', levelGained: 3, type: 'special', shortDescription: 'When you enter rage, roll on the Wild Magic table (d8): random magical effect (shadow blink, force shell, fey teleport, etc.).', fullDescription: 'The magical energy roiling inside you sometimes erupts from you. When you enter your rage, roll on the Wild Magic table to determine the magical effect produced. If the effect requires a saving throw, the DC equals 8 + your proficiency bonus + your Constitution modifier. Once you roll on the Wild Magic table, you can\'t roll on it again during the same rage. (Examples: shadowy tendrils restrain enemies; you teleport up to 30 ft; a magical force shell grants AC; you cast Faerie Fire centered on yourself; allies gain temp HP; etc.)', source: 'phb-2024', category: 'combat' },
  { id: 'barbarian.totem_warrior.spirit_seeker', name: 'Spirit Seeker', classKey: 'barbarian', subclassKey: 'barbarian_totem_warrior', levelGained: 3, type: 'passive', shortDescription: 'You can cast Beast Sense and Speak with Animals as rituals.', source: 'phb-2024', category: 'utility' },
  { id: 'barbarian.totem_warrior.totem_spirit', name: 'Totem Spirit', classKey: 'barbarian', subclassKey: 'barbarian_totem_warrior', levelGained: 3, type: 'special', shortDescription: 'Choose Bear (resistance to all but psychic while raging), Eagle (Dash bonus action while raging), Wolf (allies advantage vs adjacent enemies), etc.', source: 'phb-2024', category: 'combat' },

  // ── Bard ───────────────────────────────────────────────────────────
  { id: 'bard.valor.bonus_proficiencies', name: 'Bonus Proficiencies', classKey: 'bard', subclassKey: 'bard_valor', levelGained: 3, type: 'passive', shortDescription: 'Proficient in medium armor, shields, and martial weapons.', source: 'phb-2024', category: 'combat' },
  { id: 'bard.valor.combat_inspiration', name: 'Combat Inspiration', classKey: 'bard', subclassKey: 'bard_valor', levelGained: 3, type: 'reaction', shortDescription: 'A creature with your Bardic Inspiration die can add it to a damage roll or to AC as a reaction to being hit.', fullDescription: 'Also at 3rd level, you learn to inspire others in battle. A creature that has a Bardic Inspiration die from you can roll that die and add the number rolled to a weapon damage roll it just made. Alternatively, when an attack roll is made against the creature, it can use its reaction to roll the Bardic Inspiration die and add the number rolled to its AC against that attack, after seeing the roll but before knowing whether it hits or misses.', source: 'phb-2024', category: 'combat' },
  { id: 'bard.valor.extra_attack', name: 'Extra Attack', classKey: 'bard', subclassKey: 'bard_valor', levelGained: 6, type: 'passive', shortDescription: 'You can attack twice when you take the Attack action.', source: 'phb-2024', category: 'combat' },
  { id: 'bard.eloquence.silver_tongue', name: 'Silver Tongue', classKey: 'bard', subclassKey: 'bard_eloquence', levelGained: 3, type: 'passive', shortDescription: 'When you make a Persuasion or Deception check, treat a d20 roll of 9 or lower as a 10.', fullDescription: 'When you reach 3rd level, you have practiced your oration so much that you can wield words with unmatched skill. When you make a Charisma (Persuasion) or Charisma (Deception) check, you can treat a roll of 9 or lower on the d20 as a 10.', source: 'phb-2024', category: 'social' },
  { id: 'bard.eloquence.unsettling_words', name: 'Unsettling Words', classKey: 'bard', subclassKey: 'bard_eloquence', levelGained: 3, type: 'bonus_action', shortDescription: 'Bonus action: spend 1 Bardic Inspiration to subtract that die from a creature\'s next save before the start of your next turn.', source: 'phb-2024', category: 'combat' },
  { id: 'bard.swords.fighting_style', name: 'Fighting Style', classKey: 'bard', subclassKey: 'bard_swords', levelGained: 3, type: 'passive', shortDescription: 'Choose Dueling or Two-Weapon Fighting.', source: 'phb-2024', category: 'combat' },
  { id: 'bard.swords.blade_flourish', name: 'Blade Flourish', classKey: 'bard', subclassKey: 'bard_swords', levelGained: 3, type: 'special', shortDescription: 'Once per turn when you take Attack action, your walking speed +10 and you can apply one Flourish (defensive / slashing / mobile) by spending a Bardic Inspiration die.', source: 'phb-2024', category: 'combat' },

  // ── Cleric ─────────────────────────────────────────────────────────
  { id: 'cleric.light.warding_flare', name: 'Warding Flare', classKey: 'cleric', subclassKey: 'cleric_light', levelGained: 1, type: 'reaction', uses: { count: (lvl) => (lvl >= 1 ? 1 : 0), recharge: 'long_rest' }, shortDescription: 'Reaction when a creature within 30 ft attacks you: impose disadvantage on the attack. Uses = Wis mod per long rest.', fullDescription: 'When you are attacked by a creature within 30 feet of you that you can see, you can use your reaction to interpose dazzling divine light, imposing disadvantage on the attack roll, causing light to spill from your holy symbol in the process. An attacker that can\'t be blinded is immune to this feature. You can use this feature a number of times equal to your Wisdom modifier (minimum once). You regain all expended uses when you finish a long rest.', source: 'phb-2024', category: 'defensive' },
  { id: 'cleric.light.radiance_of_dawn', name: 'Channel Divinity: Radiance of the Dawn', classKey: 'cleric', subclassKey: 'cleric_light', levelGained: 2, type: 'action', shortDescription: 'CD: dispel magical darkness within 30 ft. Each hostile creature: Con save or 2d10 + cleric level radiant damage (half on success).', source: 'phb-2024', category: 'combat' },
  { id: 'cleric.tempest.wrath_of_the_storm', name: 'Wrath of the Storm', classKey: 'cleric', subclassKey: 'cleric_tempest', levelGained: 1, type: 'reaction', uses: { count: () => 1, recharge: 'long_rest' }, shortDescription: 'Reaction when a creature within 5 ft hits you: Dex save or 2d8 lightning/thunder damage (half on success).', fullDescription: 'You can thunderously rebuke attackers. When a creature within 5 feet of you that you can see hits you with an attack, you can use your reaction to cause the creature to make a Dexterity saving throw. The creature takes 2d8 lightning or thunder damage (your choice) on a failed save, and half as much damage on a successful one. You can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest.', source: 'phb-2024', category: 'combat' },
  { id: 'cleric.tempest.destructive_wrath', name: 'Channel Divinity: Destructive Wrath', classKey: 'cleric', subclassKey: 'cleric_tempest', levelGained: 2, type: 'free', shortDescription: 'When you roll lightning or thunder damage, spend a CD to deal max damage instead of rolling.', source: 'phb-2024', category: 'combat' },
  { id: 'cleric.war.war_priest', name: 'War Priest', classKey: 'cleric', subclassKey: 'cleric_war', levelGained: 1, type: 'bonus_action', uses: { count: (lvl) => Math.max(1, Math.floor(lvl / 4) + 1), recharge: 'long_rest' }, shortDescription: 'When you take Attack action, you can make one weapon attack as a bonus action. Uses = Wis mod per long rest.', fullDescription: 'Your god delivers bolts of inspiration to you while you are engaged in battle. When you use the Attack action, you can make one weapon attack as a bonus action. You can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest.', source: 'phb-2024', category: 'combat' },
  { id: 'cleric.war.guided_strike', name: 'Channel Divinity: Guided Strike', classKey: 'cleric', subclassKey: 'cleric_war', levelGained: 2, type: 'free', shortDescription: 'When you make an attack roll, spend a CD to gain +10 to the roll after seeing it.', source: 'phb-2024', category: 'combat' },
  { id: 'cleric.trickery.blessing_of_the_trickster', name: 'Blessing of the Trickster', classKey: 'cleric', subclassKey: 'cleric_trickery', levelGained: 1, type: 'action', shortDescription: 'Action: touch a willing creature. It has advantage on Stealth checks for 1 hour. Concentration not required.', source: 'phb-2024', category: 'utility' },
  { id: 'cleric.knowledge.blessings_of_knowledge', name: 'Blessings of Knowledge', classKey: 'cleric', subclassKey: 'cleric_knowledge', levelGained: 1, type: 'passive', shortDescription: 'Learn two languages. Gain proficiency + expertise in two of: Arcana, History, Nature, Religion.', source: 'phb-2024', category: 'utility' },
  { id: 'cleric.twilight.eyes_of_night', name: 'Eyes of Night', classKey: 'cleric', subclassKey: 'cleric_twilight', levelGained: 1, type: 'action', shortDescription: 'Darkvision 300 ft (magical). Action: share it with creatures within 10 ft for 1 hour. Uses = Wis mod per long rest.', source: 'phb-2024', category: 'utility' },
  { id: 'cleric.twilight.twilight_sanctuary', name: 'Channel Divinity: Twilight Sanctuary', classKey: 'cleric', subclassKey: 'cleric_twilight', levelGained: 2, type: 'action', shortDescription: 'CD: 30-ft radius dim-light aura for 1 minute. Allies entering gain temp HP = 1d6 + cleric level, or end a charm/fear.', fullDescription: 'You can use your Channel Divinity to refresh your allies with soothing twilight. As an action, you present your holy symbol, and a sphere of twilight emanates from you. The sphere is centered on you, has a 30-foot radius, and is filled with dim light. The sphere moves with you, and it lasts for 1 minute. Whenever a creature (including you) ends its turn in the sphere, you can grant that creature one of these benefits: you grant it temporary hit points equal to 1d6 + your cleric level, OR you end one effect on it causing it to be charmed or frightened.', source: 'phb-2024', category: 'utility' },

  // ── Druid ──────────────────────────────────────────────────────────
  { id: 'druid.land.bonus_cantrip', name: 'Bonus Cantrip', classKey: 'druid', subclassKey: 'druid_land', levelGained: 2, type: 'passive', shortDescription: 'You learn one additional druid cantrip.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'druid.land.natural_recovery', name: 'Natural Recovery', classKey: 'druid', subclassKey: 'druid_land', levelGained: 2, type: 'free', uses: { count: () => 1, recharge: 'long_rest' }, shortDescription: 'On a short rest, recover spell slot levels = half your druid level (no slot above 5th).', source: 'phb-2024', category: 'spellcasting' },
  { id: 'druid.land.land_stride', name: 'Land\'s Stride', classKey: 'druid', subclassKey: 'druid_land', levelGained: 6, type: 'passive', shortDescription: 'Move through non-magical difficult terrain at normal speed. Take no damage from non-magical plants.', source: 'phb-2024', category: 'exploration' },
  { id: 'druid.stars.starry_form', name: 'Starry Form', classKey: 'druid', subclassKey: 'druid_stars', levelGained: 2, type: 'bonus_action', shortDescription: 'Bonus action: enter Archer, Chalice, or Dragon constellation form for 10 min. Each provides combat/healing/concentration bonuses.', fullDescription: 'You can expend a use of your Wild Shape to take on a starry form, rather than transforming into a beast. While in your starry form, you retain your game statistics, but your body becomes luminous; your joints glimmer like stars, and faint lines connect them like a constellation. Your starry form sheds bright light in a 10-foot radius and dim light for an additional 10 feet. The form lasts for 10 minutes. It ends early if you dismiss it (no action), are incapacitated, die, or use Wild Shape again. Each time you assume this form, choose: Archer (bonus action ranged spell attack 1d8 + Wis radiant damage), Chalice (whenever you cast a spell that restores HP, allies within 30 ft also regain 1d8 + Wis HP), or Dragon (treat any d20 roll of 9 or lower for an Int/Wis save and concentration check as 10).', source: 'phb-2024', category: 'combat' },
  { id: 'druid.spores.symbiotic_entity', name: 'Symbiotic Entity', classKey: 'druid', subclassKey: 'druid_spores', levelGained: 2, type: 'action', shortDescription: 'Spend a Wild Shape use: gain 4 × druid level temp HP, double Halo of Spores damage, and unarmed strikes deal +1d6 necrotic.', fullDescription: 'You gain the ability to channel magic into your spore symbiosis. As an action, you can expend a use of your Wild Shape feature to awaken those spores, rather than transforming into a beast form. You gain 4 temporary hit points per level you have in this class. While this feature is active, the following effects are active: if the Halo of Spores damage roll results in damage, it is doubled, and your melee weapon attacks deal an extra 1d6 necrotic damage to any target they hit. These effects last for 10 minutes, until you are incapacitated, until you die, or until you use this feature again.', source: 'phb-2024', category: 'combat' },
  { id: 'druid.spores.halo_of_spores', name: 'Halo of Spores', classKey: 'druid', subclassKey: 'druid_spores', levelGained: 2, type: 'reaction', shortDescription: 'Reaction when a creature moves into space within 10 ft: Con save or 1d4 (scaling) necrotic damage.', source: 'phb-2024', category: 'combat' },
  { id: 'druid.shepherd.spirit_totem', name: 'Spirit Totem', classKey: 'druid', subclassKey: 'druid_shepherd', levelGained: 2, type: 'bonus_action', shortDescription: 'Bonus action: summon Bear (HP boost), Hawk (advantage on attacks), or Unicorn (healing) totem in a 30-ft aura for 1 minute.', source: 'phb-2024', category: 'combat' },
  { id: 'druid.wildfire.summon_wildfire_spirit', name: 'Summon Wildfire Spirit', classKey: 'druid', subclassKey: 'druid_wildfire', levelGained: 2, type: 'action', shortDescription: 'Spend a Wild Shape use: summon a Wildfire Spirit ally (Fiery Teleport AoE, Flame Seed ranged attack).', source: 'phb-2024', category: 'combat' },

  // ── Fighter ────────────────────────────────────────────────────────
  { id: 'fighter.samurai.fighting_spirit', name: 'Fighting Spirit', classKey: 'fighter', subclassKey: 'fighter_samurai', levelGained: 3, type: 'bonus_action', uses: { count: (lvl) => (lvl >= 17 ? 3 : 1), recharge: 'long_rest' }, shortDescription: 'Bonus action: gain temp HP (5 → 10 at L10 → 15 at L15) + advantage on weapon attacks until end of turn.', fullDescription: 'Starting at 3rd level, your intensity in battle can shield you and help you strike true. As a bonus action on your turn, you can give yourself advantage on weapon attack rolls until the end of the current turn. When you do so, you also gain 5 temporary hit points. The number of temporary hit points increases when you reach certain levels in this class, increasing to 10 at 10th level and 15 at 15th level.', source: 'phb-2024', category: 'combat' },
  { id: 'fighter.samurai.tireless_spirit', name: 'Tireless Spirit', classKey: 'fighter', subclassKey: 'fighter_samurai', levelGained: 10, type: 'passive', shortDescription: 'When you roll initiative with no Fighting Spirit uses left, you regain one.', source: 'phb-2024', category: 'combat' },
  { id: 'fighter.psi_warrior.psionic_power', name: 'Psionic Power', classKey: 'fighter', subclassKey: 'fighter_psi_warrior', levelGained: 3, type: 'special', uses: { count: (lvl) => lvl * 2, recharge: 'long_rest', die: 'd6' }, shortDescription: 'You have Psionic Energy dice (2× fighter level). Spend them for Protective Field (reaction reduce damage), Psionic Strike (extra force damage), Telekinetic Movement.', fullDescription: 'You harbor a wellspring of psionic energy within yourself. This energy is represented by your Psionic Energy dice, which fuel various psionic powers you have, detailed below. You have a number of Psionic Energy dice equal to twice your fighter level — these dice are d6s. Some powers expend the die rolled, others don\'t. You regain all your expended Psionic Energy dice when you finish a long rest. The starting powers: Protective Field (reaction — when you or a creature within 30 ft takes damage, expend a die and reduce the damage by the roll + Int mod); Psionic Strike (after a hit with a weapon attack within 30 ft, expend a die to add the roll + Int mod as force damage); Telekinetic Movement (action — telekinetically move a Medium-or-smaller object or willing creature within 30 ft up to 30 ft, free action once per short rest).', scalingNotes: 'Die size: d6 (L3) · d8 (L5) · d10 (L11) · d12 (L17).', source: 'phb-2024', category: 'combat' },
  { id: 'fighter.rune_knight.giant_might', name: 'Giant Might', classKey: 'fighter', subclassKey: 'fighter_rune_knight', levelGained: 3, type: 'bonus_action', uses: { count: (lvl) => Math.max(2, Math.floor(lvl / 4) + 2), recharge: 'long_rest' }, shortDescription: 'Bonus action: become Large for 1 minute. Advantage on Str checks/saves, +1d6 (→ 1d8/1d10) weapon damage once per turn.', fullDescription: 'You can imbue yourself with the might of giants. As a bonus action, you magically gain the following benefits, which last for 1 minute: if you are smaller than Large, you become Large, along with anything you are wearing. If you lack the room to become Large, your size doesn\'t change. You have advantage on Strength checks and Strength saving throws. Once on each of your turns, one of your attacks with a weapon or an unarmed strike can deal an extra 1d6 damage to a target on a hit. The damage increases to 1d8 at 10th level. You can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.', source: 'phb-2024', category: 'combat' },
  { id: 'fighter.rune_knight.rune_carver', name: 'Rune Carver', classKey: 'fighter', subclassKey: 'fighter_rune_knight', levelGained: 3, type: 'passive', shortDescription: 'Learn 2 runes (Cloud, Fire, Frost, Stone, Hill, Storm). Inscribe runes on items; activate for various boons (resist, reroll, charm).', source: 'phb-2024', category: 'combat' },
  { id: 'fighter.cavalier.born_to_the_saddle', name: 'Born to the Saddle', classKey: 'fighter', subclassKey: 'fighter_cavalier', levelGained: 3, type: 'passive', shortDescription: 'Advantage to stay mounted. Mounting/dismounting costs 5 ft. Land on your feet if your mount falls.', source: 'phb-2024', category: 'utility' },

  // ── Monk ───────────────────────────────────────────────────────────
  { id: 'monk.open_hand.open_hand_technique', name: 'Open Hand Technique', classKey: 'monk', subclassKey: 'monk_open_hand', levelGained: 3, type: 'free', shortDescription: 'When you hit with Flurry of Blows, choose: target Dex save or prone; Str save or push 15 ft; can\'t take reactions until end of next turn.', fullDescription: 'You can manipulate your enemy\'s ki when you harness your own. Whenever you hit a creature with one of the attacks granted by your Flurry of Blows, you can impose one of the following effects on that target: it must succeed on a Dexterity saving throw or be knocked prone; it must make a Strength saving throw — if it fails, you can push it up to 15 ft away from you; or it can\'t take reactions until the end of your next turn.', source: 'phb-2024', category: 'combat' },
  { id: 'monk.open_hand.wholeness_of_body', name: 'Wholeness of Body', classKey: 'monk', subclassKey: 'monk_open_hand', levelGained: 6, type: 'action', uses: { count: () => 1, recharge: 'long_rest' }, shortDescription: 'Action: regain 3 × monk level HP.', source: 'phb-2024', category: 'utility' },
  { id: 'monk.shadow.shadow_arts', name: 'Shadow Arts', classKey: 'monk', subclassKey: 'monk_shadow', levelGained: 3, type: 'action', shortDescription: 'You know Minor Illusion cantrip. Spend 2 Discipline to cast Darkness, Darkvision, Pass without Trace, or Silence (no components).', source: 'phb-2024', category: 'utility' },
  { id: 'monk.shadow.shadow_step', name: 'Shadow Step', classKey: 'monk', subclassKey: 'monk_shadow', levelGained: 6, type: 'bonus_action', shortDescription: 'Bonus action while in dim light/darkness: teleport up to 60 ft to an unoccupied dim/dark space + advantage on your first melee attack this turn.', fullDescription: 'At 6th level, you gain the ability to step from one shadow into another. When you are in dim light or darkness, as a bonus action you can teleport up to 60 feet to an unoccupied space you can see that is also in dim light or darkness. You then have advantage on the first melee attack you make before the end of the turn.', source: 'phb-2024', category: 'utility' },
  { id: 'monk.kensei.path_of_the_kensei', name: 'Path of the Kensei', classKey: 'monk', subclassKey: 'monk_kensei', levelGained: 3, type: 'passive', shortDescription: 'Choose 2 Kensei weapons. Use them as monk weapons. Bonus action turns one into +2 AC. Reaction with Dex save.', source: 'phb-2024', category: 'combat' },
  { id: 'monk.kensei.one_with_the_blade', name: 'One with the Blade', classKey: 'monk', subclassKey: 'monk_kensei', levelGained: 6, type: 'passive', shortDescription: 'Your Kensei weapons count as magical. Spend 1 Discipline as a bonus action: +Martial Arts die to weapon damage rolls until end of turn.', source: 'phb-2024', category: 'combat' },
  { id: 'monk.mercy.hand_of_healing', name: 'Hand of Healing', classKey: 'monk', subclassKey: 'monk_mercy', levelGained: 3, type: 'action', shortDescription: 'Action: spend 1 Discipline to heal a creature for Martial Arts die + Wis mod. Or apply as part of Flurry of Blows.', source: 'phb-2024', category: 'utility' },
  { id: 'monk.mercy.hand_of_harm', name: 'Hand of Harm', classKey: 'monk', subclassKey: 'monk_mercy', levelGained: 3, type: 'free', shortDescription: 'Once per turn when you hit with unarmed strike, spend 1 Discipline: target takes extra Martial Arts die + Wis mod necrotic damage.', source: 'phb-2024', category: 'combat' },
  { id: 'monk.ascendent_dragon.draconic_disciple', name: 'Draconic Disciple', classKey: 'monk', subclassKey: 'monk_ascendent_dragon', levelGained: 3, type: 'free', shortDescription: 'Choose a damage type. Once per turn, change unarmed strike damage to acid, cold, fire, lightning, or poison. Advantage on Charisma (Intimidation) vs creatures who saw your damage.', source: 'phb-2024', category: 'combat' },
  { id: 'monk.ascendent_dragon.breath_of_the_dragon', name: 'Breath of the Dragon', classKey: 'monk', subclassKey: 'monk_ascendent_dragon', levelGained: 3, type: 'action', shortDescription: 'Replace one Attack action attack with a breath: 20-ft cone or 30-ft line. Dex save for half (Nd10 chosen damage, scaling).', source: 'phb-2024', category: 'combat' },

  // ── Paladin ────────────────────────────────────────────────────────
  { id: 'paladin.devotion.sacred_weapon', name: 'Channel Divinity: Sacred Weapon', classKey: 'paladin', subclassKey: 'paladin_devotion', levelGained: 3, type: 'action', shortDescription: 'Action: imbue a weapon with light for 1 minute. +Cha to attack rolls, sheds bright light 20 ft.', fullDescription: 'As an action, you can imbue one weapon that you are holding with positive energy, using your Channel Divinity. For 1 minute, you add your Charisma modifier (minimum +1) to attack rolls made with that weapon. The weapon also emits bright light in a 20-foot radius and dim light 20 feet beyond that. If the weapon is not already magical, it becomes magical for the duration. You can end this effect on your turn as part of any other action. If you are no longer holding or carrying this weapon, or if you fall unconscious, this effect ends.', source: 'phb-2024', category: 'combat' },
  { id: 'paladin.devotion.turn_the_unholy', name: 'Channel Divinity: Turn the Unholy', classKey: 'paladin', subclassKey: 'paladin_devotion', levelGained: 3, type: 'action', shortDescription: 'CD: each fiend or undead within 30 ft makes Wis save or is turned for 1 minute.', source: 'phb-2024', category: 'combat' },
  { id: 'paladin.vengeance.vow_of_enmity', name: 'Channel Divinity: Vow of Enmity', classKey: 'paladin', subclassKey: 'paladin_vengeance', levelGained: 3, type: 'bonus_action', shortDescription: 'Bonus action: vow against a creature within 10 ft. Advantage on attack rolls against it for 1 minute.', fullDescription: 'As a bonus action, you can utter a vow of enmity against a creature you can see within 10 feet of you, using your Channel Divinity. You gain advantage on attack rolls against the creature for 1 minute or until it drops to 0 hit points or falls unconscious.', source: 'phb-2024', category: 'combat' },
  { id: 'paladin.vengeance.relentless_avenger', name: 'Relentless Avenger', classKey: 'paladin', subclassKey: 'paladin_vengeance', levelGained: 7, type: 'reaction', shortDescription: 'When you hit a creature with an opportunity attack, move up to half your speed as part of the reaction. Doesn\'t provoke OAs.', source: 'phb-2024', category: 'combat' },
  { id: 'paladin.ancients.natures_wrath', name: 'Channel Divinity: Nature\'s Wrath', classKey: 'paladin', subclassKey: 'paladin_ancients', levelGained: 3, type: 'action', shortDescription: 'CD: vines restrain a creature within 10 ft (Str or Dex save). Repeats save each turn.', source: 'phb-2024', category: 'combat' },
  { id: 'paladin.ancients.aura_of_warding', name: 'Aura of Warding', classKey: 'paladin', subclassKey: 'paladin_ancients', levelGained: 7, type: 'passive', shortDescription: 'You and allies within your Aura have resistance to damage from spells.', source: 'phb-2024', category: 'defensive' },
  { id: 'paladin.conquest.conquering_presence', name: 'Channel Divinity: Conquering Presence', classKey: 'paladin', subclassKey: 'paladin_conquest', levelGained: 3, type: 'action', shortDescription: 'CD: each creature within 30 ft makes Wis save or is frightened for 1 minute.', fullDescription: 'You can use your Channel Divinity to exude a terrifying presence. As an action, you force each creature of your choice that you can see within 30 feet of you to make a Wisdom saving throw. On a failed save, a creature becomes frightened of you for 1 minute. The frightened creature can repeat this saving throw at the end of each of its turns, ending the effect on itself on a success.', source: 'phb-2024', category: 'combat' },
  { id: 'paladin.glory.peerless_athlete', name: 'Channel Divinity: Peerless Athlete', classKey: 'paladin', subclassKey: 'paladin_glory', levelGained: 3, type: 'bonus_action', shortDescription: 'Bonus action: spend a CD. For 10 minutes: advantage on Athletics/Acrobatics, carry/lift double, jump distance doubles.', source: 'phb-2024', category: 'utility' },

  // ── Ranger ─────────────────────────────────────────────────────────
  { id: 'ranger.hunter.hunters_prey', name: 'Hunter\'s Prey', classKey: 'ranger', subclassKey: 'ranger_hunter', levelGained: 3, type: 'passive', shortDescription: 'Choose Colossus Slayer (+1d8 vs damaged target once/turn), Giant Killer (reaction attack vs Large+), or Horde Breaker (extra attack on second adjacent target).', source: 'phb-2024', category: 'combat' },
  { id: 'ranger.hunter.defensive_tactics', name: 'Defensive Tactics', classKey: 'ranger', subclassKey: 'ranger_hunter', levelGained: 7, type: 'passive', shortDescription: 'Choose Escape the Horde (disadvantage on OAs vs you), Multiattack Defense (+4 AC vs follow-up attacks), or Steel Will (advantage vs frighten).', source: 'phb-2024', category: 'defensive' },
  { id: 'ranger.gloom_stalker.dread_ambusher', name: 'Dread Ambusher', classKey: 'ranger', subclassKey: 'ranger_gloom_stalker', levelGained: 3, type: 'special', shortDescription: '+Wis mod initiative. On first turn of combat: +10 ft speed and one extra weapon attack dealing +1d8 damage.', fullDescription: 'At 3rd level, you master the art of the first strike. At the start of your first turn of each combat, your walking speed increases by 10 feet, which lasts until the end of that turn. If you take the Attack action on that turn, you can make one additional weapon attack as part of that action. If that attack hits, the target takes an extra 1d8 damage of the weapon\'s damage type. You also have advantage on initiative rolls.', source: 'phb-2024', category: 'combat' },
  { id: 'ranger.gloom_stalker.umbral_sight', name: 'Umbral Sight', classKey: 'ranger', subclassKey: 'ranger_gloom_stalker', levelGained: 3, type: 'passive', shortDescription: 'Darkvision 60 ft (or +30 ft). In darkness, you are invisible to creatures relying on darkvision.', source: 'phb-2024', category: 'exploration' },
  { id: 'ranger.beast_master.primal_companion', name: 'Primal Companion', classKey: 'ranger', subclassKey: 'ranger_beast_master', levelGained: 3, type: 'bonus_action', shortDescription: 'Summon a primal beast (Land/Sea/Sky). Use bonus action to command it; it acts on your turn. Scales with ranger level.', fullDescription: 'You magically summon a primal beast that draws power from your bond with nature. Choose Beast of the Land, Beast of the Sea, or Beast of the Sky — each uses the Primal Companion stat block (AC = 13 + prof, HP = 5 × ranger level, attack = prof + Str/Dex + Wis, damage = die + Wis). In combat, the beast acts during your turn. It can move and use its reaction on its own, but the only action it takes is the Dodge action — unless you take a bonus action on your turn to command it to take one of the actions in its stat block or any other action. If you are incapacitated, the beast can take any action of its choice. If the beast has died within the last hour, you can take a 1-hour ritual to revive it.', source: 'phb-2024', category: 'combat' },
  { id: 'ranger.drakewarden.draconic_gift', name: 'Draconic Gift', classKey: 'ranger', subclassKey: 'ranger_drakewarden', levelGained: 3, type: 'passive', shortDescription: 'You learn Draconic and Thaumaturgy cantrip. Use a bonus action to summon your Drake Companion (Tiny construct).', source: 'phb-2024', category: 'utility' },
  { id: 'ranger.fey_wanderer.dreadful_strikes', name: 'Dreadful Strikes', classKey: 'ranger', subclassKey: 'ranger_fey_wanderer', levelGained: 3, type: 'free', shortDescription: 'Once per turn when you hit with a weapon attack, deal +1d4 psychic damage. (1d6 at L11.)', source: 'phb-2024', category: 'combat' },
  { id: 'ranger.swarmkeeper.gathered_swarm', name: 'Gathered Swarm', classKey: 'ranger', subclassKey: 'ranger_swarmkeeper', levelGained: 3, type: 'free', shortDescription: 'When you hit with a weapon attack: +1d6 piercing, or move target 15 ft, or move yourself 5 ft without provoking. Once per turn.', source: 'phb-2024', category: 'combat' },

  // ── Rogue ──────────────────────────────────────────────────────────
  { id: 'rogue.assassin.assassinate', name: 'Assassinate', classKey: 'rogue', subclassKey: 'rogue_assassin', levelGained: 3, type: 'free', shortDescription: 'Advantage on attack rolls against creatures that haven\'t taken a turn yet. Hits on a surprised creature are automatic crits.', fullDescription: 'You are at your deadliest when you get the drop on your enemies. You have advantage on attack rolls against any creature that hasn\'t taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit.', source: 'phb-2024', category: 'combat' },
  { id: 'rogue.assassin.assassins_tools', name: 'Assassin\'s Tools', classKey: 'rogue', subclassKey: 'rogue_assassin', levelGained: 3, type: 'passive', shortDescription: 'Proficiency with the disguise kit and the poisoner\'s kit.', source: 'phb-2024', category: 'utility' },
  { id: 'rogue.swashbuckler.fancy_footwork', name: 'Fancy Footwork', classKey: 'rogue', subclassKey: 'rogue_swashbuckler', levelGained: 3, type: 'passive', shortDescription: 'On your turn, if you make a melee attack against a creature, you don\'t provoke OAs from it for the rest of your turn.', fullDescription: 'When you choose this archetype at 3rd level, you learn how to land a strike and then slip away without reprisal. During your turn, if you make a melee attack against a creature, that creature can\'t make opportunity attacks against you for the rest of your turn.', source: 'phb-2024', category: 'combat' },
  { id: 'rogue.swashbuckler.rakish_audacity', name: 'Rakish Audacity', classKey: 'rogue', subclassKey: 'rogue_swashbuckler', levelGained: 3, type: 'passive', shortDescription: 'Add Cha mod to initiative. You can use Sneak Attack without advantage if no other creatures are within 5 ft of the target.', source: 'phb-2024', category: 'combat' },
  { id: 'rogue.phantom.whispers_of_the_dead', name: 'Whispers of the Dead', classKey: 'rogue', subclassKey: 'rogue_phantom', levelGained: 3, type: 'special', shortDescription: 'Whenever you finish a short or long rest, gain proficiency in one skill or tool of your choice (replaces previous choice).', source: 'phb-2024', category: 'utility' },
  { id: 'rogue.phantom.wails_from_the_grave', name: 'Wails from the Grave', classKey: 'rogue', subclassKey: 'rogue_phantom', levelGained: 3, type: 'free', uses: { count: (lvl) => Math.max(1, Math.floor((lvl - 2) / 2)), recharge: 'long_rest' }, shortDescription: 'After Sneak-Attacking, choose a creature within 30 ft of your target: it takes half your SA damage (necrotic). Uses = prof bonus / 2 per LR.', source: 'phb-2024', category: 'combat' },
  { id: 'rogue.scout.skirmisher', name: 'Skirmisher', classKey: 'rogue', subclassKey: 'rogue_scout', levelGained: 3, type: 'reaction', shortDescription: 'When an enemy ends its turn within 5 ft of you, use a reaction to move up to half your speed (no OAs from that creature).', source: 'phb-2024', category: 'utility' },
  { id: 'rogue.scout.survivalist', name: 'Survivalist', classKey: 'rogue', subclassKey: 'rogue_scout', levelGained: 3, type: 'passive', shortDescription: 'Proficiency in Nature + Survival. Both gain Expertise (double prof bonus).', source: 'phb-2024', category: 'utility' },
  { id: 'rogue.mastermind.master_of_intrigue', name: 'Master of Intrigue', classKey: 'rogue', subclassKey: 'rogue_mastermind', levelGained: 3, type: 'passive', shortDescription: 'Learn two languages. Unerringly mimic the speech patterns and accent of any creature you\'ve heard speak for 1 minute.', source: 'phb-2024', category: 'social' },
  { id: 'rogue.mastermind.master_of_tactics', name: 'Master of Tactics', classKey: 'rogue', subclassKey: 'rogue_mastermind', levelGained: 3, type: 'bonus_action', shortDescription: 'You can use the Help action as a bonus action. The target can be up to 30 ft away.', source: 'phb-2024', category: 'combat' },

  // ── Sorcerer ───────────────────────────────────────────────────────
  { id: 'sorcerer.wild_magic.wild_magic_surge', name: 'Wild Magic Surge', classKey: 'sorcerer', subclassKey: 'sorcerer_wild_magic', levelGained: 1, type: 'special', shortDescription: 'After casting a sorcerer spell of 1st level or higher, GM may have you roll d20. On a 1, roll on the Wild Magic Surge d100 table.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'sorcerer.wild_magic.tides_of_chaos', name: 'Tides of Chaos', classKey: 'sorcerer', subclassKey: 'sorcerer_wild_magic', levelGained: 1, type: 'free', uses: { count: () => 1, recharge: 'long_rest' }, shortDescription: 'Gain advantage on one attack roll, ability check, or save. GM may then trigger a Wild Magic Surge to refresh the feature.', fullDescription: 'You can manipulate the forces of chance and chaos to gain advantage on one attack roll, ability check, or saving throw. Once you do so, you must finish a long rest before you can use this feature again. Any time before you regain the use of this feature, the GM can have you roll on the Wild Magic Surge table immediately after you cast a sorcerer spell of 1st level or higher. You then regain the use of this feature.', source: 'phb-2024', category: 'utility' },
  { id: 'sorcerer.clockwork_soul.restore_balance', name: 'Restore Balance', classKey: 'sorcerer', subclassKey: 'sorcerer_clockwork_soul', levelGained: 1, type: 'reaction', shortDescription: 'When a creature within 60 ft has advantage or disadvantage, cancel it (your choice). Uses = prof bonus per long rest.', fullDescription: 'Your connection to the plane of absolute order allows you to equalize chaotic moments. When a creature you can see within 60 feet of you is about to roll a d20 with advantage or disadvantage, you can use your reaction to prevent the roll from being affected by advantage and disadvantage. You can use this feature a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.', source: 'phb-2024', category: 'utility' },
  { id: 'sorcerer.clockwork_soul.clockwork_magic', name: 'Clockwork Magic', classKey: 'sorcerer', subclassKey: 'sorcerer_clockwork_soul', levelGained: 1, type: 'passive', shortDescription: 'Always-prepared spells: Alarm, Protection from Evil and Good, Aid, Lesser Restoration, etc. (scales by level).', source: 'phb-2024', category: 'spellcasting' },
  { id: 'sorcerer.storm_sorcery.tempestuous_magic', name: 'Tempestuous Magic', classKey: 'sorcerer', subclassKey: 'sorcerer_storm_sorcery', levelGained: 1, type: 'bonus_action', shortDescription: 'After casting a spell of 1st level or higher, fly up to 10 ft without provoking OAs as part of the spell.', source: 'phb-2024', category: 'combat' },
  { id: 'sorcerer.divine_soul.divine_magic', name: 'Divine Magic', classKey: 'sorcerer', subclassKey: 'sorcerer_divine_soul', levelGained: 1, type: 'passive', shortDescription: 'Choose an affinity (Good = Cure Wounds; Evil = Inflict Wounds; Law = Bless; Chaos = Bane; Neutrality = Protection). You can pick spells from the cleric list.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'sorcerer.divine_soul.favored_by_the_gods', name: 'Favored by the Gods', classKey: 'sorcerer', subclassKey: 'sorcerer_divine_soul', levelGained: 1, type: 'free', uses: { count: () => 1, recharge: 'short_rest' }, shortDescription: 'Once per short rest: add 2d4 to a failed save or missed attack roll.', source: 'phb-2024', category: 'utility' },
  { id: 'sorcerer.shadow_magic.eyes_of_the_dark', name: 'Eyes of the Dark', classKey: 'sorcerer', subclassKey: 'sorcerer_shadow_magic', levelGained: 1, type: 'passive', shortDescription: 'Darkvision 120 ft (sees through magical darkness). Learn Darkness; cast it by spending 2 Sorcery Points (still concentration).', source: 'phb-2024', category: 'utility' },

  // ── Warlock ────────────────────────────────────────────────────────
  { id: 'warlock.archfey.fey_presence', name: 'Fey Presence', classKey: 'warlock', subclassKey: 'warlock_archfey', levelGained: 1, type: 'action', uses: { count: () => 1, recharge: 'short_rest' }, shortDescription: 'Action: each creature in a 10-ft cube: Wis save or charmed OR frightened (your choice) until end of your next turn.', fullDescription: 'Your patron bestows upon you the ability to project the beguiling and fearsome presence of the fey. As an action, you can cause each creature in a 10-foot cube originating from you to make a Wisdom saving throw against your warlock spell save DC. The creatures that fail their saving throws are all charmed or frightened by you (your choice) until the end of your next turn. Once you use this feature, you can\'t use it again until you finish a short or long rest.', source: 'phb-2024', category: 'combat' },
  { id: 'warlock.archfey.misty_escape', name: 'Misty Escape', classKey: 'warlock', subclassKey: 'warlock_archfey', levelGained: 6, type: 'reaction', shortDescription: 'Reaction when you take damage: turn invisible and teleport up to 60 ft. Invisibility lasts until you attack or cast a spell. Once per short rest.', source: 'phb-2024', category: 'defensive' },
  { id: 'warlock.fiend.dark_ones_blessing', name: 'Dark One\'s Blessing', classKey: 'warlock', subclassKey: 'warlock_fiend', levelGained: 1, type: 'passive', shortDescription: 'When you reduce a hostile creature to 0 HP, gain temp HP = Cha mod + warlock level.', fullDescription: 'When you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier + your warlock level (minimum of 1).', source: 'phb-2024', category: 'defensive' },
  { id: 'warlock.fiend.dark_ones_own_luck', name: 'Dark One\'s Own Luck', classKey: 'warlock', subclassKey: 'warlock_fiend', levelGained: 6, type: 'free', uses: { count: () => 1, recharge: 'short_rest' }, shortDescription: 'Once per short rest: add 1d10 to an ability check or save you just made.', source: 'phb-2024', category: 'utility' },
  { id: 'warlock.great_old_one.awakened_mind', name: 'Awakened Mind', classKey: 'warlock', subclassKey: 'warlock_great_old_one', levelGained: 1, type: 'free', shortDescription: 'Telepathic communication with any creature within 30 ft that shares a language (one-way).', source: 'phb-2024', category: 'social' },
  { id: 'warlock.great_old_one.entropic_ward', name: 'Entropic Ward', classKey: 'warlock', subclassKey: 'warlock_great_old_one', levelGained: 6, type: 'reaction', uses: { count: () => 1, recharge: 'short_rest' }, shortDescription: 'Reaction when a creature attacks you: disadvantage. If it misses, you have advantage on your next attack against it before end of next turn.', source: 'phb-2024', category: 'defensive' },
  { id: 'warlock.celestial.healing_light', name: 'Healing Light', classKey: 'warlock', subclassKey: 'warlock_celestial', levelGained: 1, type: 'bonus_action', uses: { count: (lvl) => Math.max(1, Math.floor(lvl / 2) + 1), recharge: 'long_rest', die: 'd6' }, shortDescription: 'Bonus action: heal a creature within 60 ft (1d6 per die spent up to your pool, which is 1 + Cha mod dice).', fullDescription: 'You gain the ability to channel celestial energy to heal wounds. You have a pool of d6s that you spend to fuel this healing. The number of dice in the pool equals 1 + your warlock level. As a bonus action, you can heal one creature you can see within 60 feet of you, spending dice from the pool. The maximum number of dice you can spend at once equals your Charisma modifier (minimum of one die). Roll the dice you spend, add them together, and restore a number of hit points equal to the total. Your pool regains all expended dice when you finish a long rest.', source: 'phb-2024', category: 'utility' },
  { id: 'warlock.celestial.radiant_soul', name: 'Radiant Soul', classKey: 'warlock', subclassKey: 'warlock_celestial', levelGained: 6, type: 'passive', shortDescription: 'You have resistance to radiant damage. When you cast a spell dealing fire or radiant damage, add Cha mod to one damage roll.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'warlock.fathomless.tentacle_of_the_deeps', name: 'Tentacle of the Deeps', classKey: 'warlock', subclassKey: 'warlock_fathomless', levelGained: 1, type: 'bonus_action', shortDescription: 'Bonus action: summon a tentacle (10-ft reach, 1d8 cold damage on hit, reduces target speed by 10 ft). Lasts 1 minute.', source: 'phb-2024', category: 'combat' },
  { id: 'warlock.genie.genies_vessel', name: 'Genie\'s Vessel', classKey: 'warlock', subclassKey: 'warlock_genie', levelGained: 1, type: 'special', shortDescription: 'You have a magical vessel. Bonus action: enter (60 minutes inside, total cover). +Cha bonus damage once per turn matching genie type (fire/lightning/etc.).', source: 'phb-2024', category: 'utility' },

  // ── Wizard ─────────────────────────────────────────────────────────
  { id: 'wizard.evocation.evocation_savant', name: 'Evocation Savant', classKey: 'wizard', subclassKey: 'wizard_evocation', levelGained: 2, type: 'passive', shortDescription: 'Halve gold + time to copy evocation spells into your spellbook.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'wizard.evocation.sculpt_spells', name: 'Sculpt Spells', classKey: 'wizard', subclassKey: 'wizard_evocation', levelGained: 2, type: 'free', shortDescription: 'When you cast an evocation that affects others you can see, choose 1 + spell level allies in the area; they auto-pass their save and take no damage.', fullDescription: 'You can create pockets of relative safety within the effects of your evocation spells. When you cast an evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 + the spell\'s level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'wizard.evocation.potent_cantrip', name: 'Potent Cantrip', classKey: 'wizard', subclassKey: 'wizard_evocation', levelGained: 6, type: 'passive', shortDescription: 'When a creature succeeds on a save against one of your cantrips, it still takes half damage (if any).', source: 'phb-2024', category: 'spellcasting' },
  { id: 'wizard.abjuration.abjuration_savant', name: 'Abjuration Savant', classKey: 'wizard', subclassKey: 'wizard_abjuration', levelGained: 2, type: 'passive', shortDescription: 'Halve gold + time to copy abjuration spells into your spellbook.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'wizard.abjuration.arcane_ward', name: 'Arcane Ward', classKey: 'wizard', subclassKey: 'wizard_abjuration', levelGained: 2, type: 'special', shortDescription: 'Cast an abjuration spell of 1st level or higher: create an Arcane Ward (HP = 2 × wizard level + Int mod). Absorbs damage; refilled by casting more abjurations.', fullDescription: 'You learn to weave magic around yourself for protection. When you cast an abjuration spell of 1st level or higher, you can simultaneously use a strand of the spell\'s magic to create a magical ward on yourself that lasts until you finish a long rest. The ward has hit points equal to twice your wizard level + your Intelligence modifier. Whenever you take damage, the ward takes the damage instead. If this damage reduces the ward to 0 hit points, you take any remaining damage. While the ward has 0 hit points, it can\'t absorb damage, but its magic remains. Whenever you cast another abjuration spell of 1st level or higher, the ward regains a number of hit points equal to twice the level of the spell.', source: 'phb-2024', category: 'defensive' },
  { id: 'wizard.divination.divination_savant', name: 'Divination Savant', classKey: 'wizard', subclassKey: 'wizard_divination', levelGained: 2, type: 'passive', shortDescription: 'Halve gold + time to copy divination spells into your spellbook.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'wizard.divination.portent', name: 'Portent', classKey: 'wizard', subclassKey: 'wizard_divination', levelGained: 2, type: 'free', uses: { count: (lvl) => (lvl >= 14 ? 3 : 2), recharge: 'long_rest' }, shortDescription: 'After a long rest, roll 2d20 (3 at L14). Replace any d20 roll (yours or another\'s) with one of these rolls before knowing if it succeeds.', fullDescription: 'Glimpses of the future begin to press in on your awareness. When you finish a long rest, roll two d20s and record the numbers rolled. You can replace any attack roll, saving throw, or ability check made by you or a creature that you can see with one of these foretelling rolls. You must choose to do so before the roll, and you can replace a roll in this way only once per turn. Each foretelling roll can be used only once. When you finish a long rest, you lose any unused foretelling rolls.', source: 'phb-2024', category: 'utility' },
  { id: 'wizard.necromancy.necromancy_savant', name: 'Necromancy Savant', classKey: 'wizard', subclassKey: 'wizard_necromancy', levelGained: 2, type: 'passive', shortDescription: 'Halve gold + time to copy necromancy spells into your spellbook.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'wizard.necromancy.grim_harvest', name: 'Grim Harvest', classKey: 'wizard', subclassKey: 'wizard_necromancy', levelGained: 2, type: 'free', shortDescription: 'When you kill a creature with a spell of 1st level or higher, you regain HP = 2 × the spell\'s level (3× for necromancy).', fullDescription: 'You gain the ability to reap life energy from creatures you kill with your spells. Once per turn when you kill one or more creatures with a spell of 1st level or higher, you regain hit points equal to twice the spell\'s level, or three times its level if the spell belongs to the School of Necromancy. You don\'t gain this benefit for killing constructs or undead.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'wizard.chronurgy.chronal_shift', name: 'Chronal Shift', classKey: 'wizard', subclassKey: 'wizard_chronurgy', levelGained: 2, type: 'reaction', uses: { count: () => 2, recharge: 'long_rest' }, shortDescription: 'Reaction when a creature within 30 ft makes an attack roll, ability check, or save: force them to reroll.', source: 'phb-2024', category: 'utility' },
  { id: 'wizard.graviturgy.adjust_density', name: 'Adjust Density', classKey: 'wizard', subclassKey: 'wizard_graviturgy', levelGained: 2, type: 'action', shortDescription: 'Action: change a creature\'s density. Heavy: speed -10, advantage on Str checks/saves. Light: speed +10, jump distance doubles.', source: 'phb-2024', category: 'utility' },
  { id: 'wizard.order_of_scribes.wizardly_quill', name: 'Wizardly Quill', classKey: 'wizard', subclassKey: 'wizard_order_of_scribes', levelGained: 2, type: 'special', shortDescription: 'Conjure a magic quill that can copy spells into your book in 2 minutes per level (no ink). It can also mimic any handwriting you\'ve seen.', source: 'phb-2024', category: 'utility' },

  // ── Artificer ──────────────────────────────────────────────────────
  { id: 'artificer.armorer.armor_model', name: 'Armor Model', classKey: 'artificer', subclassKey: 'artificer_armorer', levelGained: 3, type: 'passive', shortDescription: 'Choose Guardian (thunder gauntlets, defensive field) or Infiltrator (lightning launcher, dampening field). Switch on a short rest.', source: 'phb-2014', category: 'combat' },
  { id: 'artificer.armorer.armorer_spells', name: 'Armorer Spells', classKey: 'artificer', subclassKey: 'artificer_armorer', levelGained: 3, type: 'passive', shortDescription: 'Always-prepared spells: Magic Missile, Thunderwave, Mirror Image, Shatter, etc. (scaling by level).', source: 'phb-2014', category: 'spellcasting' },
  { id: 'artificer.artillerist.eldritch_cannon', name: 'Eldritch Cannon', classKey: 'artificer', subclassKey: 'artificer_artillerist', levelGained: 3, type: 'action', uses: { count: () => 1, recharge: 'long_rest' }, shortDescription: 'Action: create a Small (or Tiny) magical cannon. Bonus action to activate: Force Ballista (ranged 2d8), Flamethrower (15-ft cone), or Protector (temp HP aura).', fullDescription: 'You\'ve learned how to create a magical cannon. Using woodcarver\'s tools or smith\'s tools, you can take an action to magically create a Small or Tiny eldritch cannon in an unoccupied space on a horizontal surface within 5 feet of you. A Small eldritch cannon occupies its space, and a Tiny one can be held in one hand. Once you create a cannon, you can\'t do so again until you finish a long rest or expend a spell slot of 1st level or higher. The cannon is a magical object with AC 18, HP = 5 × your artificer level, and immunity to poison/psychic damage and various conditions. As a bonus action you can command it to activate: Flamethrower (15-ft cone, Dex save or 2d8 fire), Force Ballista (ranged spell attack within 120 ft, 2d8 force damage + push 5 ft on hit), or Protector (each ally within 10 ft gains 1d8 + Int mod temp HP).', source: 'phb-2014', category: 'combat' },
  { id: 'artificer.battle_smith.steel_defender', name: 'Steel Defender', classKey: 'artificer', subclassKey: 'artificer_battle_smith', levelGained: 3, type: 'bonus_action', shortDescription: 'You have a Steel Defender companion (uses dedicated stat block). Bonus action to command it; otherwise it Dodges.', fullDescription: 'You produce a Steel Defender that aids you in combat. It is friendly to you and your companions and obeys your commands. See the Steel Defender stat block for its statistics (AC = 15 + prof, HP = 2 × artificer level + Int mod + 2, speed 40). In combat, the steel defender shares your initiative count but takes its turn immediately after yours. The only action it takes on its turn is the Dodge action, unless you take a bonus action on your turn to command it to take one of the actions in its stat block (Force-Empowered Rend, Repair, or Deflect Attack) or the Dash, Disengage, Help, Hide, or Search action. If you are incapacitated, the defender can take any action of its choice.', source: 'phb-2014', category: 'combat' },
  { id: 'artificer.battle_smith.battle_ready', name: 'Battle Ready', classKey: 'artificer', subclassKey: 'artificer_battle_smith', levelGained: 3, type: 'passive', shortDescription: 'Proficient in martial weapons. Use Intelligence instead of Str/Dex on attacks/damage with magic weapons.', source: 'phb-2014', category: 'combat' },
  { id: 'artificer.alchemist.experimental_elixir', name: 'Experimental Elixir', classKey: 'artificer', subclassKey: 'artificer_alchemist', levelGained: 3, type: 'special', uses: { count: (lvl) => Math.max(1, Math.floor((lvl - 1) / 4) + 1), recharge: 'long_rest' }, shortDescription: 'On long rest, create elixirs (Healing, Swiftness, Resilience, Boldness, Flight, Transformation) equal to your Int mod (min 1).', source: 'phb-2014', category: 'utility' },

  // ── High-level completion (tier 3–4 base-class milestones, 2024 PHB) ──
  // Fills the level 5–20 gaps so a level-20 one-shot shows every feature a
  // class gains on the sheet, actions panel, and level-up previews.
  { id: 'barbarian.improved_brutal_strike', name: 'Improved Brutal Strike', classKey: 'barbarian', levelGained: 13, type: 'passive', shortDescription: 'Brutal Strike gains two new options: Staggering Blow (disadvantage on target\'s next save) and Sundering Blow (+5 bonus to the next attack roll against the target).', source: 'phb-2024', category: 'combat' },
  { id: 'barbarian.improved_brutal_strike_17', name: 'Improved Brutal Strike (17th)', classKey: 'barbarian', levelGained: 17, type: 'passive', shortDescription: 'Brutal Strike damage becomes 2d10, and you can use two different Brutal Strike effects on a single hit.', source: 'phb-2024', category: 'combat' },
  { id: 'bard.countercharm', name: 'Countercharm', classKey: 'bard', levelGained: 7, type: 'reaction', shortDescription: 'Reaction when a creature within 30 ft fails a save against being Charmed or Frightened: it rerolls with advantage.', source: 'phb-2024', category: 'social' },
  { id: 'bard.expertise_9', name: 'Expertise (two more skills)', classKey: 'bard', levelGained: 9, type: 'passive', shortDescription: 'Choose two more skill proficiencies to double your proficiency bonus with.', source: 'phb-2024', category: 'utility' },
  { id: 'bard.superior_inspiration', name: 'Superior Inspiration', classKey: 'bard', levelGained: 18, type: 'passive', shortDescription: 'When you roll initiative, you regain expended Bardic Inspiration until you have at least two uses.', source: 'phb-2024', category: 'combat' },
  { id: 'cleric.improved_blessed_strikes', name: 'Improved Blessed Strikes', classKey: 'cleric', levelGained: 14, type: 'passive', shortDescription: 'Divine Strike improves to 2d8, or Potent Spellcasting adds a shielding boon (Wis-mod temp HP to you or an ally when you deal cantrip damage).', source: 'phb-2024', category: 'combat' },
  { id: 'cleric.greater_divine_intervention', name: 'Greater Divine Intervention', classKey: 'cleric', levelGained: 20, type: 'action', uses: { count: () => 1, recharge: 'long_rest' }, shortDescription: 'Divine Intervention can now cast Wish, once per 2d4 long rests when you do.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'druid.wild_resurgence', name: 'Wild Resurgence', classKey: 'druid', levelGained: 5, type: 'special', shortDescription: 'Once per turn, expend a spell slot to regain a Wild Shape use, or (1/long rest) expend a Wild Shape use to regain a 1st-level slot.', source: 'phb-2024', category: 'utility' },
  { id: 'druid.elemental_fury', name: 'Elemental Fury', classKey: 'druid', levelGained: 7, type: 'passive', shortDescription: 'Choose Potent Spellcasting (+Wis mod to Druid cantrip damage) or Primal Strike (1d8 extra cold/fire/lightning/thunder damage once per turn in Wild Shape or with weapons).', source: 'phb-2024', category: 'combat' },
  { id: 'druid.improved_elemental_fury', name: 'Improved Elemental Fury', classKey: 'druid', levelGained: 15, type: 'passive', shortDescription: 'Potent Spellcasting cantrip range +300 ft, or Primal Strike extra damage becomes 2d8.', source: 'phb-2024', category: 'combat' },
  { id: 'fighter.studied_attacks', name: 'Studied Attacks', classKey: 'fighter', levelGained: 13, type: 'passive', shortDescription: 'If you miss a creature with an attack roll, you have advantage on your next attack against it before the end of your next turn.', source: 'phb-2024', category: 'combat' },
  { id: 'fighter.three_extra_attacks', name: 'Three Extra Attacks', classKey: 'fighter', levelGained: 20, type: 'passive', shortDescription: 'You can attack four times, instead of once, when you take the Attack action.', source: 'phb-2024', category: 'combat' },
  { id: 'monk.heightened_focus', name: 'Heightened Focus', classKey: 'monk', levelGained: 10, type: 'passive', shortDescription: 'Flurry of Blows becomes three strikes, Patient Defense also grants Focus-point temp HP (2× martial arts die), Step of the Wind can carry a willing creature.', source: 'phb-2024', category: 'combat' },
  { id: 'monk.self_restoration', name: 'Self-Restoration', classKey: 'monk', levelGained: 10, type: 'passive', shortDescription: 'End of your turn: remove Charmed, Frightened, or Poisoned from yourself. You suffer no Exhaustion from going without food or water.', source: 'phb-2024', category: 'defensive' },
  { id: 'monk.deflect_energy', name: 'Deflect Energy', classKey: 'monk', levelGained: 13, type: 'reaction', shortDescription: 'Deflect Attacks now works against any damage type, not just Bludgeoning/Piercing/Slashing.', source: 'phb-2024', category: 'defensive' },
  { id: 'monk.perfect_focus', name: 'Perfect Focus', classKey: 'monk', levelGained: 15, type: 'passive', shortDescription: 'When you roll initiative with 3 or fewer Focus points, you regain Focus until you have 4.', source: 'phb-2024', category: 'combat' },
  { id: 'paladin.radiant_strikes', name: 'Radiant Strikes', classKey: 'paladin', levelGained: 11, type: 'passive', shortDescription: 'Your melee weapon and unarmed strikes deal an extra 1d8 Radiant damage on a hit.', source: 'phb-2024', category: 'combat' },
  { id: 'paladin.aura_expansion', name: 'Aura Expansion', classKey: 'paladin', levelGained: 18, type: 'passive', shortDescription: 'Your Aura of Protection is now a 30-foot emanation, up from 10 feet.', source: 'phb-2024', category: 'defensive' },
  { id: 'ranger.roving', name: 'Roving', classKey: 'ranger', levelGained: 6, type: 'passive', shortDescription: 'Speed +10 ft while not wearing heavy armor, and you gain Climb and Swim speeds equal to your Speed.', source: 'phb-2024', category: 'exploration' },
  { id: 'ranger.tireless', name: 'Tireless', classKey: 'ranger', levelGained: 10, type: 'action', uses: { count: (lvl) => Math.max(1, Math.floor((lvl + 2) / 4) + 1), recharge: 'long_rest' }, shortDescription: 'Give yourself temp HP (1d8 + Wis mod), uses = Wis mod/long rest; a short rest also reduces your Exhaustion by 1.', source: 'phb-2024', category: 'defensive' },
  { id: 'ranger.natures_veil', name: 'Nature\'s Veil', classKey: 'ranger', levelGained: 14, type: 'bonus_action', uses: { count: (lvl) => Math.max(1, Math.floor((lvl + 2) / 4) + 1), recharge: 'long_rest' }, shortDescription: 'Bonus action: become Invisible until the end of your next turn (Wis-mod uses per long rest).', source: 'phb-2024', category: 'utility' },
  { id: 'ranger.precise_hunter', name: 'Precise Hunter', classKey: 'ranger', levelGained: 17, type: 'passive', shortDescription: 'You have advantage on attack rolls against the current target of your Hunter\'s Mark.', source: 'phb-2024', category: 'combat' },
  { id: 'sorcerer.sorcerous_restoration', name: 'Sorcerous Restoration', classKey: 'sorcerer', levelGained: 5, type: 'special', uses: { count: () => 1, recharge: 'short_rest' }, shortDescription: 'On a short rest, regain expended Sorcery Points equal to half your sorcerer level (once per long rest).', source: 'phb-2024', category: 'spellcasting' },
  { id: 'sorcerer.sorcery_incarnate', name: 'Sorcery Incarnate', classKey: 'sorcerer', levelGained: 7, type: 'passive', shortDescription: 'If you have no Innate Sorcery uses left, you can activate it by spending 2 Sorcery Points. While active, you can use two Metamagic options on a single spell.', source: 'phb-2024', category: 'spellcasting' },
  { id: 'warlock.contact_patron', name: 'Contact Patron', classKey: 'warlock', levelGained: 9, type: 'special', uses: { count: () => 1, recharge: 'long_rest' }, shortDescription: 'Cast Contact Other Plane without a slot to reach your patron — automatically succeed on the saving throw (1/long rest).', source: 'phb-2024', category: 'utility' },
  { id: 'wizard.memorize_spell', name: 'Memorize Spell', classKey: 'wizard', levelGained: 5, type: 'special', shortDescription: 'On a short rest, study your spellbook to swap one prepared wizard spell for another from the book.', source: 'phb-2024', category: 'spellcasting' },
]

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────

/** Features the class gains at exactly this level. */
export function getClassFeaturesAtLevel(classKey: ClassKey, level: number): ClassFeatureDetail[] {
  return CLASS_FEATURES.filter(
    (f) => f.classKey === classKey && !f.subclassKey && f.levelGained === level
  )
}

/** Features the subclass gains at exactly this level. */
export function getSubclassFeaturesAtLevel(subclassKey: SubclassKey, level: number): ClassFeatureDetail[] {
  return CLASS_FEATURES.filter((f) => f.subclassKey === subclassKey && f.levelGained === level)
}

/** All features (class + optional subclass) the character has at or below `level`. */
export function getAllFeaturesUpToLevel(
  classKey: ClassKey,
  subclassKey: SubclassKey | null,
  level: number,
): ClassFeatureDetail[] {
  return CLASS_FEATURES.filter(
    (f) =>
      ((f.classKey === classKey && !f.subclassKey) ||
        (subclassKey != null && f.subclassKey === subclassKey)) &&
      f.levelGained <= level,
  )
}

export function getFeatureById(id: string): ClassFeatureDetail | null {
  return CLASS_FEATURES.find((f) => f.id === id) ?? null
}

/** Pretty action-type label for badge rendering. */
export function formatActionType(t: ClassFeatureActionType): string {
  switch (t) {
    case 'action':       return 'Action'
    case 'bonus_action': return 'Bonus Action'
    case 'reaction':     return 'Reaction'
    case 'free':         return 'No Action'
    case 'passive':      return 'Passive'
    case 'special':      return 'Special'
  }
}

/** Pretty recharge label. */
export function formatRecharge(r: RechargeType): string {
  switch (r) {
    case 'short_rest': return 'Short Rest'
    case 'long_rest':  return 'Long Rest'
    case 'dawn':       return 'Dawn'
    case 'special':    return 'Special'
  }
}
