// Shared tile map types and rendering utilities

export const TILE_COLORS: Record<string, string> = {
  stone: '#374151',
  grass: '#166534',
  water: '#1e3a8a',
  wall:  '#0f172a',
  wood:  '#7c3404',
  dirt:  '#78350f',
  sand:  '#a16207',
  lava:  '#b91c1c',
}

export const TILE_DEFS = [
  { key: 'stone', label: 'Stone Floor', color: TILE_COLORS.stone },
  { key: 'grass', label: 'Grass',       color: TILE_COLORS.grass },
  { key: 'water', label: 'Water',       color: TILE_COLORS.water },
  { key: 'wall',  label: 'Wall',        color: TILE_COLORS.wall  },
  { key: 'wood',  label: 'Wood Floor',  color: TILE_COLORS.wood  },
  { key: 'dirt',  label: 'Dirt',        color: TILE_COLORS.dirt  },
  { key: 'sand',  label: 'Sand',        color: TILE_COLORS.sand  },
  { key: 'lava',  label: 'Lava',        color: TILE_COLORS.lava  },
] as const

export type TileData = {
  cols:  number
  rows:  number
  cells: Record<string, string>  // "col,row" -> tile key
}

export function renderTilesToCanvas(
  ctx: CanvasRenderingContext2D,
  tileData: TileData,
  gridSize: number,
) {
  const w = tileData.cols * gridSize
  const h = tileData.rows * gridSize

  // Dark background for empty cells
  ctx.fillStyle = '#030712'
  ctx.fillRect(0, 0, w, h)

  // Filled tiles
  for (const [key, tileType] of Object.entries(tileData.cells)) {
    const comma = key.indexOf(',')
    const col = parseInt(key.slice(0, comma), 10)
    const row = parseInt(key.slice(comma + 1), 10)
    ctx.fillStyle = TILE_COLORS[tileType] ?? '#374151'
    ctx.fillRect(col * gridSize, row * gridSize, gridSize, gridSize)
  }

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
