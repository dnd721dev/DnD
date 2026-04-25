# Fog of War — Bug Report

Generated from full audit of all fog-related source files.
Audit answers: `fog_of_war_audit.md`

---

## Bug 1

**Priority:** CRITICAL

**Symptom:** In GM "View As" mode the fog is almost entirely cleared — roughly the entire left half (or more) of the map is revealed instead of the small circle the selected player should see. The reveal bleeds into other players' views because the oversized tiles are written to the DB under the player's wallet.

**Root cause:** `src/components/table/tableclient/TableClient.tsx`

```ts
// current (wrong)
const visionFeet = useMemo(() => {
  if (isGm) return 120          // ← fires even in View As mode
  ...
}, [isGm, ...])
```

`isGm` is `true` whenever the connected wallet is a GM, regardless of whether they have switched into "View As Player" mode. So the GM's viewport always receives a 120-ft (1 200 px / 24-tile) radius. `revealAround` in `MapBoardView` receives that radius and upserts 24-tile circles to `fog_reveals` under the impersonated player's `viewer_wallet`. The correct value in View As mode is the **selected player's** `vision_ft` from their character record (defaulting to 60 ft if absent).

**Fix:**

1. Identify the "View As" active character. `TableClient` already holds a `viewAsWallet` (or equivalent) state and the character list. Look up `characters.find(ch => ch.wallet_address === viewAsWallet)?.speed_ft` — but use `vision_ft` (or `darkvision_ft` when applicable).
2. Change the `visionFeet` memo:
   ```ts
   const visionFeet = useMemo(() => {
     if (isGm && !viewAsWallet) return 120          // GM free view — full sight
     const ch = players.find(p => p.wallet_address === (viewAsWallet ?? myWallet))?.character
     return ch?.vision_ft ?? 60                     // player's actual vision
   }, [isGm, viewAsWallet, players, myWallet])
   ```
3. Pass the resolved `visionFeet` down to `MapBoardView` as it is today; no changes needed inside `MapBoardView` itself.

---

## Bug 2

**Priority:** HIGH

**Symptom:** When the GM uses the Fog Brush tool to reveal tiles on their map, the reveal is written to `fog_reveals` in the DB but the player's browser **does not update in real-time**. The player must manually refresh the page to see the newly revealed area.

**Root cause:** `supabase/migrations/add_fog_of_war.sql` (and every subsequent migration)

The `fog_reveals` table is never added to the Supabase Realtime publication:

```sql
-- add_fog_of_war.sql creates the table and RLS but never runs:
-- ALTER PUBLICATION supabase_realtime ADD TABLE fog_reveals;
```

`MapBoardView.tsx` sets up a `supabase.channel(...).on('postgres_changes', { table: 'fog_reveals' }, ...)` subscription, but because the table is not in the publication, Postgres never sends change events to Supabase Realtime, so the subscription callback never fires.

**Fix:**

Create a new migration (e.g. `015_fog_reveals_realtime.sql`):

```sql
-- Add fog_reveals to the realtime publication so player browsers
-- receive live updates when the GM reveals fog tiles.
ALTER PUBLICATION supabase_realtime ADD TABLE fog_reveals;
```

No application code changes are needed; the subscription in `MapBoardView` is already correctly written.

---

## Bug 3

**Priority:** HIGH

**Symptom:** When a token is placed on the map (GM drops it), the expected automatic fog reveal around the token's starting position **does not happen** in the player's browser. The player sees nothing until they move the token.

**Root cause:** `src/components/table/tableclient/MapBoard.tsx`

After inserting a new token the GM's browser dispatches a `window` CustomEvent:

```ts
window.dispatchEvent(new CustomEvent('dnd721-pc-token-placed', {
  detail: { ownerWallet, x, y }
}))
```

