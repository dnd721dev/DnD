// src/lib/subclassRules.ts
// Machine-readable subclass rules for SRD + DND721 customs.
// This is designed to drive builder math + sheet calculations.

import type { ClassKey, SubclassKey } from '@/lib/subclasses'

/** Simple dice type for resources */
export type Die = 'd4' | 'd6' | 'd8' | 'd10' | 'd12'

/** Ability score keys */
export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

/** Skills (SRD list) */
export type SkillKey =
  | 'acrobatics'
  | 'animal_handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight_of_hand'
  | 'stealth'
  | 'survival'

/** Proficiency buckets */
export type ArmorProf = 'light' | 'medium' | 'heavy' | 'shields'
export type WeaponProf = 'simple' | 'martial'
export type ToolProf = string

/** Spell list hinting */
export type SpellListKey = 'wizard' | 'cleric' | 'druid' | 'paladin' | 'ranger' | 'warlock' | 'bard'

/** “Oath/Expanded” spell lists: known/always prepared depends on class */
export type AlwaysPreparedSpell = {
  level: number // spell level (1..9)
  spells: string[] // spell names (no text)
}

/**
 * Core effect types that our builder/sheet math can consume.
 * Keep these “small and strict” so it’s easy to apply.
 */
export type SubclassEffect =
  // Proficiencies
  | { type: 'gain_armor_proficiency'; armor: ArmorProf[] }
  | { type: 'gain_weapon_proficiency'; weapons: WeaponProf[] }
  | { type: 'gain_skill_proficiency'; skills: SkillKey[]; choose?: number } // choose N from list if choose exists
  | { type: 'gain_tool_proficiency'; tools: ToolProf[]; choose?: number }

  // Spellcasting adjustments
  | {
      type: 'grant_spellcasting'
      spellList: SpellListKey
      castingAbility: AbilityKey
      note?: string
    }
  | {
      type: 'expanded_spell_list'
      spellList: SpellListKey
      alwaysPrepared: AlwaysPreparedSpell[]
      note?: string
    }
  | { type: 'add_cantrip'; spellList: SpellListKey; choose: number }

  // Resources / class features with tracked uses
  | {
      type: 'resource_add'
      key: string // unique resource key used in UI + storage
      name: string
      die?: Die
      scaling?: {
        // common scaling pattern
        byLevel: Array<{ level: number; value: number }>
      }
      recharge: 'short_rest' | 'long_rest' | 'dawn' | 'special'
      note?: string
    }

  // Math flags / passive modifiers (sheet logic can interpret these)
  | { type: 'crit_range_set'; weaponAttacksOnly?: boolean; range: 20 | 19 | 18 }
  | { type: 'ac_bonus'; amount: number; condition?: string } // e.g. Draconic Resilience baseline AC rule (we’ll store condition)
  | { type: 'hp_bonus_per_level'; amount: number; note?: string } // Draconic Resilience +1 HP/level
  | { type: 'damage_bonus'; amount: number; damageType?: string; condition?: string }
  | { type: 'save_bonus'; amount: number; save?: AbilityKey; condition?: string }
  | { type: 'check_bonus'; amount: number; ability?: AbilityKey; skill?: SkillKey; condition?: string }

  // Complex rules we still want to “activate” in UI, but math is applied via flags
  | { type: 'flag'; key: string; value?: string | number | boolean; note?: string }

/** A single feature granted at a specific class level */
export type SubclassFeature = {
  level: number
  id: string
  name: string
  summary: string
  effects: SubclassEffect[]
  source: 'SRD' | 'DND721'
}

/** A complete rules record for a subclass */
export type SubclassRuleSet = {
  subclass: SubclassKey
  class: ClassKey
  source: 'SRD' | 'DND721'
  features: SubclassFeature[]
}

/**
 * SRD + DND721 rules.
 * NOTE: This file encodes *mechanics*, but not full rules text.
 *
 * ✅ FIX:
 * We use `satisfies Partial<Record<SubclassKey, SubclassRuleSet>>`
 * so TypeScript does NOT require every possible SubclassKey to exist here.
 */
