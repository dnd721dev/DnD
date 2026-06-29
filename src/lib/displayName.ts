// src/lib/displayName.ts
// Canonical human-readable name resolution. Wallet addresses are NEVER rendered
// in the UI — instead we show the in-game character name, then the player's
// profile name, falling back to a generic label when no profile is set up.
//
// Priority: character name → profiles.display_name → profiles.username → ANON_NAME.

export const ANON_NAME = 'Anonymous Adventurer'

export interface NameParts {
  /** In-game character name (highest priority when present). */
  characterName?: string | null
  /** profiles.display_name */
  displayName?: string | null
  /** profiles.username */
  username?: string | null
}

/** Resolve a display name. Never returns a wallet address. */
export function resolveDisplayName(p: NameParts): string {
  return (
    p.characterName?.trim() ||
    p.displayName?.trim() ||
    p.username?.trim() ||
    ANON_NAME
  )
}
