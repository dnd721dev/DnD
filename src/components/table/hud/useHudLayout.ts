// src/components/table/hud/useHudLayout.ts
// Layout controller for the tabletop HUD. Owns map-expanded state, docked vs
// floating geometry, collapse/opacity/snap, and per-user+role persistence.

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HudLayoutState, HudRect, HudRole, PanelMode, SnapZone } from './types'

const STORAGE_VERSION = 'v1'

function defaultsFor(role: HudRole): HudLayoutState {
  return {
    dockedHeight: role === 'gm' ? 220 : 200,
    floatingRect: { x: -1, y: -1, w: 440, h: 360 }, // x/y -1 → seeded to bottom-right on first mount
    collapsed: false,
    opacity: 1,
    snapZone: null,
    tabOrder: [],
    hiddenTabs: [],
  }
}

function storageKey(role: HudRole, wallet: string | null): string {
  return `dnd721:hud:${STORAGE_VERSION}:${role}:${(wallet || 'anon').toLowerCase()}`
}

function clampRectToViewport(r: HudRect): HudRect {
  if (typeof window === 'undefined') return r
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w = Math.min(Math.max(280, r.w), vw)
  const h = Math.min(Math.max(160, r.h), vh)
  const x = Math.min(Math.max(0, r.x), Math.max(0, vw - w))
  const y = Math.min(Math.max(0, r.y), Math.max(0, vh - h))
  return { x, y, w, h }
}

export interface UseHudLayout {
  mapExpanded: boolean
  setMapExpanded: (v: boolean) => void
  panelMode: PanelMode
  isMobile: boolean

  layout: HudLayoutState
  setDockedHeight: (h: number) => void
  setFloatingRect: (r: HudRect) => void
  setCollapsed: (v: boolean) => void
  setOpacity: (v: number) => void
  setSnapZone: (z: SnapZone) => void
  setTabOrder: (keys: string[]) => void
  setHiddenTabs: (keys: string[]) => void
}

export function useHudLayout(wallet: string | null, role: HudRole): UseHudLayout {
  const [mapExpanded, setMapExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [layout, setLayout] = useState<HudLayoutState>(() => defaultsFor(role))
  const loadedRef = useRef(false)

  // Track mobile (coarse / narrow). Free-floating is disabled on mobile.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 640px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Load persisted layout after mount (SSR-safe). Merge stored over defaults.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const base = defaultsFor(role)
    try {
      const raw = window.localStorage.getItem(storageKey(role, wallet))
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<HudLayoutState>
        const merged: HudLayoutState = {
          ...base,
          ...parsed,
          floatingRect: { ...base.floatingRect, ...(parsed.floatingRect ?? {}) },
          tabOrder: Array.isArray(parsed.tabOrder) ? parsed.tabOrder : base.tabOrder,
          hiddenTabs: Array.isArray(parsed.hiddenTabs) ? parsed.hiddenTabs : base.hiddenTabs,
        }
        setLayout(merged)
      } else {
        setLayout(base)
      }
    } catch {
      setLayout(base)
    }
    loadedRef.current = true
    // Re-run when the identity (wallet/role) changes.
  }, [wallet, role])

  // Seed a sensible floating rect (bottom-right) once we know the viewport.
  useEffect(() => {
    if (typeof window === 'undefined') return
    setLayout((prev) => {
      if (prev.floatingRect.x >= 0 && prev.floatingRect.y >= 0) return prev
      const w = prev.floatingRect.w
      const h = prev.floatingRect.h
      return {
        ...prev,
        floatingRect: {
          w, h,
          x: Math.max(8, window.innerWidth - w - 16),
          y: Math.max(8, window.innerHeight - h - 16),
        },
      }
    })
  }, [])

  // Persist (debounced) whenever layout changes, after the initial load.
  useEffect(() => {
    if (typeof window === 'undefined' || !loadedRef.current) return
    const id = window.setTimeout(() => {
      try { window.localStorage.setItem(storageKey(role, wallet), JSON.stringify(layout)) } catch { /* ignore quota */ }
    }, 250)
    return () => window.clearTimeout(id)
  }, [layout, wallet, role])

  const setDockedHeight = useCallback((h: number) => {
    // Cap to the viewport (leaving a little room at the top) so the bottom sheet
    // can be pulled nearly full-screen on phones without running off the top.
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900
    const maxH = Math.min(900, Math.max(200, vh - 56))
    setLayout((p) => ({ ...p, dockedHeight: Math.min(Math.max(120, Math.round(h)), maxH) }))
  }, [])
  const setFloatingRect = useCallback((r: HudRect) => {
    setLayout((p) => ({ ...p, floatingRect: clampRectToViewport(r) }))
  }, [])
  const setCollapsed = useCallback((v: boolean) => setLayout((p) => ({ ...p, collapsed: v })), [])
  const setOpacity = useCallback((v: number) => {
    setLayout((p) => ({ ...p, opacity: Math.min(1, Math.max(0.4, v)) }))
  }, [])
  const setSnapZone = useCallback((z: SnapZone) => setLayout((p) => ({ ...p, snapZone: z })), [])
  const setTabOrder = useCallback((keys: string[]) => setLayout((p) => ({ ...p, tabOrder: keys })), [])
  const setHiddenTabs = useCallback((keys: string[]) => setLayout((p) => ({ ...p, hiddenTabs: keys })), [])

  // On mobile, never free-float: fall back to docked (bottom-sheet) chrome.
  const panelMode: PanelMode = mapExpanded && !isMobile ? 'floating' : 'docked'

  return useMemo(() => ({
    mapExpanded, setMapExpanded, panelMode, isMobile,
    layout,
    setDockedHeight, setFloatingRect, setCollapsed, setOpacity, setSnapZone, setTabOrder, setHiddenTabs,
  }), [mapExpanded, panelMode, isMobile, layout, setDockedHeight, setFloatingRect, setCollapsed, setOpacity, setSnapZone, setTabOrder, setHiddenTabs])
}
