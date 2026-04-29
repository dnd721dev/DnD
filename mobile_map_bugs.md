# Mobile Map Bug Report

---

## Bug MB-1
**Issue:** Map has zero touch or pointer event handlers — all interaction broken on mobile
**Root cause:** `MapBoard.tsx` and `MapBoardView.tsx` container divs attach only
`onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave` (and `onWheel`). There
are no `onTouchStart`, `onTouchMove`, `onTouchEnd`, `onPointerDown`, `onPointerMove`,
or `onPointerUp` handlers anywhere on either map container. On touch devices, `mousemove`
never fires during a drag — so panning, token dragging, fog painting, ruler drawing, and
ghost token preview are all completely non-functional.
**Fix:** Replace all mouse-only event handlers on both map containers with pointer events
(`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerLeave`). Pointer events fire
identically for mouse, touch, and stylus — no separate touch handler branch needed.
Inside the handlers, use `e.clientX` / `e.clientY` directly (pointer events carry these
for all input types). Add `e.currentTarget.setPointerCapture(e.pointerId)` in the
pointerdown handler to prevent losing the pointer during fast movement.
**Priority:** CRITICAL
**Files:** `src/components/table/MapBoard.tsx`, `src/components/table/MapBoardView.tsx`

---

## Bug MB-2
**Issue:** `touch-action: none` missing on map containers — browser consumes swipe gestures
**Root cause:** Both map container divs have `overscroll-none` (which handles bounce) but
no `touch-action` property. The browser default `touch-action: auto` means the browser
intercepts touch drag gestures for native page scrolling/panning before they reach
JavaScript. This means even after adding pointer event handlers, the browser would still
consume multi-touch zoom and single-finger drag unless `touch-action: none` is explicitly
set on the container.
**Fix:** Add `style={{ touchAction: 'none' }}` (or Tailwind `touch-none`) to the outer
container div in both `MapBoard.tsx` and `MapBoardView.tsx`. This tells the browser to
hand all touch input directly to JavaScript without any native gesture handling.
**Priority:** CRITICAL
**Files:** `src/components/table/MapBoard.tsx`, `src/components/table/MapBoardView.tsx`

---

## Bug MB-3
**Issue:** Ghost token preview during placement mode never appears on mobile
**Root cause:** `MapBoard.tsx` `onMove` handler (which is `onMouseMove`) sets the ghost
position:
```js
if (placementPending) {
  const screen = getScreenPoint(e);   // e: React.MouseEvent
  setGhostPos(screen);
}
```
`mousemove` does not fire for touch drags. `ghostPos` is never updated on mobile, so
`placementPending && ghostPos` is always false, and the ghost token div never renders.
The DM has zero visual feedback about where the token will land when tapping on mobile.
**Fix:** After converting to pointer events (MB-1), the ghost will work automatically
since `onPointerMove` fires during touch drags when `touch-action: none` is set. No
additional change needed beyond MB-1 + MB-2. Optionally convert ghost rendering to
snap to a tile center rather than exact cursor position, so the DM sees exactly which
tile will receive the token.
**Priority:** CRITICAL (dependent on MB-1 + MB-2 being fixed first)
**Files:** `src/components/table/MapBoard.tsx`

---

## Bug MB-4
**Issue:** Coordinate reading helpers typed as `React.MouseEvent` — will fail if touch
events were added naively
**Root cause:** `MapBoard.tsx` `getScreenPoint(e: React.MouseEvent)` and
`MapBoardView.tsx` `getScreenPointFromMouse(e: React.MouseEvent)` both use `e.clientX`
and `e.clientY`. A `TouchEvent` does not have these properties at the top level
(they live at `e.touches[0].clientX`). If touch handlers were added that called these
helpers, all coordinates would be `NaN`, silently breaking all hit detection,
snapping, and placement.
**Fix:** Pointer events unify this — `React.PointerEvent` has `e.clientX`/`e.clientY`
for all input types. After converting to pointer events (MB-1), rename the helpers to
accept `React.PointerEvent` and no further change is needed. Delete or update the
`React.MouseEvent` type annotations.
**Priority:** HIGH (becomes the actual runtime bug if MB-1 is fixed without switching
to pointer events — i.e., if someone adds touch handlers that call the existing helpers)
**Files:** `src/components/table/MapBoard.tsx`, `src/components/table/MapBoardView.tsx`

---

