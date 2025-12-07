// src/lib/subclasses.ts
// Central library for DND721 subclasses so the character builder stays lean.

// ---------------------------------------------
// Base classes (includes Artificer)
// ---------------------------------------------

export type ClassKey =
  | 'barbarian'
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'fighter'
  | 'monk'
  | 'paladin'
  | 'ranger'
  | 'rogue'
  | 'sorcerer'
  | 'warlock'
  | 'wizard'
  | 'artificer'

// ---------------------------------------------
// All official 5e subclasses, encoded as keys
// (names only, no rules text)
// ---------------------------------------------

export type SubclassKey =
  // Barbarian
  | 'barbarian_berserker'
  | 'barbarian_totem_warrior'
  | 'barbarian_ancestral_guardian'
  | 'barbarian_storm_herald'
  | 'barbarian_zealot'
  | 'barbarian_beast'
  | 'barbarian_wild_magic'
  | 'barbarian_world_tree'
  | 'barbarian_battlerager'
  | 'barbarian_giant'
  // Bard
  | 'bard_lore'
  | 'bard_valor'
  | 'bard_glamour'
  | 'bard_swords'
  | 'bard_whispers'
  | 'bard_creation'
  | 'bard_eloquence'
  | 'bard_dance'
  | 'bard_spirits'
  | 'bard_moon'
  // Cleric
  | 'cleric_knowledge'
  | 'cleric_life'
  | 'cleric_light'
  | 'cleric_nature'
  | 'cleric_tempest'
  | 'cleric_trickery'
  | 'cleric_war'
  | 'cleric_forge'
  | 'cleric_grave'
  | 'cleric_order'
  | 'cleric_peace'
  | 'cleric_twilight'
  | 'cleric_arcana'
  | 'cleric_death'
  // Druid
  | 'druid_land'
  | 'druid_moon'
  | 'druid_dreams'
  | 'druid_shepherd'
  | 'druid_spores'
  | 'druid_stars'
  | 'druid_wildfire'
  | 'druid_sea'
  // Fighter
  | 'fighter_battle_master'
  | 'fighter_champion'
  | 'fighter_eldritch_knight'
  | 'fighter_arcane_archer'
  | 'fighter_cavalier'
  | 'fighter_samurai'
  | 'fighter_psi_warrior'
  | 'fighter_rune_knight'
  | 'fighter_echo_knight'
  | 'fighter_purple_dragon_knight'
  // Monk
  | 'monk_open_hand'
  | 'monk_shadow'
  | 'monk_four_elements'
  | 'monk_drunken_master'
  | 'monk_kensei'
  | 'monk_sun_soul'
  | 'monk_astral_self'
  | 'monk_mercy'
  | 'monk_long_death'
  | 'monk_ascendent_dragon'
  // Paladin
  | 'paladin_ancients'
  | 'paladin_devotion'
  | 'paladin_vengeance'
  | 'paladin_conquest'
  | 'paladin_redemption'
  | 'paladin_glory'
  | 'paladin_watchers'
  | 'paladin_crown'
  | 'paladin_noble_genies'
  | 'paladin_oathbreaker'
  // Ranger
  | 'ranger_beast_master'
  | 'ranger_hunter'
  | 'ranger_gloom_stalker'
  | 'ranger_horizon_walker'
  | 'ranger_monster_slayer'
  | 'ranger_fey_wanderer'
  | 'ranger_swarmkeeper'
  | 'ranger_drakewarden'
  | 'ranger_winter_walker'
  // Rogue
  | 'rogue_assassin'
  | 'rogue_arcane_trickster'
  | 'rogue_thief'
  | 'rogue_inquisitive'
  | 'rogue_mastermind'
  | 'rogue_scout'
  | 'rogue_swashbuckler'
  | 'rogue_phantom'
  | 'rogue_soulknife'
  | 'rogue_scion_of_the_three'
  // Sorcerer
  | 'sorcerer_draconic_bloodline'
  | 'sorcerer_wild_magic'
  | 'sorcerer_divine_soul'
  | 'sorcerer_shadow_magic'
  | 'sorcerer_storm_sorcery'
  | 'sorcerer_aberrant_mind'
  | 'sorcerer_clockwork_soul'
  | 'sorcerer_spellfire'
  // Warlock
  | 'warlock_archfey'
  | 'warlock_fiend'
  | 'warlock_great_old_one'
  | 'warlock_celestial'
  | 'warlock_hexblade'
  | 'warlock_fathomless'
  | 'warlock_genie'
  | 'warlock_undying'
  | 'warlock_undead'
  // Wizard
  | 'wizard_abjuration'
  | 'wizard_conjuration'
  | 'wizard_divination'
  | 'wizard_enchantment'
  | 'wizard_evocation'
  | 'wizard_illusion'
  | 'wizard_necromancy'
  | 'wizard_transmutation'
  | 'wizard_war_magic'
  | 'wizard_bladesinger'
  | 'wizard_order_of_scribes'
  | 'wizard_chronurgy'
  | 'wizard_graviturgy'
  // Artificer
  | 'artificer_alchemist'
  | 'artificer_armorer'
  | 'artificer_artillerist'
  | 'artificer_battle_smith'

