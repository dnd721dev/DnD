// src/lib/summonSpells.ts
// Spells that place a controllable thing on the map — either a summoned CREATURE
// (Find Steed → Otherworldly Steed) or a conjured OBJECT/EFFECT the caster moves
// and attacks with (Spiritual Weapon, Bigby's Hand, Flaming Sphere). The spell
// dashboard offers a "Summon" button that spawns the corresponding token.

import { ALL_SRD_MONSTERS } from '@/lib/monstersData'

function norm(s: string): string {
  return String(s ?? '').trim().toLowerCase()
}

/** A token the dashboard can spawn for the caster. */
export type SummonDescriptor = {
  name: string
  /** Token HP (null = an effect that can't be damaged/targeted). */
  hitPoints: number | null
  /** Token AC (null = not applicable). */
  armorClass: number | null
  /** `srd:<id>` monster reference when this maps to a real statblock. */
  monsterId?: string
  /** True for conjured objects/effects (no creature statblock). */
  isEffect?: boolean
}

/** Summoned creatures — resolved from their statblock in summons.ts. */
const SPELL_TO_CREATURE_ID: Record<string, string> = {
  'find steed': 'otherworldly-steed',
  'find greater steed': 'otherworldly-steed',
  'animate objects': 'animated-object',
  'summon dragon': 'draconic-spirit',
  'summon draconic spirit': 'draconic-spirit',
  'draconic spirit': 'draconic-spirit',
  'summon aberration': 'chittering-horror',
  'chittering horror': 'chittering-horror',
}

/** Conjured objects/effects — controllable tokens with no creature statblock. */
const CONJURED_EFFECTS: Record<string, SummonDescriptor> = {
  'spiritual weapon': { name: 'Spiritual Weapon', hitPoints: null, armorClass: null, isEffect: true },
  'flaming sphere':   { name: 'Flaming Sphere',   hitPoints: null, armorClass: null, isEffect: true },
  "bigby's hand":     { name: "Bigby's Hand",     hitPoints: null, armorClass: null, isEffect: true },
  'arcane hand':      { name: "Bigby's Hand",     hitPoints: null, armorClass: null, isEffect: true },
  'dancing lights':   { name: 'Dancing Lights',   hitPoints: null, armorClass: null, isEffect: true },
  'cloud of daggers': { name: 'Cloud of Daggers', hitPoints: null, armorClass: null, isEffect: true },
  'wall of fire':     { name: 'Wall of Fire',     hitPoints: null, armorClass: null, isEffect: true },
  'sickening radiance': { name: 'Sickening Radiance', hitPoints: null, armorClass: null, isEffect: true },
}

const CREATURE_BY_ID = new Map(ALL_SRD_MONSTERS.map((m) => [m.id, m]))

/** Returns what a spell summons/conjures, or null if it isn't one. */
export function getSummonForSpell(spellName: string): SummonDescriptor | null {
  const key = norm(spellName)
  const creatureId = SPELL_TO_CREATURE_ID[key]
  if (creatureId) {
    const m = CREATURE_BY_ID.get(creatureId)
    if (m) return { name: m.name, hitPoints: m.hitPoints, armorClass: m.armorClass, monsterId: `srd:${m.id}` }
  }
  return CONJURED_EFFECTS[key] ?? null
}

/** True if this spell places a controllable token on the map. */
export function isSummonSpell(spellName: string): boolean {
  const key = norm(spellName)
  return key in SPELL_TO_CREATURE_ID || key in CONJURED_EFFECTS
}
