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
  /** 2024 Epic Boon — only offered at character level 19+. */
  isEpicBoon?: boolean
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
  magicInitiateCleric: {
    key: 'magicInitiateCleric',
    name: 'Magic Initiate (Cleric)',
    prerequisite: null,
    summary: 'Learn 2 Cleric cantrips. Learn 1 first-level Cleric spell; cast it once per long rest without a slot. Origin feat granted by the Acolyte background.',
    category: 'spellcasting',
  },
  magicInitiateWizard: {
    key: 'magicInitiateWizard',
    name: 'Magic Initiate (Wizard)',
    prerequisite: null,
    summary: 'Learn 2 Wizard cantrips. Learn 1 first-level Wizard spell; cast it once per long rest without a slot. Origin feat granted by the Sage background.',
    category: 'spellcasting',
  },
  magicInitiateDruid: {
    key: 'magicInitiateDruid',
    name: 'Magic Initiate (Druid)',
    prerequisite: null,
    summary: 'Learn 2 Druid cantrips. Learn 1 first-level Druid spell; cast it once per long rest without a slot. Origin feat granted by the Hermit background.',
    category: 'spellcasting',
  },
  musician: {
    key: 'musician',
    name: 'Musician',
    prerequisite: null,
    summary: 'Gain proficiency with three musical instruments. When you finish a short rest with companions, any who heard you play gain Bardic Inspiration (1d6) once before their next long rest. Origin feat granted by the Entertainer background.',
    category: 'utility',
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

  // ── Epic Boons (2024 PHB) — level 19+ only ─────────────────────────────────
  // Each boon also grants +1 to one ability score of the player's choice.
  boonCombatProwess: {
    key: 'boonCombatProwess',
    name: 'Boon of Combat Prowess',
    prerequisite: 'Level 19+',
    summary: '+1 to one ability. Once on each of your turns when you miss with an attack roll, you can choose to hit instead.',
    category: 'combat',
    isEpicBoon: true,
  },
  boonDesperateResilience: {
    key: 'boonDesperateResilience',
    name: 'Boon of Desperate Resilience',
    prerequisite: 'Level 19+',
    summary: '+1 STR or CON. Defense of Body and Mind: while Bloodied (at or below half your HP maximum), you have resistance to all damage types except Force.',
    category: 'defensive',
    isEpicBoon: true,
  },
  boonDimensionalTravel: {
    key: 'boonDimensionalTravel',
    name: 'Boon of Dimensional Travel',
    prerequisite: 'Level 19+',
    summary: '+1 to one ability. Immediately after taking the Attack or Magic action, you can teleport up to 30 ft. to a space you can see.',
    category: 'utility',
    isEpicBoon: true,
  },
  boonEnergyResistance: {
    key: 'boonEnergyResistance',
    name: 'Boon of Energy Resistance',
    prerequisite: 'Level 19+',
    summary: '+1 to one ability. Gain resistance to two damage types of your choice (changeable each long rest). Reaction: redirect qualifying energy damage aimed at you to a creature within 60 ft.',
    category: 'defensive',
    isEpicBoon: true,
  },
  boonFate: {
    key: 'boonFate',
    name: 'Boon of Fate',
    prerequisite: 'Level 19+',
    summary: '+1 to one ability. When a creature within 60 ft. succeeds or fails a d20 test, roll 2d4 and add or subtract it from the result. Recharges on initiative or a long rest.',
    category: 'utility',
    isEpicBoon: true,
  },
  boonFortitude: {
    key: 'boonFortitude',
    name: 'Boon of Fortitude',
    prerequisite: 'Level 19+',
    summary: '+1 to one ability. Your HP maximum increases by 40, and whenever you regain HP you regain an extra amount equal to your CON modifier (once per turn).',
    category: 'defensive',
    isEpicBoon: true,
  },
  boonIrresistibleOffense: {
    key: 'boonIrresistibleOffense',
    name: 'Boon of Irresistible Offense',
    prerequisite: 'Level 19+',
    summary: '+1 STR or DEX. Your bludgeoning, piercing, and slashing damage ignores resistance. On a natural 20 attack roll, deal extra damage equal to the raised ability score.',
    category: 'combat',
    isEpicBoon: true,
  },
  boonRecovery: {
    key: 'boonRecovery',
    name: 'Boon of Recovery',
    prerequisite: 'Level 19+',
    summary: '+1 to one ability. Once per long rest when you drop to 0 HP, drop to 1 HP instead. Bonus action: regain HP equal to half your HP maximum, once per long rest.',
    category: 'defensive',
    isEpicBoon: true,
  },
  boonSkill: {
    key: 'boonSkill',
    name: 'Boon of Skill',
    prerequisite: 'Level 19+',
    summary: '+1 to one ability. Gain proficiency in one skill, and once on each of your turns you can give yourself advantage on one ability check.',
    category: 'skill',
    isEpicBoon: true,
  },
  boonSpeed: {
    key: 'boonSpeed',
    name: 'Boon of Speed',
    prerequisite: 'Level 19+',
    summary: '+1 STR or DEX. Your speed increases by 30 ft., and you can take the Disengage action as a bonus action.',
    category: 'combat',
    isEpicBoon: true,
  },
  boonSpellRecall: {
    key: 'boonSpellRecall',
    name: 'Boon of Spell Recall',
    prerequisite: 'Level 19+, spellcaster',
    summary: '+1 to one ability. When you cast a spell with a level 1–4 slot, roll 1d4 — if the roll matches the slot level, the slot is not expended.',
    category: 'spellcasting',
    isEpicBoon: true,
  },
  boonNightSpirit: {
    key: 'boonNightSpirit',
    name: 'Boon of the Night Spirit',
    prerequisite: 'Level 19+',
    summary: '+1 to one ability. While in dim light or darkness: become invisible as a bonus action (ends when you act), and you have resistance to all damage except psychic and radiant.',
    category: 'utility',
    isEpicBoon: true,
  },
  boonTruesight: {
    key: 'boonTruesight',
    name: 'Boon of Truesight',
    prerequisite: 'Level 19+',
    summary: '+1 to one ability. You have Truesight out to 60 ft. — see in normal and magical darkness, see invisible creatures, and perceive the true form of shapechangers and illusions.',
    category: 'utility',
    isEpicBoon: true,
  },
}

