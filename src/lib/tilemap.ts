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
  // Nature
  tree_oak:    '#14532d',
  tree_pine:   '#14532d',
  tree_dead:   '#5b3a1a',
  bush:        '#15803d',
  rock:        '#6b7280',
  boulder:     '#4b5563',
  log:         '#7c3f12',
  stump:       '#7c3f12',
  tall_grass:  '#15803d',
  flowers:     '#16a34a',
  snow:        '#e5edf5',
  // Water / terrain variants
  water_shallow: '#2563eb',
  water_deep:    '#172554',
  swamp:         '#365314',
  gravel:        '#6b7280',
  forest_floor:  '#3f2d12',
  shore:         '#b9a06b',
  // Paths & structure
  path_dirt:   '#7c5a2e',
  road_cobble: '#52525b',
  bridge_wood: '#8a5a2b',
  stairs:      '#9ca3af',
  rubble:      '#57534e',
  fence:       '#7c4a1e',
  // Dungeon objects
  chest:       '#a16207',
  barrel:      '#7c3f12',
  crate:       '#a87333',
  table:       '#7c3f12',
  bed:         '#7f1d1d',
  campfire:    '#7c2d12',
  statue:      '#94a3b8',
  bones:       '#e5e7eb',
  web:         '#cbd5e1',
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

  // Nature
  { key: 'tree_oak',    label: 'Oak Tree',        color: TILE_COLORS.tree_oak,    passable: false, blocksVision: true  },
  { key: 'tree_pine',   label: 'Pine Tree',       color: TILE_COLORS.tree_pine,   passable: false, blocksVision: true  },
  { key: 'tree_dead',   label: 'Dead Tree',       color: TILE_COLORS.tree_dead,   passable: false, blocksVision: true  },
  { key: 'bush',        label: 'Bush',            color: TILE_COLORS.bush,        passable: true,  difficult: true     },
  { key: 'rock',        label: 'Rock',            color: TILE_COLORS.rock,        passable: false, blocksVision: false },
  { key: 'boulder',     label: 'Boulder',         color: TILE_COLORS.boulder,     passable: false, blocksVision: true  },
  { key: 'log',         label: 'Log',             color: TILE_COLORS.log,         passable: true,  difficult: true     },
  { key: 'stump',       label: 'Stump',           color: TILE_COLORS.stump,       passable: true,  difficult: true     },
  { key: 'tall_grass',  label: 'Tall Grass',      color: TILE_COLORS.tall_grass,  passable: true,  difficult: true     },
  { key: 'flowers',     label: 'Flowers',         color: TILE_COLORS.flowers,     passable: true                       },
  { key: 'snow',        label: 'Snow',            color: TILE_COLORS.snow,        passable: true,  difficult: true     },

  // Water / terrain variants
  { key: 'water_shallow', label: 'Shallow Water', color: TILE_COLORS.water_shallow, passable: true,  difficult: true    },
  { key: 'water_deep',    label: 'Deep Water',    color: TILE_COLORS.water_deep,    passable: false, blocksVision: false },
  { key: 'swamp',         label: 'Swamp',         color: TILE_COLORS.swamp,         passable: true,  difficult: true    },
  { key: 'gravel',        label: 'Gravel',        color: TILE_COLORS.gravel,        passable: true                      },
  { key: 'forest_floor',  label: 'Forest Floor',  color: TILE_COLORS.forest_floor,  passable: true                      },
  { key: 'shore',         label: 'Shore / Beach', color: TILE_COLORS.shore,         passable: true                      },

  // Paths & structure
  { key: 'path_dirt',   label: 'Dirt Path',       color: TILE_COLORS.path_dirt,   passable: true                       },
  { key: 'road_cobble', label: 'Cobble Road',     color: TILE_COLORS.road_cobble, passable: true                       },
  { key: 'bridge_wood', label: 'Wooden Bridge',   color: TILE_COLORS.bridge_wood, passable: true                       },
  { key: 'stairs',      label: 'Stairs',          color: TILE_COLORS.stairs,      passable: true                       },
  { key: 'rubble',      label: 'Rubble',          color: TILE_COLORS.rubble,      passable: true,  difficult: true     },
  { key: 'fence',       label: 'Fence',           color: TILE_COLORS.fence,       passable: false, blocksVision: false },

  // Dungeon objects
  { key: 'chest',       label: 'Chest',           color: TILE_COLORS.chest,       passable: false, blocksVision: false },
  { key: 'barrel',      label: 'Barrel',          color: TILE_COLORS.barrel,      passable: false, blocksVision: false },
  { key: 'crate',       label: 'Crate',           color: TILE_COLORS.crate,       passable: false, blocksVision: false },
  { key: 'table',       label: 'Table',           color: TILE_COLORS.table,       passable: false, blocksVision: false },
  { key: 'bed',         label: 'Bed',             color: TILE_COLORS.bed,         passable: false, blocksVision: false },
  { key: 'campfire',    label: 'Campfire',        color: TILE_COLORS.campfire,    passable: false, blocksVision: false },
  { key: 'statue',      label: 'Statue',          color: TILE_COLORS.statue,      passable: false, blocksVision: true  },
  { key: 'bones',       label: 'Bones',           color: TILE_COLORS.bones,       passable: true                       },
  { key: 'web',         label: 'Web',             color: TILE_COLORS.web,         passable: true,  difficult: true     },
]

