'use client'

import { useState, useCallback } from 'react'
import { TILE_DEFS, TILE_COLORS, type TileData } from '@/lib/tilemap'

const ERASER_KEY = 'erase'
const DEFAULT_COLS = 20
const DEFAULT_ROWS = 14
const CELL_SIZE = 40

type Props = {
  initialData?: TileData | null
  onSave: (data: TileData) => void
  onCancel: () => void
}

export function MapBuilder({ initialData, onSave, onCancel }: Props) {
  const cols = initialData?.cols ?? DEFAULT_COLS
  const rows = initialData?.rows ?? DEFAULT_ROWS

  const [cells, setCells] = useState<Record<string, string>>(initialData?.cells ?? {})
  const [selectedTile, setSelectedTile] = useState<string>('stone')
  const [isPainting, setIsPainting] = useState(false)

  const paintCell = useCallback((col: number, row: number) => {
    const key = `${col},${row}`
    setCells((prev) => {
      if (selectedTile === ERASER_KEY) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      if (prev[key] === selectedTile) return prev
      return { ...prev, [key]: selectedTile }
    })
  }, [selectedTile])

  const handleSave = () => onSave({ cols, rows, cells })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="flex h-[92vh] w-[94vw] flex-col rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-200">Map Builder — {cols}×{rows} grid</h2>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded px-3 py-1.5 text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded px-3 py-1.5 text-xs bg-emerald-700 text-white hover:bg-emerald-600 font-semibold"
            >
              Save Map
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">

          {/* Tile palette */}
          <aside className="w-36 shrink-0 border-r border-slate-800 overflow-y-auto p-3 space-y-1">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Tiles</p>

            {TILE_DEFS.map((t) => (
              <button
                key={t.key}
                onClick={() => setSelectedTile(t.key)}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-left transition-colors ${
                  selectedTile === t.key
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span
                  className="h-4 w-4 shrink-0 rounded"
                  style={{ background: t.color, border: '1px solid rgba(255,255,255,0.12)' }}
                />
                {t.label}
              </button>
            ))}

            {/* Eraser */}
            <button
              onClick={() => setSelectedTile(ERASER_KEY)}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-left transition-colors ${
                selectedTile === ERASER_KEY
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="h-4 w-4 shrink-0 rounded border border-slate-600 bg-slate-900" />
              Eraser
            </button>

            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => setCells({})}
                className="w-full rounded px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-slate-800"
              >
                Clear All
              </button>
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
              <p>Click to paint</p>
              <p>Click+drag to fill</p>
            </div>
          </aside>

          {/* Grid canvas */}
          <div className="flex-1 overflow-auto p-4 bg-slate-900/50">
            <div
              className="inline-grid select-none border border-slate-700 rounded"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
                gridTemplateRows: `repeat(${rows}, ${CELL_SIZE}px)`,
                cursor: selectedTile === ERASER_KEY ? 'crosshair' : 'cell',
              }}
              onMouseLeave={() => setIsPainting(false)}
              onMouseUp={() => setIsPainting(false)}
            >
              {Array.from({ length: rows }, (_, row) =>
                Array.from({ length: cols }, (_, col) => {
                  const key = `${col},${row}`
                  const tileType = cells[key]
                  const tileColor = tileType ? TILE_COLORS[tileType] : undefined
                  return (
                    <div
                      key={key}
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        background: tileColor ?? '#030712',
                        border: '0.5px solid rgba(148,163,184,0.12)',
                        boxSizing: 'border-box',
                      }}
                      onMouseDown={() => { setIsPainting(true); paintCell(col, row) }}
                      onMouseEnter={() => { if (isPainting) paintCell(col, row) }}
                    />
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
