// Shared tile map types and rendering utilities
// Tiles are rendered procedurally via Canvas 2D.
// For keys listed in IMAGE_TILE_PATHS, a PNG from public/tiles/ is used instead
// once preloadTileImages() has been called (falls back to procedural until loaded).

// ─── Image-backed tile paths ─────────────────────────────────────────────────
/** Tile keys that have a real PNG asset in public/tiles/. */
export const IMAGE_TILE_PATHS: Record<string, string> = {
  floor:   '/tiles/dungeon-floor-64.png',
  wall:    '/tiles/dungeon-wall-64.png',
  cracked: '/tiles/dungeon-floor-cracked-64.png',
  water:   '/tiles/dungeon-water-64.png',
  door:    '/tiles/dungeon-door-64.png',
}

// ─── Image cache ─────────────────────────────────────────────────────────────
const _imgCache: Record<string, HTMLImageElement | 'loading' | 'error'> = {}

/**
 * Kick off loading for all image-backed tiles.
 * Safe to call multiple times (no-ops if already loading/loaded).
 * Must be called in a browser context (inside useEffect or similar).
 */
export function preloadTileImages(): void {
  if (typeof window === 'undefined') return
  for (const [key, path] of Object.entries(IMAGE_TILE_PATHS)) {
    if (_imgCache[key]) continue   // already loading or loaded
    _imgCache[key] = 'loading'
    const img = new Image()
    img.onload  = () => { _imgCache[key] = img }
    img.onerror = () => { _imgCache[key] = 'error' }
    img.src = path
  }
}

export const TILE_COLORS: Record<string, string> = {
  // Terrain
  grass:       '#166534',
  water:       '#1e3a8a',
  dirt:        '#78350f',
  sand:        '#a16207',
  ice:         '#bfdbfe',
  mud:         '#451a03',
  // Dungeon
  floor:       '#374151',
  cracked:     '#4b5563',
  stone:       '#374151',
  cobblestone: '#4b5563',
  wall:        '#0f172a',
  void:        '#020617',
  door:        '#78350f',
  // Interior
  wood:        '#7c3404',
  carpet:      '#581c87',
  marble:      '#cbd5e1',
  // Special
  lava:        '#b91c1c',
}

/** Extended tile definition with optional gameplay metadata. */
export type TileDef = {
  key:           string
  label:         string
  color:         string
  passable?:     boolean
  difficult?:    boolean
  blocksVision?: boolean
}

export const TILE_DEFS: TileDef[] = [
  // Terrain
  { key: 'grass',       label: 'Grass',          color: TILE_COLORS.grass       },
  { key: 'water',       label: 'Water / pit',     color: TILE_COLORS.water,       passable: false,  difficult: false, blocksVision: false },
  { key: 'dirt',        label: 'Dirt',            color: TILE_COLORS.dirt        },
  { key: 'sand',        label: 'Sand',            color: TILE_COLORS.sand        },
  { key: 'ice',         label: 'Ice',             color: TILE_COLORS.ice         },
  { key: 'mud',         label: 'Mud',             color: TILE_COLORS.mud         },
  // Dungeon (image-backed tiles listed first for palette prominence)
  { key: 'floor',       label: 'Stone floor',     color: TILE_COLORS.floor,       passable: true,   difficult: false, blocksVision: false },
  { key: 'cracked',     label: 'Cracked stone',   color: TILE_COLORS.cracked,     passable: true,   difficult: true,  blocksVision: false },
  { key: 'wall',        label: 'Stone wall',       color: TILE_COLORS.wall,        passable: false,  difficult: false, blocksVision: true  },
  { key: 'door',        label: 'Door',            color: TILE_COLORS.door,        passable: true,   difficult: false, blocksVision: true  },
  { key: 'stone',       label: 'Stone Floor',     color: TILE_COLORS.stone       },
  { key: 'cobblestone', label: 'Cobblestone',     color: TILE_COLORS.cobblestone },
  { key: 'void',        label: 'Void / Pit',      color: TILE_COLORS.void        },
  // Interior
  { key: 'wood',        label: 'Wood Floor',      color: TILE_COLORS.wood        },
  { key: 'carpet',      label: 'Carpet',          color: TILE_COLORS.carpet      },
  { key: 'marble',      label: 'Marble',          color: TILE_COLORS.marble      },
  // Special
  { key: 'lava',        label: 'Lava',            color: TILE_COLORS.lava        },
]

