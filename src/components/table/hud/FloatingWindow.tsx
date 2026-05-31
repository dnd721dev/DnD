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
}

export function FloatingWindow({
  mode, isMobile, title, headerExtras, children,
  dockedHeight, floatingRect, collapsed, opacity,
  onDockedHeight, onFloatingRect, onToggleCollapse, onToggleExpand, mapExpanded,
  onOpacity, onSnapZone,
}: FloatingWindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; rect: HudRect } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; rect: HudRect } | null>(null)
  const dockRef = useRef<{ startY: number; height: number } | null>(null)
  const [hoverZone, setHoverZone] = useState<SnapZone>(null)
  const [showOpacity, setShowOpacity] = useState(false)

  // ── Docked: top-edge handle resizes height (drag up = taller) ──────────────
  function onDockHandleDown(e: ReactPointerEvent) {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dockRef.current = { startY: e.clientY, height: dockedHeight }
  }
  function onDockHandleMove(e: ReactPointerEvent) {
    const s = dockRef.current
    if (!s) return
    onDockedHeight(s.height + (s.startY - e.clientY))
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

  const body = collapsed ? null : (
    <div className="min-h-0 flex-1 overflow-y-auto" style={floating ? { opacity } : undefined}>
      {children}
    </div>
  )

  if (floating) {
    const hl = hoverZone ? rectForZone(hoverZone, floatingRect) : null
    return (
      <>
        {/* Snap highlight while dragging near a zone */}
        {hl && (
          <div
            className="pointer-events-none fixed z-[59] rounded-xl border-2 border-yellow-400/70 bg-yellow-400/10"
            style={{ left: hl.x, top: hl.y, width: hl.w, height: collapsed ? 48 : hl.h }}
          />
        )}
        <div
          className="pointer-events-auto fixed z-[60] flex flex-col overflow-hidden rounded-xl border border-yellow-700/40 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-md"
          style={{
            left: floatingRect.x,
            top: floatingRect.y,
            width: floatingRect.w,
            height: collapsed ? undefined : floatingRect.h,
          }}
        >
          {titleBar}
          {body}
          {!collapsed && (
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
          )}
        </div>
      </>
    )
  }

  // Docked (bottom). Parent provides a positioned (relative) ancestor.
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-xl border border-b-0 border-yellow-700/40 bg-slate-950/95 text-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.7)] backdrop-blur-md">
      {!isMobile && !collapsed && (
        <div
          onPointerDown={onDockHandleDown}
          onPointerMove={onDockHandleMove}
          onPointerUp={onDockHandleUp}
          className="flex h-3 shrink-0 cursor-ns-resize items-center justify-center"
          style={{ touchAction: 'none' }}
          title="Drag to resize"
        >
          <div className="h-1.5 w-12 rounded-full bg-slate-600 hover:bg-yellow-500/60" />
        </div>
      )}
      {titleBar}
      {!collapsed && (
        <div className="min-h-0 overflow-y-auto" style={{ height: dockedHeight }}>
          {children}
        </div>
      )}
    </div>
  )
}
