# Tile Images

Place the following 64×64 PNG files here:

| Filename | Tile key | Description |
|----------|----------|-------------|
| `dungeon-floor-64.png` | `floor` | Stone floor |
| `dungeon-wall-64.png` | `wall` | Stone wall |
| `dungeon-floor-cracked-64.png` | `cracked` | Cracked stone floor |
| `dungeon-water-64.png` | `water` | Water / pit |
| `dungeon-door-64.png` | `door` | Door |

All files must be exactly 64×64 pixels PNG format.
The tile system will automatically scale them to the current grid size.
Until a file is present, the tile falls back to procedural Canvas 2D rendering.

## Upgrading any tile to real art

Every tile key (including the procedurally-drawn Nature / Water / Paths / Objects
sets — e.g. `tree_oak`, `road_cobble`, `chest`) can be upgraded to a sprite:

1. Drop a 64×64 PNG in this folder (e.g. `forest-tree-64.png`).
2. Add an entry to `IMAGE_TILE_PATHS` in `src/lib/tilemap.ts`:
   `tree_oak: '/tiles/forest-tree-64.png'`.

`preloadTileImages()` loads it and `drawTile()` uses the PNG automatically; the
procedural drawing stays as the instant fallback until the image finishes
loading (or if it fails). No other code or DB change is needed — tile keys are
stored as plain strings in `tile_data.cells`.
