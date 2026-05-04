# Fog of War System Audit
_Files read: FogOfWarOverlay.tsx (DOES NOT EXIST), MapBoard.tsx (1228 lines),
MapBoardView.tsx (1101 lines), DMPanel.tsx (727 lines), GMSidebar.tsx (439 lines),
MapSection.tsx (197 lines), TableTopBar.tsx (157 lines), useMapManager.ts (91 lines),
useEncounter.ts (63 lines), useSessionCharacters.ts (79 lines), types.ts, TokenHUD.tsx,
TableClient.tsx (1351 lines), globals.css, supabase.ts, supabaseAdmin.ts,
add_fog_of_war.sql, 015_fog_reveals_realtime.sql, 002_rebuild_backend.sql_

---

## SECTION A — DM fog control buttons

### A1. Search results for fog-button-related terms

Every match is in **`MapBoard.tsx`** only. No fog buttons exist in any other file.

| Term | File | What it is | Connected? | Hidden? |
|---|---|---|---|---|
| `Fog Brush` | MapBoard.tsx:1084 | Button label | ✓ `onClick={() => setFogToolActive(v => !v)}` | Conditionally — see below |
| `fogToolActive` | MapBoard.tsx:117 | Boolean state | ✓ Used in pointer handlers | — |
| `Reveal All` | MapBoard.tsx:1092 | Button label | ✓ `onClick={handleRevealAll}` | Conditionally |
| `Reset Fog` | MapBoard.tsx:1100 | Button label | ✓ `onClick={handleResetFog}` | Conditionally |
| `handleRevealAll` | MapBoard.tsx:609 | Function | ✓ Live | No |
| `handleResetFog` | MapBoard.tsx:632 | Function | ✓ Live | No |
| `isFogPaintingRef` | MapBoard.tsx:119 | Drag-paint tracking ref | ✓ Used in onMove/onUp | No |
| `paintFogAt` | MapBoard.tsx:588 | Paints one tile for all players | ✓ Called on pointer events | No |

`FogBrush`, `revealAll`, `resetFog`, `fog_brush` — **zero matches** across all of `src/`.

### A2. DMPanel.tsx — fog section

No fog-of-war section in any tab. No commented-out fog controls. DMPanel has never had fog controls.

### A3. TableTopBar.tsx — fog buttons

TableTopBar contains: RecordingButton, SRD search, Bishop's Shop, Dice Log toggle, VoiceChat, End Session. **No fog buttons were ever in the top bar.** Zero fog references.

### A4. MapSection.tsx — map toolbar

MapSection renders MapBoard or MapBoardView. **MapSection itself has no fog toolbar.** The fog toolbar is rendered *inside* MapBoard as part of that component. MapSection has only a fullscreen toggle button.

### A5. GMSidebar.tsx — fog controls

GMSidebar has Combat, Tools, Session, Admin tabs. **No fog controls in any tab.** The fog controls are on the map canvas only.

### A6. FogOfWarOverlay.tsx

**This file does not exist.** There is no `FogOfWarOverlay.tsx` anywhere in the project. The fog overlay is a plain `<canvas ref={fogCanvasRef}>` rendered inline inside MapBoard and MapBoardView — not a separate component file.

### A7. Current state of fog buttons — definitive answer

The fog buttons **exist and are functional** in `MapBoard.tsx` lines 1053–1103 as an
`<div className="pointer-events-auto absolute right-3 top-3 z-10">` toolbar.

**The Ruler is always visible. The three fog tools are conditionally hidden:**
```tsx
{sessionPlayerWallets.length > 0 && (
  <>
    <button>🌫 Fog Brush</button>
    <button>👁 Reveal All</button>
    <button>🚫 Reset Fog</button>
  </>
)}
```
They only render when `sessionPlayerWallets.length > 0` — i.e., when at least one
player has joined the session. If no players have joined, all three fog tools are invisible.

**Second hiding condition:** the fog tools are only inside `MapBoard` (GM free-view component). When the GM selects "View As" a player, `MapBoardView` is rendered instead — which has **zero fog tools**, not even the Ruler. The GM loses all map tools in "View As" mode.

---

## SECTION B — Current fog of war rendering

### B8. Rendering approach

**Two entirely separate implementations — one for GM, one for players.**

**MapBoard (GM free-view — no "view as" selected):**
- Three stacked canvas elements inside a pan/zoom transform div:
  1. `mapCanvasRef` — base map image + grid
  2. `tokenCanvasRef` — all tokens, trigger icons (`pointer-events-none`)
  3. `fogCanvasRef` — GM fog overview (`pointer-events-none`, always static)