// Ordered list for UI dropdowns
export const FEAT_LIST: Feat[] = Object.values(FEATS).sort((a, b) =>
  a.name.localeCompare(b.name)
)

/** Standard (non-boon) feats — what most pickers should offer below level 19. */
export const STANDARD_FEAT_LIST: Feat[] = FEAT_LIST.filter((f) => !f.isEpicBoon)
/** 2024 Epic Boons — offered only at character level 19+. */
export const EPIC_BOON_LIST: Feat[] = FEAT_LIST.filter((f) => !!f.isEpicBoon)

// Lists filtered by category
export const COMBAT_FEATS = FEAT_LIST.filter((f) => f.category === 'combat')
export const SPELLCASTING_FEATS = FEAT_LIST.filter((f) => f.category === 'spellcasting')
export const SKILL_FEATS = FEAT_LIST.filter((f) => f.category === 'skill')
export const UTILITY_FEATS = FEAT_LIST.filter((f) => f.category === 'utility')
export const DEFENSIVE_FEATS = FEAT_LIST.filter((f) => f.category === 'defensive')

export function getFeat(key: string): Feat | undefined {
  return FEATS[key]
}

// ── Half-feat ability bonuses ─────────────────────────────────────────────────
// Feats that also grant +1 to an ability score. `abilities` lists the allowed
// abilities — one entry means it's fixed; multiple means the player chooses.
export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export const FEAT_ABILITY_BONUS: Record<string, { amount: number; abilities: AbilityKey[] }> = {
  athlete:          { amount: 1, abilities: ['str', 'dex'] },
  actor:            { amount: 1, abilities: ['cha'] },
  durable:          { amount: 1, abilities: ['con'] },
  heavilyArmored:   { amount: 1, abilities: ['str'] },
  heavyArmorMaster: { amount: 1, abilities: ['str'] },
  keenMind:         { amount: 1, abilities: ['int'] },
  lightlyArmored:   { amount: 1, abilities: ['str', 'dex'] },
  linguist:         { amount: 1, abilities: ['int'] },
  moderatelyArmored:{ amount: 1, abilities: ['str', 'dex'] },
  observant:        { amount: 1, abilities: ['int', 'wis'] },
  // Resilient: +1 to the chosen ability AND proficiency in its saving throw.
  resilient:        { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  tavernBrawler:    { amount: 1, abilities: ['str', 'con'] },
  weaponMaster:     { amount: 1, abilities: ['str', 'dex'] },

  // Epic Boons (2024): every boon grants +1 to one ability of the player's
  // choice (Irresistible Offense and Speed are restricted to STR/DEX).
  boonCombatProwess:     { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  boonDesperateResilience: { amount: 1, abilities: ['str', 'con'] },
  boonDimensionalTravel: { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  boonEnergyResistance:  { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  boonFate:              { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  boonFortitude:         { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  boonIrresistibleOffense: { amount: 1, abilities: ['str', 'dex'] },
  boonRecovery:          { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  boonSkill:             { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  boonSpeed:             { amount: 1, abilities: ['str', 'dex'] },
  boonSpellRecall:       { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  boonNightSpirit:       { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
  boonTruesight:         { amount: 1, abilities: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
}

export function getFeatAbilityBonus(key: string) {
  return FEAT_ABILITY_BONUS[key]
}

// ── Feats that grant extra spells known ───────────────────────────────────────
// Magic Initiate (and its class variants): learn 2 cantrips + 1 first-level spell
// from the chosen class. Spell Sniper: learn 1 attack-roll cantrip. These raise
// the cantrip / leveled "known" caps so the player can actually add the spells.
const MAGIC_INITIATE_KEYS = ['magicInitiate', 'magicInitiateCleric', 'magicInitiateWizard', 'magicInitiateDruid']

export function getFeatSpellBonus(feats: string[] | null | undefined): { cantrips: number; leveled: number } {
  const owned = new Set((feats ?? []).map((f) => String(f)))
  let cantrips = 0
  let leveled = 0
  for (const k of MAGIC_INITIATE_KEYS) {
    if (owned.has(k)) { cantrips += 2; leveled += 1 }
  }
  if (owned.has('spellSniper')) cantrips += 1
  return { cantrips, leveled }
}
