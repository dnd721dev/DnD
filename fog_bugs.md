# Fog of War Bug Report
_Generated from fog_of_war_audit.md — all bugs confirmed from source code_

---

## BUG 1 — HIGH: Fog Brush / Reveal All / Reset Fog hidden when no players in session

**Issue:** The three fog tools are invisible to the GM during session setup, before any players have joined.

**Root cause:** `MapBoard.tsx` lines 1072–1103 wrap all three fog buttons in:
```tsx
{sessionPlayerWallets.length > 0 && (
  <>
    <button>🌫 Fog Brush</button>
    <button>👁 Reveal All</button>
    <button>🚫 Reset Fog</button>
  </>
)}
```
`sessionPlayerWallets` comes from `session_players` table rows. If no players have joined (empty table), all three buttons are hidden. The Ruler is always shown.

**Fix:** Remove the `sessionPlayerWallets.length > 0` guard. The buttons should always be visible to the GM. Reveal All and Reset Fog are no-ops when there are no players (they iterate over an empty wallet list), which is acceptable behaviour. Fog Brush should also work even if no players have joined yet — the GM may want to pre-configure fog before players connect.

**Priority:** HIGH

---

## BUG 2 — HIGH: GM loses all fog tools (including Ruler) when in "View As" mode

**Issue:** When GM selects a player from the "View As" dropdown, `MapBoardView` is rendered instead of `MapBoard`. `MapBoardView` has no Ruler, no Fog Brush, no Reveal All, no Reset Fog. The GM cannot measure distances or control fog while viewing a player's perspective.

**Root cause:** `MapSection.tsx` lines 130–153:
```tsx
povWallet ? (
  <MapBoardView ... />  // no fog tools, no ruler
) : (
  <MapBoard ... />      // has all fog tools + ruler
)
```
MapBoardView deliberately has no GM tools because it is also the player component.

**Fix:** Add a read-only Ruler overlay and DM fog toolbar to the MapBoardView rendering path in MapSection, conditioned on `isGm`. Or render the fog toolbar as a separate component inside MapSection (not inside MapBoard/MapBoardView) so it is present in both views.

**Priority:** HIGH

---

## BUG 3 — MEDIUM: No visual banner or indicator when Fog Brush is active

**Issue:** When the GM activates the Fog Brush, the only feedback is:
1. The Fog Brush button changes to sky-500 colour
2. The map cursor changes to `cell`

There is no banner, overlay, or status text on the map itself. Players watching the map see nothing. The DM can forget the brush is active and accidentally paint tiles while trying to pan/zoom.

**Root cause:** MapBoard.tsx has no UI element that renders when `fogToolActive = true`. Other modes (placement, trigger, ruler) all show a top-center banner:
```tsx
{triggerMode && <div className="absolute left-1/2 top-3 ...">Tap a tile to place a trigger</div>}
{placementPending && <div className="absolute left-1/2 top-3 ...">Tap to place...</div>}
```
Fog brush has no equivalent.

**Fix:** Add a banner inside MapBoard when `fogToolActive = true`:
```tsx
{fogToolActive && (
  <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-lg border border-sky-600/60 bg-slate-950/90 px-3 py-1.5 text-xs text-sky-200 shadow-lg">
    🌫 Fog Brush active — click and drag to reveal tiles (Esc to cancel)
  </div>
)}
```

**Priority:** MEDIUM

---

## BUG 4 — MEDIUM: Reveal All silently fails if map image not yet loaded

**Issue:** Clicking Reveal All before the map image has fully loaded does nothing. No error, no feedback.

**Root cause:** `handleRevealAll` (MapBoard.tsx line 610):
```typescript
const handleRevealAll = async () => {
  if (!canvasSize || sessionPlayerWallets.length === 0) return;
  // ...
}
```
`canvasSize` is `null` while the map image is loading. The function returns silently. If the GM clicks the button while the image is loading (e.g., slow connection), the operation is a no-op.

**Fix:** Show a loading/disabled state on the Reveal All button while `canvasSize` is null, or display a toast error explaining why the action failed.

**Priority:** MEDIUM

---

## BUG 5 — MEDIUM: No confirmation before Reveal All or Reset Fog

**Issue:** Both Reveal All and Reset Fog execute immediately on single click. Reset Fog permanently deletes all fog_reveals rows for the encounter/map. Reveal All triggers up to thousands of DB upserts. Both are irreversible without significant side-effects.

**Root cause:** No confirmation dialog in `handleRevealAll` or `handleResetFog`.

**Fix:** Add `window.confirm()` (or a custom confirm dialog) before both operations:
```typescript
const handleRevealAll = async () => {
  if (!canvasSize || sessionPlayerWallets.length === 0) return
  if (!window.confirm('Reveal entire map for all players?')) return
  // ... rest of function
}

const handleResetFog = async () => {
  if (!window.confirm('Reset all fog of war? This cannot be undone.')) return
  // ... rest of function
}
```

**Priority:** MEDIUM

---

