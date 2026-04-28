// src/lib/feats.ts
// SRD-style feat library for DND721.
// All 5e SRD feats with original summaries, prerequisites, and category tags.
// Mechanical bonuses (e.g. Tough +2 HP/level) are noted in summary text.

export type FeatKey = string

export type Feat = {
  key: FeatKey
  name: string
  /** Prerequisites for taking this feat (null = none). */
  prerequisite: string | null
  /** Short, original summary of what the feat does in play. */
  summary: string
  /** Broad category for filtering. */
  category: 'combat' | 'spellcasting' | 'skill' | 'utility' | 'defensive'
}

export const FEATS: Record<string, Feat> = {
  alert: {
    key: 'alert',
    name: 'Alert',
    prerequisite: null,
    summary: '+5 to initiative. You cannot be surprised while conscious. Attackers gain no advantage from being hidden when they attack you.',
    category: 'combat',
  },
  athlete: {
    key: 'athlete',
    name: 'Athlete',
    prerequisite: null,
    summary: '+1 STR or DEX (your choice). Climbing costs no extra movement. Standing from prone costs only 5 ft. of movement. You can make a running long jump or high jump after only 5 ft. of movement.',
    category: 'utility',
  },
  actor: {
    key: 'actor',
    name: 'Actor',
    prerequisite: null,
    summary: '+1 CHA. Advantage on Deception and Performance checks when impersonating. You can mimic the speech and sounds of others after 1 min of listening.',
    category: 'skill',
  },
  charger: {
    key: 'charger',
    name: 'Charger',
    prerequisite: null,
    summary: 'After using the Dash action, you can make a bonus action melee attack (+5 damage) or shove a creature.',
    category: 'combat',
  },
  crossbowExpert: {
    key: 'crossbowExpert',
    name: 'Crossbow Expert',
    prerequisite: null,
    summary: 'Ignore the loading property of crossbows. No disadvantage from firing in melee. You can attack with a hand crossbow as a bonus action when you attack with a one-handed weapon.',
    category: 'combat',
  },
  defensiveDuelist: {
    key: 'defensiveDuelist',
    name: 'Defensive Duelist',
    prerequisite: 'Dexterity 13 or higher',
    summary: 'When wielding a finesse weapon, use your reaction to add your proficiency bonus to AC against one melee attack.',
    category: 'defensive',
  },
  dualWielder: {
    key: 'dualWielder',
    name: 'Dual Wielder',
    prerequisite: null,
    summary: '+1 AC when wielding two melee weapons. You can use two-weapon fighting with non-Light weapons. You can draw or stow two weapons at once.',
    category: 'combat',
  },
  dungeonDelver: {
    key: 'dungeonDelver',
    name: 'Dungeon Delver',
    prerequisite: null,
    summary: 'Advantage on Perception and Investigation checks for secret doors. Advantage on saves vs. traps. Resistance to trap damage. Search for traps at normal pace.',
    category: 'utility',
  },
  durable: {
    key: 'durable',
    name: 'Durable',
    prerequisite: null,
    summary: '+1 CON. When rolling Hit Dice to recover HP on a short rest, the minimum you recover per die equals twice your CON modifier (minimum 2).',
    category: 'defensive',
  },
  elementalAdept: {
    key: 'elementalAdept',
    name: 'Elemental Adept',
    prerequisite: 'Spellcasting or Pact Magic feature',
    summary: 'Choose a damage type: acid, cold, fire, lightning, or thunder. Your spells ignore resistance to that type. Rolls of 1 on damage dice count as 2.',
    category: 'spellcasting',
  },
  grappler: {
    key: 'grappler',
    name: 'Grappler',
    prerequisite: 'Strength 13 or higher',
    summary: 'Advantage on attack rolls against creatures you are grappling. You can pin a creature you\'ve grappled (restrained condition for both until grapple ends).',
    category: 'combat',
  },
  greatWeaponMaster: {
    key: 'greatWeaponMaster',
    name: 'Great Weapon Master',
    prerequisite: null,
    summary: 'On a critical hit or killing blow with a heavy melee weapon, make a bonus action melee attack. Before a heavy weapon attack, take -5 to hit for +10 damage.',
    category: 'combat',
  },
  healer: {
    key: 'healer',
    name: 'Healer',
    prerequisite: null,
    summary: 'When using a healer\'s kit to stabilize, the target also regains 1 HP. You can spend a healer\'s kit use as an action: creature regains 1d6 + 4 + HD HP (once per short rest per creature).',
    category: 'utility',
  },
  heavilyArmored: {
    key: 'heavilyArmored',
    name: 'Heavily Armored',
    prerequisite: 'Proficiency with medium armor',
    summary: '+1 STR. Gain proficiency with heavy armor.',
    category: 'defensive',
  },
  heavyArmorMaster: {
    key: 'heavyArmorMaster',
    name: 'Heavy Armor Master',
    prerequisite: 'Proficiency with heavy armor',
    summary: '+1 STR. While wearing heavy armor, reduce bludgeoning, piercing, and slashing damage from non-magical attacks by 3.',
    category: 'defensive',
  },
  inspiringLeader: {
    key: 'inspiringLeader',
    name: 'Inspiring Leader',
    prerequisite: 'Charisma 13 or higher',
    summary: 'Spend 10 minutes giving an inspiring speech. Up to 6 creatures who can hear and understand you gain temporary HP equal to your level + CHA modifier.',
    category: 'utility',
  },
  keenMind: {
    key: 'keenMind',
    name: 'Keen Mind',
    prerequisite: null,
    summary: '+1 INT. You always know which way is north, the hours until sunrise/sunset, and can accurately recall anything you\'ve seen or heard within the past month.',
    category: 'skill',
  },
  lightlyArmored: {
    key: 'lightlyArmored',
    name: 'Lightly Armored',
    prerequisite: null,
    summary: '+1 STR or DEX. Gain proficiency with light armor.',
    category: 'defensive',
  },
  linguist: {
    key: 'linguist',
    name: 'Linguist',
    prerequisite: null,
    summary: '+1 INT. You learn 3 additional languages of your choice. You can create written ciphers that only you or those you teach can decipher.',
    category: 'skill',
  },
  lucky: {
    key: 'lucky',
    name: 'Lucky',
    prerequisite: null,
    summary: 'You have 3 luck points per long rest. Spend a point to roll an extra d20 on an attack, ability check, or saving throw (choose which result to use), or to force a reroll against you.',
    category: 'utility',
  },
  mageSlayor: {
    key: 'mageSlayor',
    name: 'Mage Slayer',
    prerequisite: null,
    summary: 'When a creature within 5 ft. casts a spell, use your reaction to attack it. It has disadvantage on Concentration checks from your hits. Advantage on saves against spells cast within 5 ft.',
    category: 'combat',
  },
  magicInitiate: {
    key: 'magicInitiate',
    name: 'Magic Initiate',
    prerequisite: null,
    summary: 'Choose a class: bard, cleric, druid, sorcerer, warlock, or wizard. Learn 2 cantrips from that list. Learn 1 first-level spell from that list; cast it once per long rest without a slot.',
    category: 'spellcasting',
  },
  martialAdept: {
    key: 'martialAdept',
    name: 'Martial Adept',
    prerequisite: null,
    summary: 'Learn 2 Battle Master maneuvers. You have one superiority die (d6) per short/long rest for those maneuvers (DC 8 + proficiency + STR or DEX modifier).',
    category: 'combat',
  },
  mediumArmorMaster: {
    key: 'mediumArmorMaster',
    name: 'Medium Armor Master',
    prerequisite: 'Proficiency with medium armor',
    summary: 'No disadvantage on Stealth from medium armor. Add up to +3 DEX modifier to AC in medium armor (instead of +2).',
    category: 'defensive',
  },
  mobile: {
    key: 'mobile',
    name: 'Mobile',
    prerequisite: null,
    summary: '+10 ft. speed. When you Dash, difficult terrain doesn\'t cost extra movement that turn. After attacking a creature, you don\'t provoke opportunity attacks from it that turn.',
    category: 'combat',
  },
  moderatelyArmored: {
    key: 'moderatelyArmored',
    name: 'Moderately Armored',
    prerequisite: 'Proficiency with light armor',
    summary: '+1 STR or DEX. Gain proficiency with medium armor and shields.',
    category: 'defensive',
  },
  mountedCombatant: {
    key: 'mountedCombatant',
    name: 'Mounted Combatant',
    prerequisite: null,
    summary: 'Advantage on melee attacks against unmounted creatures smaller than your mount. Force attacks on your mount to target you instead. Your mount\'s Dex saves have advantage.',
    category: 'combat',
  },
  observant: {
    key: 'observant',
    name: 'Observant',
    prerequisite: null,
    summary: '+1 INT or WIS. You can read lips. +5 bonus to passive Perception and Investigation scores.',
    category: 'skill',
  },
  polearmMaster: {
    key: 'polearmMaster',
    name: 'Polearm Master',
    prerequisite: null,
    summary: 'Bonus action attack with the butt of a glaive, halberd, quarterstaff, or spear (1d4 bludgeoning). Creatures entering your reach trigger opportunity attacks.',
    category: 'combat',
  },
  resilient: {
    key: 'resilient',
    name: 'Resilient',
    prerequisite: null,
    summary: '+1 to one ability score of your choice. Gain proficiency in saving throws with that ability.',
    category: 'defensive',
  },
  ritualCaster: {
    key: 'ritualCaster',
    name: 'Ritual Caster',
    prerequisite: 'Intelligence or Wisdom 13 or higher',
    summary: 'Acquire a ritual book with 2 first-level ritual spells. Add new ritual spells to the book (from scrolls or spellbooks). Cast those spells as rituals only.',
    category: 'spellcasting',
  },
  savageAttacker: {
    key: 'savageAttacker',
    name: 'Savage Attacker',
    prerequisite: null,
    summary: 'Once per turn, reroll a weapon\'s damage dice and use either total.',
    category: 'combat',
  },
  sentinel: {
    key: 'sentinel',
    name: 'Sentinel',
    prerequisite: null,
    summary: 'Opportunity attacks reduce speed to 0 on hit. Reactions can be used against creatures that disengage from you. Attack any creature within 5 ft. that attacks another target.',
    category: 'combat',
  },
  sharpshooter: {
    key: 'sharpshooter',
    name: 'Sharpshooter',
    prerequisite: null,
    summary: 'Long-range attacks have no disadvantage. Ranged attacks ignore half and three-quarters cover. Before a ranged attack, take -5 to hit for +10 damage.',
    category: 'combat',
  },
  shieldMaster: {
    key: 'shieldMaster',
    name: 'Shield Master',
    prerequisite: null,
    summary: 'Bonus action shove after an attack. Add shield\'s AC bonus to Dex saves vs. one source. Use reaction (successful Dex save) to take no damage on a success.',
    category: 'defensive',
  },
  skilled: {
    key: 'skilled',
    name: 'Skilled',
    prerequisite: null,
    summary: 'Gain proficiency in any combination of 3 skills or tools of your choice.',
    category: 'skill',
  },
  skulker: {
    key: 'skulker',
    name: 'Skulker',
    prerequisite: 'Dexterity 13 or higher',
    summary: 'Hide when only lightly obscured. Missing a ranged attack doesn\'t reveal your position. Dim light doesn\'t disadvantage Perception checks relying on sight.',
    category: 'skill',
  },
  spellSniper: {
    key: 'spellSniper',
    name: 'Spell Sniper',
    prerequisite: 'Spellcasting or Pact Magic feature',
    summary: 'Double range of spells requiring attack rolls. Those attacks ignore half and three-quarters cover. Learn 1 cantrip using an attack roll from any class spell list.',
    category: 'spellcasting',
  },
  tavernBrawler: {
    key: 'tavernBrawler',
    name: 'Tavern Brawler',
    prerequisite: null,
    summary: '+1 STR or CON. Proficiency with improvised weapons and unarmed strikes. Unarmed strike deals 1d4 bludgeoning. Bonus action grapple attempt after hitting with unarmed or improvised attack.',
    category: 'combat',
  },
  tough: {
    key: 'tough',
    name: 'Tough',
    prerequisite: null,
    summary: 'HP maximum increases by 2 per level (retroactive on taking the feat). Example: +10 HP at level 5.',
    category: 'defensive',
  },
  warCaster: {
    key: 'warCaster',
    name: 'War Caster',
    prerequisite: 'Spellcasting or Pact Magic feature',
    summary: 'Advantage on Concentration checks. Cast somatic components while holding weapons or shield. Cast a spell (attack roll, single target) as an opportunity attack.',
    category: 'spellcasting',
  },
  weaponMaster: {
    key: 'weaponMaster',
    name: 'Weapon Master',
    prerequisite: null,
    summary: '+1 STR or DEX. Gain proficiency with 4 weapons of your choice.',
    category: 'combat',
  },
}

// Ordered list for UI dropdowns
export const FEAT_LIST: Feat[] = Object.values(FEATS).sort((a, b) =>
  a.name.localeCompare(b.name)
)

// Lists filtered by category
export const COMBAT_FEATS = FEAT_LIST.filter((f) => f.category === 'combat')
export const SPELLCASTING_FEATS = FEAT_LIST.filter((f) => f.category === 'spellcasting')
export const SKILL_FEATS = FEAT_LIST.filter((f) => f.category === 'skill')
export const UTILITY_FEATS = FEAT_LIST.filter((f) => f.category === 'utility')
export const DEFENSIVE_FEATS = FEAT_LIST.filter((f) => f.category === 'defensive')

export function getFeat(key: string): Feat | undefined {
  return FEATS[key]
}