The listener for this event lives in `MapBoardView.tsx` (the **player's** browser). `window.dispatchEvent` is local to the dispatching browser tab and cannot cross browser sessions or network boundaries. The player's `MapBoardView` never receives the event.

The working fallback — a `useEffect` on `tokens.length` that calls `revealAround` for every token the character owns — fires when the realtime `tokens` subscription delivers the new row. However that effect only runs if `tokens.length` actually changes; if a token was previously removed and re-added the length may be the same, so the fallback can also miss.

**Fix:**

1. **Remove the dead window-event dispatch** from `MapBoard.tsx` (and its listener from `MapBoardView.tsx`). The event serves no purpose in a multi-browser setup.
2. **Make the `tokens.length` fallback robust**: change the `useEffect` dependency from `tokens.length` to `tokens.map(t => t.id).join(',')` (or a Set comparison) so any add/remove/replace triggers a reveal scan:
   ```ts
   const tokenIds = tokens.map(t => t.id).join(',')
   useEffect(() => {
     // reveal around every token owned by this player
   }, [tokenIds])   // ← catches token replacement even at same count
   ```

---

## Bug 4

**Priority:** MEDIUM

**Symptom:** On first load (or after a hard refresh) the player briefly sees the **entire map revealed** (white/visible) for one render frame before the correct fog mask appears. This flash can spoil hidden areas.

**Root cause:** `src/components/table/tableclient/MapBoardView.tsx`

The fog canvas is drawn inside a `useEffect` that depends on `[reveals, mapUrl, ...]`. On the very first render `reveals` is `[]` (empty array), which causes `drawFog` to paint a full-opacity black overlay but then immediately call `clearFogTiles([])` — effectively a no-op, leaving a black canvas. However, if the map image loads before `loadReveals()` resolves, there can be a frame where the map is painted but `drawFog` hasn't run yet, showing the bare map image.

More specifically: `mapUrl` triggers the image paint synchronously (via `useEffect`), and `reveals` starts empty, so `drawFog` is called with an empty set. The canvas is initialized to black fog — which is correct — but `loadReveals` is async. The window between "canvas created" and "first draw" is a race against the browser's paint cycle.

The deeper issue is that the canvas `opacity` or `visibility` is never suppressed during the async load, so whatever intermediate state appears (all-black fog OR flash of map) is visible to the player.

**Fix:**

Add a `fogsLoaded` boolean state, initialized to `false`. Render the fog canvas with `opacity-0` (or `visibility: hidden`) until `fogsLoaded` becomes `true`:

```tsx
const [fogsLoaded, setFogsLoaded] = useState(false)

// inside loadReveals(), after setReveals(rows):
setFogsLoaded(true)

// in JSX:
<canvas
  ref={fogCanvasRef}
  className={`... transition-opacity duration-300 ${fogsLoaded ? 'opacity-100' : 'opacity-0'}`}
/>
```

This hides any intermediate black-screen or flash until the real reveal data has been applied.

---

## Bug 5

**Priority:** MEDIUM

**Symptom:** Tokens placed at or very near the top-left corner of the map (within one vision radius of the map edge) generate fog-reveal rows in the DB with **negative `tile_x` or `tile_y` values**. These rows occupy DB storage and index space but are never drawn (negative pixel offsets fall off-canvas).

**Root cause:** `src/components/table/tableclient/MapBoardView.tsx` — `revealAround` function

```ts
for (let dy = -tileRadius; dy <= tileRadius; dy++) {
  for (let dx = -tileRadius; dx <= tileRadius; dx++) {
    const tx = centerTileX + dx   // can be negative
    const ty = centerTileY + dy   // can be negative
    circleTiles.push({ tile_x: tx, tile_y: ty })
  }
}
```

No bounds check exists. For a token at tile (1, 1) with radius 6, `tx` goes from -5 to 7 and `ty` from -5 to 7 — 25 off-map tiles are upserted per reveal event.

**Fix:**

Clamp tile coordinates to `[0, maxTileX]` and `[0, maxTileY]` before pushing:

```ts
const maxTileX = Math.floor(mapWidthPx / gridSize) - 1
const maxTileY = Math.floor(mapHeightPx / gridSize) - 1

const tx = centerTileX + dx
const ty = centerTileY + dy
if (tx < 0 || ty < 0 || tx > maxTileX || ty > maxTileY) continue
circleTiles.push({ tile_x: tx, tile_y: ty })
```

`mapWidthPx` and `mapHeightPx` are available as the natural dimensions of the loaded map image (already stored in component state).

---

## Bug 6

**Priority:** MEDIUM

**Symptom:** `FogOfWarOverlay.tsx` (the older drag-to-reveal component) draws fog incorrectly when the map is zoomed or panned — the cleared area appears **offset** from where the user dragged, sometimes by hundreds of pixels.

**Root cause:** `src/components/character-sheet/FogOfWarOverlay.tsx`

The component computes canvas draw coordinates from DOM `getBoundingClientRect()`:

```ts
const rect = canvasRef.current.getBoundingClientRect()
const x = e.clientX - rect.left
const y = e.clientY - rect.top
ctx.clearRect(x - brushSize/2, y - brushSize/2, brushSize, brushSize)
```

`getBoundingClientRect()` returns **CSS pixel** coordinates (after CSS `transform: scale(...) translate(...)` applied by the pan/zoom wrapper). The HTML canvas drawing context operates in **canvas pixel** coordinates, which are determined by the `width` / `height` attributes, not CSS size. When the canvas is scaled or translated by CSS, CSS pixels ≠ canvas pixels, causing the coordinate mismatch.

Additionally, the component does not appear to be rendered anywhere in the current component tree (not imported in `MapBoard.tsx`, `MapBoardView.tsx`, or `MapSection.tsx`).

**Fix (two options — choose one):**

*Option A* — **Remove the file.** If `FogOfWarOverlay.tsx` is confirmed unused, delete it to prevent accidental re-introduction of a broken implementation.

*Option B* — **Fix the coordinate transform** if the component is intended to be revived:
```ts
const rect = canvasRef.current.getBoundingClientRect()
const scaleX = canvasRef.current.width  / rect.width   // CSS→canvas X scale
const scaleY = canvasRef.current.height / rect.height  // CSS→canvas Y scale
const x = (e.clientX - rect.left) * scaleX
const y = (e.clientY - rect.top)  * scaleY
ctx.clearRect(x - brushSize/2, y - brushSize/2, brushSize, brushSize)
```

---

## Bug 7

**Priority:** LOW

**Symptom:** Over a long session with many token movements, the fog reveal panel may exhibit **minor jank or slow redraws** as the number of entries in local state grows unboundedly.

**Root cause:** `src/components/table/tableclient/MapBoardView.tsx` — `revealAround` accumulator

```ts
setReveals(prev => [...prev, ...circleTiles])
```

This spreads all new tiles onto the existing array on every token move, including duplicates (same tile revealed multiple times). After 100 moves with radius-6 circles (~113 tiles each), the array holds ~11 000 entries with significant duplication. `drawFog` iterates the entire array for every frame redraw.

The array is only compacted when `loadReveals()` fires (which replaces it with the deduplicated DB snapshot), but `loadReveals` is only called on mount and on realtime subscription events — not on every local reveal.

**Fix:**

Deduplicate tiles in the accumulator using a key set:

```ts
setReveals(prev => {
  const existing = new Set(prev.map(t => `${t.tile_x},${t.tile_y}`))
  const newTiles = circleTiles.filter(t => !existing.has(`${t.tile_x},${t.tile_y}`))
  return newTiles.length ? [...prev, ...newTiles] : prev
})
```

This keeps local state at most `totalMapTiles` entries regardless of session length.

---

## Summary Table

| # | Priority | One-line description |
|---|----------|----------------------|
| 1 | CRITICAL | GM View As uses GM vision radius (1 200 px) instead of player's vision |
| 2 | HIGH | `fog_reveals` not in realtime publication → no live GM-brush propagation |
| 3 | HIGH | `dnd721-pc-token-placed` window event is dead in multi-browser setup |
| 4 | MEDIUM | Fog canvas visible during async load → flash of map or all-black frame |
| 5 | MEDIUM | `revealAround` generates negative tile coords near map edges |
| 6 | MEDIUM | `FogOfWarOverlay.tsx` uses CSS pixels for canvas drawing (coordinate mismatch) |
| 7 | LOW | Local `reveals` array grows unbounded, accumulating duplicates |
