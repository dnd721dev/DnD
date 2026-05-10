'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IMAGE_TILE_PATHS, TILE_DEFS, TILE_GROUPS, drawTile, preloadTileImages, type TileData } from '@/lib/tilemap'
import { generateDungeon, generateWilderness } from '@/lib/dungeonGen'

// ── Constants ─────────────────────────────────────────────────────────────────
const CELL_SIZE  = 40     // pixels per cell in the editor canvas
const MAX_HIST   = 50
const MIN_ZOOM   = 0.25
const MAX_ZOOM   = 4.0
const ERASER_KEY = '__erase__'

type Tool = 'pencil' | 'rect' | 'line' | 'fill' | 'eraser' | 'room' | 'corridor_h' | 'corridor_v'

const TOOLS: Array<{ key: Tool; icon: string; label: string }> = [
  { key: 'pencil',     icon: '✏️',  label: 'Pencil'     },
  { key: 'rect',       icon: '▭',   label: 'Rectangle'  },
  { key: 'line',       icon: '╱',   label: 'Line'       },
  { key: 'fill',       icon: '🪣',  label: 'Fill'       },
  { key: 'eraser',     icon: '🗑',  label: 'Eraser'     },
]

const PRESET_TOOLS: Array<{ key: Tool; icon: string; label: string }> = [
  { key: 'room',       icon: '🏠',  label: 'Room'       },
  { key: 'corridor_h', icon: '━',   label: 'Corridor H' },
  { key: 'corridor_v', icon: '┃',   label: 'Corridor V' },
]

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  initialData?: TileData | null
  onSave:   (data: TileData) => void
  onCancel: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function cellKey(col: number, row: number) { return `${col},${row}` }

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

/** Bresenham line between two grid points */
function bresenham(c0: number, r0: number, c1: number, r1: number): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  let dc = Math.abs(c1 - c0), dr = Math.abs(r1 - r0)
  let sc = c0 < c1 ? 1 : -1, sr = r0 < r1 ? 1 : -1
  let err = dc - dr
  let c = c0, r = r0
  while (true) {
    pts.push([c, r])
    if (c === c1 && r === r1) break
    const e2 = 2 * err
    if (e2 > -dr) { err -= dr; c += sc }
    if (e2 <  dc) { err += dc; r += sr }
  }
  return pts
}

/** Cells in a filled or hollow rect */
function rectCells(c0: number, r0: number, c1: number, r1: number, hollow = false): Array<[number, number]> {
  const [mc, xc] = c0 < c1 ? [c0, c1] : [c1, c0]
  const [mr, xr] = r0 < r1 ? [r0, r1] : [r1, r0]
  const pts: Array<[number, number]> = []
  for (let r = mr; r <= xr; r++) {
    for (let c = mc; c <= xc; c++) {
      if (hollow) {
        if (r === mr || r === xr || c === mc || c === xc) pts.push([c, r])
      } else {
        pts.push([c, r])
      }
    }
  }
  return pts
}

/** BFS flood fill — returns set of cell keys to paint */
function floodFill(
  cells: Record<string, string>,
  col: number, row: number,
  cols: number, rows: number,
): Set<string> {
  const target = cells[cellKey(col, row)] ?? ''
  const visited = new Set<string>()
  const queue: Array<[number, number]> = [[col, row]]
  while (queue.length > 0) {
    const [c, r] = queue.shift()!
    const k = cellKey(c, r)
    if (visited.has(k)) continue
    if (c < 0 || c >= cols || r < 0 || r >= rows) continue
    const cur = cells[k] ?? ''
    if (cur !== target) continue
    visited.add(k)
    queue.push([c - 1, r], [c + 1, r], [c, r - 1], [c, r + 1])
  }
  return visited
}