// ---------------------------------------------
// Options used by the UI
// ---------------------------------------------

export type SubclassOption = {
  key: SubclassKey
  label: string
  /** Optional: which book it came from, for display only */
  source?:
    | 'PHB'
    | 'XGtE'
    | 'TCoE'
    | 'SCAG'
    | 'DMG'
    | 'EGtW'
    | 'Ravnica'
    | 'Theros'
    | 'Ravenloft'
    | 'Fizban'
    | 'Bigby'
    | 'Eberron'
    | 'Other'
}

// ---------------------------------------------
// Subclasses per class
// (names only; rules are in your books)
// ---------------------------------------------

export const CLASS_SUBCLASSES: Record<ClassKey, SubclassOption[]> = {
  // ----------------- Barbarian -----------------
  barbarian: [
    { key: 'barbarian_berserker', label: 'Path of the Berserker', source: 'PHB' },
    { key: 'barbarian_totem_warrior', label: 'Path of the Totem Warrior', source: 'PHB' },
    { key: 'barbarian_ancestral_guardian', label: 'Path of the Ancestral Guardian', source: 'XGtE' },
    { key: 'barbarian_storm_herald', label: 'Path of the Storm Herald', source: 'XGtE' },
    { key: 'barbarian_zealot', label: 'Path of the Zealot', source: 'XGtE' },
    { key: 'barbarian_beast', label: 'Path of the Beast', source: 'TCoE' },
    { key: 'barbarian_wild_magic', label: 'Path of Wild Magic', source: 'TCoE' },
    { key: 'barbarian_world_tree', label: 'Path of the World Tree', source: 'PHB' },
    { key: 'barbarian_battlerager', label: 'Path of the Battlerager', source: 'SCAG' },
    { key: 'barbarian_giant', label: 'Path of the Giant', source: 'Bigby' },
  ],

  // ----------------- Bard -----------------
  bard: [
    { key: 'bard_lore', label: 'College of Lore', source: 'PHB' },
    { key: 'bard_valor', label: 'College of Valor', source: 'PHB' },
    { key: 'bard_glamour', label: 'College of Glamour', source: 'XGtE' },
    { key: 'bard_swords', label: 'College of Swords', source: 'XGtE' },
    { key: 'bard_whispers', label: 'College of Whispers', source: 'XGtE' },
    { key: 'bard_creation', label: 'College of Creation', source: 'TCoE' },
    { key: 'bard_eloquence', label: 'College of Eloquence', source: 'TCoE' },
    { key: 'bard_dance', label: 'College of Dance', source: 'PHB' },
    { key: 'bard_spirits', label: 'College of Spirits', source: 'Ravenloft' },
    { key: 'bard_moon', label: 'College of the Moon', source: 'Other' },
  ],

  // ----------------- Cleric -----------------
  cleric: [
    { key: 'cleric_knowledge', label: 'Knowledge Domain', source: 'PHB' },
    { key: 'cleric_life', label: 'Life Domain', source: 'PHB' },
    { key: 'cleric_light', label: 'Light Domain', source: 'PHB' },
    { key: 'cleric_nature', label: 'Nature Domain', source: 'PHB' },
    { key: 'cleric_tempest', label: 'Tempest Domain', source: 'PHB' },
    { key: 'cleric_trickery', label: 'Trickery Domain', source: 'PHB' },
    { key: 'cleric_war', label: 'War Domain', source: 'PHB' },
    { key: 'cleric_forge', label: 'Forge Domain', source: 'XGtE' },
    { key: 'cleric_grave', label: 'Grave Domain', source: 'XGtE' },
    { key: 'cleric_order', label: 'Order Domain', source: 'TCoE' },
    { key: 'cleric_peace', label: 'Peace Domain', source: 'TCoE' },
    { key: 'cleric_twilight', label: 'Twilight Domain', source: 'TCoE' },
    { key: 'cleric_arcana', label: 'Arcana Domain', source: 'SCAG' },
    { key: 'cleric_death', label: 'Death Domain', source: 'DMG' },
  ],

  // ----------------- Druid -----------------
  druid: [
    { key: 'druid_land', label: 'Circle of the Land', source: 'PHB' },
    { key: 'druid_moon', label: 'Circle of the Moon', source: 'PHB' },
    { key: 'druid_dreams', label: 'Circle of Dreams', source: 'XGtE' },
    { key: 'druid_shepherd', label: 'Circle of the Shepherd', source: 'XGtE' },
    { key: 'druid_spores', label: 'Circle of Spores', source: 'Ravnica' },
    { key: 'druid_stars', label: 'Circle of Stars', source: 'TCoE' },
    { key: 'druid_wildfire', label: 'Circle of Wildfire', source: 'TCoE' },
    { key: 'druid_sea', label: 'Circle of the Sea', source: 'Other' },
  ],

  // ----------------- Fighter -----------------
  fighter: [
    { key: 'fighter_battle_master', label: 'Battle Master', source: 'PHB' },
    { key: 'fighter_champion', label: 'Champion', source: 'PHB' },
    { key: 'fighter_eldritch_knight', label: 'Eldritch Knight', source: 'PHB' },
    { key: 'fighter_arcane_archer', label: 'Arcane Archer', source: 'XGtE' },
    { key: 'fighter_cavalier', label: 'Cavalier', source: 'XGtE' },
    { key: 'fighter_samurai', label: 'Samurai', source: 'XGtE' },
    { key: 'fighter_psi_warrior', label: 'Psi Warrior', source: 'TCoE' },
    { key: 'fighter_rune_knight', label: 'Rune Knight', source: 'TCoE' },
    { key: 'fighter_echo_knight', label: 'Echo Knight', source: 'EGtW' },
    { key: 'fighter_purple_dragon_knight', label: 'Purple Dragon Knight', source: 'SCAG' },
  ],

  // ----------------- Monk -----------------
  monk: [
    { key: 'monk_open_hand', label: 'Way of the Open Hand', source: 'PHB' },
    { key: 'monk_shadow', label: 'Way of Shadow', source: 'PHB' },
    { key: 'monk_four_elements', label: 'Way of the Four Elements', source: 'PHB' },
    { key: 'monk_drunken_master', label: 'Way of the Drunken Master', source: 'XGtE' },
    { key: 'monk_kensei', label: 'Way of the Kensei', source: 'XGtE' },
    { key: 'monk_sun_soul', label: 'Way of the Sun Soul', source: 'SCAG' },
    { key: 'monk_astral_self', label: 'Way of the Astral Self', source: 'TCoE' },
    { key: 'monk_mercy', label: 'Way of Mercy', source: 'TCoE' },
    { key: 'monk_long_death', label: 'Way of the Long Death', source: 'SCAG' },
    { key: 'monk_ascendent_dragon', label: 'Way of the Ascendant Dragon', source: 'Other' },
  ],

  // ----------------- Paladin -----------------
  paladin: [
    { key: 'paladin_ancients', label: 'Oath of the Ancients', source: 'PHB' },
    { key: 'paladin_devotion', label: 'Oath of Devotion', source: 'PHB' },
    { key: 'paladin_vengeance', label: 'Oath of Vengeance', source: 'PHB' },
    { key: 'paladin_conquest', label: 'Oath of Conquest', source: 'XGtE' },
    { key: 'paladin_redemption', label: 'Oath of Redemption', source: 'XGtE' },
    { key: 'paladin_glory', label: 'Oath of Glory', source: 'TCoE' },
    { key: 'paladin_watchers', label: 'Oath of the Watchers', source: 'TCoE' },
    { key: 'paladin_crown', label: 'Oath of the Crown', source: 'SCAG' },
    { key: 'paladin_noble_genies', label: 'Oath of Noble Genies', source: 'Other' },
    { key: 'paladin_oathbreaker', label: 'Oathbreaker', source: 'DMG' },
  ],

  // ----------------- Ranger -----------------
  ranger: [
    { key: 'ranger_beast_master', label: 'Beast Master Conclave', source: 'PHB' },
    { key: 'ranger_hunter', label: 'Hunter Conclave', source: 'PHB' },
    { key: 'ranger_gloom_stalker', label: 'Gloom Stalker Conclave', source: 'XGtE' },
    { key: 'ranger_horizon_walker', label: 'Horizon Walker Conclave', source: 'XGtE' },
    { key: 'ranger_monster_slayer', label: 'Monster Slayer Conclave', source: 'XGtE' },
    { key: 'ranger_fey_wanderer', label: 'Fey Wanderer Conclave', source: 'TCoE' },
    { key: 'ranger_swarmkeeper', label: 'Swarmkeeper Conclave', source: 'TCoE' },
    { key: 'ranger_drakewarden', label: 'Drakewarden Conclave', source: 'Fizban' },
    { key: 'ranger_winter_walker', label: 'Winter Walker Conclave', source: 'Other' },
  ],

  // ----------------- Rogue -----------------
  rogue: [
    { key: 'rogue_assassin', label: 'Assassin', source: 'PHB' },
    { key: 'rogue_arcane_trickster', label: 'Arcane Trickster', source: 'PHB' },
    { key: 'rogue_thief', label: 'Thief', source: 'PHB' },
    { key: 'rogue_inquisitive', label: 'Inquisitive', source: 'XGtE' },
    { key: 'rogue_mastermind', label: 'Mastermind', source: 'XGtE' },
    { key: 'rogue_scout', label: 'Scout', source: 'XGtE' },
    { key: 'rogue_swashbuckler', label: 'Swashbuckler', source: 'XGtE' },
    { key: 'rogue_phantom', label: 'Phantom', source: 'TCoE' },
    { key: 'rogue_soulknife', label: 'Soulknife', source: 'TCoE' },
    { key: 'rogue_scion_of_the_three', label: 'Scion of the Three', source: 'Other' },
  ],

  // ----------------- Sorcerer -----------------
  sorcerer: [
    { key: 'sorcerer_draconic_bloodline', label: 'Draconic Bloodline', source: 'PHB' },
    { key: 'sorcerer_wild_magic', label: 'Wild Magic', source: 'PHB' },
    { key: 'sorcerer_divine_soul', label: 'Divine Soul', source: 'XGtE' },
    { key: 'sorcerer_shadow_magic', label: 'Shadow Magic', source: 'XGtE' },
    { key: 'sorcerer_storm_sorcery', label: 'Storm Sorcery', source: 'XGtE' },
    { key: 'sorcerer_aberrant_mind', label: 'Aberrant Mind', source: 'TCoE' },
    { key: 'sorcerer_clockwork_soul', label: 'Clockwork Soul', source: 'TCoE' },
    { key: 'sorcerer_spellfire', label: 'Spellfire', source: 'Other' },
  ],

  // ----------------- Warlock -----------------
  warlock: [
    { key: 'warlock_archfey', label: 'The Archfey', source: 'PHB' },
    { key: 'warlock_fiend', label: 'The Fiend', source: 'PHB' },
    { key: 'warlock_great_old_one', label: 'The Great Old One', source: 'PHB' },
    { key: 'warlock_celestial', label: 'The Celestial', source: 'XGtE' },
    { key: 'warlock_hexblade', label: 'The Hexblade', source: 'XGtE' },
    { key: 'warlock_fathomless', label: 'The Fathomless', source: 'TCoE' },
    { key: 'warlock_genie', label: 'The Genie', source: 'TCoE' },
    { key: 'warlock_undying', label: 'The Undying', source: 'SCAG' },
    { key: 'warlock_undead', label: 'The Undead', source: 'Ravenloft' },
  ],

  // ----------------- Wizard -----------------
  wizard: [
    { key: 'wizard_abjuration', label: 'School of Abjuration', source: 'PHB' },
    { key: 'wizard_conjuration', label: 'School of Conjuration', source: 'PHB' },
    { key: 'wizard_divination', label: 'School of Divination', source: 'PHB' },
    { key: 'wizard_enchantment', label: 'School of Enchantment', source: 'PHB' },
    { key: 'wizard_evocation', label: 'School of Evocation', source: 'PHB' },
    { key: 'wizard_illusion', label: 'School of Illusion', source: 'PHB' },
    { key: 'wizard_necromancy', label: 'School of Necromancy', source: 'PHB' },
    { key: 'wizard_transmutation', label: 'School of Transmutation', source: 'PHB' },
    { key: 'wizard_war_magic', label: 'War Magic', source: 'XGtE' },
    { key: 'wizard_bladesinger', label: 'Bladesinger', source: 'SCAG' },
    { key: 'wizard_order_of_scribes', label: 'Order of Scribes', source: 'TCoE' },
    { key: 'wizard_chronurgy', label: 'Chronurgy Magic', source: 'EGtW' },
    { key: 'wizard_graviturgy', label: 'Graviturgy Magic', source: 'EGtW' },
  ],

  // ----------------- Artificer -----------------
  artificer: [
    { key: 'artificer_alchemist', label: 'Alchemist', source: 'Eberron' },
    { key: 'artificer_armorer', label: 'Armorer', source: 'TCoE' },
    { key: 'artificer_artillerist', label: 'Artillerist', source: 'Eberron' },
    { key: 'artificer_battle_smith', label: 'Battle Smith', source: 'Eberron' },
  ],
}

