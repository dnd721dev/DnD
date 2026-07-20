// src/components/table/hud/FloatingWindow.tsx
// Content-agnostic shell for the tabletop HUD panel. Renders the panel body in
// either a bottom-docked mode (vertical height-resize) or a free-floating mode
// (drag to move, corner-resize, opacity, edge/corner snap), with a
// collapse/minimize toggle.

'use client'

import { useState, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { HudRect, PanelMode, SnapZone } from './types'

const SNAP_THRESHOLD = 48
const SNAP_GAP = 12

function viewport() {
  return { vw: window.innerWidth, vh: window.innerHeight }
}

/** Which snap zone (if any) a rect is near, based on edge proximity. */
function detectZone(r: HudRect): SnapZone {
  if (typeof window === 'undefined') return null
  const { vw, vh } = viewport()
  const nearL = r.x <= SNAP_THRESHOLD
  const nearR = vw - (r.x + r.w) <= SNAP_THRESHOLD
  const nearT = r.y <= SNAP_THRESHOLD
  const nearB = vh - (r.y + r.h) <= SNAP_THRESHOLD
  if (nearT && nearL) return 'top-left'
  if (nearT && nearR) return 'top-right'
  if (nearB && nearL) return 'bottom-left'
  if (nearB && nearR) return 'bottom-right'
  if (nearT) return 'top'
  if (nearB) return 'bottom'
  return null
}

/** Anchored rect for a zone, preserving the window's current w/h. */
function rectForZone(zone: SnapZone, r: HudRect): HudRect {
  if (!zone || typeof window === 'undefined') return r
  const { vw, vh } = viewport()
  const cx = Math.round((vw - r.w) / 2)
  switch (zone) {
    case 'top-left':     return { ...r, x: SNAP_GAP, y: SNAP_GAP }
    case 'top-right':    return { ...r, x: vw - r.w - SNAP_GAP, y: SNAP_GAP }
    case 'bottom-left':  return { ...r, x: SNAP_GAP, y: vh - r.h - SNAP_GAP }
    case 'bottom-right': return { ...r, x: vw - r.w - SNAP_GAP, y: vh - r.h - SNAP_GAP }
    case 'top':          return { ...r, x: cx, y: SNAP_GAP }
    case 'bottom':       return { ...r, x: cx, y: vh - r.h - SNAP_GAP }
    default:             return r
  }
}

interface FloatingWindowProps {
  mode: PanelMode
  isMobile: boolean
  title: ReactNode
  headerExtras?: ReactNode
  children: ReactNode

  // Geometry (controlled)
  dockedHeight: number
  floatingRect: HudRect
  collapsed: boolean
  opacity: number

  // Callbacks
  onDockedHeight: (h: number) => void
  onFloatingRect: (r: HudRect) => void
  onToggleCollapse: () => void
  onToggleExpand: () => void
  mapExpanded: boolean
  onOpacity?: (v: number) => void
  onSnapZone?: (z: SnapZone) => void
  /** Docked orientation. 'bottom' (default) is the classic bottom sheet;
   *  'left' docks as a side drawer so the map keeps its full height — the
   *  same `dockedHeight` number is reused as the drawer WIDTH (clamped
   *  340–560px). Floating mode is unaffected. */
  dockSide?: 'bottom' | 'left'
}

const LEFT_DOCK_MIN = 340
const LEFT_DOCK_MAX = 560

export function FloatingWindow({
  mode, isMobile, title, headerExtras, children,
  dockedHeight, floatingRect, collapsed, opacity,
  onDockedHeight, onFloatingRect, onToggleCollapse, onToggleExpand, mapExpanded,
  onOpacity, onSnapZone, dockSide = 'bottom',
}: FloatingWindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; rect: HudRect } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; rect: HudRect } | null>(null)
  const dockRef = useRef<{ startY: number; height: number } | null>(null)
  const [hoverZone, setHoverZone] = useState<SnapZone>(null)
  const [showOpacity, setShowOpacity] = useState(false)

  // ── Docked: top-edge handle resizes height (drag up = taller).
  //    Left dock: right-edge handle resizes width (drag right = wider). ──────
  function onDockHandleDown(e: ReactPointerEvent) {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dockRef.current = { startY: dockSide === 'left' ? e.clientX : e.clientY, height: dockedHeight }
  }
  function onDockHandleMove(e: ReactPointerEvent) {
    const s = dockRef.current
    if (!s) return
    if (dockSide === 'left') {
      const w = s.height + (e.clientX - s.startY)
      onDockedHeight(Math.min(LEFT_DOCK_MAX, Math.max(LEFT_DOCK_MIN, w)))
    } else {
      onDockedHeight(s.height + (s.startY - e.clientY))
    }
  }
  function onDockHandleUp(e: ReactPointerEvent) {
    if (dockRef.current) (e.target as HTMLElement).releasePointerCapture(e.pointerId)
    dockRef.current = null
  }

  // ── Floating: title-bar drag moves the window ──────────────────────────────
  function onTitleDown(e: ReactPointerEvent) {
    if (mode !== 'floating' || isMobile) return
    if ((e.target as HTMLElement).closest('button,input,select,a,[data-no-drag]')) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, rect: floatingRect }
  }
  function onTitleMove(e: ReactPointerEvent) {
    const s = dragRef.current
    if (!s) return
    const next = { ...s.rect, x: s.rect.x + (e.clientX - s.startX), y: s.rect.y + (e.clientY - s.startY) }
    setHoverZone(detectZone(next))
    onFloatingRect(next)
  }
  function onTitleUp(e: ReactPointerEvent) {
    if (dragRef.current) (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    dragRef.current = null
    const zone = hoverZone
    setHoverZone(null)
    if (zone) {
      onFloatingRect(rectForZone(zone, floatingRect))
      onSnapZone?.(zone)
    } else {
      onSnapZone?.(null)
    }
  }

  // ── Floating: corner handle resizes ────────────────────────────────────────
  function onResizeDown(e: ReactPointerEvent) {
    e.preventDefault(); e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    resizeRef.current = { startX: e.clientX, startY: e.clientY, rect: floatingRect }
  }
  function onResizeMove(e: ReactPointerEvent) {
    const s = resizeRef.current
    if (!s) return
    onFloatingRect({ ...s.rect, w: s.rect.w + (e.clientX - s.startX), h: s.rect.h + (e.clientY - s.startY) })
  }
  function onResizeUp(e: ReactPointerEvent) {
    if (resizeRef.current) (e.target as HTMLElement).releasePointerCapture(e.pointerId)
    resizeRef.current = null
  }

  const floating = mode === 'floating'

  const opacityControl = floating && onOpacity ? (
    <div className="relative" data-no-drag>
      <button
        type="button"
        onClick={() => setShowOpacity((v) => !v)}
        title="Panel opacity"
        className="grid h-11 w-11 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        ◐
      </button>
      {showOpacity && (
        <div className="absolute right-0 top-12 z-10 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
          <span className="text-xs text-slate-400">Opacity</span>
          <input
            type="range" min={0.4} max={1} step={0.05} value={opacity}
            onChange={(e) => onOpacity(Number(e.target.value))}
            className="w-28"
          />
        </div>
      )}
    </div>
  ) : null

  const titleBar = (
    <div
      onPointerDown={onTitleDown}
      onPointerMove={onTitleMove}
      onPointerUp={onTitleUp}
      className={`flex items-center justify-between gap-2 border-b border-slate-700/60 bg-slate-900/95 px-3 ${
        floating ? 'cursor-move select-none rounded-t-xl' : ''
      }`}
      style={{ minHeight: 44 }}
    >
      <div className="min-w-0 truncate text-sm font-semibold text-yellow-100">{title}</div>
      <div className="flex shrink-0 items-center gap-1">
        {headerExtras}
        {opacityControl}
        <button
          type="button"
          onClick={onToggleExpand}
          title={mapExpanded ? 'Restore docked layout' : 'Expand map (float panel)'}
          className="grid h-11 w-11 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          {mapExpanded ? '🗗' : '⛶'}
        </button>
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
          className="grid h-11 w-11 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          {collapsed ? '▴' : '▾'}
        </button>
      </div>
    </div>
  )

  // ── Single stable render tree ───────────────────────────────────────────────
  // Both docked and floating modes render the SAME element structure so that
  // toggling `mode` (when the map expands/collapses) only changes attributes —
  // it never unmounts/remounts {children}. That preserves the sidebar's active
  // tab and any open modal across map expand/collapse. Each mode-only chrome bit
  // renders `null` (rather than being omitted) so sibling positions never shift.
  const hl = floating && hoverZone ? rectForZone(hoverZone, floatingRect) : null

  return (
    <>
      {/* Snap highlight slot — position 0 (null unless floating + dragging near a zone) */}
      {hl ? (
        <div
          className="pointer-events-none fixed z-[59] rounded-xl border-2 border-yellow-400/70 bg-yellow-400/10"
          style={{ left: hl.x, top: hl.y, width: hl.w, height: collapsed ? 48 : hl.h }}
        />
      ) : null}

      <div
        className={floating
          ? 'pointer-events-auto fixed z-[60] flex flex-col overflow-hidden rounded-xl border border-yellow-700/40 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-md'
          : dockSide === 'left'
          ? `pointer-events-auto absolute bottom-0 left-0 top-0 z-30 flex flex-col overflow-hidden rounded-r-xl border border-l-0 border-yellow-700/40 bg-slate-950/95 text-slate-100 shadow-[4px_0_24px_rgba(0,0,0,0.7)] backdrop-blur-md${collapsed ? ' !bottom-auto' : ''}`
          : 'pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-xl border border-b-0 border-yellow-700/40 bg-slate-950/95 text-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.7)] backdrop-blur-md'}
        style={floating
          ? { left: floatingRect.x, top: floatingRect.y, width: floatingRect.w, height: collapsed ? undefined : floatingRect.h }
          : dockSide === 'left'
          ? { width: collapsed ? undefined : Math.min(LEFT_DOCK_MAX, Math.max(LEFT_DOCK_MIN, dockedHeight)) }
          : undefined}
      >
        {/* Dock resize handle slot — null when floating/collapsed. Shown on
            mobile too (touchAction:none makes the drag work for touch) so the
            bottom sheet can be pulled up; the grip is taller on mobile for an
            easier touch target. Left dock resizes via its right edge instead. */}
        {!floating && !collapsed && dockSide !== 'left' ? (
          <div
            onPointerDown={onDockHandleDown}
            onPointerMove={onDockHandleMove}
            onPointerUp={onDockHandleUp}
            className={`flex shrink-0 cursor-ns-resize items-center justify-center ${isMobile ? 'h-6' : 'h-3'}`}
            style={{ touchAction: 'none' }}
            title="Drag to resize"
          >
            <div className={`rounded-full bg-slate-500 hover:bg-yellow-500/70 ${isMobile ? 'h-2 w-16' : 'h-1.5 w-12'}`} />
          </div>
        ) : null}

        {titleBar}

        {/* Body — stable position; {children} persist across docked↔floating.
            Floating fills the window (flex-1); bottom dock is bounded to
            dockedHeight (NO flex-1 — the bottom-anchored container would
            otherwise grow to fill the viewport). Left dock fills its full
            height (the container is inset-y bound). */}
        {!collapsed ? (
          <div
            className={floating || dockSide === 'left' ? 'min-h-0 flex-1 overflow-y-auto' : 'min-h-0 overflow-y-auto'}
            style={floating ? { opacity } : dockSide === 'left' ? undefined : { height: dockedHeight }}
          >
            {children}
          </div>
        ) : null}

        {/* Left-dock width-resize handle — right edge */}
        {!floating && !collapsed && dockSide === 'left' ? (
          <div
            onPointerDown={onDockHandleDown}
            onPointerMove={onDockHandleMove}
            onPointerUp={onDockHandleUp}
            className="absolute bottom-0 right-0 top-0 w-2 cursor-ew-resize hover:bg-yellow-500/20"
            style={{ touchAction: 'none' }}
            title="Drag to resize drawer"
            aria-label="Resize GM drawer"
          />
        ) : null}

        {/* Floating resize handle slot — null when docked/collapsed */}
        {floating && !collapsed ? (
          <div
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
            title="Resize"
            style={{ touchAction: 'none' }}
          >
            <div className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 border-b-2 border-r-2 border-slate-500" />
          </div>
        ) : null}
      </div>
    </>
  )
}