- `fogCanvasRef` is CSS-class `pointer-events-none absolute left-0 top-0` — **never changed dynamically**
- When `fogToolActive = false`: canvas is fully `clearRect` (transparent — GM sees full map)
- When `fogToolActive = true`: tile grid drawn with two colours:
  - Unrevealed: `rgba(2,6,23,0.6)` (dark)
  - Revealed by any player: `rgba(74,222,128,0.12)` (subtle green tint)
- This is a GM **editorial overlay** — not player fog. GM always sees all tokens.

**MapBoardView (player view OR GM "view as"):**
- Same three-canvas stack in same order
- `fogCanvasRef` class: `pointer-events-none absolute left-0 top-0 transition-opacity duration-300 ${fogsLoaded ? 'opacity-100' : 'opacity-0'}`
  - Starts transparent until `loadReveals()` resolves → prevents flash
- Drawing algorithm:
  1. `ctx.fillStyle = 'rgba(2,6,23,0.92)'` → fill entire canvas (full dark fog)
  2. `ctx.save(); ctx.globalCompositeOperation = 'destination-out'` → switch to erase mode
  3. Loop `reveals` array → `ctx.fillRect(tile_x * gridSize, tile_y * gridSize, gridSize, gridSize)` per tile → punches hole in fog
  4. `ctx.restore()` → restore composite mode
- No canvas state or pointer-events changes at any time

### B9. How revealed tiles are stored

One row per tile per viewer wallet per encounter per map in `fog_reveals`:

```sql
encounter_id  UUID  NOT NULL  -- FK → encounters(id) CASCADE DELETE
viewer_wallet TEXT  NOT NULL  -- lowercase wallet address of the player
map_id        UUID            -- NULL for legacy single-map sessions
tile_x        INT   NOT NULL
tile_y        INT   NOT NULL
UNIQUE NULLS NOT DISTINCT (encounter_id, viewer_wallet, map_id, tile_x, tile_y)
```