// ── Tile Swatch (32×32 canvas preview of a tile texture) ────────────────────
function TileSwatch({ tileKey, selected, onClick }: {
  tileKey: string; selected: boolean; onClick: () => void
}) {
  const ref    = useRef<HTMLCanvasElement>(null)
  const imgSrc = IMAGE_TILE_PATHS[tileKey]   // defined only for PNG-backed tiles
  const label  = TILE_DEFS.find(t => t.key === tileKey)?.label ?? tileKey

  // Canvas draw — only used when there is no PNG for this key
  useEffect(() => {
    if (imgSrc) return   // skip: we render an <img> instead
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, 32, 32)
    drawTile(ctx, 0, 0, 32, tileKey)
  }, [tileKey, imgSrc])

  return (
    <button
      title={label}
      onClick={onClick}
      className={`relative rounded transition ${selected ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950' : 'hover:ring-1 hover:ring-slate-500'}`}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          width={32}
          height={32}
          alt={label}
          className="block rounded"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <canvas ref={ref} width={32} height={32} className="block rounded" />
      )}
    </button>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MapCreator({ initialData, onSave, onCancel }: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Map state
  const [mapName, setMapName] = useState(initialData?.name ?? 'New Map')
  const [cols, setCols]       = useState(initialData?.cols ?? 24)
  const [rows, setRows]       = useState(initialData?.rows ?? 16)
  const [cells, setCells]     = useState<Record<string, string>>(initialData?.cells ?? {})

  // Tool state
  const [tool, setTool]             = useState<Tool>('pencil')
  const [activeTile, setActiveTile] = useState<string>('stone')
  const [shiftHeld, setShiftHeld]   = useState(false)

  // History (undo/redo)
  const [history, setHistory] = useState<Record<string, string>[]>([])
  const [future,  setFuture]  = useState<Record<string, string>[]>([])

  // Viewport
  const [zoom, setZoom] = useState(1.0)
  const [pan,  setPan]  = useState({ x: 24, y: 24 })

  // Drag state (for rect / line / room / corridor tools)
  const [dragStart, setDragStart] = useState<{ col: number; row: number } | null>(null)
  const [previewKeys, setPreviewKeys] = useState<Set<string>>(new Set())
  const [cursor,     setCursor]       = useState<{ col: number; row: number } | null>(null)

  // Panning via space+drag
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const spaceRef    = useRef(false)
  const paintingRef = useRef(false)      // for pencil/eraser stroke tracking

  // Gen modal
  const [genTarget, setGenTarget] = useState<'dungeon' | 'wilderness' | null>(null)
  const [genCols,   setGenCols]   = useState(cols)
  const [genRows,   setGenRows]   = useState(rows)

  // Resize inputs
  const [resizeCols, setResizeCols] = useState(cols)
  const [resizeRows, setResizeRows] = useState(rows)

  // Kick off PNG preloads once on mount
  useEffect(() => { preloadTileImages() }, [])

  // ── History helpers ─────────────────────────────────────────────────────────
  function pushHistory(snapshot: Record<string, string>) {
    setHistory(h => [...h.slice(-MAX_HIST + 1), snapshot])
    setFuture([])
  }

  function undo() {
    setHistory(h => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      setFuture(f => [cells, ...f.slice(0, MAX_HIST - 1)])
      setCells(prev)
      return h.slice(0, -1)
    })
  }

  function redo() {
    setFuture(f => {
      if (f.length === 0) return f
      const next = f[0]
      setHistory(h => [...h.slice(-MAX_HIST + 1), cells])
      setCells(next)
      return f.slice(1)
    })
  }

  // ── Coordinate conversion ────────────────────────────────────────────────────
  function canvasToGrid(e: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left - pan.x) / zoom
    const y = (e.clientY - rect.top  - pan.y) / zoom
    const col = Math.floor(x / CELL_SIZE)
    const row = Math.floor(y / CELL_SIZE)
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null
    return { col, row }
  }

  // ── Commit a set of cell changes ────────────────────────────────────────────
  function commitCells(overrides: Record<string, string | null>) {
    setCells(prev => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(overrides)) {
        if (v === null) delete next[k]; else next[k] = v
      }
      return next
    })
  }

  // ── Preview cells for drag tools ────────────────────────────────────────────
  function computePreview(endCol: number, endRow: number): Array<[number, number]> {
    if (!dragStart) return []
    const { col: sc, row: sr } = dragStart
    switch (tool) {
      case 'rect':
        return rectCells(sc, sr, endCol, endRow, shiftHeld)
      case 'line':
        return bresenham(sc, sr, endCol, endRow)
      case 'room':
        return rectCells(sc, sr, endCol, endRow, false) // border=wall, interior=stone
      case 'corridor_h':
        return bresenham(sc, sr, endCol, sr)  // axis-lock horizontal
      case 'corridor_v':
        return bresenham(sc, sr, sc, endRow)  // axis-lock vertical
      default:
        return []
    }
  }

  // ── Mouse handlers ───────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || spaceRef.current) {
      // Middle button or space+drag → pan
      panStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
      e.preventDefault()
      return
    }
    if (e.button !== 0) return
    const pos = canvasToGrid(e)
    if (!pos) return
    const { col, row } = pos

    if (tool === 'pencil' || tool === 'eraser') {
      pushHistory(cells)
      paintingRef.current = true
      const override: Record<string, string | null> = {}
      override[cellKey(col, row)] = tool === 'eraser' ? null : activeTile
      commitCells(override)
    } else if (tool === 'fill') {
      pushHistory(cells)
      const toFill = floodFill(cells, col, row, cols, rows)
      const override: Record<string, string | null> = {}
      for (const k of toFill) {
        override[k] = activeTile === ERASER_KEY ? null : activeTile
      }
      commitCells(override)
    } else {
      // Drag-start tools
      setDragStart({ col, row })
      setPreviewKeys(new Set())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, activeTile, cells, cols, rows, pan, zoom, shiftHeld])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Pan
    if (panStartRef.current) {
      const { mx, my, px, py } = panStartRef.current
      setPan({ x: px + e.clientX - mx, y: py + e.clientY - my })
      return
    }

    const pos = canvasToGrid(e)
    setCursor(pos)

    if ((tool === 'pencil' || tool === 'eraser') && paintingRef.current && pos) {
      const override: Record<string, string | null> = {}
      override[cellKey(pos.col, pos.row)] = tool === 'eraser' ? null : activeTile
      commitCells(override)
    }

    if (dragStart && pos) {
      const pts = computePreview(pos.col, pos.row)
      setPreviewKeys(new Set(pts.map(([c, r]) => cellKey(c, r))))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, activeTile, dragStart, pan, zoom, shiftHeld])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (panStartRef.current) { panStartRef.current = null; return }
    paintingRef.current = false

    if (!dragStart) return
    const pos = canvasToGrid(e) ?? dragStart
    const pts = computePreview(pos.col, pos.row)

    if (pts.length > 0) {
      pushHistory(cells)
      const override: Record<string, string | null> = {}
      if (tool === 'room') {
        const { col: sc, row: sr } = dragStart
        const allPts  = rectCells(sc, sr, pos.col, pos.row, false)
        const edgePts = new Set(rectCells(sc, sr, pos.col, pos.row, true).map(([c, r]) => cellKey(c, r)))
        for (const [c, r] of allPts) {
          const k = cellKey(c, r)
          override[k] = edgePts.has(k) ? 'wall' : 'stone'
        }
      } else {
        for (const [c, r] of pts) {
          override[cellKey(c, r)] = activeTile === ERASER_KEY ? null : activeTile
        }
      }
      commitCells(override)
    }
    setDragStart(null)
    setPreviewKeys(new Set())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragStart, cells, activeTile, tool, pan, zoom, shiftHeld])

  const handleMouseLeave = useCallback(() => {
    paintingRef.current = false
    setCursor(null)
    setPreviewKeys(new Set())
  }, [])

  // ── Wheel zoom ───────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
    const newZoom = clamp(zoom * factor, MIN_ZOOM, MAX_ZOOM)
    // Zoom around mouse cursor position
    setPan(p => ({
      x: mx - (mx - p.x) * (newZoom / zoom),
      y: my - (my - p.y) * (newZoom / zoom),
    }))
    setZoom(newZoom)
  }, [zoom])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space') { spaceRef.current = true; return }
      if (e.key === 'Shift') { setShiftHeld(true); return }
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }
      // Tool shortcuts
      if (!mod && document.activeElement?.tagName !== 'INPUT') {
        if (e.key === 'p') setTool('pencil')
        if (e.key === 'r') setTool('rect')
        if (e.key === 'l') setTool('line')
        if (e.key === 'f') setTool('fill')
        if (e.key === 'e') setTool('eraser')
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') spaceRef.current = false
      if (e.key === 'Shift') setShiftHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, history, future])

  // ── Canvas render ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Resize canvas to fill its container
    const container = containerRef.current
    if (container) {
      canvas.width  = container.clientWidth
      canvas.height = container.clientHeight
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#030712'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Determine visible tile range (viewport culling)
    const viewX0 = -pan.x / zoom
    const viewY0 = -pan.y / zoom
    const viewX1 = (canvas.width  - pan.x) / zoom
    const viewY1 = (canvas.height - pan.y) / zoom
    const colStart = Math.max(0, Math.floor(viewX0 / CELL_SIZE) - 1)
    const colEnd   = Math.min(cols - 1, Math.ceil(viewX1 / CELL_SIZE))
    const rowStart = Math.max(0, Math.floor(viewY0 / CELL_SIZE) - 1)
    const rowEnd   = Math.min(rows - 1, Math.ceil(viewY1 / CELL_SIZE))

    // Draw filled tiles
    for (let r = rowStart; r <= rowEnd; r++) {
      for (let c = colStart; c <= colEnd; c++) {
        const k = cellKey(c, r)
        if (cells[k]) drawTile(ctx, c, r, CELL_SIZE, cells[k])
      }
    }

    // Draw preview overlay
    if (previewKeys.size > 0) {
      ctx.globalAlpha = 0.45
      for (const k of previewKeys) {
        const comma = k.indexOf(',')
        const pc = parseInt(k.slice(0, comma), 10)
        const pr = parseInt(k.slice(comma + 1), 10)
        if (tool === 'room') {
          // Preview uses wall for edge, stone for interior — handled at commit
          ctx.fillStyle = '#374151'
          ctx.fillRect(pc * CELL_SIZE, pr * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        } else if (activeTile !== ERASER_KEY) {
          drawTile(ctx, pc, pr, CELL_SIZE, activeTile)
        } else {
          ctx.fillStyle = '#030712'
          ctx.fillRect(pc * CELL_SIZE, pr * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        }
      }
      ctx.globalAlpha = 1
    }

    // Grid lines
    const totalW = cols * CELL_SIZE
    const totalH = rows * CELL_SIZE
    ctx.lineWidth = 0.5 / zoom
    ctx.strokeStyle = 'rgba(148,163,184,0.18)'
    for (let c = colStart; c <= colEnd + 1; c++) {
      const lx = c * CELL_SIZE
      ctx.beginPath(); ctx.moveTo(lx, rowStart * CELL_SIZE); ctx.lineTo(lx, (rowEnd + 1) * CELL_SIZE); ctx.stroke()
    }
    for (let r = rowStart; r <= rowEnd + 1; r++) {
      const ly = r * CELL_SIZE
      ctx.beginPath(); ctx.moveTo(colStart * CELL_SIZE, ly); ctx.lineTo((colEnd + 1) * CELL_SIZE, ly); ctx.stroke()
    }

    // Map border
    ctx.lineWidth = 1.5 / zoom
    ctx.strokeStyle = 'rgba(71,85,105,0.6)'
    ctx.strokeRect(0, 0, totalW, totalH)

    // Cursor highlight
    if (cursor) {
      ctx.strokeStyle = 'rgba(251,191,36,0.9)'
      ctx.lineWidth = 1.5 / zoom
      ctx.strokeRect(cursor.col * CELL_SIZE + 0.5, cursor.row * CELL_SIZE + 0.5, CELL_SIZE - 1, CELL_SIZE - 1)
    }

    ctx.restore()

    // Status bar text (in screen space)
    ctx.fillStyle = 'rgba(100,116,139,0.8)'
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'
    const zoomPct = `${Math.round(zoom * 100)}%`
    const coordStr = cursor ? `  ${cursor.col},${cursor.row}` : ''
    ctx.fillText(`${zoomPct}${coordStr}`, canvas.width - 8, canvas.height - 6)

  }, [cells, previewKeys, cursor, zoom, pan, cols, rows, activeTile, tool])

  // ── Resize handler ───────────────────────────────────────────────────────────
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return
      canvas.width  = container.clientWidth
      canvas.height = container.clientHeight
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // ── Map resize ───────────────────────────────────────────────────────────────
  function applyResize() {
    const nc = Math.max(4, Math.min(200, resizeCols))
    const nr = Math.max(4, Math.min(200, resizeRows))
    pushHistory(cells)
    // Trim cells outside new bounds
    const trimmed: Record<string, string> = {}
    for (const [k, v] of Object.entries(cells)) {
      const comma = k.indexOf(',')
      const c = parseInt(k.slice(0, comma), 10)
      const r = parseInt(k.slice(comma + 1), 10)
      if (c < nc && r < nr) trimmed[k] = v
    }
    setCols(nc); setRows(nr); setCells(trimmed)
    setResizeCols(nc); setResizeRows(nr)
  }

  // ── Procedural generation ────────────────────────────────────────────────────
  function runGenerate() {
    if (!genTarget) return
    const nc = Math.max(8, Math.min(200, genCols))
    const nr = Math.max(8, Math.min(200, genRows))
    pushHistory(cells)
    const result = genTarget === 'dungeon'
      ? generateDungeon({ cols: nc, rows: nr })
      : generateWilderness({ cols: nc, rows: nr })
    setCols(nc); setRows(nr)
    setResizeCols(nc); setResizeRows(nr)
    setCells(result.cells)
    setGenTarget(null)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  function handleSave() {
    onSave({ cols, rows, cells, name: mapName.trim() || 'Untitled Map' })
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const sidebarCls   = 'w-44 shrink-0 flex flex-col gap-1 overflow-y-auto border-slate-800 bg-slate-950 p-3'
  const sectionCls   = 'text-[9px] font-bold uppercase tracking-widest text-slate-600 pt-2 pb-0.5'
  const toolBtnCls   = (active: boolean) =>
    `flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-left transition-colors ${
      active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`
  const numInputCls  = 'h-6 w-14 rounded border border-slate-700 bg-slate-900 px-1 text-xs text-slate-200 outline-none focus:border-yellow-500'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex flex-1 flex-col overflow-hidden rounded-none border-0 shadow-2xl sm:m-3 sm:rounded-xl sm:border sm:border-slate-700">

        {/* ── Header ── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-2">
          <span className="text-slate-500 text-xs">🗺</span>
          <input
            value={mapName}
            onChange={e => setMapName(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-200 outline-none placeholder:text-slate-600 focus:text-white"
            placeholder="Map name…"
          />
          <div className="flex items-center gap-1">
            <button
              onClick={undo} disabled={history.length === 0} title="Undo (Ctrl+Z)"
              className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
            >↩ Undo</button>
            <button
              onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)"
              className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30"
            >↪ Redo</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onCancel} className="rounded px-3 py-1.5 text-xs bg-slate-800 text-slate-300 hover:bg-slate-700">
              Cancel
            </button>
            <button onClick={handleSave} className="rounded px-3 py-1.5 text-xs bg-emerald-700 text-white hover:bg-emerald-600 font-semibold">
              Save Map
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* ── Left: Tools ── */}
          <aside className={`${sidebarCls} border-r`}>
            <p className={sectionCls}>Tools</p>
            {TOOLS.map(t => (
              <button key={t.key} onClick={() => setTool(t.key)} className={toolBtnCls(tool === t.key)}>
                <span className="w-4 text-center text-base">{t.icon}</span>
                <span>{t.label}</span>
                {t.key === 'rect' && <span className="ml-auto text-[9px] text-slate-600">⇧=outline</span>}
              </button>
            ))}

            <p className={sectionCls}>Presets</p>
            {PRESET_TOOLS.map(t => (
              <button key={t.key} onClick={() => setTool(t.key)} className={toolBtnCls(tool === t.key)}>
                <span className="w-4 text-center font-mono">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}

            <p className={sectionCls}>Generate</p>
            <button
              onClick={() => { setGenCols(cols); setGenRows(rows); setGenTarget('dungeon') }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              🏰 <span>Dungeon</span>
            </button>
            <button
              onClick={() => { setGenCols(cols); setGenRows(rows); setGenTarget('wilderness') }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              🌿 <span>Wilderness</span>
            </button>

            <div className="mt-auto pt-3 border-t border-slate-800 text-[9px] text-slate-600 space-y-0.5">
              <p>P=pencil R=rect</p>
              <p>L=line F=fill E=eraser</p>
              <p>Scroll=zoom Space+drag=pan</p>
            </div>
          </aside>

          {/* ── Center: Canvas ── */}
          <div ref={containerRef} className="relative flex-1 overflow-hidden bg-slate-900/60">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 cursor-crosshair"
              style={{ cursor: spaceRef.current ? 'grab' : 'crosshair' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              onContextMenu={e => e.preventDefault()}
            />
          </div>

          {/* ── Right: Tile palette + settings ── */}
          <aside className={`${sidebarCls} border-l`}>
            {TILE_GROUPS.map(group => (
              <div key={group.label}>
                <p className={sectionCls}>{group.label}</p>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {group.keys.map(k => (
                    <TileSwatch
                      key={k} tileKey={k}
                      selected={activeTile === k && tool !== 'eraser'}
                      onClick={() => { setActiveTile(k); if (tool === 'eraser') setTool('pencil') }}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Eraser swatch */}
            <div>
              <p className={sectionCls}>Erase</p>
              <button
                onClick={() => { setActiveTile(ERASER_KEY); setTool('eraser') }}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs w-full text-left transition-colors ${
                  tool === 'eraser' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span className="h-8 w-8 rounded border border-slate-700 bg-slate-900 inline-flex items-center justify-center text-base">🗑</span>
                <span>Eraser</span>
              </button>
            </div>

            {/* Map size */}
            <div className="pt-2 border-t border-slate-800">
              <p className={sectionCls}>Map Size</p>
              <div className="flex items-center gap-1.5 mt-1">
                <label className="text-[10px] text-slate-500">W</label>
                <input type="number" className={numInputCls} value={resizeCols} min={4} max={200}
                  onChange={e => setResizeCols(Number(e.target.value))} />
                <label className="text-[10px] text-slate-500">H</label>
                <input type="number" className={numInputCls} value={resizeRows} min={4} max={200}
                  onChange={e => setResizeRows(Number(e.target.value))} />
              </div>
              <button
                onClick={applyResize}
                className="mt-1.5 w-full rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-700 transition"
              >
                Apply Resize
              </button>
            </div>

            <div className="pt-1">
              <p className={sectionCls}>Clear</p>
              <button
                onClick={() => { pushHistory(cells); setCells({}) }}
                className="w-full rounded px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-slate-800 transition text-left"
              >
                Clear All Tiles
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Generate Modal ── */}
      {genTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
          <div className="rounded-xl border border-slate-700 bg-slate-950 p-6 shadow-2xl w-80">
            <h3 className="mb-4 text-sm font-semibold text-slate-200 capitalize">
              Generate {genTarget === 'dungeon' ? '🏰 Dungeon' : '🌿 Wilderness'}
            </h3>
            <div className="mb-4 space-y-3">
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-slate-500">Preset sizes</p>
                <div className="flex gap-2">
                  {[{ label: 'Small', c: 24, r: 16 }, { label: 'Medium', c: 40, r: 28 }, { label: 'Large', c: 60, r: 40 }].map(p => (
                    <button key={p.label} onClick={() => { setGenCols(p.c); setGenRows(p.r) }}
                      className={`rounded border px-2 py-1 text-[10px] transition ${
                        genCols === p.c && genRows === p.r
                          ? 'border-amber-600 bg-amber-900/30 text-amber-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}>
                      {p.label}<br /><span className="text-slate-600">{p.c}×{p.r}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-500">Width</span>
                  <input type="number" className={`${numInputCls} w-16`} value={genCols} min={8} max={200}
                    onChange={e => setGenCols(Number(e.target.value))} />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-500">Height</span>
                  <input type="number" className={`${numInputCls} w-16`} value={genRows} min={8} max={200}
                    onChange={e => setGenRows(Number(e.target.value))} />
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={runGenerate}
                className="flex-1 rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 transition">
                Generate
              </button>
              <button onClick={() => setGenTarget(null)}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
