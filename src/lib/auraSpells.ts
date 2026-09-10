// src/lib/auraSpells.ts
// Concentration spells that create an emanation/aura centered on the caster.
// Casting one draws a radius ring on the caster's token that follows them until
// concentration ends.

function norm(s: string): string {
  return String(s ?? '').trim().toLowerCase()
}

/** Normalized spell name → aura radius in feet + a short label + ring color. */
const AURA_SPELLS: Record<string, { radiusFt: number; label: string; color: string }> = {
  'spirit guardians':  { radiusFt: 15, label: 'Spirit Guardians', color: '#a78bfa' },
  'aura of vitality':  { radiusFt: 30, label: 'Aura of Vitality',  color: '#4ade80' },
  'aura of life':      { radiusFt: 30, label: 'Aura of Life',      color: '#facc15' },
  'aura of purity':    { radiusFt: 30, label: 'Aura of Purity',    color: '#38bdf8' },
  'antilife shell':    { radiusFt: 10, label: 'Antilife Shell',    color: '#84cc16' },
  'crusaders mantle':  { radiusFt: 30, label: "Crusader's Mantle", color: '#fbbf24' },
  "crusader's mantle": { radiusFt: 30, label: "Crusader's Mantle", color: '#fbbf24' },
  'circle of power':   { radiusFt: 30, label: 'Circle of Power',   color: '#c084fc' },
  'moonbeam':          { radiusFt: 5,  label: 'Moonbeam',          color: '#93c5fd' },
}

export type SpellAura = { radiusFt: number; label: string; color: string }

/** Aura info for a spell, or null if it doesn't create one. */
export function getSpellAura(spellName: string): SpellAura | null {
  return AURA_SPELLS[norm(spellName)] ?? null
}