## BUG 6 — MEDIUM: Reveal All only covers players currently in session — new joiners see dark map

**Issue:** Reveal All iterates over `sessionPlayerWallets` at the moment the button is clicked. If a player joins after Reveal All was run, their `viewer_wallet` was not in the list and they have no `fog_reveals` rows → they see a fully dark map even though the DM intended for everyone to see the full map.

**Root cause:** `handleRevealAll` loops over `sessionPlayerWallets` (a prop snapshot). New players who join later are not covered.

**Fix:** When a new player joins and fog_reveals has rows for this encounter/map, automatically generate reveals for the new player equal to the union of all existing reveals (or all tiles if Reveal All was used). This requires a server-side trigger or a client-side check on player join. The simplest fix: after the session loads `sessionPlayerWallets`, if fog reveals already exist for other wallets, auto-populate for the new wallet.

**Priority:** MEDIUM

---

## BUG 7 — LOW: Verbose production debug logs in fog code

**Issue:** Four `console.log` statements in MapBoardView fire on every token movement and every fog load, producing cluttered browser console output in production.

**Root cause:** MapBoardView.tsx lines 419, 446, 482, 505:
```typescript
console.log('[fog] revealAround', { center, visionPx, rTiles, originX, originY })
console.log('[fog] circleTiles count:', circleTiles.length)
console.log('[fog] upserted', payload.length, 'tiles to DB')
console.log('[fog] token reveal x=', px, 'y=', py, 'ownerLower=', ownerLower)
```

**Fix:** Remove all four `console.log` calls. Keep only `console.error` calls for actual errors.

**Priority:** LOW

---

## BUG 8 — LOW: No loading/success feedback for Reveal All

**Issue:** Reveal All can trigger up to ~6000 DB upserts (600 tiles × 10 players) in 12+ batches. The operation runs silently with no loading state, progress indicator, or success toast. The GM doesn't know if it worked or how long it will take.

**Root cause:** `handleRevealAll` has no loading state management.

**Fix:** Add a simple loading state:
```typescript
const [isRevealingAll, setIsRevealingAll] = useState(false)

const handleRevealAll = async () => {
  if (!canvasSize || sessionPlayerWallets.length === 0) return
  if (!window.confirm('Reveal entire map for all players?')) return
  setIsRevealingAll(true)
  try {
    // ... existing reveal logic ...
  } finally {
    setIsRevealingAll(false)
    // show a success toast
  }
}
```
And disable the button while `isRevealingAll`:
```tsx
<button disabled={isRevealingAll} onClick={handleRevealAll}>
  {isRevealingAll ? '⏳ Revealing…' : '👁 Reveal All'}
</button>
```

**Priority:** LOW

---

## NOT A BUG (from the audit): "Reveal All blocks player token movement"

The audit found **no code path** by which Reveal All could block token movement. The fog canvas always has `pointer-events-none`. No fog state is checked in any movement handler. Reveal All does not write to `tokens`, `encounters`, `sessions`, or `characters`. If players reported movement being blocked after Reveal All, the actual cause is one of:
- Session `status` is not `'active'`
- Initiative is active and it is not the player's turn
- Player has used all movement for this turn (`remainingMovePx <= 0`)
- Player's wallet is not properly connected (ownerWallet prop is null)

These are not fog bugs.

---

## NOT A BUG: FogOfWarOverlay.tsx missing

The file `FogOfWarOverlay.tsx` listed in the audit spec does not exist and was never created. The fog overlay canvas was always embedded directly in MapBoard.tsx and MapBoardView.tsx. This is the correct architecture — no separate file is needed.

---

## Priority summary

| # | Priority | Issue |
|---|----------|-------|
| 1 | HIGH | Fog Brush/Reveal All/Reset Fog hidden when no players in session |
| 2 | HIGH | GM loses all fog tools in "View As" mode |
| 3 | MEDIUM | No visual banner when Fog Brush is active |
| 4 | MEDIUM | Reveal All silently fails when map image not yet loaded |
| 5 | MEDIUM | No confirmation before Reveal All or Reset Fog |
| 6 | MEDIUM | Reveal All misses players who join after it runs |
| 7 | LOW | Verbose production debug logs in fog code |
| 8 | LOW | No loading/success feedback for Reveal All |

## Fix implementation order

1. **BUG 1** — Remove `sessionPlayerWallets.length > 0` guard (1 line change in MapBoard.tsx)
2. **BUG 5** — Add confirmation dialogs to Reveal All and Reset Fog (2 guard lines)
3. **BUG 3** — Add fog brush active banner (1 JSX block in MapBoard.tsx)
4. **BUG 7** — Remove debug console.logs from MapBoardView.tsx (4 lines)
5. **BUG 8** — Add loading state to Reveal All button
6. **BUG 2** — Add GM fog toolbar overlay to MapSection for "View As" mode (larger change)
7. **BUG 4** — Add disabled/error state when canvasSize is null
8. **BUG 6** — Auto-populate fog for late-joining players (requires design decision)
