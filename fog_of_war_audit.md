# Fog of War — Full Audit Report

All files were read completely before writing this report. No code has been changed.

---

## SECTION A — Canvas and coordinate system

### A1. Exact pixel dimensions of the fog canvas element

`MapBoardView.tsx` sets canvas HTML attributes directly inside the fog-draw `useEffect`:

```tsx
canvas.width  = canvasSize.width   // HTML attribute — sets drawing resolution
canvas.height = canvasSize.height
```

`canvasSize` is:

```tsx
const canvasSize = useMemo(() => {
  if (tileData) return { width: tileData.cols * gridSize, height: tileData.rows * gridSize }
  if (img)      return { width: img.width, height: img.height }
  return null
}, [tileData, img, gridSize])
```

For image maps: `img.width × img.height` — the **natural** pixel dimensions of the image, not CSS display size.
For tile maps: `cols × gridSize` by `rows × gridSize`.

There are no CSS `width` or `height` properties set on the canvas elements — only Tailwind classes (`block`, `absolute left-0 top-0 pointer-events-none`). So the canvas renders at its natural pixel dimensions.

### A2. Exact pixel dimensions of the map image element

The map canvas (`mapCanvasRef`) is also drawn at natural dimensions:

```tsx
canvas.width  = img.width
canvas.height = img.height
ctx.drawImage(img, 0, 0)
```

No CSS scaling is applied to the canvas element. It renders at `img.width × img.height`.

### A3. Do fog canvas HTML attributes match map image rendered pixel dimensions?

**Yes — they match exactly.** Both `mapCanvasRef` and `fogCanvasRef` are set to `canvasSize.width × canvasSize.height`, which is derived from the same source (image natural size or tile grid). No mismatch.

### A4. CSS transform, scale, zoom, or matrix

A CSS transform is applied to the inner wrapper `<div>` that contains **all three** canvases (map, token, fog):

```tsx
const transformStyle = {
  transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
  transformOrigin: 'top left' as const,
}
// …
<div className="relative inline-block" style={transformStyle}>
  <canvas ref={mapCanvasRef} className="block" />
  <canvas ref={tokenCanvasRef} className="pointer-events-none absolute left-0 top-0" />
  <canvas ref={fogCanvasRef}   className="pointer-events-none absolute left-0 top-0" />
</div>
```

All three canvases receive the **same** transform. No inconsistency.

### A5. Pan/scroll offset consistency

Panning is implemented via `translate: { x, y }` state. All three canvases are children of the transformed `<div>`, so pan is applied identically to all three.

Token positions (`t.x`, `t.y`) are stored in **world space** (natural canvas pixels). `revealAround` is called with `{ x: tok.x, y: tok.y }` — also world space. The fog drawing iterates over `reveals` and calls `ctx.fillRect(r.tile_x * gridSize, ...)` — also world space.

Pan/zoom are applied only at the DOM level via CSS transform. Drawing code always operates in world/natural pixel coordinates. **Consistency is correct.**

### A6. gridSize value

`gridSize = 50` pixels per tile. Defined as:
- Default parameter in both `MapBoard.tsx` (`gridSize = 50`) and `MapBoardView.tsx` (`gridSize = 50`)
- Hardcoded when `MapBoardView` is instantiated in `MapSection.tsx`: `gridSize={50}`
- Never passed from the DB or any configurable source — it is always 50.

### A7. Tile coordinate → pixel coordinate conversion (current formula)

In `revealAround` (MapBoardView.tsx):
```
cx      = Math.floor(center.x / gridSize)         // tile column (integer)
cy      = Math.floor(center.y / gridSize)          // tile row (integer)
originX = (cx + 0.5) * gridSize                    // pixel center of token's tile
originY = (cy + 0.5) * gridSize

rTiles  = Math.ceil(visionPx / gridSize) + 1       // tile radius (inclusive buffer)

for dx in [-rTiles, rTiles], dy in [-rTiles, rTiles]:
  tx  = cx + dx
  ty  = cy + dy
  px  = (tx + 0.5) * gridSize                      // pixel center of candidate tile
  py  = (ty + 0.5) * gridSize
  if dist(origin, candidate) <= visionPx → include tile
```

