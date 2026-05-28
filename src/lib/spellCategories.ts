// src/lib/spellCategories.ts
// Categorise SRD spells into combat / healing / utility based on actual
// SrdSpell fields (no heal_dice or damage_dice — those fields don't exist).
//
// SrdSpell truth:
//   attackRoll?: boolean   — spell attack roll (NOT 'spell_attack')
//   saveAbility?: string   — save ability (NOT 'save_type')
//   damage?: string        — damage dice string (NOT 'damage_dice')
//   notes?: string         — free text; healing dice live here
//   duration: string       — concentration if includes 'concentration'

import type { SrdSpell } from '@/lib/srdspells'

export type SpellCategory = 'combat' | 'healing' | 'utility'

// Known healing spell names (lower-cased for matching)
const HEALING_SPELL_NAMES = new Set([
  'cure wounds',
  'healing word',
  'mass cure wounds',
  'mass healing word',
  'prayer of healing',
  'aura of vitality',
  'aura of life',
  'life transference',
  'regenerate',
  'revivify',
  'greater restoration',
  'lesser restoration',
  'aid',
  'beacon of hope',
  'death ward',
  'heal',
  'spare the dying',
  'power word heal',
])

const HEALING_NOTES_KEYWORDS = [
  'regains',
  'regain',
  'restores',
  'restore',
  ' heal',
  'hit points are restored',
  'hit point maximum',
  'stabilizes',
  'returns to 1 hit point',
]

export function categorizeSpell(spell: SrdSpell): SpellCategory {
  const nameLower = spell.name.toLowerCase()
  const notesLower = (spell.notes ?? '').toLowerCase()

  // Healing check first — some healing spells also have saves (e.g. Prayer of Healing)
  if (HEALING_SPELL_NAMES.has(nameLower)) return 'healing'
  if (HEALING_NOTES_KEYWORDS.some(k => notesLower.includes(k))) return 'healing'

  // Combat: has damage dice OR spell attack roll OR save + damage
  if (spell.damage) return 'combat'
  if (spell.attackRoll) return 'combat'
  // Save-only spells without damage are utility (Sleep, Hold Person, etc.)
  return 'utility'
}

/** Cantrips scale with character level (not slot level). */
export function scaleCantripDamage(damage: string, charLevel: number): string {
  const m = damage.match(/^(\d+)(d\d+.*)$/)
  if (!m) return damage
  // 5e rule: cantrips gain dice at levels 5, 11, 17
  const extraDice = charLevel >= 17 ? 3 : charLevel >= 11 ? 2 : charLevel >= 5 ? 1 : 0
  const count = 1 + extraDice
  return `${count}${m[2]}`
}

/** Scale a leveled spell's damage dice for upcasting. */
export function scaleDamageForSlot(spell: SrdSpell, slotLevel: number): string {
  const base = spell.damage ?? '1d6'
  if (spell.level === 0) return base // cantrip — use scaleCantripDamage instead
  if (!spell.upcastDamage || slotLevel <= spell.level) return base

  const extraLevels = slotLevel - spell.level
  const upcast = spell.upcastDamage

  // upcastDamage is like "1d6" — multiply count by extraLevels and add to base
  const baseMatch  = base.match(/^(\d+)(d\d+)(.*)$/)
  const extraMatch = upcast.match(/^(\d+)(d\d+)/)

  if (!baseMatch || !extraMatch || baseMatch[2] !== extraMatch[2]) {
    // Different die types — just return base + note
    return base
  }

  const baseCount  = parseInt(baseMatch[1])
  const extraCount = parseInt(extraMatch[1]) * extraLevels
  return `${baseCount + extraCount}${baseMatch[2]}${baseMatch[3] ?? ''}`
}

/**
 * Extract a healing dice string from the spell's notes field.
 * Looks for patterns like "1d8" or "2d4" in the notes.
 * Falls back to a curated lookup, then '1d8'.
 */
const HEAL_DICE_LOOKUP: Record<string, string> = {
  'cure wounds':       '1d8',
  'healing word':      '1d4',
  'mass cure wounds':  '3d8',
  'mass healing word': '1d4',
  'prayer of healing': '2d8',
  'aura of vitality':  '2d6',
  'life transference': '4d8',
  'heal':              '70',   // flat 70 HP at base, but still works as a roll
  'regenerate':        '4d8+15',
  'revivify':          '1',
  'aid':               '5',   // +5 max HP each target
}

