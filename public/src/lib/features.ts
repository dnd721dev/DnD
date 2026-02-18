// src/lib/features.ts
// SRD-style feature library for DND721.
// Focused on core class features (levels 1–5) with short, original summaries.
// Full rules are still referenced from the actual 5e books / SRD.

import type { ClassKey, SubclassKey } from './subclasses'

export type FeatureSourceType = 'class' | 'subclass' | 'race' | 'background' | 'feat'

export type FeatureKey =
  // Barbarian
  | 'barbarian_rage'
  | 'barbarian_unarmored_defense'
  | 'barbarian_reckless_attack'
  | 'barbarian_danger_sense'
  | 'barbarian_primal_path'
  // Bard
  | 'bard_spellcasting'
  | 'bard_bardic_inspiration'
  | 'bard_jack_of_all_trades'
  | 'bard_song_of_rest'
  | 'bard_expertise'
  | 'bard_bard_college'
  // Cleric
  | 'cleric_spellcasting'
  | 'cleric_divine_domain'
  | 'cleric_channel_divinity'
  | 'cleric_turn_undead'
  | 'cleric_destroy_undead'
  // Druid
  | 'druid_druidic'
  | 'druid_spellcasting'
  | 'druid_wild_shape'
  | 'druid_druid_circle'
  // Fighter
  | 'fighter_fighting_style'
  | 'fighter_second_wind'
  | 'fighter_action_surge'
  | 'fighter_martial_archetype'
  | 'fighter_extra_attack'
  // Monk
  | 'monk_unarmored_defense'
  | 'monk_martial_arts'
  | 'monk_ki'
  | 'monk_unarmored_movement'
  | 'monk_monastic_tradition'
  | 'monk_deflect_missiles'
  // Paladin
  | 'paladin_divine_sense'
  | 'paladin_lay_on_hands'
  | 'paladin_fighting_style'
  | 'paladin_spellcasting'
  | 'paladin_divine_smite'
  | 'paladin_divine_health'
  | 'paladin_sacred_oath'
  // Ranger
  | 'ranger_favored_enemy'
  | 'ranger_natural_explorer'
  | 'ranger_fighting_style'
  | 'ranger_spellcasting'
  | 'ranger_primeval_awareness'
  | 'ranger_ranger_archetype'
  // Rogue
  | 'rogue_expertise'
  | 'rogue_sneak_attack'
  | 'rogue_thieves_cant'
  | 'rogue_cunning_action'
  // Sorcerer
  | 'sorcerer_sorcerous_origin'
  | 'sorcerer_spellcasting'
  | 'sorcerer_font_of_magic'
  | 'sorcerer_metamagic'
  // Warlock
  | 'warlock_otherworldly_patron'
  | 'warlock_pact_magic'
  | 'warlock_eldritch_invocations'
  | 'warlock_pact_boon'
  // Wizard
  | 'wizard_spellcasting'
  | 'wizard_arcane_recovery'
  | 'wizard_arcane_tradition'

export type Feature = {
  key: FeatureKey
  /** Short display name, e.g. "Second Wind" */
  name: string
  /** Which class this feature belongs to (if class-based). */
  class?: ClassKey
  /** Which subclass this feature belongs to (if subclass-based). */
  subclass?: SubclassKey
  /** Level the feature is gained at for that class/subclass. */
  level: number
  /** Broad source category (class, subclass, race, etc.). */
  sourceType: FeatureSourceType
  /** Short, SRD-style/original summary – NOT full rules text. */
  summary: string
  /** True when this is roughly mirrored by the 5e SRD. */
  srd: boolean
}

/**
 * Core SRD-ish class features, paraphrased.
 * These are *reminder text* only – players still reference the actual rules in their books/D&D Beyond.
 */
