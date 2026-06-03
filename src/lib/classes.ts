// src/lib/classes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for per-class proficiencies and 2024 prepared-spell
// tables. Read by:
//   - Character creation (auto-populate saves + class skill choices)
//   - SpellsPanel (prepared-spell cap)
//   - "Fix proficiencies from class" backfill button on existing characters
//
// 2024 PHB rules are used for prepared-spell counts because D&D Beyond defaults
// to 2024 (their current rules). The 2014 fallback (`level + casting_mod`)
// remains in SpellsPanel for classes that don't have a 2024 table here yet.
// ─────────────────────────────────────────────────────────────────────────────

import type { AbilityKey } from './dnd5e'

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

export type SpellcastingProgression = 'full' | 'half' | 'third' | 'pact' | 'none'

export interface ClassDef {
  /** Hit die size (d6/8/10/12). */
  hitDie: 6 | 8 | 10 | 12
  /** Saving throw proficiencies granted by the class. */
  savingThrowProfs: AbilityKey[]
  /** Class skill list — player picks `count` from `options` at character creation. */
  skillChoices: { count: number; options: string[] }
  /** Spellcasting block (omit / set progression='none' for non-casters). */
  spellcasting?: {
    ability: AbilityKey
    progression: SpellcastingProgression
    /**
     * 2024 PHB prepared-spell table indexed by class level. Index 0 is unused
     * (no level 0). When provided, this OVERRIDES the legacy 2014 formula
     * (`level + casting_mod`). Only includes classes that prepare from a list;
     * fixed-list casters (sorcerer/warlock/bard) don't need this.
     */
    preparedByLevel?: readonly number[]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLASS_DATA — keep in sync with PHB 2024 prepared-spell tables.
// ─────────────────────────────────────────────────────────────────────────────

export const CLASS_DATA: Record<ClassKey, ClassDef> = {
  barbarian: {
    hitDie: 12,
    savingThrowProfs: ['str', 'con'],
    skillChoices: {
      count: 2,
      options: ['animal_handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    },
  },

  bard: {
    hitDie: 8,
    savingThrowProfs: ['dex', 'cha'],
    // Bard chooses any 3 skills
    skillChoices: {
      count: 3,
      options: [
        'acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception',
        'history', 'insight', 'intimidation', 'investigation', 'medicine',
        'nature', 'perception', 'performance', 'persuasion', 'religion',
        'sleight_of_hand', 'stealth', 'survival',
      ],
    },
    spellcasting: {
      ability: 'cha',
      progression: 'full',
      // 2024 Bard known-spells table (used as prepared cap here):
      // L1=4, L2=5, L3=6, L4=7, L5=9, L6=10, L7=11, L8=12, L9=14, L10=15, L11+=16, L17+=22
      preparedByLevel: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 16, 16, 16, 16, 22, 22, 22, 22],
    },
  },

  cleric: {
    hitDie: 8,
    savingThrowProfs: ['wis', 'cha'],
    skillChoices: {
      count: 2,
      options: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    },
    spellcasting: {
      ability: 'wis',
      progression: 'full',
      preparedByLevel: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 16, 16, 16, 16, 22, 22, 22, 22],
    },
  },

  druid: {
    hitDie: 8,
    savingThrowProfs: ['int', 'wis'],
    skillChoices: {
      count: 2,
      options: [
        'arcana', 'animal_handling', 'insight', 'medicine',
        'nature', 'perception', 'religion', 'survival',
      ],
    },
    spellcasting: {
      ability: 'wis',
      progression: 'full',
      preparedByLevel: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 16, 16, 16, 16, 22, 22, 22, 22],
    },
  },

  fighter: {
    hitDie: 10,
    savingThrowProfs: ['str', 'con'],
    skillChoices: {
      count: 2,
      options: [
        'acrobatics', 'animal_handling', 'athletics', 'history',
        'insight', 'intimidation', 'perception', 'survival',
      ],
    },
    // Eldritch Knight (subclass) adds spellcasting at L3 — handled by subclass
    // tables, not the base class entry.
  },

  monk: {
    hitDie: 8,
    savingThrowProfs: ['str', 'dex'],
    skillChoices: {
      count: 2,
      options: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    },
  },

  paladin: {
    hitDie: 10,
    savingThrowProfs: ['wis', 'cha'],
    skillChoices: {
      count: 2,
      options: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    },
    spellcasting: {
      ability: 'cha',
      progression: 'half',
      // 2024 Paladin prepared-spell table:
      // L1=N/A (no slots), L2=4, L3=5, L4=6, L5=6, L6=6, L7=7, L8=7, L9=9,
      // L10=9, L11=10, L12=10, L13=11, L14=11, L15=12, L16=12, L17=14, L18=14,
      // L19=15, L20=15
      preparedByLevel: [0, 0, 4, 5, 6, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
    },
  },

  ranger: {
    hitDie: 10,
    savingThrowProfs: ['str', 'dex'],
    skillChoices: {
      count: 3,
      options: [
        'animal_handling', 'athletics', 'insight', 'investigation',
        'nature', 'perception', 'stealth', 'survival',
      ],
    },
    spellcasting: {
      ability: 'wis',
      progression: 'half',
      preparedByLevel: [0, 2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
    },
  },

  rogue: {
    hitDie: 8,
    savingThrowProfs: ['dex', 'int'],
    skillChoices: {
      count: 4,
      options: [
        'acrobatics', 'athletics', 'deception', 'insight', 'intimidation',
        'investigation', 'perception', 'performance', 'persuasion',
        'sleight_of_hand', 'stealth',
      ],
    },
    // Arcane Trickster (subclass) adds spellcasting at L3 — handled by subclass.
  },

  sorcerer: {
    hitDie: 6,
    savingThrowProfs: ['con', 'cha'],
    skillChoices: {
      count: 2,
      options: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    },
    spellcasting: {
      ability: 'cha',
      progression: 'full',
      // Sorcerer is "known", not "prepared" — included for cap parity with the
      // 2024 known-spells table.
      preparedByLevel: [0, 2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 22],
    },
  },

  warlock: {
    hitDie: 8,
    savingThrowProfs: ['wis', 'cha'],
    skillChoices: {
      count: 2,
      options: [
        'arcana', 'deception', 'history', 'intimidation',
        'investigation', 'nature', 'religion',
      ],
    },
    spellcasting: {
      ability: 'cha',
      progression: 'pact',
      // Warlock 2024 known spells: L1=2, L2=3, L3=4, L4=5, L5=6, L6=7, L7=8, L8=9,
      // L9=10, L10=10, L11=11, L12=11, L13=12, L14=12, L15=13, L16=13, L17=14,
      // L18=14, L19=15, L20=15
      preparedByLevel: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    },
  },

  wizard: {
    hitDie: 6,
    savingThrowProfs: ['int', 'wis'],
    skillChoices: {
      count: 2,
      options: [
        'arcana', 'history', 'insight', 'investigation',
        'medicine', 'nature', 'religion',
      ],
    },
    spellcasting: {
      ability: 'int',
      progression: 'full',
      preparedByLevel: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 16, 16, 16, 16, 22, 22, 22, 22],
    },
  },

  artificer: {
    hitDie: 8,
    savingThrowProfs: ['con', 'int'],
    skillChoices: {
      count: 2,
      options: [
        'arcana', 'history', 'investigation', 'medicine',
        'nature', 'perception', 'sleight_of_hand',
      ],
    },
    spellcasting: {
      ability: 'int',
      progression: 'half',
      preparedByLevel: [0, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
    },
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Safe lookup that lowercases the input and returns null when no class matches. */
export function getClassDef(classKey: string | null | undefined): ClassDef | null {
  if (!classKey) return null
  const key = String(classKey).trim().toLowerCase() as ClassKey
  return CLASS_DATA[key] ?? null
}

/** Returns 2024 prepared-spell count, or null if the class has no 2024 table. */
export function getPreparedSpellCount(classKey: string | null | undefined, level: number): number | null {
  const def = getClassDef(classKey)
  const tbl = def?.spellcasting?.preparedByLevel
  if (!tbl) return null
  const safeLevel = Math.max(0, Math.min(20, Math.floor(level)))
  return tbl[safeLevel] ?? null
}

/** Returns the casting ability for a class (e.g., 'wis' for Druid). */
export function getCastingAbility(classKey: string | null | undefined): AbilityKey | null {
  return getClassDef(classKey)?.spellcasting?.ability ?? null
}
