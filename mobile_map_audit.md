# Mobile Map Audit

Files read: MapBoard.tsx, MapBoardView.tsx, TokenHUD.tsx, MapSection.tsx,
useMapManager.ts, useEncounter.ts, DMPanel.tsx, GMSidebar.tsx, layout.tsx,
tableclient/types.ts, TableClient.tsx, TableClientShell.tsx,
globals.css, tailwind.config.js, tailwind.config.ts

FogOfWarOverlay.tsx does not exist as a separate file. Fog is implemented
directly inside MapBoard.tsx (GM) and MapBoardView.tsx (player) via
fogCanvasRef.

---

## SECTION A — Map interaction on mobile

### A1 — Event listeners on map canvas/container

**MapBoard.tsx (GM view) — container div (line 884–893):**

| Event type     | Handler        | Present? |
|----------------|----------------|----------|
| onMouseDown    | onDown         | ✅ YES   |
| onMouseMove    | onMove         | ✅ YES   |
| onMouseUp      | onUp           | ✅ YES   |
| onMouseLeave   | onLeave        | ✅ YES   |
| onContextMenu  | onContextMenu  | ✅ YES   |
| onWheel        | onWheel        | ✅ YES   |
| onTouchStart   | —              | ❌ MISSING |
| onTouchMove    | —              | ❌ MISSING |
| onTouchEnd     | —              | ❌ MISSING |
| onTouchCancel  | —              | ❌ MISSING |
| onPointerDown  | —              | ❌ MISSING |
| onPointerMove  | —              | ❌ MISSING |
| onPointerUp    | —              | ❌ MISSING |
| onPointerLeave | —              | ❌ MISSING |

Also has an imperative `wheel` listener added in a useEffect on containerRef
(line 840–846) with `{ passive: false }` to prevent scroll — mouse/wheel only.

**MapBoardView.tsx (player view) — container div (line 808–815):**

| Event type     | Handler             | Present? |
|----------------|---------------------|----------|
| onMouseDown    | handleMouseDown     | ✅ YES   |
| onMouseMove    | handleMouseMove     | ✅ YES   |
| onMouseUp      | handleMouseUp       | ✅ YES   |
| onMouseLeave   | handleMouseLeave    | ✅ YES   |
| onWheel        | handleWheel         | ✅ YES   |
| onTouchStart   | —                   | ❌ MISSING |
| onTouchMove    | —                   | ❌ MISSING |
| onTouchEnd     | —                   | ❌ MISSING |
| onTouchCancel  | —                   | ❌ MISSING |
| onPointerDown  | —                   | ❌ MISSING |
| onPointerMove  | —                   | ❌ MISSING |
| onPointerUp    | —                   | ❌ MISSING |
| onPointerLeave | —                   | ❌ MISSING |

Also has an imperative `wheel` listener in a useEffect (line 794–800).

**VERDICT: Both map components are 100% mouse-only. Zero touch or pointer
event handlers exist anywhere on either map container.**


### A2 — Overlay elements that could intercept touch events

**MapBoard.tsx overlays (z-index order, top to bottom):**

| Element                    | z-index      | pointer-events | Issue? |
|----------------------------|--------------|----------------|--------|
| TokenHUD (absolute z-50)   | z-50         | not set (auto) | ⚠️ Intercepts in its area |
| Trigger banner (z-20)      | z-20         | pointer-events-auto | OK — intentionally interactive |
| Ruler SVG (z-10)           | z-10         | pointer-events-none | ✅ safe |
| Toolbar buttons (z-10)     | z-10, right-3 top-3 | pointer-events-auto | OK — interactive buttons |
| Placement banner (no z)    | stacking     | pointer-events-auto | OK — interactive |
| Ghost token (absolute)     | stacking     | pointer-events-none | ✅ safe |
| Trigger hover highlight    | absolute     | pointer-events-none | ✅ safe |
| fogCanvasRef               | absolute     | pointer-events-none | ✅ safe |
| tokenCanvasRef             | absolute     | pointer-events-none | ✅ safe |
| mapCanvasRef               | block (base) | not set (auto) | ✅ base layer, no issue |

**MapBoardView.tsx overlays:**

| Element        | pointer-events                   | Issue? |
|----------------|----------------------------------|--------|
| fogCanvasRef   | pointer-events-none (Tailwind)   | ✅ safe |
| tokenCanvasRef | pointer-events-none (Tailwind)   | ✅ safe |
| mapCanvasRef   | block (auto)                     | ✅ base layer |

