// src/lib/dungeonGen.ts
// Procedural map generators — no external assets required.
// Outputs TileData compatible with the existing tile map system.

import type { TileData } from './tilemap'

// ─── Seeded PRNG (LCG) ────────────────────────────────────────────────────────
function mkRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Rect { x: number; y: number; w: number; h: number }
interface Room { x: number; y: number; w: number; h: number; cx: number; cy: number }

// ─── BSP Dungeon Generator ────────────────────────────────────────────────────
export interface DungeonOpts {
  cols:         number
  rows:         number
  minRoomSize?: number   // minimum room dimension (default 4)
  maxRoomSize?: number   // maximum room dimension (default 10)
  seed?:        number
}

/**
 * Generates a BSP dungeon: rooms connected by L-shaped corridors.
 * All interior uses 'stone' floor; all borders use 'wall'.
 */
export function generateDungeon(opts: DungeonOpts): TileData {
  const { cols, rows } = opts
  const minRoom = Math.max(3, opts.minRoomSize ?? 4)
  const maxRoom = Math.max(minRoom + 1, opts.maxRoomSize ?? 10)
  const rng = mkRng(opts.seed ?? Date.now())

  const cells: Record<string, string> = {}

  // Fill everything with walls
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells[`${c},${r}`] = 'wall'
    }
  }

  // BSP: split root rect recursively into leaf nodes
  const root: Rect = { x: 1, y: 1, w: cols - 2, h: rows - 2 }
  const leaves = bspSplit(root, minRoom, maxRoom, rng, 0)

  // Carve a room inside each leaf
  const rooms: Room[] = leaves.map(leaf => {
    const maxW = Math.min(maxRoom, leaf.w - 2)
    const maxH = Math.min(maxRoom, leaf.h - 2)
    const rw = minRoom + Math.floor(rng() * Math.max(1, maxW - minRoom + 1))
    const rh = minRoom + Math.floor(rng() * Math.max(1, maxH - minRoom + 1))
    const rx = leaf.x + 1 + Math.floor(rng() * Math.max(1, leaf.w - rw - 1))
    const ry = leaf.y + 1 + Math.floor(rng() * Math.max(1, leaf.h - rh - 1))
    // Carve floor
    for (let r = ry; r < ry + rh; r++) {
      for (let c = rx; c < rx + rw; c++) {
        cells[`${c},${r}`] = 'stone'
      }
    }
    return { x: rx, y: ry, w: rw, h: rh, cx: Math.floor(rx + rw / 2), cy: Math.floor(ry + rh / 2) }
  })

  // Connect each room to the next with an L-shaped corridor
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1]
    const b = rooms[i]
    // Randomly decide horizontal-first or vertical-first
    if (rng() > 0.5) {
      carveHCorridor(cells, a.cx, b.cx, a.cy)
      carveVCorridor(cells, a.cy, b.cy, b.cx)
    } else {
      carveVCorridor(cells, a.cy, b.cy, a.cx)
      carveHCorridor(cells, a.cx, b.cx, b.cy)
    }
  }

  return { cols, rows, cells }
}

function bspSplit(
  rect: Rect,
  minRoom: number,
  maxRoom: number,
  rng: () => number,
  depth: number,
): Rect[] {
  // Stop splitting if too small or deep enough
  const minSplit = (minRoom + 2) * 2
  const tooSmallH = rect.w < minSplit
  const tooSmallV = rect.h < minSplit
  if ((tooSmallH && tooSmallV) || depth >= 6) return [rect]

  // Prefer to split the larger dimension
  const splitH = tooSmallH ? false : tooSmallV ? true : rect.w >= rect.h

  if (splitH) {
    // Split vertically (left/right)
    const min = Math.floor(rect.w * 0.4)
    const max = Math.floor(rect.w * 0.6)
    const split = min + Math.floor(rng() * (max - min + 1))
    const left  = { x: rect.x,         y: rect.y, w: split,          h: rect.h }
    const right = { x: rect.x + split,  y: rect.y, w: rect.w - split, h: rect.h }
    return [
      ...bspSplit(left,  minRoom, maxRoom, rng, depth + 1),
      ...bspSplit(right, minRoom, maxRoom, rng, depth + 1),
    ]
  } else {
    // Split horizontally (top/bottom)
    const min = Math.floor(rect.h * 0.4)
    const max = Math.floor(rect.h * 0.6)
    const split = min + Math.floor(rng() * (max - min + 1))
    const top    = { x: rect.x, y: rect.y,         w: rect.w, h: split          }
    const bottom = { x: rect.x, y: rect.y + split,  w: rect.w, h: rect.h - split }
    return [
      ...bspSplit(top,    minRoom, maxRoom, rng, depth + 1),
      ...bspSplit(bottom, minRoom, maxRoom, rng, depth + 1),
    ]
  }
}

