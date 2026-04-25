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
  | 'barbarian_extra_attack'
  | 'barbarian_fast_movement'
  | 'barbarian_feral_instinct'
  | 'barbarian_brutal_critical'
  | 'barbarian_relentless_rage'
  | 'barbarian_persistent_rage'
  | 'barbarian_indomitable_might'
  | 'barbarian_primal_champion'
  // Bard
  | 'bard_spellcasting'
  | 'bard_bardic_inspiration'
  | 'bard_jack_of_all_trades'
  | 'bard_song_of_rest'
  | 'bard_expertise'
  | 'bard_bard_college'
  | 'bard_font_of_inspiration'
  | 'bard_countercharm'
  | 'bard_magical_secrets'
  | 'bard_superior_inspiration'
  // Cleric
  | 'cleric_spellcasting'
  | 'cleric_divine_domain'
  | 'cleric_channel_divinity'
  | 'cleric_turn_undead'
  | 'cleric_destroy_undead'
  | 'cleric_divine_intervention'
  // Druid
  | 'druid_druidic'
  | 'druid_spellcasting'
  | 'druid_wild_shape'
  | 'druid_druid_circle'
  | 'druid_timeless_body'
  | 'druid_beast_spells'
  | 'druid_archdruid'
  // Fighter
  | 'fighter_fighting_style'
  | 'fighter_second_wind'
  | 'fighter_action_surge'
  | 'fighter_martial_archetype'
  | 'fighter_extra_attack'
  | 'fighter_indomitable'
  // Monk
  | 'monk_unarmored_defense'
  | 'monk_martial_arts'
  | 'monk_ki'
  | 'monk_unarmored_movement'
  | 'monk_monastic_tradition'
  | 'monk_deflect_missiles'
  | 'monk_slow_fall'
  | 'monk_extra_attack'
  | 'monk_stunning_strike'
  | 'monk_ki_empowered_strikes'
  | 'monk_evasion'
  | 'monk_stillness_of_mind'
  | 'monk_purity_of_body'
  | 'monk_tongue_of_sun_moon'
  | 'monk_diamond_soul'
  | 'monk_timeless_body'
  | 'monk_empty_body'
  | 'monk_perfect_self'
  // Paladin
  | 'paladin_divine_sense'
  | 'paladin_lay_on_hands'
  | 'paladin_fighting_style'
  | 'paladin_spellcasting'
  | 'paladin_divine_smite'
  | 'paladin_divine_health'
  | 'paladin_sacred_oath'
  | 'paladin_extra_attack'
  | 'paladin_aura_of_protection'
  | 'paladin_aura_of_courage'
  | 'paladin_improved_divine_smite'
  | 'paladin_cleansing_touch'
  // Ranger
  | 'ranger_favored_enemy'
  | 'ranger_natural_explorer'
  | 'ranger_fighting_style'
  | 'ranger_spellcasting'
  | 'ranger_primeval_awareness'
  | 'ranger_ranger_archetype'
  | 'ranger_extra_attack'
  | 'ranger_lands_stride'
  | 'ranger_hide_in_plain_sight'
  | 'ranger_vanish'
  | 'ranger_feral_senses'
  | 'ranger_foe_slayer'
  // Rogue
  | 'rogue_expertise'
  | 'rogue_sneak_attack'
  | 'rogue_thieves_cant'
  | 'rogue_cunning_action'
  | 'rogue_roguish_archetype'
  | 'rogue_uncanny_dodge'
  | 'rogue_evasion'
  | 'rogue_reliable_talent'
  | 'rogue_blindsense'
  | 'rogue_slippery_mind'
  | 'rogue_elusive'
  | 'rogue_stroke_of_luck'
  // Sorcerer
  | 'sorcerer_sorcerous_origin'
  | 'sorcerer_spellcasting'
  | 'sorcerer_font_of_magic'
  | 'sorcerer_metamagic'
  | 'sorcerer_sorcerous_restoration'
  // Warlock
  | 'warlock_otherworldly_patron'
  | 'warlock_pact_magic'
  | 'warlock_eldritch_invocations'
  | 'warlock_pact_boon'
  | 'warlock_mystic_arcanum'
  | 'warlock_eldritch_master'
  // Wizard
  | 'wizard_spellcasting'
  | 'wizard_arcane_recovery'
  | 'wizard_arcane_tradition'
  | 'wizard_spell_mastery'
  | 'wizard_signature_spells'

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
  wizard_spell_mastery: {
    key: 'wizard_spell_mastery',
    name: 'Spell Mastery',
    class: 'wizard',
    level: 18,
    sourceType: 'class',
    summary:
      'You have studied two spells so thoroughly that you can cast them at their lowest level without expending a spell slot.',
    srd: true,
  },
  wizard_signature_spells: {
    key: 'wizard_signature_spells',
    name: 'Signature Spells',
    class: 'wizard',
    level: 20,
    sourceType: 'class',
    summary:
      'You master two powerful spells and can cast each of them once per short rest without spending a spell slot.',
    srd: true,
  },

  // ---- Barbarian (levels 5–20) ----
  barbarian_extra_attack: {
    key: 'barbarian_extra_attack',
    name: 'Extra Attack',
    class: 'barbarian',
    level: 5,
    sourceType: 'class',
    summary:
      'Your combat training lets you strike more than once whenever you take the Attack action on your turn.',
    srd: true,
  },
  barbarian_fast_movement: {
    key: 'barbarian_fast_movement',
    name: 'Fast Movement',
    class: 'barbarian',
    level: 5,
    sourceType: 'class',
    summary:
      'Your speed increases by 10 feet while you are not wearing heavy armor.',
    srd: true,
  },
  barbarian_feral_instinct: {
    key: 'barbarian_feral_instinct',
    name: 'Feral Instinct',
    class: 'barbarian',
    level: 7,
    sourceType: 'class',
    summary:
      'Your instincts are so honed that you gain advantage on initiative rolls, and you can act normally on the first turn even if surprised.',
    srd: true,
  },
  barbarian_brutal_critical: {
    key: 'barbarian_brutal_critical',
    name: 'Brutal Critical',
    class: 'barbarian',
    level: 9,
    sourceType: 'class',
    summary:
      'When you score a critical hit with a melee weapon you roll one additional weapon damage die (increasing to two extra dice at level 13, three at level 17).',
    srd: true,
  },
  barbarian_relentless_rage: {
    key: 'barbarian_relentless_rage',
    name: 'Relentless Rage',
    class: 'barbarian',
    level: 11,
    sourceType: 'class',
    summary:
      'If you drop to 0 hit points while raging and don\'t die outright, you can make a DC 10 Constitution save to drop to 1 hp instead.',
    srd: true,
  },
  barbarian_persistent_rage: {
    key: 'barbarian_persistent_rage',
    name: 'Persistent Rage',
    class: 'barbarian',
    level: 15,
    sourceType: 'class',
    summary:
      'Your rage is so powerful it ends only if you fall unconscious or choose to end it — it no longer ends from lack of attacking or damage.',
    srd: true,
  },
  barbarian_indomitable_might: {
    key: 'barbarian_indomitable_might',
    name: 'Indomitable Might',
    class: 'barbarian',
    level: 18,
    sourceType: 'class',
    summary:
      'If your total for a Strength check is less than your Strength score, you can use that score in place of the total.',
    srd: true,
  },
  barbarian_primal_champion: {
    key: 'barbarian_primal_champion',
    name: 'Primal Champion',
    class: 'barbarian',
    level: 20,
    sourceType: 'class',
    summary:
      'You embody primal power: your Strength and Constitution scores each increase by 4, and their maximums rise to 24.',
    srd: true,
  },

  // ---- Bard (levels 5–20) ----
  bard_font_of_inspiration: {
    key: 'bard_font_of_inspiration',
    name: 'Font of Inspiration',
    class: 'bard',
    level: 5,
    sourceType: 'class',
    summary:
      'You regain all of your Bardic Inspiration uses after a short or long rest instead of only a long rest.',
    srd: true,
  },
  bard_countercharm: {
    key: 'bard_countercharm',
    name: 'Countercharm',
    class: 'bard',
    level: 6,
    sourceType: 'class',
    summary:
      'You can perform as an action to give nearby allies advantage on saves against being frightened or charmed, as long as you keep performing.',
    srd: true,
  },
  bard_magical_secrets: {
    key: 'bard_magical_secrets',
    name: 'Magical Secrets',
    class: 'bard',
    level: 10,
    sourceType: 'class',
    summary:
      'You plunder the magical knowledge of other classes, learning two spells from any class list. You gain additional pairs at levels 14 and 18.',
    srd: true,
  },
  bard_superior_inspiration: {
    key: 'bard_superior_inspiration',
    name: 'Superior Inspiration',
    class: 'bard',
    level: 20,
    sourceType: 'class',
    summary:
      'When you roll initiative with no Bardic Inspiration uses remaining, you regain one use immediately.',
    srd: true,
  },

  // ---- Cleric (levels 10–20) ----
  cleric_divine_intervention: {
    key: 'cleric_divine_intervention',
    name: 'Divine Intervention',
    class: 'cleric',
    level: 10,
    sourceType: 'class',
    summary:
      'You can call on your deity to intercede on your behalf. Success is based on a percentile roll equal to your cleric level; at level 20 it succeeds automatically.',
    srd: true,
  },

  // ---- Druid (levels 18–20) ----
  druid_timeless_body: {
    key: 'druid_timeless_body',
    name: 'Timeless Body',
    class: 'druid',
    level: 18,
    sourceType: 'class',
    summary:
      'The primal magic you wield causes you to age more slowly — for every 10 years that pass, your body ages only 1 year.',
    srd: true,
  },
  druid_beast_spells: {
    key: 'druid_beast_spells',
    name: 'Beast Spells',
    class: 'druid',
    level: 18,
    sourceType: 'class',
    summary:
      'You can cast many of your spells in Wild Shape form, even performing the somatic and verbal components while transformed.',
    srd: true,
  },
  druid_archdruid: {
    key: 'druid_archdruid',
    name: 'Archdruid',
    class: 'druid',
    level: 20,
    sourceType: 'class',
    summary:
      'You can use Wild Shape an unlimited number of times, and you ignore the verbal and somatic components of your druid spells.',
    srd: true,
  },

  // ---- Fighter (levels 9+) ----
  fighter_indomitable: {
    key: 'fighter_indomitable',
    name: 'Indomitable',
    class: 'fighter',
    level: 9,
    sourceType: 'class',
    summary:
      'You can reroll a saving throw you fail, using the new result. You gain additional uses at levels 13 and 17.',
    srd: true,
  },

  // ---- Monk (levels 4–20) ----
  monk_slow_fall: {
    key: 'monk_slow_fall',
    name: 'Slow Fall',
    class: 'monk',
    level: 4,
    sourceType: 'class',
    summary:
      'You can use your reaction to reduce falling damage by an amount equal to five times your monk level.',
    srd: true,
  },
  monk_extra_attack: {
    key: 'monk_extra_attack',
    name: 'Extra Attack',
    class: 'monk',
    level: 5,
    sourceType: 'class',
    summary:
      'You can attack twice whenever you take the Attack action on your turn.',
    srd: true,
  },
  monk_stunning_strike: {
    key: 'monk_stunning_strike',
    name: 'Stunning Strike',
    class: 'monk',
    level: 5,
    sourceType: 'class',
    summary:
      'When you hit with a melee weapon attack, you can spend 1 ki point to force the target to make a Constitution save or be stunned until the end of your next turn.',
    srd: true,
  },
  monk_ki_empowered_strikes: {
    key: 'monk_ki_empowered_strikes',
    name: 'Ki-Empowered Strikes',
    class: 'monk',
    level: 6,
    sourceType: 'class',
    summary:
      'Your unarmed strikes count as magical for the purpose of overcoming resistance and immunity to non-magical attacks.',
    srd: true,
  },
  monk_evasion: {
    key: 'monk_evasion',
    name: 'Evasion',
    class: 'monk',
    level: 7,
    sourceType: 'class',
    summary:
      'When an effect lets you make a Dexterity save for half damage, you take no damage on a success and only half on a failure.',
    srd: true,
  },
  monk_stillness_of_mind: {
    key: 'monk_stillness_of_mind',
    name: 'Stillness of Mind',
    class: 'monk',
    level: 7,
    sourceType: 'class',
    summary:
      'As an action you can end one effect on yourself that is causing you to be charmed or frightened.',
    srd: true,
  },
  monk_purity_of_body: {
    key: 'monk_purity_of_body',
    name: 'Purity of Body',
    class: 'monk',
    level: 10,
    sourceType: 'class',
    summary:
      'Your mastery of ki has made you immune to disease and poison.',
    srd: true,
  },
  monk_tongue_of_sun_moon: {
    key: 'monk_tongue_of_sun_moon',
    name: 'Tongue of the Sun and Moon',
    class: 'monk',
    level: 13,
    sourceType: 'class',
    summary:
      'You learn to touch the ki of other minds so that you can communicate with any creature that has a language.',
    srd: true,
  },
  monk_diamond_soul: {
    key: 'monk_diamond_soul',
    name: 'Diamond Soul',
    class: 'monk',
    level: 14, // ✅ fixed: was 13; 5e RAW = level 14
    sourceType: 'class',
    summary:
      'You gain proficiency in all saving throws. When you fail a save you can spend 1 ki point to reroll it.',
    srd: true,
  },
  monk_timeless_body: {
    key: 'monk_timeless_body',
    name: 'Timeless Body',
    class: 'monk',
    level: 15,
    sourceType: 'class',
    summary:
      'Your ki sustains you so that you no longer need food or water, and you suffer none of the frailty of old age.',
    srd: true,
  },
  monk_empty_body: {
    key: 'monk_empty_body',
    name: 'Empty Body',
    class: 'monk',
    level: 18,
    sourceType: 'class',
    summary:
      'You can spend 4 ki points to become invisible for 1 minute and gain resistance to all damage except force. You can also spend 8 ki to cast astral projection on yourself.',
    srd: true,
  },
  monk_perfect_self: {
    key: 'monk_perfect_self',
    name: 'Perfect Self',
    class: 'monk',
    level: 20,
    sourceType: 'class',
    summary:
      'When you roll initiative with no ki points remaining, you regain 4 ki points.',
    srd: true,
  },

  // ---- Paladin (levels 5–14) ----
  paladin_extra_attack: {
    key: 'paladin_extra_attack',
    name: 'Extra Attack',
    class: 'paladin',
    level: 5,
    sourceType: 'class',
    summary:
      'You can attack twice whenever you take the Attack action on your turn.',
    srd: true,
  },
  paladin_aura_of_protection: {
    key: 'paladin_aura_of_protection',
    name: 'Aura of Protection',
    class: 'paladin',
    level: 6,
    sourceType: 'class',
    summary:
      'You and friendly creatures within 10 feet add your Charisma modifier to all saving throws (expands to 30 feet at level 18).',
    srd: true,
  },
  paladin_aura_of_courage: {
    key: 'paladin_aura_of_courage',
    name: 'Aura of Courage',
    class: 'paladin',
    level: 7,
    sourceType: 'class',
    summary:
      'You and friendly creatures within 10 feet cannot be frightened while you are conscious (expands to 30 feet at level 18).',
    srd: true,
  },
  paladin_improved_divine_smite: {
    key: 'paladin_improved_divine_smite',
    name: 'Improved Divine Smite',
    class: 'paladin',
    level: 11,
    sourceType: 'class',
    summary:
      'Your melee weapon strikes are so imbued with righteous power that every hit adds an extra 1d8 radiant damage automatically.',
    srd: true,
  },
  paladin_cleansing_touch: {
    key: 'paladin_cleansing_touch',
    name: 'Cleansing Touch',
    class: 'paladin',
    level: 14,
    sourceType: 'class',
    summary:
      'As an action you can end one spell on yourself or a willing creature you touch. Uses per long rest equal your Charisma modifier.',
    srd: true,
  },

  // ---- Ranger (levels 5–20) ----
  ranger_extra_attack: {
    key: 'ranger_extra_attack',
    name: 'Extra Attack',
    class: 'ranger',
    level: 5,
    sourceType: 'class',
    summary:
      'You can attack twice whenever you take the Attack action on your turn.',
    srd: true,
  },
  ranger_lands_stride: {
    key: 'ranger_lands_stride',
    name: "Land's Stride",
    class: 'ranger',
    level: 8,
    sourceType: 'class',
    summary:
      'Moving through nonmagical difficult terrain costs no extra movement, and you have advantage on saves against magically created plants that impede movement.',
    srd: true,
  },
  ranger_hide_in_plain_sight: {
    key: 'ranger_hide_in_plain_sight',
    name: 'Hide in Plain Sight',
    class: 'ranger',
    level: 10,
    sourceType: 'class',
    summary:
      'By spending 1 minute camouflaging yourself, you can gain +10 to Stealth checks as long as you remain still.',
    srd: true,
  },
  ranger_vanish: {
    key: 'ranger_vanish',
    name: 'Vanish',
    class: 'ranger',
    level: 14,
    sourceType: 'class',
    summary:
      'You can use the Hide action as a bonus action, and you cannot be tracked by non-magical means unless you choose to leave a trail.',
    srd: true,
  },
  ranger_feral_senses: {
    key: 'ranger_feral_senses',
    name: 'Feral Senses',
    class: 'ranger',
    level: 18,
    sourceType: 'class',
    summary:
      'You gain supernatural awareness: you don\'t suffer disadvantage against invisible creatures, and you are aware of any invisible creature within 30 feet.',
    srd: true,
  },
  ranger_foe_slayer: {
    key: 'ranger_foe_slayer',
    name: 'Foe Slayer',
    class: 'ranger',
    level: 20,
    sourceType: 'class',
    summary:
      'Once per turn when you attack a favored enemy, you can add your Wisdom modifier to the attack roll or the damage roll.',
    srd: true,
  },

  // ---- Rogue (levels 3–20) ----
  rogue_roguish_archetype: {
    key: 'rogue_roguish_archetype',
    name: 'Roguish Archetype',
    class: 'rogue',
    level: 3,
    sourceType: 'class',
    summary:
      'You choose an archetype that defines your style — such as thief, assassin, or arcane trickster — granting extra features at later levels.',
    srd: true,
  },
  rogue_uncanny_dodge: {
    key: 'rogue_uncanny_dodge',
    name: 'Uncanny Dodge',
    class: 'rogue',
    level: 5,
    sourceType: 'class',
    summary:
      'When an attacker you can see hits you, you can use your reaction to halve the damage.',
    srd: true,
  },
  rogue_evasion: {
    key: 'rogue_evasion',
    name: 'Evasion',
    class: 'rogue',
    level: 7,
    sourceType: 'class',
    summary:
      'When an effect lets you make a Dexterity save for half damage, you take no damage on a success and only half on a failure.',
    srd: true,
  },
  rogue_reliable_talent: {
    key: 'rogue_reliable_talent',
    name: 'Reliable Talent',
    class: 'rogue',
    level: 11,
    sourceType: 'class',
    summary:
      'Whenever you make an ability check using a skill or tool you are proficient in, a roll of 9 or lower counts as a 10.',
    srd: true,
  },
  rogue_blindsense: {
    key: 'rogue_blindsense',
    name: 'Blindsense',
    class: 'rogue',
    level: 14,
    sourceType: 'class',
    summary:
      'If you can hear, you are aware of the location of any hidden or invisible creature within 10 feet of you.',
    srd: true,
  },
  rogue_slippery_mind: {
    key: 'rogue_slippery_mind',
    name: 'Slippery Mind',
    class: 'rogue',
    level: 15,
    sourceType: 'class',
    summary:
      'Your sharp wits extend to mental fortitude — you gain proficiency in Wisdom saving throws.',
    srd: true,
  },
  rogue_elusive: {
    key: 'rogue_elusive',
    name: 'Elusive',
    class: 'rogue',
    level: 18,
    sourceType: 'class',
    summary:
      'You are so hard to pin down that no attack roll gains advantage against you as long as you aren\'t incapacitated.',
    srd: true,
  },
  rogue_stroke_of_luck: {
    key: 'rogue_stroke_of_luck',
    name: 'Stroke of Luck',
    class: 'rogue',
    level: 20,
    sourceType: 'class',
    summary:
      'If your attack misses a target within range, you can turn the miss into a hit. Or if you fail an ability check, you can treat the d20 roll as a 20. Recharges on a short or long rest.',
    srd: true,
  },

  // ---- Sorcerer (level 20) ----
  sorcerer_sorcerous_restoration: {
    key: 'sorcerer_sorcerous_restoration',
    name: 'Sorcerous Restoration',
    class: 'sorcerer',
    level: 20,
    sourceType: 'class',
    summary:
      'You regain 4 expended sorcery points whenever you finish a short rest.',
    srd: true,
  },

  // ---- Warlock (levels 11–20) ----
  warlock_mystic_arcanum: {
    key: 'warlock_mystic_arcanum',
    name: 'Mystic Arcanum',
    class: 'warlock',
    level: 11,
    sourceType: 'class',
    summary:
      'Your patron bestows a powerful secret: you gain one 6th-level spell you can cast once per long rest without a spell slot. You gain 7th-, 8th-, and 9th-level arcana at levels 13, 15, and 17.',
    srd: true,
  },
  warlock_eldritch_master: {
    key: 'warlock_eldritch_master',
    name: 'Eldritch Master',
    class: 'warlock',
    level: 20,
    sourceType: 'class',
    summary:
      'You can spend 1 minute entreating your patron to regain all expended Pact Magic spell slots. Usable once per long rest.',
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