**VERDICT: Fog and token canvases are correctly set to pointer-events-none
in both components. The Ruler SVG overlay is also safe. The toolbar buttons
in the top-right of MapBoard use pointer-events-auto as intended. No
overlay is incorrectly blocking the map area — the root cause is the
absence of touch/pointer handlers, not overlay interception.**


### A3 — Fog overlay pointer-events

**MapBoard.tsx, line 898:**
```
<canvas ref={fogCanvasRef} className="pointer-events-none absolute left-0 top-0" />
```
✅ pointer-events-none is set via Tailwind class.

**MapBoardView.tsx, line 821–823:**
```
<canvas ref={fogCanvasRef}
  className={`pointer-events-none absolute left-0 top-0 transition-opacity duration-300 ...`}
/>
```
✅ pointer-events-none is set via Tailwind class.

**VERDICT: Fog canvas does NOT intercept touch or mouse events. This is
not a contributing factor to the mobile bug.**


### A4 — CSS touch-action, pointer-events, user-select occurrences

**globals.css:** Only contains `@tailwind base/components/utilities`. No
custom touch-action, pointer-events, or user-select rules.

**tailwind.config.js / tailwind.config.ts:** No custom plugins adding
touch-action rules. The `touch-none` utility class (from Tailwind's
Touch Action plugin, which is included in Tailwind v3 core) is available
but never applied to either map container.

**MapBoard.tsx container (line 886):**
```
className="relative h-full w-full overflow-hidden overscroll-none rounded-xl ..."
```
- `overscroll-none` → `overscroll-behavior: none` ✅ (prevents overscroll bounce)
- NO `touch-action` property
- NO `user-select` property
- NO `pointer-events` property (inherits auto)

**MapBoardView.tsx container (line 809–810):**
```
className="relative h-full w-full overflow-hidden overscroll-none rounded-xl ..."
```
Same as above — `overscroll-none` only, no `touch-action`.

**MapSection.tsx outer wrapper (line 81–82):**
```
<section className="relative h-full overflow-hidden rounded-xl border ...">
  <div className="relative w-full min-h-[calc(100vh-180px)] overflow-hidden ...">
```
No touch-action on outer containers either.

**GMSidebar.tsx drag handle (line 207–210):** Has both `onMouseDown` and
`onTouchStart`. No touch-action set. This drag handle is the ONLY place
in the codebase that has any touch event handlers.

**VERDICT: Neither map container has `touch-action: none`. The browser
default `touch-action: auto` is in effect. This means the browser will
consume touch drag gestures for native scrolling/panning rather than
passing them through to JavaScript. Even if touch/pointer handlers were
added, they would need `touch-action: none` on the container to suppress
native gesture handling and get raw pointer events.**


### A5 — overflow:hidden with fixed size

**MapSection.tsx inner div:**
```
min-h-[calc(100vh-180px)] overflow-hidden
```
The map content div has `overflow-hidden` and `min-h` based on viewport
height. The inner transformed div uses `transform: translate() scale()`,
so zoomed-out content can be offset within the clipping rectangle.

**Effect on touch events:** The overflow-hidden clips the visual display
but the container element itself still covers the same pixel area on screen.
Events landing inside the container element's bounding box will reach the
container regardless of overflow clipping. This is NOT a source of touch
interception problems.

MapBoard and MapBoardView inner `inline-block` divs (lines 895/817) contain
the canvases and can extend beyond the container when zoomed in, but events
on those areas would still be clipped by `overflow-hidden` on the parent.


### A6 — Viewport meta tag

**src/app/layout.tsx:** The root layout does NOT have an explicit
`<meta name="viewport" ...>` tag and does NOT export a `viewport`
metadata object.

Next.js 14 App Router automatically injects `<meta name="viewport"
content="width=device-width, initial-scale=1">` when no override is
provided. This default is sufficient for correct mobile rendering.

**VERDICT: Viewport meta is handled by Next.js defaults. Not a bug.**


### A7 — What happens when a player taps the map on mobile

Current behavior:
1. Touch event fires on the container div.
2. No `onTouchStart` / `onPointerDown` handler exists → nothing runs.
3. The browser sees `touch-action: auto` and may attempt native scroll.
4. After ~300ms, the browser fires a synthetic `click` event as a fallback.
5. The container has no `onClick` handler, so the synthetic click also
   does nothing.
6. **Net result: tapping the map does nothing at all on mobile.**

For dragging (pan/move token):
1. Touch drag begins.
2. `touchmove` fires (not handled).
3. `mousemove` does NOT fire during a touch drag.
4. No panning, no token movement — completely broken.


### A8 — CSS touch-action on map or parent

See A4. No `touch-action` property is set anywhere on the map container
or any of its ancestors. Default `touch-action: auto` applies.

