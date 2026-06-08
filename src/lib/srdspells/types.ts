// Shared types for SRD spells

export type SpellSaveAbility = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

// Main 5e PHB casters + half-casters
export type SpellClass =
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'paladin'
  | 'ranger'
  | 'sorcerer'
  | 'warlock'
  | 'wizard'
  | 'artificer'

export type SpellDamageType =
  | 'acid' | 'bludgeoning' | 'cold' | 'fire' | 'force' | 'lightning'
  | 'necrotic' | 'piercing' | 'poison' | 'psychic' | 'radiant'
  | 'slashing' | 'thunder'

export type AreaShape = 'sphere' | 'cone' | 'line' | 'cube' | 'cylinder' | 'square'

export type AreaOfEffect = {
  shape: AreaShape
  /** Radius for sphere/cylinder, edge length for cube/square/cone, length for line. */
  sizeFt: number
  heightFt?: number
  widthFt?: number
}

/**
 * Cantrip damage scales with character level at the standard 5/11/17 breakpoints.
 * Each value is the FULL dice expression at that tier (e.g. "2d10").
 */
export type CantripScaling = {
  l5:  string
  l11: string
  l17: string
}

export type SpellSource = 'srd-5.1' | 'srd-5.2' | 'class-gap'

export type SrdSpell = {
  // ── original fields (unchanged) ────────────────────────────────────────
  name: string
  level: number // 0 = cantrip
  school: string
  castingTime: string
  range: string
  components: string
  duration: string
  attackRoll?: boolean
  saveAbility?: SpellSaveAbility
  damage?: string // formula e.g. "2d8+3"
  notes?: string
  classes?: SpellClass[] // which class spell lists this belongs to
  /** Extra damage added per spell slot level above the spell's base level (e.g. "1d6") */
  upcastDamage?: string
  /** If true, the base damage already scales — show upcast table instead of +upcastDamage */
  upcastNotes?: string

  // ── new optional detail fields (additive, non-breaking) ─────────────────
  /** Explicit concentration flag. Falls back to /concentration/i.test(duration). */
  concentration?: boolean
  /** Explicit ritual flag. Falls back to /ritual/i.test(castingTime). */
  ritual?: boolean
  /** Full 2024 PHB rules text (or our plain-language rewrite for class-gap fills). */
  fullDescription?: string
  /** "At Higher Levels" callout for leveled spells. */
  higherLevels?: string
  /** Cantrip damage at character levels 5 / 11 / 17. */
  cantripScaling?: CantripScaling
  areaOfEffect?: AreaOfEffect
  /** Free-form target description: "one creature", "up to three creatures", etc. */
  targets?: string
  damageType?: SpellDamageType
  /** Condition tags for future automation: ['blinded','charmed','frightened',…]. */
  mechanicalEffects?: string[]
  /** Sourced from official SRD or our class-gap fill. */
  source?: SpellSource
}