export const TILE_GROUPS = [
  { label: 'Terrain',  keys: ['grass', 'water', 'dirt', 'sand', 'ice', 'mud'] },
  { label: 'Nature',   keys: ['tree_oak', 'tree_pine', 'tree_dead', 'bush', 'rock', 'boulder', 'log', 'stump', 'tall_grass', 'flowers', 'snow'] },
  { label: 'Water',    keys: ['water_shallow', 'water_deep', 'swamp', 'gravel', 'forest_floor', 'shore'] },
  { label: 'Paths',    keys: ['path_dirt', 'road_cobble', 'bridge_wood', 'stairs', 'rubble', 'fence'] },
  { label: 'Dungeon',  keys: ['floor', 'cracked', 'wall', 'door', 'stone', 'cobblestone', 'void'] },
  { label: 'Objects',  keys: ['chest', 'barrel', 'crate', 'table', 'bed', 'campfire', 'statue', 'bones', 'web'] },
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

    // ═══ NATURE ═══════════════════════════════════════════════════════════════
    case 'tree_oak': {
      ctx.fillStyle = '#166534'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#5b3a1a'
      ctx.fillRect(x + size * 0.45, y + size * 0.55, size * 0.1, size * 0.35)
      const cx = x + size * 0.5, cy = y + size * 0.42
      for (let i = 0; i < 3; i++) {
        const ang = i * 2.1
        const ox = Math.cos(ang) * size * 0.16, oy = Math.sin(ang) * size * 0.12
        const r = size * (0.2 + noise(col, row, i) * 0.06)
        ctx.fillStyle = lerpHex('#14532d', '#16a34a', noise(col, row, i + 3))
        ctx.beginPath(); ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    case 'tree_pine': {
      ctx.fillStyle = '#166534'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#5b3a1a'
      ctx.fillRect(x + size * 0.46, y + size * 0.72, size * 0.08, size * 0.2)
      for (let i = 0; i < 3; i++) {
        const ty = y + size * (0.2 + i * 0.2)
        const half = size * (0.16 + i * 0.08)
        ctx.fillStyle = lerpHex('#14532d', '#166534', i / 3)
        ctx.beginPath()
        ctx.moveTo(x + size * 0.5, ty - size * 0.12)
        ctx.lineTo(x + size * 0.5 - half, ty + size * 0.14)
        ctx.lineTo(x + size * 0.5 + half, ty + size * 0.14)
        ctx.closePath(); ctx.fill()
      }
      break
    }
    case 'tree_dead': {
      ctx.fillStyle = '#3f2d12'; ctx.fillRect(x, y, size, size)
      ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = Math.max(2, size * 0.05)
      const bx = x + size * 0.5
      ctx.beginPath(); ctx.moveTo(bx, y + size * 0.9); ctx.lineTo(bx, y + size * 0.25); ctx.stroke()
      for (let i = 0; i < 4; i++) {
        const by = y + size * (0.3 + i * 0.14)
        const dir = i % 2 === 0 ? 1 : -1
        ctx.beginPath(); ctx.moveTo(bx, by)
        ctx.lineTo(bx + dir * size * (0.18 + noise(col, row, i) * 0.1), by - size * 0.12)
        ctx.stroke()
      }
      break
    }
    case 'bush': {
      ctx.fillStyle = '#166534'; ctx.fillRect(x, y, size, size)
      for (let i = 0; i < 4; i++) {
        const ox = (0.3 + noise(col, row, i) * 0.4) * size
        const oy = (0.4 + noise(col, row, i + 4) * 0.4) * size
        const r = size * (0.14 + noise(col, row, i + 8) * 0.06)
        ctx.fillStyle = lerpHex('#15803d', '#22c55e', noise(col, row, i + 12))
        ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    case 'rock':
    case 'boulder': {
      ctx.fillStyle = '#166534'; ctx.fillRect(x, y, size, size)
      const scale = tileKey === 'boulder' ? 0.42 : 0.28
      const cx = x + size * 0.5, cy = y + size * 0.55
      ctx.beginPath()
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2
        const rr = size * scale * (0.8 + noise(col, row, i) * 0.4)
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.8
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fillStyle = tileKey === 'boulder' ? '#4b5563' : '#6b7280'; ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.beginPath(); ctx.arc(cx - size * 0.08, cy - size * 0.08, size * scale * 0.4, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'log': {
      ctx.fillStyle = '#166534'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#7c3f12'
      ctx.fillRect(x + size * 0.1, y + size * 0.38, size * 0.8, size * 0.24)
      ctx.fillStyle = '#a16207'
      ctx.beginPath(); ctx.ellipse(x + size * 0.1, y + size * 0.5, size * 0.06, size * 0.12, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.75
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + size * (0.1 + i * 0.2), y + size * 0.38); ctx.lineTo(x + size * (0.1 + i * 0.2), y + size * 0.62); ctx.stroke() }
      break
    }
    case 'stump': {
      ctx.fillStyle = '#166534'; ctx.fillRect(x, y, size, size)
      const cx = x + size * 0.5, cy = y + size * 0.5
      ctx.fillStyle = '#7c3f12'
      ctx.beginPath(); ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1
      for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(cx, cy, size * 0.28 * (i / 3), 0, Math.PI * 2); ctx.stroke() }
      break
    }
    case 'tall_grass': {
      ctx.fillStyle = '#15803d'; ctx.fillRect(x, y, size, size)
      ctx.lineWidth = 1.25
      for (let i = 0; i < 16; i++) {
        const bx = x + noise(col, row, i) * size
        const by = y + size * (0.6 + noise(col, row, i + 16) * 0.4)
        const len = size * (0.3 + noise(col, row, i + 32) * 0.25)
        ctx.strokeStyle = noise(col, row, i + 48) > 0.5 ? 'rgba(134,239,172,0.5)' : 'rgba(21,128,61,0.9)'
        const sway = (noise(col, row, i + 64) - 0.5) * size * 0.15
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + sway, by - len * 0.6, bx + sway * 1.5, by - len); ctx.stroke()
      }
      break
    }
    case 'flowers': {
      ctx.fillStyle = '#166534'; ctx.fillRect(x, y, size, size)
      const cols = ['#f87171', '#facc15', '#f472b6', '#a78bfa', '#fff']
      for (let i = 0; i < 6; i++) {
        const fx = x + (0.15 + noise(col, row, i) * 0.7) * size
        const fy = y + (0.15 + noise(col, row, i + 6) * 0.7) * size
        ctx.fillStyle = cols[Math.floor(noise(col, row, i + 12) * cols.length) % cols.length]
        for (let p = 0; p < 4; p++) {
          const a = (p / 4) * Math.PI * 2
          ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 1.5, fy + Math.sin(a) * 1.5, 1.6, 0, Math.PI * 2); ctx.fill()
        }
        ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(fx, fy, 1, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    case 'snow': {
      ctx.fillStyle = '#e5edf5'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      for (let i = 0; i < 6; i++) { ctx.fillRect(x + noise(col, row, i) * size, y + noise(col, row, i + 6) * size, 2, 2) }
      ctx.fillStyle = 'rgba(148,163,184,0.25)'
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + noise(col, row, i + 12) * size, y + noise(col, row, i + 15) * size, size * 0.1, 0, Math.PI * 2); ctx.fill() }
      break
    }

    // ═══ WATER / TERRAIN VARIANTS ═════════════════════════════════════════════
    case 'water_shallow':
    case 'water_deep': {
      const deep = tileKey === 'water_deep'
      if (deep) {
        const grd = ctx.createRadialGradient(x + size * 0.5, y + size * 0.5, 0, x + size * 0.5, y + size * 0.5, size * 0.7)
        grd.addColorStop(0, '#1e3a8a'); grd.addColorStop(1, '#0b1437')
        ctx.fillStyle = grd
      } else {
        ctx.fillStyle = '#2563eb'
      }
      ctx.fillRect(x, y, size, size)
      ctx.strokeStyle = deep ? 'rgba(147,197,253,0.25)' : 'rgba(191,219,254,0.5)'
      ctx.lineWidth = 0.75
      const waveCount = Math.max(3, Math.floor(size / 12))
      for (let i = 0; i < waveCount; i++) {
        const wy = y + (i + 0.5) * (size / waveCount)
        ctx.beginPath()
        for (let wx = x; wx <= x + size; wx += 2) {
          const t = (wx - x) / size
          const wv = wy + Math.sin(t * Math.PI * 3 + noise(col, row, i) * 10) * 1.8
          if (wx === x) ctx.moveTo(wx, wv); else ctx.lineTo(wx, wv)
        }
        ctx.stroke()
      }
      break
    }
    case 'swamp': {
      ctx.fillStyle = '#365314'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = 'rgba(20,40,10,0.6)'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.arc(x + noise(col, row, i) * size, y + noise(col, row, i + 3) * size, size * (0.1 + noise(col, row, i + 6) * 0.12), 0, Math.PI * 2); ctx.fill()
      }
      ctx.strokeStyle = 'rgba(132,204,22,0.5)'; ctx.lineWidth = 1
      for (let i = 0; i < 4; i++) {
        const rx = x + noise(col, row, i + 9) * size
        ctx.beginPath(); ctx.moveTo(rx, y + size * 0.9); ctx.lineTo(rx, y + size * 0.5); ctx.stroke()
      }
      break
    }
    case 'gravel': {
      ctx.fillStyle = '#6b7280'; ctx.fillRect(x, y, size, size)
      for (let i = 0; i < 18; i++) {
        const gx = x + noise(col, row, i) * size, gy = y + noise(col, row, i + 18) * size
        ctx.fillStyle = lerpHex('#4b5563', '#9ca3af', noise(col, row, i + 36))
        ctx.beginPath(); ctx.arc(gx, gy, 1 + noise(col, row, i + 54) * 1.5, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    case 'forest_floor': {
      ctx.fillStyle = '#3f2d12'; ctx.fillRect(x, y, size, size)
      const leaf = ['#65a30d', '#a16207', '#ca8a04', '#4d7c0f']
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = leaf[Math.floor(noise(col, row, i) * leaf.length) % leaf.length]
        ctx.globalAlpha = 0.6
        ctx.fillRect(x + noise(col, row, i + 14) * size, y + noise(col, row, i + 28) * size, 3, 2)
      }
      ctx.globalAlpha = 1
      break
    }
    case 'shore': {
      ctx.fillStyle = '#b9a06b'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#2563eb'
      ctx.beginPath(); ctx.moveTo(x, y + size)
      for (let wx = x; wx <= x + size; wx += 3) {
        const t = (wx - x) / size
        ctx.lineTo(wx, y + size * 0.6 + Math.sin(t * Math.PI * 2 + noise(col, row, 1) * 6) * size * 0.08)
      }
      ctx.lineTo(x + size, y + size); ctx.closePath(); ctx.fill()
      break
    }

    // ═══ PATHS & STRUCTURE ════════════════════════════════════════════════════
    case 'path_dirt': {
      ctx.fillStyle = '#7c5a2e'; ctx.fillRect(x, y, size, size)
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = noise(col, row, i) > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.18)'
        ctx.fillRect(x + noise(col, row, i + 10) * size, y + noise(col, row, i + 20) * size, 2, 2)
      }
      break
    }
    case 'road_cobble': {
      ctx.fillStyle = '#52525b'; ctx.fillRect(x, y, size, size)
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1
      const n = 3
      const cell = size / n
      for (let r2 = 0; r2 < n; r2++) for (let c2 = 0; c2 < n; c2++) {
        const off = (r2 % 2) * cell * 0.3
        const px = x + c2 * cell + off + cell * 0.1
        const py = y + r2 * cell + cell * 0.1
        ctx.fillStyle = lerpHex('#3f3f46', '#71717a', noise(col, row, r2 * n + c2))
        ctx.beginPath(); ctx.ellipse(px + cell * 0.35, py + cell * 0.35, cell * 0.38, cell * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      }
      break
    }
    case 'bridge_wood': {
      ctx.fillStyle = '#172554'; ctx.fillRect(x, y, size, size) // water under
      ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x, y + size * 0.12, size, size * 0.76)
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1
      for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(x + (i / 6) * size, y + size * 0.12); ctx.lineTo(x + (i / 6) * size, y + size * 0.88); ctx.stroke() }
      ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x, y + size * 0.12); ctx.lineTo(x + size, y + size * 0.12); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x, y + size * 0.88); ctx.lineTo(x + size, y + size * 0.88); ctx.stroke()
      break
    }
    case 'stairs': {
      ctx.fillStyle = '#9ca3af'; ctx.fillRect(x, y, size, size)
      const steps = 5
      for (let i = 0; i < steps; i++) {
        ctx.fillStyle = lerpHex('#6b7280', '#d1d5db', i / steps)
        ctx.fillRect(x, y + (i / steps) * size, size, size / steps - 0.5)
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.75
        ctx.beginPath(); ctx.moveTo(x, y + (i / steps) * size); ctx.lineTo(x + size, y + (i / steps) * size); ctx.stroke()
      }
      break
    }
    case 'rubble': {
      ctx.fillStyle = '#57534e'; ctx.fillRect(x, y, size, size)
      for (let i = 0; i < 8; i++) {
        const rx = x + noise(col, row, i) * size, ry = y + noise(col, row, i + 8) * size
        const s2 = size * (0.08 + noise(col, row, i + 16) * 0.1)
        ctx.fillStyle = lerpHex('#44403c', '#a8a29e', noise(col, row, i + 24))
        ctx.save(); ctx.translate(rx, ry); ctx.rotate(noise(col, row, i + 32) * Math.PI)
        ctx.fillRect(-s2 / 2, -s2 / 2, s2, s2 * 0.7); ctx.restore()
      }
      break
    }
    case 'fence': {
      ctx.fillStyle = '#166534'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#7c4a1e'
      ctx.fillRect(x, y + size * 0.35, size, size * 0.08)
      ctx.fillRect(x, y + size * 0.6, size, size * 0.08)
      for (let i = 0; i < 3; i++) { ctx.fillRect(x + (0.2 + i * 0.3) * size, y + size * 0.25, size * 0.07, size * 0.55) }
      break
    }

    // ═══ DUNGEON OBJECTS ══════════════════════════════════════════════════════
    case 'chest': {
      ctx.fillStyle = '#374151'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#7c3f12'; ctx.fillRect(x + size * 0.2, y + size * 0.4, size * 0.6, size * 0.4)
      ctx.fillStyle = '#a16207'; ctx.fillRect(x + size * 0.2, y + size * 0.32, size * 0.6, size * 0.12)
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x + size * 0.2, y + size * 0.32, size * 0.6, size * 0.48)
      ctx.fillStyle = '#fde047'; ctx.fillRect(x + size * 0.46, y + size * 0.5, size * 0.08, size * 0.1)
      break
    }
    case 'barrel': {
      ctx.fillStyle = '#374151'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#7c3f12'
      ctx.beginPath(); ctx.ellipse(x + size * 0.5, y + size * 0.5, size * 0.26, size * 0.36, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#3f1d09'; ctx.lineWidth = 2
      for (const f of [0.35, 0.5, 0.65]) { ctx.beginPath(); ctx.moveTo(x + size * 0.26, y + size * f); ctx.lineTo(x + size * 0.74, y + size * f); ctx.stroke() }
      break
    }
    case 'crate': {
      ctx.fillStyle = '#374151'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#a87333'; ctx.fillRect(x + size * 0.22, y + size * 0.22, size * 0.56, size * 0.56)
      ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = 2
      ctx.strokeRect(x + size * 0.22, y + size * 0.22, size * 0.56, size * 0.56)
      ctx.beginPath(); ctx.moveTo(x + size * 0.22, y + size * 0.22); ctx.lineTo(x + size * 0.78, y + size * 0.78); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + size * 0.78, y + size * 0.22); ctx.lineTo(x + size * 0.22, y + size * 0.78); ctx.stroke()
      break
    }
    case 'table': {
      ctx.fillStyle = '#374151'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#7c3f12'; ctx.fillRect(x + size * 0.18, y + size * 0.3, size * 0.64, size * 0.18)
      ctx.fillStyle = '#5b3a1a'
      ctx.fillRect(x + size * 0.22, y + size * 0.48, size * 0.06, size * 0.26)
      ctx.fillRect(x + size * 0.72, y + size * 0.48, size * 0.06, size * 0.26)
      break
    }
    case 'bed': {
      ctx.fillStyle = '#374151'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#5b3a1a'; ctx.fillRect(x + size * 0.18, y + size * 0.2, size * 0.64, size * 0.6)
      ctx.fillStyle = '#7f1d1d'; ctx.fillRect(x + size * 0.2, y + size * 0.34, size * 0.6, size * 0.44)
      ctx.fillStyle = '#e5e7eb'; ctx.fillRect(x + size * 0.22, y + size * 0.24, size * 0.56, size * 0.14)
      break
    }
    case 'campfire': {
      ctx.fillStyle = '#374151'; ctx.fillRect(x, y, size, size)
      ctx.strokeStyle = '#5b3a1a'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(x + size * 0.3, y + size * 0.72); ctx.lineTo(x + size * 0.7, y + size * 0.58); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + size * 0.3, y + size * 0.58); ctx.lineTo(x + size * 0.7, y + size * 0.72); ctx.stroke()
      const flame = (h: string, sc: number) => { ctx.fillStyle = h; ctx.beginPath(); ctx.moveTo(x + size * 0.5, y + size * (0.6 - sc)); ctx.lineTo(x + size * (0.5 - sc * 0.5), y + size * 0.62); ctx.lineTo(x + size * (0.5 + sc * 0.5), y + size * 0.62); ctx.closePath(); ctx.fill() }
      flame('#f97316', 0.32); flame('#facc15', 0.2)
      break
    }
    case 'statue': {
      ctx.fillStyle = '#374151'; ctx.fillRect(x, y, size, size)
      ctx.fillStyle = '#64748b'; ctx.fillRect(x + size * 0.3, y + size * 0.78, size * 0.4, size * 0.12)
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath(); ctx.arc(x + size * 0.5, y + size * 0.28, size * 0.12, 0, Math.PI * 2); ctx.fill()
      ctx.fillRect(x + size * 0.4, y + size * 0.38, size * 0.2, size * 0.42)
      break
    }
    case 'bones': {
      ctx.fillStyle = '#374151'; ctx.fillRect(x, y, size, size)
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 2.5
      ctx.beginPath(); ctx.moveTo(x + size * 0.3, y + size * 0.35); ctx.lineTo(x + size * 0.7, y + size * 0.7); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + size * 0.7, y + size * 0.35); ctx.lineTo(x + size * 0.3, y + size * 0.7); ctx.stroke()
      ctx.fillStyle = '#f3f4f6'; ctx.beginPath(); ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.12, 0, Math.PI * 2); ctx.fill()
      break
    }
    case 'web': {
      ctx.fillStyle = '#374151'; ctx.fillRect(x, y, size, size)
      ctx.strokeStyle = 'rgba(226,232,240,0.6)'; ctx.lineWidth = 0.75
      const cx = x, cy = y // anchor at corner
      for (let i = 0; i <= 4; i++) {
        const a = (i / 4) * (Math.PI / 2)
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * size, cy + Math.sin(a) * size); ctx.stroke()
      }
      for (let r2 = 1; r2 <= 3; r2++) {
        const rr = (r2 / 3) * size
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI / 2); ctx.stroke()
      }
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