This is a bug: the map needs `touch-action: none` on its container so
that (a) the browser doesn't consume swipe gestures for page scrolling,
and (b) pointer events fire correctly for all input types.


### A9 — Token pointer-events

Tokens are NOT DOM elements. They are painted pixels on the `tokenCanvasRef`
canvas, which has `pointer-events-none`. Hit detection is performed
programmatically in the event handlers:
```js
const hit = tokens.find((t) => Math.hypot(t.x - world.x, t.y - world.y) < gridSize * 0.5)
```
Since all token interaction flows through the container's mouse handlers
(which don't fire on touch), tokens are completely untappable on mobile.

**VERDICT: Tokens are invisible to touch input for the same root reason
as the map — no touch/pointer handlers on the container.**


### A10 — JavaScript errors on touch

**Coordinate mismatch analysis:**

`getScreenPoint(e: React.MouseEvent)` in MapBoard.tsx (line 577):
```js
return { x: e.clientX - rect.left, y: e.clientY - rect.top };
```
This uses `e.clientX` / `e.clientY` directly. These properties are
undefined on `TouchEvent` objects (touch coordinates are at
`e.touches[0].clientX`). If a `TouchEvent` were passed here it would
produce `NaN - number = NaN` coordinates, causing all snap/hit calculations
to produce NaN, and the ghost token to not render.

Same pattern in MapBoardView.tsx `getScreenPointFromMouse(e: React.MouseEvent)`.

**However:** Since there are NO touch event handlers attached to either
container, a TouchEvent would never be passed to these functions. The
bug manifests as silence (nothing happens on touch) rather than as a
runtime error.

The `ghostPos` setter in `onMove` (`setGhostPos(screen)`) would set
NaN coordinates if called from a touch event, causing the ghost div to
render at an undefined position. But again, it's never called from touch.

**VERDICT: There are no JavaScript errors thrown on mobile touch because
touch events are never handled — they're silently ignored. The coordinate
mismatch would become an error if touch handlers were naively added
without switching to pointer events.**


---

## SECTION B — Token placement on mobile

### B11 — Token placement flow

**Activation:**
1. `PlaceCharactersPanel.tsx` `handlePlace()` dispatches a
   `dnd721-place-token` CustomEvent.
2. `MapBoard.tsx` `useEffect` listens for this event and sets
   `setPlacementPending(detail)`, `setGhostPos(null)`.

**Visual feedback:**
- Cursor changes to `crosshair` (CSS cursor — invisible on touch).
- A banner renders: `"Click to place <name>"` with a Cancel button.
  The word "Click" is wrong on touch devices.
- A ghost token div renders at `ghostPos` — but `ghostPos` is only set
  from `onMove` (mousemove), so it never appears on touch.

**Ghost token rendering (line 901–913):**
```js
{placementPending && ghostPos && (
  <div className="pointer-events-none absolute ..."
    style={{ left: ghostPos.x - ..., top: ghostPos.y - ... }}>
    ...
  </div>
)}
```
`ghostPos` is set in `onMove`:
```js
if (placementPending) {
  const screen = getScreenPoint(e);  // React.MouseEvent only
  setGhostPos(screen);
}
```
`onMove` is `onMouseMove` which never fires during a touch drag.
**The ghost token NEVER appears on mobile.**

**Placement confirmation (line 646–728):**
```js
if (placementPending) {
  const world = getWorldPoint(e);   // React.MouseEvent only
  const x = snap(world.x);
  const y = snap(world.y);
  ...
  supabase.from('tokens').insert({ x, y, ... })
}
```
This runs in `onDown` (= `onMouseDown`). On mobile, `onMouseDown` may
fire after a 300ms tap delay as a synthetic event. If the user taps
precisely and quickly:
- The 300ms synthetic click fires `onMouseDown`.
- `getWorldPoint(e)` gets valid coordinates from the synthetic click's
  `clientX/clientY`.
- The token IS inserted.
- But there was zero visual feedback during the tap (no ghost).

So on mobile: placement IS theoretically possible via single-tap (with
300ms delay and no ghost), but is completely blind and unreliable.


### B12 — Ghost preview uses mouse cursor position

**YES, confirmed.** The ghost token position is driven entirely by
`setGhostPos(getScreenPoint(e))` inside `onMove` (= `onMouseMove`).
`mousemove` does not fire for touch drags. The ghost NEVER appears on
mobile.


### B13 — CSS hiding placement UI on mobile

The placement mode banner:
```jsx
<div className="pointer-events-auto absolute left-1/2 top-3 flex ...">
  <span>Click to place <strong>{placementPending.label}</strong></span>
  <button ...>Cancel (Esc)</button>
</div>
```
No responsive hiding classes (`hidden md:block` etc). Banner IS visible
on mobile. The text says "Click" which should say "Tap" on touch devices.
Cancel button is functional via tap.

The `PlaceCharactersPanel` is inside the Tools tab of GMSidebar which is
a bottom panel — always rendered on mobile (no responsive hiding). The
Tools tab tab button and the panel itself are visible on mobile.


### B14 — Placement mode button visible on mobile

**GMSidebar** renders as a fixed bottom panel with 4 tabs. No responsive
hiding. The Tools tab contains DMPanel (left column) + TriggersPanel (right
column) in a `grid-cols-2` layout.

On a 390px viewport, each column is ~185px wide. The `📍 Place` button in
PlaceCharactersPanel has `className="... px-2.5 py-1 text-[10px] ..."`.
At `py-1` = 4px top + 4px bottom padding + text height ~16px = total ~24px.
**This is less than the 44px minimum tap target size.** The button is
functional but hard to tap accurately on mobile.

The panel itself has `style={{ height: panelHeight }}` with a default of
192px. That's extremely cramped for the content inside it on mobile.


### B15 — Tile coordinate calculation for touch

In `onDown` (MapBoard.tsx, line 646–728):
```js
const world = getWorldPoint(e);  // e: React.MouseEvent
const x = snap(world.x);         // snap = Math.floor(world.x/gridSize)*gridSize + gridSize/2
const y = snap(world.y);
```
`getWorldPoint(e: React.MouseEvent)` calls `getScreenPoint(e)` which uses
`e.clientX`/`e.clientY`. On a synthetic click event from mobile tap, these
ARE populated with the tap coordinates. So the coordinate math WORKS for
a single tap — but only after the 300ms synthetic click delay.

On touch drag (to pan while in placement mode), the coordinates would not
update the ghost because `onMove` (= `onMouseMove`) doesn't fire for drags.


### B16 — Minimum tap area for tile selection

Grid tiles are `gridSize = 50px` at zoom=1. At zoom=1, this meets the 44px
minimum. At MIN_ZOOM=0.5, tiles would be 25×25px — below minimum.

No tap area expansion for mobile exists in the code.

The `📍 Place` button itself (see B14) is ~24px tall — below 44px minimum.
Other buttons in DMPanel (Quick Roll die buttons) are also small (~40px).


### B17 — Token visibility after placement

After the GM places a token via `supabase.from('tokens').insert(...)`:
1. The INSERT fires a realtime event.
2. MapBoard.tsx realtime subscription picks up the INSERT and updates state:
   ```js
   if (payload.eventType === 'INSERT') {
     const t = payload.new as any;
     if (t.map_id !== null && t.map_id !== undefined && t.map_id !== mapId) return;
     setTokens((prev) => [...prev, { ... }]);
   }
   ```
3. Token appears on map canvas via the draw useEffect.
4. In MapBoardView.tsx, PC tokens (`type === 'pc'`) skip the fog check and
   are always rendered. ✅
5. Fog reveal fires via the tokenIds effect when the new token appears:
   ```js
   void revealAround({ x: px, y: py })
   ```
   `revealAround` correctly handles NaN/Infinity guards and tile-center snapping.

**VERDICT: Token IS visible after placement (for both GM and player views).
The visibility system is correct. The bug is in the interaction — not the
rendering after a token is placed.**

---

## Supplementary: layout.tsx

`src/app/layout.tsx` renders a plain `<html>` element with `<body>`. There
is no explicit `<meta name="viewport">` tag. Next.js 14 App Router injects
`<meta name="viewport" content="width=device-width, initial-scale=1">` as
a default when no `viewport` metadata export is provided. This is standard
Next.js behavior and not a bug.

There IS no `<meta name="viewport" initial-scale=...">` override restricting
zoom, so pinch-to-zoom should work (though the map has its own JS zoom).

## Supplementary: `FogOfWarOverlay.tsx`

This file does NOT exist. The fog overlay is implemented as `fogCanvasRef`
directly inside `MapBoard.tsx` (GM) and `MapBoardView.tsx` (player). Both
have `pointer-events-none` correctly set.

## Supplementary: GMSidebar drag handle

GMSidebar.tsx `handleDragStart` / `handleDragMove` already handle both
mouse and touch events correctly (lines 58–80). This component is the
only place in the codebase with touch event handling. The pattern used
there (`'touches' in e ? e.touches[0].clientY : e.clientY`) is the correct
pattern to apply to the map components.
