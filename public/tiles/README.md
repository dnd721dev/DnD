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