## Bug MB-5
**Issue:** `PlaceCharactersPanel` "📍 Place" button tap target is ~24px — below 44px minimum
**Root cause:** The Place button in `PlaceCharactersPanel.tsx` (line 234–239):
```jsx
<button className="rounded-md border border-sky-700/50 bg-sky-700/20 px-2.5 py-1 text-[10px] ...">
  📍 Place
</button>
```
`py-1` = 4px top + 4px bottom padding. `text-[10px]` ≈ 13px line height.
Total button height ≈ 21–24px. Apple HIG and Google Material Design both require
minimum 44×44px tap targets on mobile. This button will be very difficult to tap
accurately on a 390px screen.
**Fix:** Increase to `py-2.5` (minimum) or `min-h-[44px]` on the button. Also increase
the `Remove` button from `py-0.5` to `py-2` minimum.
**Priority:** HIGH
**Files:** `src/components/table/PlaceCharactersPanel.tsx`

---

## Bug MB-6
**Issue:** Placement mode banner says "Click to place" — wrong instruction on touch devices
**Root cause:** `MapBoard.tsx` line 1037:
```jsx
<span>Click to place <strong>{placementPending.label}</strong></span>
```
On touch devices the DM taps, not clicks. The word "Click" is confusing.
**Fix:** Change to "Tap to place" or detect touch capability and show the appropriate
verb. Simplest fix: "Tap to place" since the app is targeting mobile-first.
**Priority:** MEDIUM
**Files:** `src/components/table/MapBoard.tsx`

---

## Bug MB-7
**Issue:** GMSidebar `grid-cols-2` layout for Tools tab is extremely cramped on mobile
**Root cause:** `GMSidebar.tsx` Tools tab (line 271–298) renders:
```jsx
<div className="grid h-full grid-cols-2 gap-2">
  <div>DMPanel</div>
  <div>TriggersPanel</div>
</div>
```
On a 390px screen with 8px padding each side, each column is ~185px wide. The default
panel height is 192px. DMPanel is packed with: PlaceCharactersPanel, Inspiration,
d20 Mode toggle, Quick Rolls (die shape buttons), Custom Roll builder, and Encounter
Calculator. On a 185px × 192px surface, most of this is either clipped or requires
heavy scrolling to reach. The PlaceCharactersPanel is the first section so it appears
at the top, but the overall panel density is hostile on mobile.
**Fix:** For screens narrower than `md` (768px), change the Tools tab to a single
column (`grid-cols-1`) OR move PlaceCharactersPanel to its own dedicated section
that is always visible without needing to scroll. Alternatively, increase the default
`panelHeight` on mobile devices.
**Priority:** MEDIUM
**Files:** `src/components/table/GMSidebar.tsx`

---

## Bug MB-8
**Issue:** Pinch-to-zoom is not implemented — map zoom is mouse-wheel only
**Root cause:** Both map components implement zoom only via `onWheel` events. There is
no multi-touch pinch gesture handler. On mobile, the user cannot zoom the map at all
(the browser's native pinch zoom would try to zoom the entire page, not the map canvas,
and would be partially suppressed by `overscroll-none`).
**Fix:** After converting to pointer events (MB-1 + MB-2), implement two-pointer pinch
zoom by tracking two simultaneous pointerId values. Calculate the distance between the
two pointers on `onPointerMove` and adjust zoom proportionally. This is the standard
approach for pinch-zoom with pointer events.
**Priority:** MEDIUM (enhancement — map is at least usable at default zoom without this)
**Files:** `src/components/table/MapBoard.tsx`, `src/components/table/MapBoardView.tsx`

---

## Summary Table

| # | Issue | File(s) | Priority |
|---|-------|---------|----------|
| MB-1 | Zero touch/pointer handlers — all map interaction broken | MapBoard.tsx, MapBoardView.tsx | CRITICAL |
| MB-2 | No `touch-action: none` — browser consumes swipe gestures | MapBoard.tsx, MapBoardView.tsx | CRITICAL |
| MB-3 | Ghost token never shows during placement (depends on MB-1) | MapBoard.tsx | CRITICAL |
| MB-4 | Coordinate helpers typed MouseEvent — would NaN on touch | MapBoard.tsx, MapBoardView.tsx | HIGH |
| MB-5 | "📍 Place" button ~24px tall — below 44px tap target | PlaceCharactersPanel.tsx | HIGH |
| MB-6 | Placement banner says "Click" not "Tap" | MapBoard.tsx | MEDIUM |
| MB-7 | Tools tab grid-cols-2 too cramped on mobile | GMSidebar.tsx | MEDIUM |
| MB-8 | No pinch-to-zoom | MapBoard.tsx, MapBoardView.tsx | MEDIUM |

---

## Prerequisite fix order

MB-1 and MB-2 must be done together — adding pointer handlers without
`touch-action: none` will still lose gestures to the browser. Once MB-1
and MB-2 are in place, MB-3 and MB-4 resolve naturally. MB-5, MB-6, MB-7,
MB-8 are independent and can be done in any order.