// ---------------------------------------------
// Optional: partial feature hints for a few SRD-ish subclasses
// (You already had these; leaving them as-is is fine.)
// ---------------------------------------------

export type SubclassFeaturesMap = Partial<
  Record<SubclassKey, Record<number, string[]>>
>

// Very light, non-rulesy summaries. Totally optional for your UI.
export const SUBCLASS_FEATURES: SubclassFeaturesMap = {
  // ----------------- Barbarian -----------------
  barbarian_berserker: {
    3: [
      'Frenzy — you can push your rage into a reckless, exhausting burst of extra attacks (see official rules).',
    ],
    6: [
      'Mindless Rage — while raging you shrug off most fear and charm effects (see official rules).',
    ],
  },
  barbarian_totem_warrior: {
    3: [
      'Totem Spirit — choose an animal spirit that shapes how your rage protects or empowers you (see official rules).',
    ],
    6: [
      'Aspect of the Beast — your chosen animal spirit grants you a passive benefit even when you are calm (see official rules).',
    ],
  },

  // ----------------- Bard -----------------
  bard_lore: {
    3: [
      'Bonus Proficiencies — you pick up extra skills through study and stories (see official rules).',
      'Cutting Words — you can use your inspiration to throw enemies off their game (see official rules).',
    ],
  },
  bard_valor: {
    3: [
      'Bonus Proficiencies — you gain competence with armor and weapons suitable for a war bard (see official rules).',
      'Combat Inspiration — your inspiration can boost damage or defenses in a fight (see official rules).',
    ],
  },

  // ----------------- Cleric -----------------
  cleric_life: {
    1: [
      'Bonus Proficiency — you gain martial training suitable for a devoted healer (see official rules).',
      'Disciple of Life — your healing spells restore a bit of extra vitality (see official rules).',
    ],
    2: [
      'Channel Divinity: Preserve Life — you can pour divine energy into wounded allies as a burst of healing (see official rules).',
    ],
  },
  cleric_light: {
    1: [
      'Bonus Cantrip — you gain a light-themed cantrip representing your radiant faith (see official rules).',
      'Warding Flare — you can flash radiant light to spoil an attacker’s strike (see official rules).',
    ],
    2: [
      'Channel Divinity: Radiance of the Dawn — unleash searing light to burn away darkness and foes (see official rules).',
    ],
  },

  // ----------------- Druid -----------------
  druid_land: {
    2: [
      'Bonus Cantrip — the land’s magic grants you one extra druid cantrip (see official rules).',
      'Natural Recovery — you can pull spell energy back during a brief rest (see official rules).',
    ],
  },
  druid_moon: {
    2: [
      'Circle Forms — your wild shape is geared toward stronger, more combat-ready beasts (see official rules).',
    ],
  },

  // ----------------- Fighter -----------------
  fighter_champion: {
    3: [
      'Improved Critical — your weapon attacks score critical hits more often than most warriors (see official rules).',
    ],
    7: [
      'Remarkable Athlete — you are naturally better at physical stunts, leaps, and scrambles (see official rules).',
    ],
  },
  fighter_battle_master: {
    3: [
      'Combat Superiority — you learn maneuvers fueled by a pool of expertise dice (see official rules).',
      'Student of War — you gain training with a useful tool or craft (see official rules).',
    ],
  },
  fighter_eldritch_knight: {
    3: [
      'Spellcasting — you blend martial prowess with a limited arcane spell list (see official rules).',
      'Weapon Bond — you form a magical link to one or more weapons you can call to hand (see official rules).',
    ],
  },

  // ----------------- Monk -----------------
  monk_open_hand: {
    3: [
      'Open Hand Technique — your flurry strikes can knock foes prone, shove them away, or disrupt their reactions (see official rules).',
    ],
  },
  monk_shadow: {
    3: [
      'Shadow Arts — you learn ki-powered tricks to bend darkness for stealth and misdirection (see official rules).',
    ],
  },

  // ----------------- Paladin -----------------
  paladin_devotion: {
    3: [
      'Sacred Weapon — you can channel divine light into a weapon to strike truer and brighter (see official rules).',
      'Turn the Unholy — you brandish holy power to drive off fiends and undead (see official rules).',
    ],
  },
  paladin_vengeance: {
    3: [
      'Abjure Enemy — you call down divine terror on a specific foe (see official rules).',
      'Vow of Enmity — you swear focused hatred that helps you strike a chosen enemy (see official rules).',
    ],
  },

  // ----------------- Ranger -----------------
  ranger_hunter: {
    3: [
      'Hunter’s Prey — pick a style of hunting that changes how you pressure and punish enemies (see official rules).',
    ],
  },
  ranger_beast_master: {
    3: [
      'Ranger’s Companion — you fight alongside a loyal beast that grows with your power (see official rules).',
    ],
  },

  // ----------------- Rogue -----------------
  rogue_thief: {
    3: [
      'Fast Hands — you can use your nimble fingers to do more with your bonus actions (see official rules).',
      'Second-Story Work — you climb and jump like someone born on rooftops (see official rules).',
    ],
  },
  rogue_assassin: {
    3: [
      'Bonus Proficiencies — you gain tools suited for infiltration and disguise (see official rules).',
      'Assassinate — you are especially deadly against surprised or unprepared targets (see official rules).',
    ],
  },

  // ----------------- Sorcerer -----------------
  sorcerer_draconic_bloodline: {
    1: [
      'Dragon Ancestor — you tie your magic to a specific draconic lineage (see official rules).',
      'Draconic Resilience — your body toughens with a hint of draconic protection (see official rules).',
    ],
  },
  sorcerer_wild_magic: {
    1: [
      'Wild Magic Surge — your spells may trigger unpredictable magical side effects (see official rules).',
      'Tides of Chaos — you can bend luck in your favor, inviting chaos later (see official rules).',
    ],
  },

  // ----------------- Warlock -----------------
  warlock_fiend: {
    1: [
      'Dark One’s Blessing — when you fell enemies, your patron rewards you with a buffer of vitality (see official rules).',
    ],
  },
  warlock_archfey: {
    1: [
      'Fey Presence — your patron’s glamour can overwhelm minds around you (see official rules).',
    ],
  },
  warlock_hexblade: {
    1: [
      'Hexblade’s Curse — you focus a supernatural curse on a single foe to strike them harder (see official rules).',
      'Hex Warrior — you gain martial and magical benefits when fighting with favored weapons (see official rules).',
    ],
  },

  // ----------------- Wizard -----------------
  wizard_evocation: {
    2: [
      'Evocation Savant — you copy evocation spells more efficiently (see official rules).',
      'Sculpt Spells — you can shape your blasts so allies dodge the worst of them (see official rules).',
    ],
  },
  wizard_abjuration: {
    2: [
      'Abjuration Savant — you handle protective spells more efficiently (see official rules).',
      'Arcane Ward — you surround yourself with a reservoir of magical protection (see official rules).',
    ],
  },
  wizard_divination: {
    2: [
      'Divination Savant — you specialize in insight and foresight magic (see official rules).',
      'Portent — visions of possible futures let you replace important d20 rolls (see official rules).',
    ],
  },
}
