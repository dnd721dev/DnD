// src/lib/gameType.ts
// Shared CAYA vs Free-Level game-type helpers, used by campaign selection,
// session join, and the invite flow.

export type GameType = 'set_level' | 'caya'

/** True if a character (by is_caya) is allowed in a game of the given type. */
export function characterMatchesType(isCaya: boolean, type: GameType): boolean {
  return type === 'caya' ? isCaya === true : isCaya === false
}

export function typeLabel(t: GameType): string {
  return t === 'caya' ? 'CAYA (Come As You Are)' : 'Free-Level'
}

export function typeShort(t: GameType): string {
  return t === 'caya' ? 'CAYA' : 'Free-Level'
}

/** Why a character can't be used in this game type (for UI messaging). */
export function mismatchReason(type: GameType): string {
  return type === 'caya'
    ? 'CAYA games require a CAYA character (created at level 1).'
    : 'Free-Level games require a Free-Level character (not a CAYA character).'
}
