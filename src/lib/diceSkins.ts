import { DIE_CONFIG, type DieSides } from './dnd5e'

export type DiceSkinColors = {
  color: string
  highlight: string
  glow: string
}

export type DiceSkin = {
  id: string
  name: string
  /** Optional global tint — applies to all die types unless overridden per-die */
  tint?: DiceSkinColors
  /** Optional per-die-type color overrides */
  colors?: Partial<Record<DieSides, DiceSkinColors>>
}

export const DICE_SKINS: Record<string, DiceSkin> = {
  classic: { id: 'classic', name: 'Classic' },
}

/** Resolve effective die colors, applying any skin overrides over DIE_CONFIG defaults */
export function getSkinColors(sides: DieSides, skin?: DiceSkin | null): DiceSkinColors {
  const base = DIE_CONFIG[sides]
  const perDie = skin?.colors?.[sides]
  const tint = skin?.tint
  const override = perDie ?? tint ?? null
  if (!override) return { color: base.color, highlight: base.highlight, glow: base.glow }
  return {
    color: override.color,
    highlight: override.highlight,
    glow: override.glow,
  }
}

// ── 3D dice customization (profiles.dice_prefs) ─────────────────────────────────

export type DiceMaterial = 'plastic' | 'metal' | 'glass'

/**
 * Per-user 3D dice appearance + sound. Persisted as JSON on `profiles.dice_prefs`.
 * All fields optional so a missing/empty object resolves to the defaults below.
 */
export type DicePrefs = {
  /** Quick-fill preset id (one of DICE_PRESETS). Pure UI sugar — the resolved
   *  color/material fields below are what actually drive rendering. */
  skin?: string
  /** Hex body color for all dice. When unset the per-die-type DIE_CONFIG default is kept. */
  bodyColor?: string | null
  /** Hex color for the numerals. */
  numberColor?: string | null
  material?: DiceMaterial
  soundEnabled?: boolean
  /** 0–1. */
  soundVolume?: number
}

export type ResolvedDicePrefs = {
  skin: string
  /** null = use per-die-type defaults from DIE_CONFIG */
  bodyColor: string | null
  numberColor: string
  material: DiceMaterial
  soundEnabled: boolean
  soundVolume: number
}

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function cleanHex(v: unknown): string | null {
  return typeof v === 'string' && HEX_RE.test(v.trim()) ? v.trim() : null
}

/** Fill in defaults + sanitize. Safe to call on `null`/`{}`/untrusted JSON. */
export function resolveDicePrefs(raw: DicePrefs | null | undefined): ResolvedDicePrefs {
  const p = raw ?? {}
  const material: DiceMaterial =
    p.material === 'metal' || p.material === 'glass' ? p.material : 'plastic'
  const vol = typeof p.soundVolume === 'number' && isFinite(p.soundVolume)
    ? Math.max(0, Math.min(1, p.soundVolume))
    : 0.5
  return {
    skin: typeof p.skin === 'string' ? p.skin : 'classic',
    bodyColor: cleanHex(p.bodyColor),
    numberColor: cleanHex(p.numberColor) ?? '#f8fafc',
    material,
    soundEnabled: p.soundEnabled !== false, // default on
    soundVolume: vol,
  }
}

export type DicePreset = {
  id: string
  name: string
  bodyColor: string
  numberColor: string
  material: DiceMaterial
}

/**
 * Quick-fill gallery for the profile editor. Picking one just fills the
 * full-control fields (body color / number color / material); the user can then
 * tweak freely.
 */
export const DICE_PRESETS: DicePreset[] = [
  { id: 'classic',  name: 'Classic',  bodyColor: '#1e3a8a', numberColor: '#f8fafc', material: 'plastic' },
  { id: 'obsidian', name: 'Obsidian', bodyColor: '#0b0f1a', numberColor: '#e94560', material: 'plastic' },
  { id: 'gold',     name: 'Gold',     bodyColor: '#b8860b', numberColor: '#fff7d6', material: 'metal' },
  { id: 'ruby',     name: 'Ruby',     bodyColor: '#7f1d1d', numberColor: '#fecaca', material: 'glass' },
  { id: 'emerald',  name: 'Emerald',  bodyColor: '#064e3b', numberColor: '#bbf7d0', material: 'glass' },
  { id: 'sapphire', name: 'Sapphire', bodyColor: '#1e3a8a', numberColor: '#bfdbfe', material: 'glass' },
  { id: 'amethyst', name: 'Amethyst', bodyColor: '#4c1d95', numberColor: '#e9d5ff', material: 'glass' },
  { id: 'steel',    name: 'Steel',    bodyColor: '#64748b', numberColor: '#0f172a', material: 'metal' },
  { id: 'bone',     name: 'Bone',     bodyColor: '#e7e5e4', numberColor: '#1c1917', material: 'plastic' },
]

export function getDicePreset(id: string | undefined | null): DicePreset | null {
  return DICE_PRESETS.find((p) => p.id === id) ?? null
}