export function getHealDice(spell: SrdSpell): string {
  const key = spell.name.toLowerCase()
  if (HEAL_DICE_LOOKUP[key]) return HEAL_DICE_LOOKUP[key]
  // Try to pull the first dice expression from the notes
  const m = (spell.notes ?? '').match(/(\d+d\d+)/)
  return m ? m[1] : '1d8'
}

/** Upcast heal dice string */
export function scaleHealForSlot(spell: SrdSpell, slotLevel: number): string {
  const base = getHealDice(spell)
  if (spell.level === 0) return base
  if (!spell.upcastDamage || slotLevel <= spell.level) return base

  const extraLevels = slotLevel - spell.level
  const upcast = spell.upcastDamage
  const baseMatch  = base.match(/^(\d+)(d\d+)(.*)$/)
  const extraMatch = upcast.match(/^(\d+)(d\d+)/)

  if (!baseMatch || !extraMatch || baseMatch[2] !== extraMatch[2]) return base

  const baseCount  = parseInt(baseMatch[1])
  const extraCount = parseInt(extraMatch[1]) * extraLevels
  return `${baseCount + extraCount}${baseMatch[2]}${baseMatch[3] ?? ''}`
}

/** True for classes that have spell slots */
export function isSpellcaster(className: string | null | undefined): boolean {
  if (!className) return false
  const c = className.toLowerCase().trim()
  return ['bard','cleric','druid','sorcerer','wizard','warlock','paladin','ranger','artificer'].includes(c)
}

/** Returns the spellcasting ability key for a class */
export function getSpellcastingAbility(className: string): 'int' | 'wis' | 'cha' {
  const c = className.toLowerCase().trim()
  if (c === 'wizard' || c === 'artificer') return 'int'
  if (c === 'cleric' || c === 'druid' || c === 'ranger') return 'wis'
  return 'cha'
}

/** Proficiency bonus from character level */
export function profBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2
}

/** Standard D&D ability modifier */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Wave 6K — per-spell casting ability for multiclass characters.
 *
 * 5e rule: each class uses ITS OWN spellcasting ability. A Cleric/Wizard
 * multiclass casts Cleric spells with WIS and Wizard spells with INT.
 *
 * Algorithm:
 *  1. Determine which of the character's classes can cast `spell` (i.e. the
 *     spell's `classes` array intersects with the character's class list).
 *  2. If only ONE such class, return that class's ability.
 *  3. If multiple (e.g. Cure Wounds is on Cleric AND Bard lists), pick the
 *     class whose ability modifier is HIGHER.
 *  4. If none, fall back to the primary class's ability.
 *
 * EK/AT third-caster subclasses count as Wizard-list casters (INT).
 */
export function getCastingAbilityForSpell(
  args: {
    primaryClass: string | null | undefined
    secondaryClass?: string | null
    primarySubclass?: string | null
    secondarySubclass?: string | null
    abilities: Partial<Record<'str'|'dex'|'con'|'int'|'wis'|'cha', number>>
  },
  spell: { classes?: readonly string[] },
): 'int' | 'wis' | 'cha' {
  const primary = (args.primaryClass ?? '').toLowerCase()
  const secondary = (args.secondaryClass ?? '').toLowerCase()
  const spellClasses = (spell.classes ?? []) as string[]

  type Candidate = { classKey: string, ability: 'int' | 'wis' | 'cha' }
  const candidates: Candidate[] = []
  function consider(cls: string, sub: string | null | undefined) {
    if (!cls) return
    // EK / AT cast wizard-list spells with INT.
    if (cls === 'fighter' && (sub ?? '').toLowerCase() === 'fighter_eldritch_knight') {
      candidates.push({ classKey: 'wizard', ability: 'int' })
      return
    }
    if (cls === 'rogue' && (sub ?? '').toLowerCase() === 'rogue_arcane_trickster') {
      candidates.push({ classKey: 'wizard', ability: 'int' })
      return
    }
    if (isSpellcaster(cls)) {
      candidates.push({ classKey: cls, ability: getSpellcastingAbility(cls) })
    }
  }
  consider(primary, args.primarySubclass)
  consider(secondary, args.secondarySubclass)

  const matching = candidates.filter(c => spellClasses.includes(c.classKey))
  if (matching.length === 0) {
    return candidates[0]?.ability ?? 'int'
  }
  if (matching.length === 1) return matching[0].ability

  function mod(ab: 'int' | 'wis' | 'cha'): number {
    return abilityModifier(Number(args.abilities[ab] ?? 10))
  }
  return matching.sort((a, b) => mod(b.ability) - mod(a.ability))[0].ability
}