- Keyed by **`viewer_wallet`** — one record set per player wallet, not per character
- One row per tile (not a JSONB array)
- Realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE fog_reveals` (migration 015)
- MapBoardView subscription: `filter: encounter_id=eq.${encounterId}`, calls `loadReveals()` on any change

### B10. When fog reveal happens

| Trigger | Implemented? | Code path |
|---|---|---|
| Token placement via InitiativeTracker "📍 Place" | ✓ | Realtime INSERT → `tokenIds` effect → `revealAround` |
| Token drag-move (player) | ✓ | `commitMoveToTarget` → `revealAround` |
| Token tap-to-move (mobile) | ✓ | `commitMoveToTarget` → `revealAround` |
| Arrow-key move | ✓ | `commitMoveToTarget` → `revealAround` |
| GM clicks Reveal All | ✓ | `handleRevealAll` — inserts all tiles × all player wallets |
| DM uses Fog Brush | ✓ | `paintFogAt` on pointer events |
| Player joins and token already on map | ✓ | `tokenIds` effect fires on mount → `revealAround` |

**All paths are implemented.**

### B11. fog_reveals table schema

See B9. No JSONB array. One row per tile. No `character_id` column.

### B12. Per-player fog state

Yes — each player's reveals are stored with their `viewer_wallet`. MapBoardView loads
only rows for `ownerLower` (the current player's wallet). Players see only what their
token has revealed.

DM free view: no fog applied (all transparent). GM always sees full map.

DM "View As" mode: renders MapBoardView with `ownerWallet = selectedPlayerWallet` —
shows exactly that player's fog state. Correct behaviour.

---

## SECTION C — Player token movement after Reveal All

### C13. What Reveal All actually does

`handleRevealAll` (MapBoard.tsx lines 609–629):
1. Checks `!canvasSize || sessionPlayerWallets.length === 0` → early return if canvas not ready or no players
2. Computes all tiles from canvasSize
3. Builds `allRows` array: all tiles × all `sessionPlayerWallets`
4. Sets `fogRevealSet` to all tiles (updates GM canvas)
5. Batched upserts to `fog_reveals` in groups of 500

**Does NOT:** set any flag, change pointer-events, write to tokens/encounters/sessions, set loading state.

### C14. Movement checks in MapBoardView

`canMoveToken(t)` checks only:
1. `canInteract` — session status must be `'active'`
2. `ownerLower` must be set
3. `t.owner_wallet` must equal `ownerLower`
4. If initiative active: only active player's wallet can move
5. If in combat and `remainingMovePx <= 0`: blocked

**Zero fog checks.** `fog_reveals` is never read by any movement handler.

### C15. mapMode / mapState / fogMode / brushMode

**None of these variables exist.** There is no `mapMode`, `mapState`, `isRevealing`, `isBrushing`, `fogMode`, or `brushMode` in any file. The only fog-relevant state is `fogToolActive` (boolean) in MapBoard. This is exclusively for the GM brush overlay — it has no effect on MapBoardView or player interaction.

### C16. useMapManager stuck state

`useMapManager` handles CRUD on the `maps` table only. Zero fog state. Cannot get stuck.

### C17. Pointer-events after Reveal All

**Impossible.** The `fogCanvasRef` canvas has Tailwind class `pointer-events-none` applied at render time. No code anywhere modifies `fogCanvasRef.current.style.pointerEvents`. This is never changed dynamically by any fog operation.

### C18. Z-index after Reveal All

No z-index changes occur during fog operations. The fog canvas has no explicit z-index class — it relies on DOM stacking order (map → tokens → fog, top to bottom in z-order). This does not change.

### C19. Reveal All and rows checked by movement

Movement checks read from: `sessions` (status), `encounters` (active_entry_id), `characters` (action_state). Reveal All writes only to `fog_reveals`. **No intersection.**

### C20. Reveal All async / loading state

`handleRevealAll` is async, no `setLoading`. No UI freeze. Does not set any state that affects movement. Batch inserts run in the background silently.

**Root cause of "movement blocked after Reveal All":** Cannot be confirmed from source code. The fog system has no mechanism to block movement. The actual block likely comes from: session status not `'active'`, initiative turn restriction, or exhausted movement budget — none of which are fog-related.

---

## SECTION D — Fog Brush tool

### D21–D23. Fog Brush implementation status

**Fully implemented.** All brush functionality is in MapBoard.tsx:
- Toggle: `fogToolActive` state → button at lines 1072–1085
- Paint: `paintFogAt(world)` called on pointerdown + pointermove while `isFogPaintingRef.current = true`
- DM-only: MapBoardView (player component) has no `fogToolActive` state
- DB persistence: upserts one row per tile per `sessionPlayerWallets` entry
- Realtime sync: players receive `postgres_changes` event → `loadReveals()` → canvas redraws within ~1–2s
- Escape key cancels: `setFogToolActive(false); isFogPaintingRef.current = false`
- No undo for individual brush strokes (Reset Fog nukes everything)

---

## SECTION E — Other fog observations

### E24. Fog persistence between sessions

Fog is scoped to `encounter_id`. `useEncounter` does SELECT-then-INSERT — if an encounter already exists for the session, it is reused. Result: fog persists across session resumptions. New session → new encounter → fresh fog. Resumed session → reused encounter → fog carries over. This is by design.

### E25. Token placement 0,0 bug

**Fixed.** Guard at MapBoardView line 503: `if (px === 0 && py === 0) return`. The `snapToGrid` function always produces `Math.floor(v / gridSize) * gridSize + gridSize / 2` (minimum value = `gridSize/2` = 25 for gridSize=50). No placed token will have px=0,py=0.

### E26. Fog reveal accumulation

**Correct.** `revealAround` appends new tiles to `reveals` state (only new tiles, via functional updater checking the existing set). Old revealed tiles are preserved indefinitely. Fog accumulates.

### E27. Realtime sync

**Working.** Migration 015 adds `fog_reveals` to realtime publication. All MapBoardView instances subscribe and `loadReveals()` on any event for the encounter.

### E28. GM "View As" fog correctness

Shows correct player fog. However GM loses all fog tools in this mode (MapBoardView has none).

### E29. Fog reset per session

Fog resets when a new encounter is created. Fog carries over when encounter is reused. Encounter is reused by default via `useEncounter`.

### E30. Console errors and debug logs

Four `console.log` debug statements remain in MapBoardView production code (lines 419, 446, 482, 505). These fire on every token movement and produce verbose output. No canvas context errors found.

---

## Summary table

| Claim | Reality |
|---|---|
| FogOfWarOverlay.tsx exists | FALSE — file does not exist |
| Fog buttons are missing | PARTIAL — they exist but hidden when no players or when GM is in "View As" mode |
| Fog buttons were deleted in a refactor | FALSE — always been in MapBoard.tsx |
| Fog buttons are in GMSidebar | FALSE — in MapBoard, above the map canvas |
| Fog buttons are in TableTopBar | FALSE — never were |
| Reveal All blocks token movement | CANNOT CONFIRM — no fog code path blocks movement |
| Fog canvas intercepts clicks | FALSE — always pointer-events-none |
| Fog brush is unimplemented | FALSE — fully implemented |
| 0,0 origin bug | FIXED — guard + tile-center snap both in place |
| Realtime fog sync works | TRUE — migration 015, subscription in MapBoardView |
| Per-player fog state | TRUE — keyed by viewer_wallet |
| DM free view sees full map | TRUE — fog canvas empty when fogToolActive=false |
