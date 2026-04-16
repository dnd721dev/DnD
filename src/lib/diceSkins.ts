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
  // Future skins — examples of what's possible:
  // obsidian: { id: 'obsidian', name: 'Obsidian', tint: { color: '#1a1a2e', highlight: '#e94560', glow: 'rgba(233,69,96,0.8)' } },
  // gold: { id: 'gold', name: 'Gold', tint: { color: '#7c5c1a', highlight: '#ffd700', glow: 'rgba(255,215,0,0.8)' } },
  // gemstone: { id: 'gemstone', name: 'Gemstone', tint: { color: '#0d3b2e', highlight: '#00ff88', glow: 'rgba(0,255,136,0.8)' } },
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