export const SUBCLASS_RULES: Partial<Record<SubclassKey, SubclassRuleSet>> = {

  // ============================================================
  // BARBARIAN — Path of the Berserker (SRD)
  // ============================================================
  barbarian_berserker: {
    subclass: 'barbarian_berserker',
    class: 'barbarian',
    source: 'SRD',
    features: [
      {
        level: 3,
        id: 'berserker_frenzy',
        name: 'Frenzy',
        summary:
          'While raging, you can frenzy for a bonus-action melee attack each turn; you suffer exhaustion when the rage ends.',
        effects: [
          { type: 'flag', key: 'barbarian.berserker.frenzy_available', value: true },
          {
            type: 'flag',
            key: 'barbarian.berserker.frenzy_exhaustion_on_end',
            value: true,
            note: 'Track exhaustion as per rules.',
          },
        ],
        source: 'SRD',
      },
      {
        level: 6,
        id: 'berserker_mindless_rage',
        name: 'Mindless Rage',
        summary:
          'While raging, you are immune to being charmed or frightened; if already charmed/frightened, it is suspended.',
        effects: [{ type: 'flag', key: 'barbarian.berserker.mindless_rage', value: true }],
        source: 'SRD',
      },
      {
        level: 10,
        id: 'berserker_intimidating_presence',
        name: 'Intimidating Presence',
        summary: 'Use your action to frighten a creature (save ends).',
        effects: [{ type: 'flag', key: 'barbarian.berserker.intimidating_presence', value: true }],
        source: 'SRD',
      },
      {
        level: 14,
        id: 'berserker_retaliation',
        name: 'Retaliation',
        summary: 'When you take damage from a creature within 5 feet, you can use your reaction to make a melee attack.',
        effects: [{ type: 'flag', key: 'barbarian.berserker.retaliation', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // BARD — College of Lore (SRD)
  // ============================================================
  bard_lore: {
    subclass: 'bard_lore',
    class: 'bard',
    source: 'SRD',
    features: [
      {
        level: 3,
        id: 'lore_bonus_proficiencies',
        name: 'Bonus Proficiencies',
        summary: 'Gain proficiency in 3 skills of your choice.',
        effects: [{ type: 'gain_skill_proficiency', skills: [], choose: 3 }],
        source: 'SRD',
      },
      {
        level: 3,
        id: 'lore_cutting_words',
        name: 'Cutting Words',
        summary: 'Use Bardic Inspiration to subtract from a creature’s attack roll, ability check, or damage roll.',
        effects: [{ type: 'flag', key: 'bard.lore.cutting_words', value: true }],
        source: 'SRD',
      },
      {
        level: 6,
        id: 'lore_additional_magical_secrets',
        name: 'Additional Magical Secrets',
        summary: 'Learn 2 additional spells from any class. (Counts as bard spells for you.)',
        effects: [{ type: 'flag', key: 'bard.lore.additional_magical_secrets', value: 2 }],
        source: 'SRD',
      },
      {
        level: 14,
        id: 'lore_peerless_skill',
        name: 'Peerless Skill',
        summary: 'Add Bardic Inspiration to your own ability check after seeing the d20 roll.',
        effects: [{ type: 'flag', key: 'bard.lore.peerless_skill', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // CLERIC — Life Domain (SRD)
  // ============================================================
  cleric_life: {
    subclass: 'cleric_life',
    class: 'cleric',
    source: 'SRD',
    features: [
      {
        level: 1,
        id: 'life_bonus_proficiency',
        name: 'Bonus Proficiency',
        summary: 'Gain proficiency with heavy armor.',
        effects: [{ type: 'gain_armor_proficiency', armor: ['heavy'] }],
        source: 'SRD',
      },
      {
        level: 1,
        id: 'life_disciple_of_life',
        name: 'Disciple of Life',
        summary: 'Healing spells restore additional HP.',
        effects: [{ type: 'flag', key: 'cleric.life.disciple_of_life', value: true }],
        source: 'SRD',
      },
      {
        level: 2,
        id: 'life_channel_preserve_life',
        name: 'Channel Divinity: Preserve Life',
        summary: 'Distribute healing as an action (pool scales).',
        effects: [{ type: 'flag', key: 'cleric.life.channel_preserve_life', value: true }],
        source: 'SRD',
      },
      {
        level: 6,
        id: 'life_blessed_healer',
        name: 'Blessed Healer',
        summary: 'When you heal others with a spell of 1st level or higher, you regain HP too.',
        effects: [{ type: 'flag', key: 'cleric.life.blessed_healer', value: true }],
        source: 'SRD',
      },
      {
        level: 8,
        id: 'life_divine_strike',
        name: 'Divine Strike',
        summary: 'Once per turn, deal extra radiant damage on a weapon hit.',
        effects: [
          {
            type: 'flag',
            key: 'cleric.life.divine_strike',
            value: true,
            note: 'Damage scaling (1d8 at 8, 2d8 at 14).',
          },
        ],
        source: 'SRD',
      },
      {
        level: 17,
        id: 'life_supreme_healing',
        name: 'Supreme Healing',
        summary: 'Your healing spells use maximum dice values.',
        effects: [{ type: 'flag', key: 'cleric.life.supreme_healing', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // DRUID — Circle of the Land (SRD)
  // ============================================================
  druid_land: {
    subclass: 'druid_land',
    class: 'druid',
    source: 'SRD',
    features: [
      {
        level: 2,
        id: 'land_bonus_cantrip',
        name: 'Bonus Cantrip',
        summary: 'Learn one additional druid cantrip.',
        effects: [{ type: 'add_cantrip', spellList: 'druid', choose: 1 }],
        source: 'SRD',
      },
      {
        level: 2,
        id: 'land_natural_recovery',
        name: 'Natural Recovery',
        summary: 'Recover spell slots on a short rest (once per day).',
        effects: [{ type: 'flag', key: 'druid.land.natural_recovery', value: true }],
        source: 'SRD',
      },
      {
        level: 3,
        id: 'land_circle_spells',
        name: 'Circle Spells',
        summary: 'You always have certain spells prepared depending on your chosen land.',
        effects: [
          {
            type: 'flag',
            key: 'druid.land.circle_spells',
            value: true,
            note: 'Implement as a land-choice + always-prepared list. We’ll wire this into your builder next.',
          },
        ],
        source: 'SRD',
      },
      {
        level: 6,
        id: 'land_lands_stride',
        name: "Land's Stride",
        summary: 'Move through nonmagical difficult terrain without extra movement; resist certain plant hazards.',
        effects: [{ type: 'flag', key: 'druid.land.lands_stride', value: true }],
        source: 'SRD',
      },
      {
        level: 10,
        id: 'land_natures_ward',
        name: "Nature's Ward",
        summary: 'Immune to poison and disease; can’t be charmed/frightened by elementals/fey.',
        effects: [{ type: 'flag', key: 'druid.land.natures_ward', value: true }],
        source: 'SRD',
      },
      {
        level: 14,
        id: 'land_natures_sanctuary',
        name: "Nature's Sanctuary",
        summary: 'Creatures of nature may hesitate to attack you (save to do so).',
        effects: [{ type: 'flag', key: 'druid.land.natures_sanctuary', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // FIGHTER — Champion (SRD)
  // ============================================================
  fighter_champion: {
    subclass: 'fighter_champion',
    class: 'fighter',
    source: 'SRD',
    features: [
      {
        level: 3,
        id: 'champion_improved_critical',
        name: 'Improved Critical',
        summary: 'Your weapon attacks score a critical hit on a roll of 19–20.',
        effects: [{ type: 'crit_range_set', weaponAttacksOnly: true, range: 19 }],
        source: 'SRD',
      },
      {
        level: 7,
        id: 'champion_remarkable_athlete',
        name: 'Remarkable Athlete',
        summary:
          'Add half proficiency bonus to STR/DEX/CON checks you aren’t proficient in; increase running long jump.',
        effects: [
          { type: 'flag', key: 'fighter.champion.remarkable_athlete', value: true },
          {
            type: 'flag',
            key: 'fighter.champion.remarkable_athlete_half_prof_checks',
            value: true,
            note: 'Sheet logic should apply half-prof to STR/DEX/CON checks without proficiency.',
          },
        ],
        source: 'SRD',
      },
      {
        level: 10,
        id: 'champion_additional_fighting_style',
        name: 'Additional Fighting Style',
        summary: 'Choose a second Fighting Style.',
        effects: [{ type: 'flag', key: 'fighter.champion.additional_fighting_style', value: 1 }],
        source: 'SRD',
      },
      {
        level: 15,
        id: 'champion_superior_critical',
        name: 'Superior Critical',
        summary: 'Your weapon attacks score a critical hit on a roll of 18–20.',
        effects: [{ type: 'crit_range_set', weaponAttacksOnly: true, range: 18 }],
        source: 'SRD',
      },
      {
        level: 18,
        id: 'champion_survivor',
        name: 'Survivor',
        summary: 'Regain HP each turn when below half HP (if not at 0).',
        effects: [{ type: 'flag', key: 'fighter.champion.survivor', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // FIGHTER — Battle Master (SRD)
  // ============================================================
  fighter_battle_master: {
    subclass: 'fighter_battle_master',
    class: 'fighter',
    source: 'SRD',
    features: [
      {
        level: 3,
        id: 'bm_combat_superiority',
        name: 'Combat Superiority',
        summary: 'You gain superiority dice and learn maneuvers.',
        effects: [
          {
            type: 'resource_add',
            key: 'fighter.superiority',
            name: 'Superiority Dice',
            die: 'd8',
            scaling: { byLevel: [{ level: 3, value: 4 }, { level: 7, value: 5 }, { level: 15, value: 6 }] },
            recharge: 'short_rest',
            note: 'Die increases to d10 at 10 and d12 at 18 (handled below as flags).',
          },
          { type: 'flag', key: 'fighter.battlemaster.maneuvers_known', value: 3 },
          {
            type: 'flag',
            key: 'fighter.battlemaster.save_dc',
            value: '8 + proficiency + STR/DEX (your choice)',
          },
          { type: 'flag', key: 'fighter.battlemaster.superiority_die_upgrade_10', value: 'd10' },
          { type: 'flag', key: 'fighter.battlemaster.superiority_die_upgrade_18', value: 'd12' },
        ],
        source: 'SRD',
      },
      {
        level: 3,
        id: 'bm_student_of_war',
        name: 'Student of War',
        summary: 'Gain proficiency with one artisan’s tool of your choice.',
        effects: [{ type: 'gain_tool_proficiency', tools: [], choose: 1 }],
        source: 'SRD',
      },
      {
        level: 7,
        id: 'bm_know_your_enemy',
        name: 'Know Your Enemy',
        summary: 'Study a creature to learn relative stats.',
        effects: [{ type: 'flag', key: 'fighter.battlemaster.know_your_enemy', value: true }],
        source: 'SRD',
      },
      {
        level: 10,
        id: 'bm_improved_combat_superiority',
        name: 'Improved Combat Superiority',
        summary: 'Superiority die becomes d10.',
        effects: [{ type: 'flag', key: 'fighter.battlemaster.superiority_die', value: 'd10' }],
        source: 'SRD',
      },
      {
        level: 15,
        id: 'bm_relentless',
        name: 'Relentless',
        summary: 'Regain 1 superiority die when you start combat with none.',
        effects: [{ type: 'flag', key: 'fighter.battlemaster.relentless', value: true }],
        source: 'SRD',
      },
      {
        level: 18,
        id: 'bm_superior_combat_superiority',
        name: 'Superior Combat Superiority',
        summary: 'Superiority die becomes d12.',
        effects: [{ type: 'flag', key: 'fighter.battlemaster.superiority_die', value: 'd12' }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // FIGHTER — Eldritch Knight (SRD)
  // ============================================================
  fighter_eldritch_knight: {
    subclass: 'fighter_eldritch_knight',
    class: 'fighter',
    source: 'SRD',
    features: [
      {
        level: 3,
        id: 'ek_spellcasting',
        name: 'Spellcasting',
        summary: 'You learn wizard spells; INT is your casting ability (EK school limits apply).',
        effects: [
          {
            type: 'grant_spellcasting',
            spellList: 'wizard',
            castingAbility: 'int',
            note: 'EK: mostly abjuration/evocation with limited off-school picks.',
          },
          { type: 'flag', key: 'fighter.eldritch_knight.school_limits', value: true },
        ],
        source: 'SRD',
      },
      {
        level: 3,
        id: 'ek_weapon_bond',
        name: 'Weapon Bond',
        summary: 'Bond with weapons; can summon them and can’t be disarmed (per rules).',
        effects: [{ type: 'flag', key: 'fighter.eldritch_knight.weapon_bond', value: true }],
        source: 'SRD',
      },
      {
        level: 7,
        id: 'ek_war_magic',
        name: 'War Magic',
        summary: 'After using an action to cast a cantrip, make one weapon attack as a bonus action.',
        effects: [{ type: 'flag', key: 'fighter.eldritch_knight.war_magic', value: true }],
        source: 'SRD',
      },
      {
        level: 10,
        id: 'ek_eldritch_strike',
        name: 'Eldritch Strike',
        summary: 'When you hit with a weapon, target has disadvantage on next save vs your spell.',
        effects: [{ type: 'flag', key: 'fighter.eldritch_knight.eldritch_strike', value: true }],
        source: 'SRD',
      },
      {
        level: 15,
        id: 'ek_arcane_charge',
        name: 'Arcane Charge',
        summary: 'After Action Surge, teleport (per rules).',
        effects: [{ type: 'flag', key: 'fighter.eldritch_knight.arcane_charge', value: true }],
        source: 'SRD',
      },
      {
        level: 18,
        id: 'ek_improved_war_magic',
        name: 'Improved War Magic',
        summary: 'After casting any spell with your action, make one weapon attack as a bonus action.',
        effects: [{ type: 'flag', key: 'fighter.eldritch_knight.improved_war_magic', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // MONK — Way of the Open Hand (SRD)
  // ============================================================
  monk_open_hand: {
    subclass: 'monk_open_hand',
    class: 'monk',
    source: 'SRD',
    features: [
      {
        level: 3,
        id: 'oh_open_hand_technique',
        name: 'Open Hand Technique',
        summary:
          'When you hit with Flurry of Blows, you can impose one of several effects (no reaction, prone, or push).',
        effects: [{ type: 'flag', key: 'monk.open_hand.technique', value: true }],
        source: 'SRD',
      },
      {
        level: 6,
        id: 'oh_wholeness_of_body',
        name: 'Wholeness of Body',
        summary: 'Heal yourself once per long rest (amount scales).',
        effects: [{ type: 'flag', key: 'monk.open_hand.wholeness_of_body', value: true }],
        source: 'SRD',
      },
      {
        level: 11,
        id: 'oh_tranquility',
        name: 'Tranquility',
        summary: 'Gain the effect of sanctuary at the end of a long rest (ends if you attack/cast).',
        effects: [{ type: 'flag', key: 'monk.open_hand.tranquility', value: true }],
        source: 'SRD',
      },
      {
        level: 17,
        id: 'oh_quivering_palm',
        name: 'Quivering Palm',
        summary: 'Set up lethal vibrations; later trigger with an action (per rules).',
        effects: [{ type: 'flag', key: 'monk.open_hand.quivering_palm', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // PALADIN — Oath of Devotion (SRD)
  // ============================================================
  paladin_devotion: {
    subclass: 'paladin_devotion',
    class: 'paladin',
    source: 'SRD',
    features: [
      {
        level: 3,
        id: 'devotion_oath_spells',
        name: 'Oath Spells',
        summary: 'You always have certain oath spells prepared.',
        effects: [
          {
            type: 'expanded_spell_list',
            spellList: 'paladin',
            alwaysPrepared: [
              { level: 1, spells: ['protection from evil and good', 'sanctuary'] },
              { level: 2, spells: ['lesser restoration', 'zone of truth'] },
              { level: 3, spells: ['beacon of hope', 'dispel magic'] },
              { level: 4, spells: ['freedom of movement', 'guardian of faith'] },
              { level: 5, spells: ['commune', 'flame strike'] },
            ],
            note: 'Paladin oath spells are always prepared and don’t count against prepared total.',
          },
        ],
        source: 'SRD',
      },
      {
        level: 3,
        id: 'devotion_channel_divinity',
        name: 'Channel Divinity',
        summary: 'Sacred Weapon and Turn the Unholy.',
        effects: [{ type: 'flag', key: 'paladin.devotion.channel_divinity', value: true }],
        source: 'SRD',
      },
      {
        level: 7,
        id: 'devotion_aura_of_devotion',
        name: 'Aura of Devotion',
        summary: 'You and allies within aura can’t be charmed.',
        effects: [{ type: 'flag', key: 'paladin.devotion.aura_of_devotion', value: true }],
        source: 'SRD',
      },
      {
        level: 15,
        id: 'devotion_purity_of_spirit',
        name: 'Purity of Spirit',
        summary: 'You are always under protection from evil and good.',
        effects: [{ type: 'flag', key: 'paladin.devotion.purity_of_spirit', value: true }],
        source: 'SRD',
      },
      {
        level: 20,
        id: 'devotion_holy_nimbus',
        name: 'Holy Nimbus',
        summary: 'Radiant aura transformation (per rules).',
        effects: [{ type: 'flag', key: 'paladin.devotion.holy_nimbus', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // RANGER — Hunter (SRD)
  // ============================================================
  ranger_hunter: {
    subclass: 'ranger_hunter',
    class: 'ranger',
    source: 'SRD',
    features: [
      {
        level: 3,
        id: 'hunter_hunters_prey',
        name: "Hunter's Prey",
        summary: 'Choose Colossus Slayer, Giant Killer, or Horde Breaker.',
        effects: [
          { type: 'flag', key: 'ranger.hunter.choice.hunters_prey', value: true },
          {
            type: 'flag',
            key: 'ranger.hunter.choice.options',
            // ✅ FIX for your earlier string[] errors: store a string, not string[]
            value: 'colossus_slayer|giant_killer|horde_breaker',
            note: 'Pipe-delimited options; UI can split by "|".',
          },
        ],
        source: 'SRD',
      },
      {
        level: 7,
        id: 'hunter_defensive_tactics',
        name: 'Defensive Tactics',
        summary: 'Choose Escape the Horde, Multiattack Defense, or Steel Will.',
        effects: [
          { type: 'flag', key: 'ranger.hunter.choice.defensive_tactics', value: true },
          {
            type: 'flag',
            key: 'ranger.hunter.choice.options7',
            value: 'escape_the_horde|multiattack_defense|steel_will',
            note: 'Pipe-delimited options; UI can split by "|".',
          },
        ],
        source: 'SRD',
      },
      {
        level: 11,
        id: 'hunter_multiattack',
        name: 'Multiattack',
        summary: 'Choose Volley or Whirlwind Attack.',
        effects: [
          { type: 'flag', key: 'ranger.hunter.choice.multiattack', value: true },
          {
            type: 'flag',
            key: 'ranger.hunter.choice.options11',
            value: 'volley|whirlwind_attack',
            note: 'Pipe-delimited options; UI can split by "|".',
          },
        ],
        source: 'SRD',
      },
      {
        level: 15,
        id: 'hunter_superior_hunters_defense',
        name: "Superior Hunter's Defense",
        summary: 'Choose Evasion, Stand Against the Tide, or Uncanny Dodge.',
        effects: [
          { type: 'flag', key: 'ranger.hunter.choice.superior_defense', value: true },
          {
            type: 'flag',
            key: 'ranger.hunter.choice.options15',
            value: 'evasion|stand_against_the_tide|uncanny_dodge',
            note: 'Pipe-delimited options; UI can split by "|".',
          },
        ],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // ROGUE — Thief (SRD)
  // ============================================================
  rogue_thief: {
    subclass: 'rogue_thief',
    class: 'rogue',
    source: 'SRD',
    features: [
      {
        level: 3,
        id: 'thief_fast_hands',
        name: 'Fast Hands',
        summary: 'Use bonus action for Sleight of Hand, thieves’ tools, or Use an Object.',
        effects: [{ type: 'flag', key: 'rogue.thief.fast_hands', value: true }],
        source: 'SRD',
      },
      {
        level: 3,
        id: 'thief_second_story_work',
        name: 'Second-Story Work',
        summary: 'Climb faster; improve running long jump distance.',
        effects: [{ type: 'flag', key: 'rogue.thief.second_story_work', value: true }],
        source: 'SRD',
      },
      {
        level: 9,
        id: 'thief_supreme_sneak',
        name: 'Supreme Sneak',
        summary: 'Advantage on Stealth if you move at half speed or less.',
        effects: [{ type: 'flag', key: 'rogue.thief.supreme_sneak', value: true }],
        source: 'SRD',
      },
      {
        level: 13,
        id: 'thief_use_magic_device',
        name: 'Use Magic Device',
        summary: 'Ignore class/race/level requirements on magic items (per rules).',
        effects: [{ type: 'flag', key: 'rogue.thief.use_magic_device', value: true }],
        source: 'SRD',
      },
      {
        level: 17,
        id: 'thief_thiefs_reflexes',
        name: "Thief's Reflexes",
        summary: 'Take two turns during the first round of combat (per rules).',
        effects: [{ type: 'flag', key: 'rogue.thief.thiefs_reflexes', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // SORCERER — Draconic Bloodline (SRD)
  // ============================================================
  sorcerer_draconic_bloodline: {
    subclass: 'sorcerer_draconic_bloodline',
    class: 'sorcerer',
    source: 'SRD',
    features: [
      {
        level: 1,
        id: 'draconic_ancestor',
        name: 'Dragon Ancestor',
        summary: 'Choose a draconic ancestry; it affects damage type and flavor.',
        effects: [{ type: 'flag', key: 'sorcerer.draconic.ancestry_choice', value: true }],
        source: 'SRD',
      },
      {
        level: 1,
        id: 'draconic_resilience',
        name: 'Draconic Resilience',
        summary:
          'Your hit point maximum increases by 1 each sorcerer level; when not wearing armor, your base AC becomes 13 + DEX.',
        effects: [
          { type: 'hp_bonus_per_level', amount: 1, note: 'Applies per sorcerer level.' },
          { type: 'ac_bonus', amount: 0, condition: 'When not wearing armor, base AC = 13 + DEX (override rule).' },
          { type: 'flag', key: 'sorcerer.draconic.unarmored_ac_13_plus_dex', value: true },
        ],
        source: 'SRD',
      },
      {
        level: 6,
        id: 'draconic_elemental_affinity',
        name: 'Elemental Affinity',
        summary:
          'Add CHA modifier to one damage roll of spells of your ancestry type; spend 1 sorcery point for resistance (per rules).',
        effects: [
          { type: 'flag', key: 'sorcerer.draconic.elemental_affinity', value: true },
          { type: 'flag', key: 'sorcerer.draconic.damage_bonus_cha_to_ancestry', value: true },
        ],
        source: 'SRD',
      },
      {
        level: 14,
        id: 'draconic_wings',
        name: 'Dragon Wings',
        summary: 'Gain a flying speed (per rules) when not wearing armor.',
        effects: [{ type: 'flag', key: 'sorcerer.draconic.dragon_wings', value: true }],
        source: 'SRD',
      },
      {
        level: 18,
        id: 'draconic_presence',
        name: 'Draconic Presence',
        summary: 'Spend sorcery points to radiate awe or fear (per rules).',
        effects: [{ type: 'flag', key: 'sorcerer.draconic.draconic_presence', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // WARLOCK — The Fiend (SRD)
  // ============================================================
  warlock_fiend: {
    subclass: 'warlock_fiend',
    class: 'warlock',
    source: 'SRD',
    features: [
      {
        level: 1,
        id: 'fiend_expanded_spells',
        name: 'Expanded Spell List',
        summary: 'Your patron adds spells to the warlock list for you.',
        effects: [
          {
            type: 'expanded_spell_list',
            spellList: 'warlock',
            alwaysPrepared: [
              { level: 1, spells: ['burning hands', 'command'] },
              { level: 2, spells: ['blindness/deafness', 'scorching ray'] },
              { level: 3, spells: ['fireball', 'stinking cloud'] },
              { level: 4, spells: ['fire shield', 'wall of fire'] },
              { level: 5, spells: ['flame strike', 'hallow'] },
            ],
            note: 'Warlock expanded list = added options to learn (not auto-prepared).',
          },
        ],
        source: 'SRD',
      },
      {
        level: 1,
        id: 'fiend_dark_ones_blessing',
        name: "Dark One's Blessing",
        summary: 'When you reduce a hostile creature to 0 HP, gain temporary HP (per rules).',
        effects: [{ type: 'flag', key: 'warlock.fiend.dark_ones_blessing', value: true }],
        source: 'SRD',
      },
      {
        level: 6,
        id: 'fiend_dark_ones_own_luck',
        name: "Dark One's Own Luck",
        summary: 'Add d10 to an ability check or saving throw (once per short/long rest).',
        effects: [
          {
            type: 'resource_add',
            key: 'warlock.fiend.dark_ones_own_luck',
            name: "Dark One's Own Luck",
            scaling: { byLevel: [{ level: 6, value: 1 }] },
            recharge: 'short_rest',
            note: 'Adds 1d10 to a check/save after seeing roll.',
          },
        ],
        source: 'SRD',
      },
      {
        level: 10,
        id: 'fiend_fiendish_resilience',
        name: 'Fiendish Resilience',
        summary: 'Choose a damage type to gain resistance (changes after rest).',
        effects: [{ type: 'flag', key: 'warlock.fiend.fiendish_resilience', value: true }],
        source: 'SRD',
      },
      {
        level: 14,
        id: 'fiend_hurl_through_hell',
        name: 'Hurl Through Hell',
        summary: 'On hit, send target through hell (once per long rest).',
        effects: [
          {
            type: 'resource_add',
            key: 'warlock.fiend.hurl_through_hell',
            name: 'Hurl Through Hell',
            scaling: { byLevel: [{ level: 14, value: 1 }] },
            recharge: 'long_rest',
          },
        ],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // WIZARD — School of Evocation (SRD)
  // ============================================================
  wizard_evocation: {
    subclass: 'wizard_evocation',
    class: 'wizard',
    source: 'SRD',
    features: [
      {
        level: 2,
        id: 'evocation_savant',
        name: 'Evocation Savant',
        summary: 'Copy evocation spells into your spellbook faster/cheaper.',
        effects: [{ type: 'flag', key: 'wizard.evocation.savant', value: true }],
        source: 'SRD',
      },
      {
        level: 2,
        id: 'sculpt_spells',
        name: 'Sculpt Spells',
        summary: 'Protect allies from your evocation area spells (per rules).',
        effects: [{ type: 'flag', key: 'wizard.evocation.sculpt_spells', value: true }],
        source: 'SRD',
      },
      {
        level: 6,
        id: 'potent_cantrip',
        name: 'Potent Cantrip',
        summary: 'Targets take half damage on successful saves against your cantrips (per rules).',
        effects: [{ type: 'flag', key: 'wizard.evocation.potent_cantrip', value: true }],
        source: 'SRD',
      },
      {
        level: 10,
        id: 'empowered_evocation',
        name: 'Empowered Evocation',
        summary: 'Add INT modifier to one damage roll of any wizard evocation spell.',
        effects: [{ type: 'flag', key: 'wizard.evocation.empowered_evocation', value: true }],
        source: 'SRD',
      },
      {
        level: 14,
        id: 'overchannel',
        name: 'Overchannel',
        summary: 'Maximize damage of certain lower-level spells; repeated use hurts you (per rules).',
        effects: [{ type: 'flag', key: 'wizard.evocation.overchannel', value: true }],
        source: 'SRD',
      },
    ],
  },

  // ============================================================
  // ================= DND721 CUSTOMS ============================
  // ============================================================

  ranger_winter_walker: {
    subclass: 'ranger_winter_walker',
    class: 'ranger',
    source: 'DND721',
    features: [
      {
        level: 3,
        id: 'ww_frostbound_tracker',
        name: 'Frostbound Tracker',
        summary: 'You ignore difficult terrain caused by snow/ice; advantage on Survival checks to track in cold environments.',
        effects: [
          { type: 'flag', key: 'ranger.winter_walker.ignore_snow_ice_difficult_terrain', value: true },
          { type: 'flag', key: 'ranger.winter_walker.adv_track_cold', value: true },
        ],
        source: 'DND721',
      },
      {
        level: 3,
        id: 'ww_chillshot',
        name: 'Chillshot',
        summary: 'Once per turn, when you hit with a weapon attack, deal +1d4 cold damage.',
        effects: [
          {
            type: 'flag',
            key: 'ranger.winter_walker.once_per_turn_bonus_damage',
            value: '{"die":"d4","type":"cold"}',
            note: 'JSON string; parser can JSON.parse().',
          },
        ],
        source: 'DND721',
      },
      {
        level: 7,
        id: 'ww_icewalk',
        name: 'Icewalk',
        summary: 'You have advantage on checks/saves to avoid slipping; you can move across icy surfaces without penalty.',
        effects: [{ type: 'flag', key: 'ranger.winter_walker.icewalk', value: true }],
        source: 'DND721',
      },
      {
        level: 11,
        id: 'ww_whiteout',
        name: 'Whiteout',
        summary: 'Once per short rest, create a brief localized whiteout to disengage or reposition (control tool).',
        effects: [
          {
            type: 'resource_add',
            key: 'ranger.winter_walker.whiteout',
            name: 'Whiteout',
            scaling: { byLevel: [{ level: 11, value: 1 }] },
            recharge: 'short_rest',
          },
        ],
        source: 'DND721',
      },
      {
        level: 15,
        id: 'ww_frozen_punishment',
        name: 'Frozen Punishment',
        summary: 'When a creature you hit tries to move, you can punish it (reaction) with extra cold damage (per your table’s design).',
        effects: [{ type: 'flag', key: 'ranger.winter_walker.reaction_punish_move', value: true }],
        source: 'DND721',
      },
    ],
  },

  rogue_scion_of_the_three: {
    subclass: 'rogue_scion_of_the_three',
    class: 'rogue',
    source: 'DND721',
    features: [
      {
        level: 3,
        id: 's3_threefold_path',
        name: 'Threefold Path',
        summary: 'Choose one style: Shadow (stealth), Blade (duelist), or Guile (social).',
        effects: [
          {
            type: 'flag',
            key: 'rogue.scion.choice.threefold',
            value: 'shadow|blade|guile',
            note: 'Pipe-delimited options; UI can split by "|".',
          },
        ],
        source: 'DND721',
      },
      {
        level: 9,
        id: 's3_triple_step',
        name: 'Triple Step',
        summary: 'Once per turn, when you use Cunning Action, gain a small extra reposition (your design lever).',
        effects: [{ type: 'flag', key: 'rogue.scion.triple_step', value: true }],
        source: 'DND721',
      },
      {
        level: 13,
        id: 's3_threefold_mastery',
        name: 'Threefold Mastery',
        summary: 'Your chosen style gets a stronger benefit (your design).',
        effects: [{ type: 'flag', key: 'rogue.scion.threefold_mastery', value: true }],
        source: 'DND721',
      },
      {
        level: 17,
        id: 's3_the_third_key',
        name: 'The Third Key',
        summary: 'Capstone: a powerful once-per-rest trick tied to your Threefold choice.',
        effects: [
          {
            type: 'resource_add',
            key: 'rogue.scion.third_key',
            name: 'The Third Key',
            scaling: { byLevel: [{ level: 17, value: 1 }] },
            recharge: 'long_rest',
          },
        ],
        source: 'DND721',
      },
    ],
  },

  sorcerer_spellfire: {
    subclass: 'sorcerer_spellfire',
    class: 'sorcerer',
    source: 'DND721',
    features: [
      {
        level: 1,
        id: 'sf_spellfire_spark',
        name: 'Spellfire Spark',
        summary:
          'You learn one bonus offensive cantrip; when you roll max damage on a spell, gain 1 temporary sorcery point (cap 1).',
        effects: [
          // ⚠️ if your SpellListKey doesn’t include sorcerer, keep this as a flag for now
          { type: 'flag', key: 'sorcerer.spellfire.bonus_cantrip_choose', value: 1 },
          { type: 'flag', key: 'sorcerer.spellfire.temp_sorcery_point_on_max_damage', value: true },
        ],
        source: 'DND721',
      },
      {
        level: 6,
        id: 'sf_burning_focus',
        name: 'Burning Focus',
        summary: 'Add CHA modifier to one fire spell damage roll each turn.',
        effects: [{ type: 'flag', key: 'sorcerer.spellfire.cha_to_fire_damage_once_per_turn', value: true }],
        source: 'DND721',
      },
      {
        level: 14,
        id: 'sf_spellfire_wings',
        name: 'Spellfire Wings',
        summary: 'Brief flight burst fueled by spellfire (resource-based).',
        effects: [
          {
            type: 'resource_add',
            key: 'sorcerer.spellfire.wings',
            name: 'Spellfire Wings',
            scaling: { byLevel: [{ level: 14, value: 1 }] },
            recharge: 'short_rest',
          },
        ],
        source: 'DND721',
      },
      {
        level: 18,
        id: 'sf_infernal_overflow',
        name: 'Infernal Overflow',
        summary: 'Capstone: once per long rest, maximize one fire spell’s damage (your design).',
        effects: [
          {
            type: 'resource_add',
            key: 'sorcerer.spellfire.infernal_overflow',
            name: 'Infernal Overflow',
            scaling: { byLevel: [{ level: 18, value: 1 }] },
            recharge: 'long_rest',
          },
        ],
        source: 'DND721',
      },
    ],
  },

  paladin_noble_genies: {
    subclass: 'paladin_noble_genies',
    class: 'paladin',
    source: 'DND721',
    features: [
      {
        level: 3,
        id: 'ng_genie_vow',
        name: 'Genie Vow',
        summary: 'Choose a noble element (air/earth/fire/water); it influences your aura and smites.',
        effects: [
          {
            type: 'flag',
            key: 'paladin.noble_genies.element_choice',
            value: 'air|earth|fire|water',
            note: 'Pipe-delimited options; UI can split by "|".',
          },
        ],
        source: 'DND721',
      },
      {
        level: 3,
        id: 'ng_channel_divinity',
        name: 'Channel Divinity: Court’s Command',
        summary: 'A genie-themed command presence (control tool).',
        effects: [{ type: 'flag', key: 'paladin.noble_genies.channel_divinity', value: true }],
        source: 'DND721',
      },
      {
        level: 7,
        id: 'ng_elemental_aura',
        name: 'Elemental Aura',
        summary: 'You and allies gain a small elemental benefit based on your genie choice.',
        effects: [{ type: 'flag', key: 'paladin.noble_genies.elemental_aura', value: true }],
        source: 'DND721',
      },
      {
        level: 15,
        id: 'ng_royal_resilience',
        name: 'Royal Resilience',
        summary: 'Gain resistance or advantage against effects tied to your element (your design).',
        effects: [{ type: 'flag', key: 'paladin.noble_genies.royal_resilience', value: true }],
        source: 'DND721',
      },
      {
        level: 20,
        id: 'ng_noble_ascension',
        name: 'Noble Ascension',
        summary: 'Capstone transformation (your design).',
        effects: [{ type: 'flag', key: 'paladin.noble_genies.noble_ascension', value: true }],
        source: 'DND721',
      },
    ],
  },

  bard_moon: {
    subclass: 'bard_moon',
    class: 'bard',
    source: 'DND721',
    features: [
      {
        level: 3,
        id: 'moonlit_glamour',
        name: 'Moonlit Glamour',
        summary: 'Add +1 to AC while you have Bardic Inspiration available (simple toggle).',
        effects: [{ type: 'ac_bonus', amount: 1, condition: 'While you have at least 1 Bardic Inspiration die remaining.' }],
        source: 'DND721',
      },
      {
        level: 6,
        id: 'silver_tongue',
        name: 'Silver Tongue of the Moon',
        summary: 'Gain a bonus to Persuasion checks under moonlight or at night (your setting hook).',
        effects: [{ type: 'check_bonus', amount: 2, skill: 'persuasion', condition: 'At night / under moonlight (GM toggle).' }],
        source: 'DND721',
      },
      {
        level: 14,
        id: 'lunar_veil',
        name: 'Lunar Veil',
        summary: 'Once per short rest, briefly turn partially unseen (your design).',
        effects: [
          {
            type: 'resource_add',
            key: 'bard.moon.lunar_veil',
            name: 'Lunar Veil',
            scaling: { byLevel: [{ level: 14, value: 1 }] },
            recharge: 'short_rest',
          },
        ],
        source: 'DND721',
      },
    ],
  },

  druid_sea: {
    subclass: 'druid_sea',
    class: 'druid',
    source: 'DND721',
    features: [
      {
        level: 2,
        id: 'sea_tidecraft',
        name: 'Tidecraft',
        summary:
          'Learn one extra druid cantrip; you can breathe underwater for a total of 1 hour per long rest (chunked).',
        effects: [
          { type: 'add_cantrip', spellList: 'druid', choose: 1 },
          {
            type: 'resource_add',
            key: 'druid.sea.water_breathing_minutes',
            name: 'Water Breathing (minutes)',
            scaling: { byLevel: [{ level: 2, value: 60 }] },
            recharge: 'long_rest',
            note: 'Spend in chunks; you can track this as a timer toggle in UI.',
          },
        ],
        source: 'DND721',
      },
      {
        level: 6,
        id: 'sea_current_shift',
        name: 'Current Shift',
        summary: 'Once per short rest, reposition yourself or an ally 10 feet (your design).',
        effects: [
          {
            type: 'resource_add',
            key: 'druid.sea.current_shift',
            name: 'Current Shift',
            scaling: { byLevel: [{ level: 6, value: 1 }] },
            recharge: 'short_rest',
          },
        ],
        source: 'DND721',
      },
      {
        level: 10,
        id: 'sea_brineward',
        name: 'Brineward',
        summary: 'Gain resistance to cold damage (always on).',
        effects: [{ type: 'flag', key: 'druid.sea.resist_cold', value: true }],
        source: 'DND721',
      },
      {
        level: 14,
        id: 'sea_tidal_sanctuary',
        name: 'Tidal Sanctuary',
        summary: 'Once per long rest, conjure a tide barrier that reduces damage for allies (your design).',
        effects: [
          {
            type: 'resource_add',
            key: 'druid.sea.tidal_sanctuary',
            name: 'Tidal Sanctuary',
            scaling: { byLevel: [{ level: 14, value: 1 }] },
            recharge: 'long_rest',
          },
        ],
        source: 'DND721',
      },
    ],
  },
} satisfies Partial<Record<SubclassKey, SubclassRuleSet>>

// ✅ Put this near the bottom of src/lib/subclassRules.ts (replace your helper)

export function getSubclassFeaturesForLevel(subclass: SubclassKey, classLevel: number): SubclassFeature[] {
  const rs = SUBCLASS_RULES[subclass]
  if (!rs) return []
  return rs.features
    .filter((f: SubclassFeature) => f.level <= classLevel)
    .sort((a: SubclassFeature, b: SubclassFeature) => a.level - b.level)
}