export const TILE_GROUPS = [
  { label: 'Terrain',  keys: ['grass', 'water', 'dirt', 'sand', 'ice', 'mud'] },
  { label: 'Dungeon',  keys: ['floor', 'cracked', 'wall', 'door', 'stone', 'cobblestone', 'void'] },
  { label: 'Interior', keys: ['wood', 'carpet', 'marble'] },
  { label: 'Special',  keys: ['lava'] },
] as const

export type TileKey = string   // loosened from the const-tuple so new keys work without casting

export type TileData = {
  cols:  number
  rows:  number
  cells: Record<string, string>  // "col,row" -> tile key
  name?: string
}

// ─── Deterministic noise helper ───────────────────────────────────────────────
// Produces a stable pseudo-random float [0,1) for a given (col, row, index).
function noise(col: number, row: number, i = 0): number {
  const h = Math.abs((col * 7919 + row * 6271 + i * 3571) % 1000)
  return h / 1000
}

// Lerp between two hex colors at weight t [0,1]
function lerpHex(a: string, b: string, t: number): string {
  const p = (c: string) => parseInt(c, 16)
  const r1 = p(a.slice(1, 3)), g1 = p(a.slice(3, 5)), b1 = p(a.slice(5, 7))
  const r2 = p(b.slice(1, 3)), g2 = p(b.slice(3, 5)), b2 = p(b.slice(5, 7))
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const bv = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${bv})`
}

// ─── Per-tile texture drawing ──────────────────────────────────────────────────
/**
 * Draws a single tile at pixel position (x, y) = (col*size, row*size).
 * All textures are pure Canvas 2D — no external images needed.
 */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  size: number,
  tileKey: string,
) {
  const x = col * size
  const y = row * size

  // ── Image-backed tile (PNG) ───────────────────────────────────────────────
  const cached = _imgCache[tileKey]
  if (cached instanceof HTMLImageElement) {
    ctx.drawImage(cached, x, y, size, size)
    return   // skip procedural draw entirely
  }

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, size, size)
  ctx.clip()

  switch (tileKey) {
    // ── Floor (dungeon) — procedural fallback until PNG loads ────────────────
    case 'floor': {
      ctx.fillStyle = '#374151'
      ctx.fillRect(x, y, size, size)
      break
    }

    // ── Cracked stone — procedural fallback until PNG loads ──────────────────
    case 'cracked': {
      ctx.fillStyle = '#4b5563'
      ctx.fillRect(x, y, size, size)
      break
    }

    // ── Door — procedural fallback until PNG loads ───────────────────────────
    case 'door': {
      ctx.fillStyle = '#78350f'
      ctx.fillRect(x, y, size, size)
      break
    }

    // ── Stone Floor ──────────────────────────────────────────────────────────
    case 'stone': {
      ctx.fillStyle = '#374151'
      ctx.fillRect(x, y, size, size)
      // Scattered stipple dots
      for (let i = 0; i < 8; i++) {
        const dx = noise(col, row, i) * size
        const dy = noise(col, row, i + 8) * size
        const light = noise(col, row, i + 16) > 0.5
        ctx.fillStyle = light ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)'
        ctx.fillRect(x + dx, y + dy, 1.5, 1.5)
      }
      // Faint mortar joint lines (every 2 tiles, offset by row)
      if ((col % 2 === 0 && row % 2 === 0) || (col % 2 === 1 && row % 2 === 1)) {
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'
        ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(x, y + size * 0.5); ctx.lineTo(x + size, y + size * 0.5); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + size * 0.5, y); ctx.lineTo(x + size * 0.5, y + size); ctx.stroke()
      }
      break
    }

    // ── Wall ─────────────────────────────────────────────────────────────────
    case 'wall': {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(x, y, size, size)
      // Brick pattern: horizontal mortar lines every ~8px
      const brickH = Math.max(6, Math.round(size / 6))
      const offset = row % 2 === 0 ? 0 : size * 0.5
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 0.75
      for (let ly = brickH; ly < size; ly += brickH) {
        ctx.beginPath(); ctx.moveTo(x, y + ly); ctx.lineTo(x + size, y + ly); ctx.stroke()
      }
      // Vertical joints offset per row
      const jointSpacing = Math.max(10, size * 0.6)
      for (let lx = offset; lx < size; lx += jointSpacing) {
        const jy0 = Math.floor(lx / brickH) * brickH
        const jy1 = jy0 + brickH
        ctx.beginPath(); ctx.moveTo(x + lx, y + jy0); ctx.lineTo(x + lx, y + jy1); ctx.stroke()
      }
      break
    }

    // ── Cobblestone ──────────────────────────────────────────────────────────
    case 'cobblestone': {
      ctx.fillStyle = '#374151'
      ctx.fillRect(x, y, size, size)
      // 4 irregular rounded "stone" outlines
      const stones = [
        { ox: 0.05, oy: 0.05, w: 0.42, h: 0.42 },
        { ox: 0.53, oy: 0.05, w: 0.42, h: 0.42 },
        { ox: 0.05, oy: 0.53, w: 0.42, h: 0.42 },
        { ox: 0.53, oy: 0.53, w: 0.42, h: 0.42 },
      ]
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 1
      for (let i = 0; i < stones.length; i++) {
        const s = stones[i]
        const jitter = (noise(col, row, i) - 0.5) * 0.08
        const sx = x + (s.ox + jitter) * size
        const sy = y + (s.oy + jitter) * size
        const sw = s.w * size
        const sh = s.h * size
        const r = Math.min(sw, sh) * 0.25
        ctx.beginPath()
        ctx.moveTo(sx + r, sy)
        ctx.lineTo(sx + sw - r, sy)
        ctx.arcTo(sx + sw, sy, sx + sw, sy + r, r)
        ctx.lineTo(sx + sw, sy + sh - r)
        ctx.arcTo(sx + sw, sy + sh, sx + sw - r, sy + sh, r)
        ctx.lineTo(sx + r, sy + sh)
        ctx.arcTo(sx, sy + sh, sx, sy + sh - r, r)
        ctx.lineTo(sx, sy + r)
        ctx.arcTo(sx, sy, sx + r, sy, r)
        ctx.closePath()
        ctx.fillStyle = lerpHex('#4b5563', '#374151', noise(col, row, i + 4))
        ctx.fill()
        ctx.stroke()
      }
      break
    }

    // ── Grass ─────────────────────────────────────────────────────────────────
    case 'grass': {
      ctx.fillStyle = '#166534'
      ctx.fillRect(x, y, size, size)
      // Scattered short grass blades
      ctx.lineWidth = 1
      for (let i = 0; i < 10; i++) {
        const bx = x + noise(col, row, i) * size
        const by = y + noise(col, row, i + 10) * size
        const len = 2 + noise(col, row, i + 20) * 4
        const lighter = noise(col, row, i + 30) > 0.5
        ctx.strokeStyle = lighter ? 'rgba(134,239,172,0.25)' : 'rgba(0,0,0,0.18)'
        ctx.beginPath(); ctx.moveTo(bx, by + len); ctx.lineTo(bx, by); ctx.stroke()
      }
      break
    }

    // ── Water ─────────────────────────────────────────────────────────────────
    case 'water': {
      ctx.fillStyle = '#1e3a8a'
      ctx.fillRect(x, y, size, size)
      // Horizontal wave lines
      ctx.lineWidth = 0.75
      ctx.strokeStyle = 'rgba(147,197,253,0.3)'
      const waveCount = Math.max(3, Math.floor(size / 10))
      for (let i = 0; i < waveCount; i++) {
        const wy = y + (i + 0.5 + noise(col, row, i) * 0.4) * (size / waveCount)
        const amp = 1.5 + noise(col, row, i + 10) * 2
        ctx.beginPath()
        for (let wx = x; wx <= x + size; wx += 2) {
          const t = (wx - x) / size
          const waveY = wy + Math.sin(t * Math.PI * 3 + noise(col, row, i + 20) * 10) * amp
          if (wx === x) ctx.moveTo(wx, waveY); else ctx.lineTo(wx, waveY)
        }
        ctx.stroke()
      }
      break
    }

    // ── Dirt ──────────────────────────────────────────────────────────────────
    case 'dirt': {
      ctx.fillStyle = '#78350f'
      ctx.fillRect(x, y, size, size)
      for (let i = 0; i < 8; i++) {
        const dx = noise(col, row, i) * size
        const dy = noise(col, row, i + 8) * size
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.fillRect(x + dx, y + dy, 2, 2)
      }
      break
    }

    // ── Sand ──────────────────────────────────────────────────────────────────
    case 'sand': {
      ctx.fillStyle = '#a16207'
      ctx.fillRect(x, y, size, size)
      for (let i = 0; i < 12; i++) {
        const dx = noise(col, row, i) * size
        const dy = noise(col, row, i + 12) * size
        ctx.fillStyle = 'rgba(253,230,138,0.3)'
        ctx.fillRect(x + dx, y + dy, 1, 1)
      }
      break
    }

    // ── Ice ───────────────────────────────────────────────────────────────────
    case 'ice': {
      ctx.fillStyle = '#bfdbfe'
      ctx.fillRect(x, y, size, size)
      // Slightly deeper inner
      ctx.fillStyle = 'rgba(186,230,253,0.4)'
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4)
      // 2 jagged crack lines
      ctx.strokeStyle = 'rgba(56,189,248,0.45)'
      ctx.lineWidth = 0.75
      for (let c = 0; c < 2; c++) {
        const startX = x + noise(col, row, c) * size
        const startY = y + noise(col, row, c + 2) * size
        const endX   = x + noise(col, row, c + 4) * size
        const endY   = y + noise(col, row, c + 6) * size
        ctx.beginPath(); ctx.moveTo(startX, startY)
        const steps = 4
        for (let s = 1; s <= steps; s++) {
          const t = s / steps
          const jx = startX + (endX - startX) * t + (noise(col, row, c * 10 + s) - 0.5) * size * 0.3
          const jy = startY + (endY - startY) * t + (noise(col, row, c * 10 + s + 5) - 0.5) * size * 0.3
          ctx.lineTo(jx, jy)
        }
        ctx.stroke()
      }
      break
    }

    // ── Mud ───────────────────────────────────────────────────────────────────
    case 'mud': {
      ctx.fillStyle = '#451a03'
      ctx.fillRect(x, y, size, size)
      // 2 darker blob outlines
      for (let b = 0; b < 2; b++) {
        const cx2 = x + (0.25 + b * 0.45) * size
        const cy2 = y + (0.3 + noise(col, row, b) * 0.4) * size
        const r = (0.12 + noise(col, row, b + 2) * 0.1) * size
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.stroke()
      }
      // Speckles
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = 'rgba(120,53,15,0.5)'
        ctx.fillRect(x + noise(col, row, i + 6) * size, y + noise(col, row, i + 11) * size, 2, 2)
      }
      break
    }

    // ── Wood Floor ────────────────────────────────────────────────────────────
    case 'wood': {
      ctx.fillStyle = '#7c3404'
      ctx.fillRect(x, y, size, size)
      // Planks: horizontal bands with slight color variation
      const plankH = Math.max(4, Math.round(size / 4))
      for (let p = 0; p < 4; p++) {
        const py = y + p * plankH
        const shade = (noise(col, row, p) - 0.5) * 0.15
        const bright = Math.round(124 + shade * 124)
        ctx.fillStyle = `rgba(${bright}, ${Math.round(bright * 0.43)}, ${Math.round(bright * 0.04)}, 0.25)`
        ctx.fillRect(x, py, size, plankH - 0.5)
        // Wood grain lines
        ctx.strokeStyle = `rgba(0,0,0,0.12)`
        ctx.lineWidth = 0.5
        for (let g = 0; g < 2; g++) {
          const gx = x + noise(col, row, p * 4 + g + 10) * size
          ctx.beginPath(); ctx.moveTo(gx, py); ctx.lineTo(gx + size * 0.3, py + plankH); ctx.stroke()
        }
      }
      // Plank dividers
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 0.75
      for (let p = 1; p < 4; p++) {
        ctx.beginPath(); ctx.moveTo(x, y + p * plankH); ctx.lineTo(x + size, y + p * plankH); ctx.stroke()
      }
      break
    }

    // ── Carpet ────────────────────────────────────────────────────────────────
    case 'carpet': {
      ctx.fillStyle = '#581c87'
      ctx.fillRect(x, y, size, size)
      // Crosshatch weave pattern
      ctx.strokeStyle = 'rgba(192,132,252,0.18)'
      ctx.lineWidth = 0.5
      const step = Math.max(3, Math.round(size / 10))
      for (let lx = x; lx <= x + size; lx += step) {
        ctx.beginPath(); ctx.moveTo(lx, y); ctx.lineTo(lx, y + size); ctx.stroke()
      }
      for (let ly = y; ly <= y + size; ly += step) {
        ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + size, ly); ctx.stroke()
      }
      // Subtle border inset
      ctx.strokeStyle = 'rgba(109,40,217,0.5)'
      ctx.lineWidth = 1.5
      ctx.strokeRect(x + 2, y + 2, size - 4, size - 4)
      break
    }

    // ── Marble ────────────────────────────────────────────────────────────────
    case 'marble': {
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(x, y, size, size)
      // 2 sinuous gray veins using quadratic beziers
      ctx.lineWidth = 0.75
      for (let v = 0; v < 2; v++) {
        ctx.strokeStyle = `rgba(100,116,139,${0.2 + noise(col, row, v) * 0.2})`
        const x0 = x + noise(col, row, v * 4    ) * size
        const y0 = y + noise(col, row, v * 4 + 1) * size
        const x1 = x + noise(col, row, v * 4 + 2) * size
        const y1 = y + noise(col, row, v * 4 + 3) * size
        const cpx = x + noise(col, row, v * 4 + 8) * size
        const cpy = y + noise(col, row, v * 4 + 9) * size
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cpx, cpy, x1, y1); ctx.stroke()
      }
      break
    }

    // ── Lava ──────────────────────────────────────────────────────────────────
    case 'lava': {
      // Gradient base: brighter center
      const grd = ctx.createRadialGradient(x + size * 0.5, y + size * 0.5, 0, x + size * 0.5, y + size * 0.5, size * 0.6)
      grd.addColorStop(0, '#ef4444')
      grd.addColorStop(1, '#7f1d1d')
      ctx.fillStyle = grd
      ctx.fillRect(x, y, size, size)
      // Dark crack lines
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'
      ctx.lineWidth = 1
      for (let c = 0; c < 3; c++) {
        const cx0 = x + noise(col, row, c) * size
        const cy0 = y + noise(col, row, c + 3) * size
        ctx.beginPath(); ctx.moveTo(cx0, cy0)
        const segments = 3
        for (let s = 1; s <= segments; s++) {
          ctx.lineTo(
            cx0 + (noise(col, row, c * 7 + s) - 0.5) * size * 0.7,
            cy0 + (noise(col, row, c * 7 + s + 4) - 0.5) * size * 0.7,
          )
        }
        ctx.stroke()
      }
      break
    }

    // ── Void / Pit ────────────────────────────────────────────────────────────
    case 'void': {
      ctx.fillStyle = '#020617'
      ctx.fillRect(x, y, size, size)
      // Depth illusion: inset lighter border
      ctx.strokeStyle = 'rgba(30,41,59,0.8)'
      ctx.lineWidth = 2
      ctx.strokeRect(x + 3, y + 3, size - 6, size - 6)
      ctx.strokeStyle = 'rgba(15,23,42,0.8)'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 6, y + 6, size - 12, size - 12)
      break
    }

    // ── Fallback ──────────────────────────────────────────────────────────────
    default: {
      ctx.fillStyle = TILE_COLORS[tileKey] ?? '#374151'
      ctx.fillRect(x, y, size, size)
    }
  }

  ctx.restore()
}

// ─── Canvas renderer (used by MapBoard + MapBoardView) ────────────────────────
export function renderTilesToCanvas(
  ctx: CanvasRenderingContext2D,
  tileData: TileData,
  gridSize: number,
  skipGrid = false,
) {
  const w = tileData.cols * gridSize
  const h = tileData.rows * gridSize

  // Dark background for empty cells
  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, w, h)

  // Textured tiles
  for (const [key, tileType] of Object.entries(tileData.cells)) {
    const comma = key.indexOf(',')
    const col = parseInt(key.slice(0, comma), 10)
    const row = parseInt(key.slice(comma + 1), 10)
    drawTile(ctx, col, row, gridSize, tileType)
  }

  if (!skipGrid) {
    // Grid overlay
    ctx.lineWidth = 0.5
    ctx.strokeStyle = 'rgba(148,163,184,0.2)'
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
  }
}
