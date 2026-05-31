// src/components/table/hud/FloatingWindow.tsx
// Content-agnostic shell for the tabletop HUD panel. Renders the panel body in
// either a bottom-docked mode (vertical height-resize) or a free-floating mode
// (drag to move, corner-resize, opacity), with a collapse/minimize toggle.

'use client'

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { HudRect, PanelMode } from './types'

interface FloatingWindowProps {
  mode: PanelMode
  isMobile: boolean
  title: ReactNode
  /** Extra controls rendered in the title bar (e.g. customize, opacity). */
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
  /** Map expand/restore toggle lives here so it's reachable in both modes. */
  onToggleExpand: () => void
  mapExpanded: boolean
}

export function FloatingWindow({
  mode, isMobile, title, headerExtras, children,
  dockedHeight, floatingRect, collapsed, opacity,
  onDockedHeight, onFloatingRect, onToggleCollapse, onToggleExpand, mapExpanded,
}: FloatingWindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; rect: HudRect } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; rect: HudRect } | null>(null)
  const dockRef = useRef<{ startY: number; height: number } | null>(null)

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
    // ignore drags that start on a button/input inside the title bar
    if ((e.target as HTMLElement).closest('button,input,select,a,[data-no-drag]')) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, rect: floatingRect }
  }
  function onTitleMove(e: ReactPointerEvent) {
    const s = dragRef.current
    if (!s) return
    onFloatingRect({ ...s.rect, x: s.rect.x + (e.clientX - s.startX), y: s.rect.y + (e.clientY - s.startY) })
  }
  function onTitleUp(e: ReactPointerEvent) {
    if (dragRef.current) (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    dragRef.current = null
  }

  // ── Floating: corner handle resizes ────────────────────────────────────────
  function onResizeDown(e: ReactPointerEvent) {
    e.preventDefault()
    e.stopPropagation()
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
    return (
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
    )
  }

  // Docked (bottom). Parent provides a positioned (relative) ancestor.
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex flex-col overflow-hidden rounded-t-xl border border-b-0 border-yellow-700/40 bg-slate-950/95 text-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.7)] backdrop-blur-md">
      {/* top-edge resize handle (desktop only) */}
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
