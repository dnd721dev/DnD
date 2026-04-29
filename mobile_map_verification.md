# Mobile Map Verification

## Files changed

| File | Bugs fixed |
|------|-----------|
| `src/components/table/MapBoard.tsx` | MB-1, MB-2, MB-3, MB-4, MB-6, MB-8 |
| `src/components/table/MapBoardView.tsx` | MB-1, MB-2, MB-4, MB-8 |
| `src/components/table/PlaceCharactersPanel.tsx` | MB-5 |
| `src/components/table/GMSidebar.tsx` | MB-7 |

TypeScript: `npx tsc --noEmit` — **0 errors**

---

## Root cause one-liners

**MB-1:** Both map containers had only `onMouseDown/Move/Up/Leave` handlers; `mousemove` never fires for touch drags, so all map interaction was completely inoperative on touch devices.

**MB-2:** Neither map container had `touch-action: none`, so the browser consumed swipe gestures for native page scrolling before JavaScript could see them.

**MB-3:** The ghost token position was set only inside `onMouseMove` using `getScreenPoint(e: React.MouseEvent)`, which never fired during touch drag, leaving the DM with zero visual feedback during tap-to-place on mobile.

**MB-4:** Both `getScreenPoint` helpers were typed as `(e: React.MouseEvent)` and accessed `e.clientX` directly; a `TouchEvent` would have produced `NaN` coordinates since touch coordinates live at `e.touches[0].clientX`.

**MB-5:** The "📍 Place" button used `py-1 text-[10px]` making it ~24px tall — half the 44px minimum tap target.

**MB-6:** The placement mode banner said "Click to place" and the trigger mode banner said "Click a tile" — both wrong on touch devices where the action is a tap.

**MB-7:** The GMSidebar Tools/Combat/Session tabs used a hardcoded `grid-cols-2` layout that compressed each column to ~185px on a 390px mobile screen, making the panel extremely cramped.

**MB-8:** Zoom was mouse-wheel only; no pinch-to-zoom gesture existed, leaving mobile users stuck at the initial zoom level.

---

## What changed in each file

### MapBoard.tsx (GM map)
- Added `activePointersRef`, `pinchStartDistRef`, `pinchStartZoomRef`, `pinchMidRef` refs
- `getScreenPoint` / `getWorldPoint` now accept `{ clientX: number; clientY: number }` (compatible with pointer, mouse, and wheel events)
- `onDown` → `onPointerDown`: adds `setPointerCapture`, tracks active pointers, starts pinch snapshot on second finger
- `onMove` → `onPointerMove`: runs pinch zoom when 2 pointers active, otherwise existing logic unchanged
- `onUp` → `onPointerUp(e)`: removes pointer from tracking, clears pinch state when < 2 pointers
- `onLeave` → `onPointerLeave(e)`: removes pointer, only clears pan/drag when zero pointers remain (pointer capture keeps drag alive during fast movement)
- Container div: `touchAction: 'none'` added; `onMouseDown/Move/Up/Leave` → `onPointerDown/Move/Up/Leave`; added `onPointerCancel={onLeave}`
- Banners: "Click to place" → "Tap to place"; "Click a tile" → "Tap a tile"

### MapBoardView.tsx (player map)
- Same pointer tracking refs added
- `getScreenPointFromMouse` + `getScreenPointFromWheel` → single `getScreenPoint({ clientX, clientY })`
- `handleMouseDown` → `handlePointerDown`: adds `setPointerCapture`, pointer tracking, pinch snapshot
- `handleMouseMove` → `handlePointerMove`: pinch zoom when 2 pointers, otherwise existing movement logic
- `handleMouseUp` → `handlePointerUp(e)`: removes pointer, clears pinch state
- `handleMouseLeave` → `handlePointerLeave(e)`: same cleanup logic as MapBoard
- Container div: `touchAction: 'none'`; mouse handlers → pointer handlers; `onPointerCancel` added

### PlaceCharactersPanel.tsx
- "📍 Place" button: `py-1 text-[10px]` → `min-h-[44px] min-w-[60px] py-2 text-[11px]`
- "Remove" button: `py-0.5` → `min-h-[36px] py-1.5`

### GMSidebar.tsx
- Combat tab: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- Tools tab: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- Session tab: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- On screens narrower than 640px (mobile), each tab now uses a single full-width column. On ≥640px (tablet/desktop), the two-column layout is preserved.

---

## Verification steps

### MAP INTERACTION (open table on mobile as player)

1. **Tap the map** — tap should register immediately (no 300ms delay); no overlay blocks it.
2. **Tap a token** — token hit detection fires; `dnd721-target-selected` event dispatches;
   PlayerSidebar target panel updates.
3. **Long-press a token on your turn** — not yet implemented as a discrete long-press gesture,
   but a quick tap-and-drag (pointer down then move) will start the drag.
4. **Drag token to new tile** — token follows finger, snaps to grid; on pointer up the move
   is saved to Supabase via `move_my_token` RPC.
5. **Pan the map with one finger** — starts immediately; map follows finger smoothly.
6. **Pinch to zoom** — both MapBoard and MapBoardView now support two-finger pinch-to-zoom;
   zoom anchors to the midpoint between the two fingers.

### TOKEN PLACEMENT (open table on mobile as GM)

1. **Navigate to Tools tab** — single-column layout on mobile; full-width, scrollable.
2. **Tap a character's 📍 Place button** — button is now 44px+ tall; easy to tap.
3. **Placement mode banner appears** — banner says "Tap to place [name]".
4. **Move finger across map** — ghost token follows finger position via `onPointerMove`.
5. **Tap a tile** — token is placed at that tile via Supabase insert.
6. **Token appears on map** — via realtime subscription, token renders on both GM and player views.
7. **Fog reveals around token** — `revealAround` fires from the tokenIds effect in MapBoardView.