In fog draw:
```
ctx.fillRect(r.tile_x * gridSize, r.tile_y * gridSize, gridSize, gridSize)
```
(top-left corner of each tile, size = gridSize × gridSize)

### A8. Canvas positioning

```tsx
<canvas ref={fogCanvasRef} className="pointer-events-none absolute left-0 top-0" />
```

Positioned `absolute, left-0, top-0` within the `relative inline-block` inner div. Identical to the token canvas. Both sit exactly on top of the map canvas. **Correct.**

---

## SECTION B — Fog initialization

### B9. Initial fog canvas state

When `MapBoardView` first mounts, the fog-draw effect runs with `reveals = []` (the initial state). It draws:
1. Full-coverage dark rectangle: `ctx.fillRect(0, 0, canvas.width, canvas.height)` with `rgba(2,6,23,0.92)`
2. No reveals to erase (empty array)

**Player sees fully opaque dark fog on first render.** This is correct intent, but there is a visible flash before saved reveals load (see B12).

### B10. First draw function and parameters

The fog draw effect (lines ~579–601 in MapBoardView.tsx):
```
canvas.width  = canvasSize.width
canvas.height = canvasSize.height
ctx.clearRect(0, 0, canvas.width, canvas.height)
ctx.fillStyle = 'rgba(2,6,23,0.92)'
ctx.fillRect(0, 0, canvas.width, canvas.height)         // fill full canvas dark
ctx.save()
ctx.globalCompositeOperation = 'destination-out'
ctx.fillStyle = 'rgba(0,0,0,1)'
for (r of reveals):
  ctx.fillRect(r.tile_x * gridSize, r.tile_y * gridSize, gridSize, gridSize)  // erase revealed tiles
ctx.restore()
```

### B11. fog_reveals load on mount

Yes. The `loadReveals()` function runs inside a `useEffect` on `[encounterId, ownerLower, mapId]`:
```tsx
async function loadReveals() {
  let query = supabase.from('fog_reveals')
    .select('tile_x, tile_y')
    .eq('encounter_id', encounterId)
    .eq('viewer_wallet', ownerLower)
  if (mapId) query = query.eq('map_id', mapId)
  else       query = query.is('map_id', null)
  const { data } = await query
  setReveals(rows)        // triggers fog redraw
  setRevealSet(…)
}
```

The query runs after the component mounts and after the image loads (because `canvasSize` depends on `img`).

### B12. Race condition between canvas init and fog_reveals loading

**YES — a race condition exists.** Sequence:

1. Component mounts → `reveals = []` → fog draw effect fires → **full black fog rendered**
2. `loadReveals()` async call in flight
3. Supabase responds → `setReveals(rows)` → fog draw effect re-fires → **saved reveals cleared**

Between steps 1 and 3, the player sees fully fogged map. The duration equals Supabase round-trip latency (~100–300 ms). Player sees a brief "flash" of full fog before their saved revealed areas appear.

There is no "invisible until loaded" mechanism. The canvas is always visible from first render.

### B13. GM "View As" reinitialization

When the GM changes `gmViewWallet`, `MapSection` unmounts `MapBoard` and mounts `MapBoardView` with `ownerWallet={povWallet}`. The new `MapBoardView` instance has fresh state: `reveals = []`, `revealedOnceRef = false`. The `loadReveals()` effect runs with the new `ownerLower`, fetching that player's `fog_reveals`. **Correct reload.** No stale cached data is used.

---

## SECTION C — Token placement fog reveal

### C14. Function called when token is placed