export const FEATURES: Record<FeatureKey, Feature> = {
  // ----------------- Barbarian -----------------
  barbarian_rage: {
    key: 'barbarian_rage',
    name: 'Rage',
    class: 'barbarian',
    level: 1,
    sourceType: 'class',
    summary:
      'You can fall into a battle trance that lets you hit harder and shake off some physical harm for a short time.',
    srd: true,
  },
  barbarian_unarmored_defense: {
    key: 'barbarian_unarmored_defense',
    name: 'Unarmored Defense',
    class: 'barbarian',
    level: 1,
    sourceType: 'class',
    summary:
      'When not wearing armor, your toughness and reflexes combine to make you harder to hit than normal.',
    srd: true,
  },
  barbarian_reckless_attack: {
    key: 'barbarian_reckless_attack',
    name: 'Reckless Attack',
    class: 'barbarian',
    level: 2,
    sourceType: 'class',
    summary:
      'You can throw caution aside for one attack, making it easier to hit but also easier for enemies to hit you.',
    srd: true,
  },
  barbarian_danger_sense: {
    key: 'barbarian_danger_sense',
    name: 'Danger Sense',
    class: 'barbarian',
    level: 2,
    sourceType: 'class',
    summary:
      'You gain an uncanny sense for incoming hazards, helping you dodge effects like traps and area spells.',
    srd: true,
  },
  barbarian_primal_path: {
    key: 'barbarian_primal_path',
    name: 'Primal Path',
    class: 'barbarian',
    level: 3,
    sourceType: 'class',
    summary:
      'You choose a path that shapes the source of your rage, granting extra features at later levels.',
    srd: true,
  },

  // ----------------- Bard -----------------
  bard_spellcasting: {
    key: 'bard_spellcasting',
    name: 'Spellcasting',
    class: 'bard',
    level: 1,
    sourceType: 'class',
    summary:
      'You learn and cast spells fueled by your performance and talent, using Charisma as your spellcasting ability.',
    srd: true,
  },
  bard_bardic_inspiration: {
    key: 'bard_bardic_inspiration',
    name: 'Bardic Inspiration',
    class: 'bard',
    level: 1,
    sourceType: 'class',
    summary:
      'With a word or tune you inspire others, letting them add an extra die to key rolls a limited number of times per rest.',
    srd: true,
  },
  bard_jack_of_all_trades: {
    key: 'bard_jack_of_all_trades',
    name: 'Jack of All Trades',
    class: 'bard',
    level: 2,
    sourceType: 'class',
    summary:
      'You are broadly skilled, gaining a small bonus to ability checks where you lack full proficiency.',
    srd: true,
  },
  bard_song_of_rest: {
    key: 'bard_song_of_rest',
    name: 'Song of Rest',
    class: 'bard',
    level: 2,
    sourceType: 'class',
    summary:
      'During a short rest you can soothe allies with music or words so they regain a bit of extra healing.',
    srd: true,
  },
  bard_expertise: {
    key: 'bard_expertise',
    name: 'Expertise',
    class: 'bard',
    level: 3,
    sourceType: 'class',
    summary:
      'You double your proficiency bonus for a couple of your best skills, representing focused training.',
    srd: true,
  },
  bard_bard_college: {
    key: 'bard_bard_college',
    name: 'Bard College',
    class: 'bard',
    level: 3,
    sourceType: 'class',
    summary:
      'You join a college that defines your style of magic and performance, granting extra features at later levels.',
    srd: true,
  },

  // ----------------- Cleric -----------------
  cleric_spellcasting: {
    key: 'cleric_spellcasting',
    name: 'Spellcasting',
    class: 'cleric',
    level: 1,
    sourceType: 'class',
    summary:
      'You prepare and cast divine spells granted by your deity or faith, using Wisdom as your spellcasting ability.',
    srd: true,
  },
  cleric_divine_domain: {
    key: 'cleric_divine_domain',
    name: 'Divine Domain',
    class: 'cleric',
    level: 1,
    sourceType: 'class',
    summary:
      'You choose a domain tied to your deity’s portfolio, which grants extra spells and themed powers.',
    srd: true,
  },
  cleric_channel_divinity: {
    key: 'cleric_channel_divinity',
    name: 'Channel Divinity',
    class: 'cleric',
    level: 2,
    sourceType: 'class',
    summary:
      'You can focus divine energy into powerful effects, including your domain’s unique option.',
    srd: true,
  },
  cleric_turn_undead: {
    key: 'cleric_turn_undead',
    name: 'Turn Undead',
    class: 'cleric',
    level: 2,
    sourceType: 'class',
    summary:
      'You present holy power to drive undead away from you, forcing them to flee if they fail a saving throw.',
    srd: true,
  },
  cleric_destroy_undead: {
    key: 'cleric_destroy_undead',
    name: 'Destroy Undead',
    class: 'cleric',
    level: 5,
    sourceType: 'class',
    summary:
      'Your turning power becomes strong enough to outright destroy weaker undead when you turn them.',
    srd: true,
  },

  // ----------------- Druid -----------------
  druid_druidic: {
    key: 'druid_druidic',
    name: 'Druidic',
    class: 'druid',
    level: 1,
    sourceType: 'class',
    summary:
      'You know the secret speech of druids, a hidden language used to pass messages and warnings.',
    srd: true,
  },
  druid_spellcasting: {
    key: 'druid_spellcasting',
    name: 'Spellcasting',
    class: 'druid',
    level: 1,
    sourceType: 'class',
    summary:
      'You draw spell power from the natural world, preparing and casting druid spells using Wisdom.',
    srd: true,
  },
  druid_wild_shape: {
    key: 'druid_wild_shape',
    name: 'Wild Shape',
    class: 'druid',
    level: 2,
    sourceType: 'class',
    summary:
      'You can transform into beasts you have seen, gaining their physical form for a limited time.',
    srd: true,
  },
  druid_druid_circle: {
    key: 'druid_druid_circle',
    name: 'Druid Circle',
    class: 'druid',
    level: 2,
    sourceType: 'class',
    summary:
      'You join a circle that defines how you channel nature’s power, providing extra features at later levels.',
    srd: true,
  },

  // ----------------- Fighter -----------------
  fighter_fighting_style: {
    key: 'fighter_fighting_style',
    name: 'Fighting Style',
    class: 'fighter',
    level: 1,
    sourceType: 'class',
    summary:
      'You commit to a particular combat style, like archery or defense, gaining a small but reliable combat bonus.',
    srd: true,
  },
  fighter_second_wind: {
    key: 'fighter_second_wind',
    name: 'Second Wind',
    class: 'fighter',
    level: 1,
    sourceType: 'class',
    summary:
      'In the thick of battle you can briefly rally, restoring a small amount of your own health.',
    srd: true,
  },
  fighter_action_surge: {
    key: 'fighter_action_surge',
    name: 'Action Surge',
    class: 'fighter',
    level: 2,
    sourceType: 'class',
    summary:
      'You can push yourself past your limits to take an extra burst of action on your turn.',
    srd: true,
  },
  fighter_martial_archetype: {
    key: 'fighter_martial_archetype',
    name: 'Martial Archetype',
    class: 'fighter',
    level: 3,
    sourceType: 'class',
    summary:
      'You choose a style of warrior training—such as a champion or battle master—that grants extra features.',
    srd: true,
  },
  fighter_extra_attack: {
    key: 'fighter_extra_attack',
    name: 'Extra Attack',
    class: 'fighter',
    level: 5,
    sourceType: 'class',
    summary:
      'Your combat training allows you to make more than one weapon attack when you take the Attack action.',
    srd: true,
  },

  // ----------------- Monk -----------------
  monk_unarmored_defense: {
    key: 'monk_unarmored_defense',
    name: 'Unarmored Defense',
    class: 'monk',
    level: 1,
    sourceType: 'class',
    summary:
      'When not armored or shielded, your agility and discipline protect you better than simple armor.',
    srd: true,
  },
  monk_martial_arts: {
    key: 'monk_martial_arts',
    name: 'Martial Arts',
    class: 'monk',
    level: 1,
    sourceType: 'class',
    summary:
      'You fight with trained strikes and kicks, using Dexterity and special rules for unarmed blows and monk weapons.',
    srd: true,
  },
  monk_ki: {
    key: 'monk_ki',
    name: 'Ki',
    class: 'monk',
    level: 2,
    sourceType: 'class',
    summary:
      'You learn to harness inner energy for bursts of speed, flurries of blows, and defensive focus.',
    srd: true,
  },
  monk_unarmored_movement: {
    key: 'monk_unarmored_movement',
    name: 'Unarmored Movement',
    class: 'monk',
    level: 2,
    sourceType: 'class',
    summary:
      'Your training makes you unnaturally fast while not wearing armor or carrying heavy loads.',
    srd: true,
  },
  monk_monastic_tradition: {
    key: 'monk_monastic_tradition',
    name: 'Monastic Tradition',
    class: 'monk',
    level: 3,
    sourceType: 'class',
    summary:
      'You choose a monastery’s tradition, shaping how you spend ki and what stunts you can perform.',
    srd: true,
  },
  monk_deflect_missiles: {
    key: 'monk_deflect_missiles',
    name: 'Deflect Missiles',
    class: 'monk',
    level: 3,
    sourceType: 'class',
    summary:
      'You can use your reaction to lessen or even catch incoming ranged weapon attacks.',
    srd: true,
  },

  // ----------------- Paladin -----------------
  paladin_divine_sense: {
    key: 'paladin_divine_sense',
    name: 'Divine Sense',
    class: 'paladin',
    level: 1,
    sourceType: 'class',
    summary:
      'You briefly open your awareness to detect the presence of strongly holy or unholy forces nearby.',
    srd: true,
  },
  paladin_lay_on_hands: {
    key: 'paladin_lay_on_hands',
    name: 'Lay on Hands',
    class: 'paladin',
    level: 1,
    sourceType: 'class',
    summary:
      'You carry a pool of healing that you can share through touch to mend wounds or cure certain ailments.',
    srd: true,
  },
  paladin_fighting_style: {
    key: 'paladin_fighting_style',
    name: 'Fighting Style',
    class: 'paladin',
    level: 2,
    sourceType: 'class',
    summary:
      'You adopt a combat style suited to holy warriors, gaining a small but steady bonus in fights.',
    srd: true,
  },
  paladin_spellcasting: {
    key: 'paladin_spellcasting',
    name: 'Spellcasting',
    class: 'paladin',
    level: 2,
    sourceType: 'class',
    summary:
      'Your oath grants you access to divine spells that support your role as a frontline holy warrior.',
    srd: true,
  },
  paladin_divine_smite: {
    key: 'paladin_divine_smite',
    name: 'Divine Smite',
    class: 'paladin',
    level: 2,
    sourceType: 'class',
    summary:
      'When you strike with a melee weapon, you can expend a spell slot to channel radiant power into the blow.',
    srd: true,
  },
  paladin_divine_health: {
    key: 'paladin_divine_health',
    name: 'Divine Health',
    class: 'paladin',
    level: 3,
    sourceType: 'class',
    summary:
      'Your sacred oath protects your body from mundane diseases.',
    srd: true,
  },
  paladin_sacred_oath: {
    key: 'paladin_sacred_oath',
    name: 'Sacred Oath',
    class: 'paladin',
    level: 3,
    sourceType: 'class',
    summary:
      'You swear a formal oath that defines your paladin path, unlocking extra powers and spells.',
    srd: true,
  },

  // ----------------- Ranger -----------------
  ranger_favored_enemy: {
    key: 'ranger_favored_enemy',
    name: 'Favored Enemy',
    class: 'ranger',
    level: 1,
    sourceType: 'class',
    summary:
      'You choose one or more categories of foes you know well, gaining small perks when tracking or recalling lore about them.',
    srd: true,
  },
  ranger_natural_explorer: {
    key: 'ranger_natural_explorer',
    name: 'Natural Explorer',
    class: 'ranger',
    level: 1,
    sourceType: 'class',
    summary:
      'You are at home in certain terrains, moving and guiding your group more effectively there.',
    srd: true,
  },
  ranger_fighting_style: {
    key: 'ranger_fighting_style',
    name: 'Fighting Style',
    class: 'ranger',
    level: 2,
    sourceType: 'class',
    summary:
      'You choose a combat style tailored to hunters and skirmishers, such as archery or two-weapon fighting.',
    srd: true,
  },
  ranger_spellcasting: {
    key: 'ranger_spellcasting',
    name: 'Spellcasting',
    class: 'ranger',
    level: 2,
    sourceType: 'class',
    summary:
      'You learn a limited number of nature-themed spells that support scouting and combat.',
    srd: true,
  },
  ranger_primeval_awareness: {
    key: 'ranger_primeval_awareness',
    name: 'Primeval Awareness',
    class: 'ranger',
    level: 3,
    sourceType: 'class',
    summary:
      'You can focus to sense if certain powerful creature types are present in the area.',
    srd: true,
  },
  ranger_ranger_archetype: {
    key: 'ranger_ranger_archetype',
    name: 'Ranger Archetype',
    class: 'ranger',
    level: 3,
    sourceType: 'class',
    summary:
      'You adopt an archetype, such as a hunter or beast master, that grants more abilities as you advance.',
    srd: true,
  },

  // ----------------- Rogue -----------------
  rogue_expertise: {
    key: 'rogue_expertise',
    name: 'Expertise',
    class: 'rogue',
    level: 1,
    sourceType: 'class',
    summary:
      'You choose skills or tools where your training is exceptional, doubling your proficiency bonus.',
    srd: true,
  },
  rogue_sneak_attack: {
    key: 'rogue_sneak_attack',
    name: 'Sneak Attack',
    class: 'rogue',
    level: 1,
    sourceType: 'class',
    summary:
      'Once per turn you deal extra damage to a creature you catch off guard or fight alongside an ally.',
    srd: true,
  },
  rogue_thieves_cant: {
    key: 'rogue_thieves_cant',
    name: 'Thieves’ Cant',
    class: 'rogue',
    level: 1,
    sourceType: 'class',
    summary:
      'You know a hidden jargon of symbols and phrases used by rogues to pass hidden messages.',
    srd: true,
  },
  rogue_cunning_action: {
    key: 'rogue_cunning_action',
    name: 'Cunning Action',
    class: 'rogue',
    level: 2,
    sourceType: 'class',
    summary:
      'Your reflexes let you use your bonus action for things like dashing, dodging away, or hiding.',
    srd: true,
  },

  // ----------------- Sorcerer -----------------
  sorcerer_sorcerous_origin: {
    key: 'sorcerer_sorcerous_origin',
    name: 'Sorcerous Origin',
    class: 'sorcerer',
    level: 1,
    sourceType: 'class',
    summary:
      'You choose a source of innate magic—such as draconic blood or wild magic—that shapes your powers.',
    srd: true,
  },
  sorcerer_spellcasting: {
    key: 'sorcerer_spellcasting',
    name: 'Spellcasting',
    class: 'sorcerer',
    level: 1,
    sourceType: 'class',
    summary:
      'You cast spells from a list of known spells, using Charisma and a flexible pool of spell slots.',
    srd: true,
  },
  sorcerer_font_of_magic: {
    key: 'sorcerer_font_of_magic',
    name: 'Font of Magic',
    class: 'sorcerer',
    level: 2,
    sourceType: 'class',
    summary:
      'You gain sorcery points you can turn into spell slots or spend on other sorcerer options.',
    srd: true,
  },
  sorcerer_metamagic: {
    key: 'sorcerer_metamagic',
    name: 'Metamagic',
    class: 'sorcerer',
    level: 3,
    sourceType: 'class',
    summary:
      'You twist spells in special ways—extending range, reshaping area, or altering casting speed.',
    srd: true,
  },

  // ----------------- Warlock -----------------
  warlock_otherworldly_patron: {
    key: 'warlock_otherworldly_patron',
    name: 'Otherworldly Patron',
    class: 'warlock',
    level: 1,
    sourceType: 'class',
    summary:
      'You forge a pact with a powerful being beyond the world, which grants unique features and spells.',
    srd: true,
  },
  warlock_pact_magic: {
    key: 'warlock_pact_magic',
    name: 'Pact Magic',
    class: 'warlock',
    level: 1,
    sourceType: 'class',
    summary:
      'You use a compact, quickly refreshing spell slot system tied to your patron’s magic.',
    srd: true,
  },
  warlock_eldritch_invocations: {
    key: 'warlock_eldritch_invocations',
    name: 'Eldritch Invocations',
    class: 'warlock',
    level: 2,
    sourceType: 'class',
    summary:
      'You gain permanent magical tricks that customize how your warlock powers function.',
    srd: true,
  },
  warlock_pact_boon: {
    key: 'warlock_pact_boon',
    name: 'Pact Boon',
    class: 'warlock',
    level: 3,
    sourceType: 'class',
    summary:
      'Your patron grants a signature boon such as a familiar, weapon, or grimoire that shapes your style.',
    srd: true,
  },

  // ----------------- Wizard -----------------
  wizard_spellcasting: {
    key: 'wizard_spellcasting',
    name: 'Spellcasting',
    class: 'wizard',
    level: 1,
    sourceType: 'class',
    summary:
      'You learn and prepare spells from a spellbook, using Intelligence to power your arcane magic.',
    srd: true,
  },
  wizard_arcane_recovery: {
    key: 'wizard_arcane_recovery',
    name: 'Arcane Recovery',
    class: 'wizard',
    level: 1,
    sourceType: 'class',
    summary:
      'After a short rest you can reclaim a small amount of expended spell power.',
    srd: true,
  },
  wizard_arcane_tradition: {
    key: 'wizard_arcane_tradition',
    name: 'Arcane Tradition',
    class: 'wizard',
    level: 2,
    sourceType: 'class',
    summary:
      'You specialize in a school of magic, gaining benefits that support that type of spellcasting.',
    srd: true,
  },
}

// ----------------- Helpers -----------------

/**
 * Get all class features a character should have at a given level.
 * This does not include subclass features – those are handled separately.
 */
export function getClassFeaturesForLevel(
  classKey: ClassKey,
  level: number
): Feature[] {
  return Object.values(FEATURES).filter(
    (f) =>
      f.sourceType === 'class' &&
      f.class === classKey &&
      f.level <= level
  )
}

/**
 * If you later add explicit subclass-based feature entries into FEATURES
 * (with sourceType: 'subclass' and a defined `subclass`),
 * you can use this to pull them:
 */
export function getSubclassFeaturesForLevel(
  subclassKey: SubclassKey,
  level: number
): Feature[] {
  return Object.values(FEATURES).filter(
    (f) =>
      f.sourceType === 'subclass' &&
      f.subclass === subclassKey &&
      f.level <= level
  )
}