function carveHCorridor(cells: Record<string, string>, x1: number, x2: number, y: number) {
  const [lo, hi] = x1 < x2 ? [x1, x2] : [x2, x1]
  for (let x = lo; x <= hi; x++) {
    cells[`${x},${y}`] = 'stone'
  }
}

function carveVCorridor(cells: Record<string, string>, y1: number, y2: number, x: number) {
  const [lo, hi] = y1 < y2 ? [y1, y2] : [y2, y1]
  for (let y = lo; y <= hi; y++) {
    cells[`${x},${y}`] = 'stone'
  }
}

// ─── Wilderness Generator ─────────────────────────────────────────────────────
export interface WildernessOpts {
  cols:  number
  rows:  number
  seed?: number
}

/**
 * Generates an organic outdoor map: grass base, water bodies, dirt paths, mud.
 */
export function generateWilderness(opts: WildernessOpts): TileData {
  const { cols, rows } = opts
  const rng = mkRng(opts.seed ?? Date.now())

  const cells: Record<string, string> = {}

  // Base layer: all grass
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells[`${c},${r}`] = 'grass'
    }
  }

  // 1–3 water bodies (irregular blobs)
  const waterCount = 1 + Math.floor(rng() * 3)
  const waterCenters: Array<{ cx: number; cy: number }> = []
  for (let w = 0; w < waterCount; w++) {
    const cx = Math.floor(rng() * cols)
    const cy = Math.floor(rng() * rows)
    const baseR = Math.floor(Math.min(cols, rows) * (0.08 + rng() * 0.12))
    waterCenters.push({ cx, cy })
    // Fill irregular circle
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const angle = Math.atan2(r - cy, c - cx)
        const noise = Math.sin(angle * 4 + rng() * 2) * 0.2
        const radius = baseR * (1 + noise)
        const dist = Math.sqrt((c - cx) ** 2 + (r - cy) ** 2)
        if (dist < radius) cells[`${c},${r}`] = 'water'
      }
    }
  }

  // 1–2 dirt paths between random edge points
  const pathCount = 1 + Math.floor(rng() * 2)
  for (let p = 0; p < pathCount; p++) {
    // Start from top or left edge, end at bottom or right
    const startLeft = rng() > 0.5
    const startC = startLeft ? 0 : Math.floor(rng() * cols)
    const startR = startLeft ? Math.floor(rng() * rows) : 0
    const endC = startLeft ? cols - 1 : Math.floor(rng() * cols)
    const endR = startLeft ? Math.floor(rng() * rows) : rows - 1

    // Walk a slightly wobbly Bresenham path
    let c = startC, r = startR
    const visited = new Set<string>()
    while (c !== endC || r !== endR) {
      const key = `${c},${r}`
      if (!visited.has(key)) {
        visited.add(key)
        cells[key] = 'dirt'
        // Also widen path occasionally
        if (rng() > 0.6) {
          const nc = c + (rng() > 0.5 ? 1 : -1)
          if (nc >= 0 && nc < cols) cells[`${nc},${r}`] = 'dirt'
        }
      }
      // Move toward end with wobble
      const dc = endC - c
      const dr = endR - r
      const wobble = rng() * 0.35
      if (Math.abs(dc) > Math.abs(dr)) {
        c += dc > 0 ? 1 : -1
        if (rng() < wobble && r + (dr > 0 ? 1 : -1) >= 0 && r + (dr > 0 ? 1 : -1) < rows) {
          r += dr > 0 ? 1 : -1
        }
      } else {
        r += dr > 0 ? 1 : -1
        if (rng() < wobble && c + (dc > 0 ? 1 : -1) >= 0 && c + (dc > 0 ? 1 : -1) < cols) {
          c += dc > 0 ? 1 : -1
        }
      }
    }
    cells[`${endC},${endR}`] = 'dirt'
  }

  // Mud patches near water edges
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
  for (const [key, tile] of Object.entries(cells)) {
    if (tile !== 'water') continue
    const comma = key.indexOf(',')
    const cc = parseInt(key.slice(0, comma), 10)
    const cr = parseInt(key.slice(comma + 1), 10)
    for (const [dc, dr] of dirs) {
      const nk = `${cc + dc},${cr + dr}`
      if (cells[nk] === 'grass' && rng() < 0.4) cells[nk] = 'mud'
    }
  }

  return { cols, rows, cells }
}
