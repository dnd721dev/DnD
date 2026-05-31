// src/components/table/hud/types.ts
// Shared types for the tabletop HUD (dock + floating panel) system.

import type { ReactNode } from 'react'

export type PanelMode = 'docked' | 'floating'

export type HudRole = 'gm' | 'player'

/** A rectangle in viewport pixels for the floating window. */
export interface HudRect {
  x: number
  y: number
  w: number
  h: number
}

/** Snap targets for the floating window (P2). */
export type SnapZone =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | null

/** Persisted, per-user+role HUD layout. */
export interface HudLayoutState {
  /** Docked panel height in px. */
  dockedHeight: number
  /** Floating window geometry. */
  floatingRect: HudRect
  /** Collapsed (minimized to title bar) in either mode. */
  collapsed: boolean
  /** Floating body opacity (0.4–1.0). 1.0 docked. (P2) */
  opacity: number
  /** Active snap zone for re-anchoring on resize. (P2) */
  snapZone: SnapZone
  /** Tab order (keys). (P3) */
  tabOrder: string[]
  /** Hidden tab keys. (P3) */
  hiddenTabs: string[]
}

/** A panel tab/widget descriptor (single source of truth for docked + floating). */
export interface HudTab {
  key: string
  label: string
  render: () => ReactNode
  /** Keep mounted even when not the active tab (preserves realtime subscriptions). */
  alwaysMounted?: boolean
}