In `MapBoard.tsx` (GM's browser), after the `tokens.insert()` resolves:
```tsx
window.dispatchEvent(new CustomEvent('dnd721-pc-token-placed', {
  detail: { ownerWallet: payload.ownerWallet, x, y },
}))
```

In `MapBoardView.tsx`, a `useEffect` listens for this event and calls `revealAround({ x: px, y: py })`.

**However:** this window event is local to the GM's browser tab. It never reaches the player's browser (different computer). The placement reveal for the player happens via a separate fallback path (see C15, C16).

### C15. Values of tile_x, tile_y at placement time

```tsx
const x = snap(world.x)   // snap = Math.floor(v/gridSize)*gridSize + gridSize/2
const y = snap(world.y)
```

`x` and `y` are confirmed placement coordinates from the DM's click, snapped to the **center** of a tile. They are always valid (never 0,0 unless the DM clicks tile (0,0), which is guarded by the `if (px === 0 && py === 0) return` check in the listener).

The event fires inside the `.then()` of the `tokens.insert()` call, so `x` and `y` are the same values written to the DB. **No async gap issue for the values themselves.**

### C16. Placement reveal function vs movement reveal function

Both call `revealAround(center: Point)` — the **same function**. The difference is HOW the center is obtained:

**Placement path (GM's browser only):**
```
MapBoard.tsx places token
  → dispatches window event dnd721-pc-token-placed with {x, y}
  → MapBoardView (if present in same browser) catches it
  → revealAround({ x, y })
```

**Placement path (player's browser — actual working path):**
```
tokens INSERT lands in DB
  → player's realtime subscription fires loadTokens()
  → tokens state updated with new PC token
  → fallback initial-reveal useEffect runs (tokens.length dependency)
  → finds PC token: myPc.x, myPc.y
  → revealAround({ x: myPc.x, y: myPc.y })
```

**Movement path (player's browser):**
```
handleMouseUp fires
  → move_my_token RPC persists new x, y
  → revealAround({ x: tok.x, y: tok.y })
```

All paths end in the same `revealAround` function. ✅

### C17. What tile_x, tile_y values produce the "left half cleared" symptom

**tile_x = 0, tile_y = 0** combined with a **large vision radius** produces this symptom.

With `visionFeet = 30` → `visionPx = 300` → radius = 6 tiles: a circle at tile (0,0) with center at pixel (25, 25) would clear tiles (-6,-6) to (6,6). Tiles with negative coordinates are drawn off-canvas (harmless). On-screen the cleared area looks like a partial arc covering the top-left corner.

**With `visionFeet = 120` (GM's erroneously-applied vision — see C18) → `visionPx = 1200` → radius = 24 tiles.** A circle centered at pixel (25, 25) with radius 1200 pixels extends ~1200px to the right and downward, clearing a huge area on the left/top of the map. On a typical 2000×1500 map this clears the entire left portion — **matching the "left half cleared" symptom exactly.**

The old corner-snap function (`Math.round(v / gridSize) * gridSize`, which puts tokens on grid intersections at x=0 for near-origin clicks) would place the token at x=0, not x=25, giving:
- `cx = Math.floor(0/50) = 0` — same tile, so same bug

The current tile-center snap (`Math.floor(v/gridSize)*gridSize + gridSize/2`) places tokens at (25, 25) for tile (0,0), but the tile index is still (0,0). The snap only affects where the token visually sits on the grid; the tile lookup is the same.

### C18. Vision range at placement time

`visionFeet` is computed in `TableClient.tsx`:
```tsx
const visionFeet = useMemo(() => {
  if (isGm) return 120    // ← BUG: always 120 for GM, including View As mode
  if (!selectedCharacter) return 30
  const raw = (selectedCharacter as any)?.vision
  …
})
```

When the GM is in **View As** mode, `isGm = true` → `visionFeet = 120`. This is passed to `MapBoardView`. The player's actual vision (stored in `characters.vision`, defaulting to 30) is **not used**. The GM's `MapBoardView` reveals a 24-tile radius circle instead of the player's 6-tile (30ft) circle. This is the primary cause of the "left half cleared" symptom.

---

## SECTION D — Token movement fog reveal

### D19. Function called when token moves

In `MapBoardView.tsx`, `handleMouseUp`:
```tsx
const { error: moveErr } = await supabase.rpc('move_my_token', { p_token_id, p_x, p_y })
if (!moveErr) {
  void revealAround({ x: tok.x, y: tok.y })  // same function as placement
}
```

### D20. tile_x, tile_y at movement time

`tok.x` and `tok.y` are the **new** snapped position after the drag, set by:
```tsx
const desired = { x: snapToGrid(world.x), y: snapToGrid(world.y) }
```
where `snapToGrid = Math.floor(value/gridSize)*gridSize + gridSize/2`. These are confirmed tile-center coordinates of the new position. **Always correct.**

### D21. Why movement reveals work correctly but placement did not

Movement calls `revealAround` directly in the **player's own `MapBoardView`** with the token's new position. No window events, no async gaps, no wrong vision radius — the player's `visionFeet` is read from their character data.

Placement via the GM uses `visionFeet = 120` (GM's inflated value) when the GM's `MapBoardView` in View As mode calls `revealAround`. **This is why placement reveals too much.**

The player's own movement reveal uses `visionFeet = selectedCharacter.vision` (correctly loaded from the characters table). **This is why movement reveals work correctly.**

### D22. Movement fog accumulation

**Yes — fog reveals accumulate.** The fog draw effect uses the full `reveals` array:
```tsx
setReveals(prev => [...prev, ...circleTiles])   // append, never remove
```
And the fog draw:
```tsx
ctx.fillRect(0, 0, canvas.width, canvas.height)   // full dark
for (r of reveals):
  ctx.fillRect(r.tile_x * gridSize, …)             // destination-out each tile
```
Every tile ever revealed remains cleared. Moving the token never re-fogs previous areas. ✅

### D23. Write frequency to fog_reveals

Every movement triggers `revealAround`, which immediately upserts all tiles in the vision circle to `fog_reveals`:
```tsx
await supabase.from('fog_reveals').upsert(payload, { ignoreDuplicates: true })
```
This fires on **every drag-end** (mouseUp). No debounce. With 113 tiles per 30ft circle and many movements, this can generate many DB writes. `ignoreDuplicates: true` prevents duplicate errors but doesn't reduce write volume.

---

## SECTION E — Fog reveal calculation

### E24. Complete current reveal calculation

```
// Inputs: center (world pixels), visionPx (pixels), gridSize (50)

cx      = Math.floor(center.x / gridSize)           // token tile X
cy      = Math.floor(center.y / gridSize)           // token tile Y
originX = (cx + 0.5) * gridSize                     // tile center pixel X
originY = (cy + 0.5) * gridSize                     // tile center pixel Y

rTiles  = Math.ceil(visionPx / gridSize) + 1        // search radius in tiles

// Collect tiles whose center is within visionPx of origin
for dx = -rTiles to +rTiles:
  for dy = -rTiles to +rTiles:
    tx = cx + dx
    ty = cy + dy
    px = (tx + 0.5) * gridSize
    py = (ty + 0.5) * gridSize
    if sqrt((px-originX)² + (py-originY)²) <= visionPx → add (tx, ty)

// Draw (in fog-draw effect):
ctx.fillRect(0,0,W,H)                               // dark overlay
ctx.save()
ctx.globalCompositeOperation = 'destination-out'
ctx.fillStyle = 'rgba(0,0,0,1)'
for each revealed tile:
  ctx.fillRect(tile_x * gridSize, tile_y * gridSize, gridSize, gridSize)
ctx.restore()
```

### E25. Composite operation

`destination-out` — correct. This erases the fog layer where revealed tiles are drawn.
`ctx.save()` and `ctx.restore()` bracket the composite operation change. **Correctly reset.** ✅

### E26. Fog drawing approach

**Approach (a) modified**: A dark rectangle covers the whole canvas, then individual tile-sized rectangles are cleared with `destination-out`. Reveals are **tile-based rectangles**, not circular arcs. The circle shape is computed at the tile level; drawing is per-tile fillRect.

### E27. save/restore around composite operation

**Yes — ctx.save() and ctx.restore() are used correctly.** Lines 594–600 of MapBoardView.tsx. ✅

### E28. Fog canvas redrawn from scratch on every update

**Yes — always redrawn from scratch.** The entire dark overlay is repainted, then all `reveals` tiles are cleared. Previously revealed tiles are preserved because the `reveals` array accumulates all tiles ever revealed (locally), and is periodically replaced with the full DB snapshot when `loadReveals()` fires. No reveals are ever lost.

---

## SECTION F — Multi-player fog isolation

### F29. Per-player isolation

Each player has their own `viewer_wallet` scope in `fog_reveals`. The SELECT query filters by `viewer_wallet = ownerLower`. Each `MapBoardView` instance renders fog for one wallet only. **Correctly isolated.**

### F30. GM Free View

When `gmViewWallet = null`, `MapSection` renders `MapBoard` (the GM version) which has **no fog canvas for the player**. The GM's fog canvas in `MapBoard.tsx` is the GM-overlay tool view (shows revealed vs unrevealed tiles in a green tint/dark grid for the fog brush). It is not a player fog overlay.

The GM sees the full map with the fog tool overlay. When fog tool is inactive (`fogToolActive = false`), the fog canvas in `MapBoard.tsx` is cleared entirely (see lines 501–519: `if (!fogToolActive) return`). So in GM Free View with fog tool off, no fog is drawn at all. ✅

### F31. GM "View As" fog reload

When the GM switches `gmViewWallet` to a player wallet:
- `MapSection` unmounts `MapBoard` and mounts a fresh `MapBoardView` with `ownerWallet={povWallet}`
- Fresh component state: `reveals = []`, new `ownerLower = povWallet.toLowerCase()`
- `loadReveals()` runs immediately with the new wallet — fetches that player's `fog_reveals` from Supabase

No stale data is reused. ✅

### F32. RLS — can Player A see Player B's reveals?

The `fog_reveals_open` policy:
```sql
CREATE POLICY "fog_reveals_open" ON fog_reveals
  USING (true)
  WITH CHECK (true);
```

**This is an OPEN policy — any authenticated user can SELECT all rows.** There is no `viewer_wallet = current_wallet()` restriction on SELECT. A player could in theory query another player's fog_reveals if they knew the encounter_id.

However: `MapBoardView` only queries `WHERE viewer_wallet = ownerLower` (their own wallet). The client code does not expose other players' reveals in any UI. A malicious client could query directly, but the UI itself is isolated correctly.

---

## SECTION G — Supabase fog_reveals table

### G33. Exact table schema

```sql
CREATE TABLE IF NOT EXISTS fog_reveals (
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  viewer_wallet TEXT NOT NULL,
  map_id        UUID REFERENCES maps(id) ON DELETE CASCADE,
  tile_x        INT NOT NULL,
  tile_y        INT NOT NULL,
  CONSTRAINT fog_reveals_unique
    UNIQUE NULLS NOT DISTINCT (encounter_id, viewer_wallet, map_id, tile_x, tile_y)
);
```

No primary key column. Unique constraint covers all 5 columns (NULLS NOT DISTINCT for `map_id`).

### G34. Row structure

**One row per revealed tile per player per map.** A character with 30ft vision revealing a 6-tile circle writes ~113 rows per position. After many movements, thousands of rows accumulate. `ignoreDuplicates: true` on upsert prevents re-inserting already-revealed tiles.

### G35. Write query (reveal operation)

```tsx
await supabase.from('fog_reveals').upsert(payload, { ignoreDuplicates: true })
```
Where `payload` is an array of `{ encounter_id, viewer_wallet, map_id, tile_x, tile_y }` objects. One upsert per `revealAround` call (all circle tiles in one batch).

### G36. Read query (mount)

```tsx
supabase.from('fog_reveals')
  .select('tile_x, tile_y')
  .eq('encounter_id', encounterId)
  .eq('viewer_wallet', ownerLower)
  .eq('map_id', mapId)          // or .is('map_id', null) if no mapId
```

### G37. Realtime subscription on fog_reveals

A Supabase realtime subscription exists in both `MapBoard.tsx` (GM union view) and `MapBoardView.tsx` (player view):
```tsx
.on('postgres_changes', { event: '*', table: 'fog_reveals', filter: `encounter_id=eq.${encounterId}` }, callback)
```

**HOWEVER:** There is no migration that adds `fog_reveals` to the `supabase_realtime` publication. Comparing:
- `session_rolls` was added in `013_session_rolls_realtime.sql` ✅
- `session_players` was added in `011_character_sheet_columns.sql` ✅
- `fog_reveals`: **no `ALTER PUBLICATION supabase_realtime ADD TABLE fog_reveals;` found in any migration** ❌

If `fog_reveals` is not in the publication, realtime events never fire for it. The GM's Fog Brush writes to `fog_reveals` but the player's subscription callback never fires — the player's fog does not update without a page refresh.

### G38. RLS policy gaps

**Open policy — all authenticated users can read/write:**
```sql
CREATE POLICY "fog_reveals_open" ON fog_reveals
  USING (true)
  WITH CHECK (true);
```

- Players can INSERT their own reveals ✅ (and other players' reveals ⚠)
- Players can SELECT their own reveals ✅ (and other players' reveals ⚠)
- DM can INSERT/UPDATE reveals for any character ✅
- No silent write failures ✅ (policy is fully open)
- Security gap: no wallet enforcement on write — a player could theoretically write reveals for a different player's wallet

In practice, the open policy works for a trusted-group D&D app. But if tighter security is needed, `WITH CHECK (viewer_wallet = current_wallet())` would enforce ownership.

---

## Cross-cutting observations

### How the "left half cleared" symptom is produced

The symptom is caused by **Bug 1** (GM's `visionFeet = 120` in View As mode):

1. GM switches to View As (Player A)
2. GM places Player A's token near tile (1, 1)
3. GM's `MapBoardView` receives `dnd721-pc-token-placed` event
4. `visionFeet = 120` (isGm=true) → `visionPx = 1200` → radius = 24 tiles
5. `revealAround` collects ~1800 tiles in a 24-tile circle
6. Upserts to `fog_reveals` with Player A's wallet
7. Player A's realtime subscription (if working) fires `loadReveals()` → shows huge reveal
8. Or: Player A's fallback via `tokens.length` reveals with their own `visionFeet=30` — BUT the GM's previous upsert already wrote the large circle to the DB, so `loadReveals()` returns all of it

For a map with gridSize=50 and a 2000px-wide map (40 tiles), a 24-tile radius circle at tile (1,1) would reach tile 25 to the right — covering most of the map. This looks exactly like "the left half of the map cleared."

### Why movement works correctly

Player moves their own token → `revealAround` runs in the player's own `MapBoardView` with `visionFeet` = player's actual character vision (e.g., 30) → 6-tile radius circle → symmetric reveal around token. No inflated GM vision involved.

### Fallback placement reveal works cross-browser

Even though the window event doesn't cross browsers, the `tokens.length` effect in the player's `MapBoardView` IS triggered by the DB realtime event when the GM places a token. This calls `revealAround` in the player's browser with the correct (small) vision radius. The placement reveal chain for players on separate browsers works correctly via this path.
