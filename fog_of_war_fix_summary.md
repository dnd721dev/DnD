# Fog of War — Fix Summary

All 7 bugs from `fog_of_war_bugs.md` have been fixed. TypeScript reports zero errors after all changes.

---

## Bug 1 — CRITICAL: GM View As used GM vision radius

**Files changed:** `src/app/sessions/[id]/table/TableClient.tsx`

1. Extended `SessionPlayerRow` type to carry `vision` and `race` fields.
2. In `loadPlayers()`, after fetching player rows, batch-fetch `id, vision, race` from `characters` and merge onto each `SessionPlayerRow`.
3. Rewrote the `visionFeet` memo with three branches:
   - `isGm && !gmViewWallet` → 120 ft (GM free view, unchanged)
   - `isGm && gmViewWallet` → looked up player's `vision` from `sessionPlayers`; falls back to race-based darkvision heuristic (same logic as the player branch)
   - player → unchanged existing logic
4. Added `gmViewWallet` and `sessionPlayers` to the memo's dependency array.

---

## Bug 2 — HIGH: `fog_reveals` not in realtime publication

**Files changed:** `supabase/migrations/015_fog_reveals_realtime.sql` *(new file)*

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE fog_reveals;
```

No application code changes needed; the `postgres_changes` subscription in `MapBoardView` was already correct.

---

## Bug 3 — HIGH: Dead `dnd721-pc-token-placed` window event

**Files changed:**
- `src/components/table/MapBoard.tsx` — removed the `window.dispatchEvent('dnd721-pc-token-placed', ...)` block and its comment
- `src/components/table/MapBoardView.tsx` — removed the `window.addEventListener('dnd721-pc-token-placed', ...)` `useEffect`; removed `revealedOnceRef`; replaced the `tokens.length` fallback effect with a new one that:
  - Tracks `tokenIds = tokens.map(t => t.id).join(',')` as the dep key so token *replacement* at the same count is detected
  - No longer has a "only once" guard — `revealAround` upserts with `ON CONFLICT DO NOTHING` so repeating it is safe

---

## Bug 4 — MEDIUM: Fog canvas flash on load

**Files changed:** `src/components/table/MapBoardView.tsx`

1. Added `const [fogsLoaded, setFogsLoaded] = useState(false)`.
2. `setFogsLoaded(true)` called inside `loadReveals()` after `setRevealSet(s)`.
3. `setFogsLoaded(false)` called at the top of the load effect (on map/encounter change) and when `ownerLower` is absent.
4. Fog canvas now renders with `opacity-0` until loaded, then `opacity-100` with a 300 ms CSS transition.

---

## Bug 5 — MEDIUM: Negative tile coords near map edges

**Files changed:** `src/components/table/MapBoardView.tsx`

Inside `revealAround`:
1. Derived `maxTileX` and `maxTileY` from `canvasSize` (falls back to `Infinity` if canvas not yet sized).
2. Added `if (tx < 0 || ty < 0 || tx > maxTileX || ty > maxTileY) continue` before pushing a tile.
3. Added `canvasSize` to the `useCallback` dependency array.

---

## Bug 6 — MEDIUM: Deleted `FogOfWarOverlay.tsx`

**Files changed:** `src/components/table/FogOfWarOverlay.tsx` *(deleted)*

Confirmed the file had zero importers in the source tree before deletion.

---

## Bug 7 — LOW: Unbounded `reveals` accumulator

**Files changed:** `src/components/table/MapBoardView.tsx`

Replaced the raw spread `setReveals(prev => [...prev, ...circleTiles])` with a deduplicating functional update that only appends tiles not already present in the array. After a long session the array is bounded to at most `totalMapTiles` entries regardless of how many reveal events fire.

---

## Files touched in total

| File | Change |
|------|--------|
| `src/app/sessions/[id]/table/TableClient.tsx` | Bug 1 — View As vision fix |
| `src/components/table/MapBoard.tsx` | Bug 3 — removed dead window event dispatch |
| `src/components/table/MapBoardView.tsx` | Bugs 3, 4, 5, 7 — listener removed, flash guard, bounds clamping, dedup |
| `src/components/table/FogOfWarOverlay.tsx` | Bug 6 — deleted (unused, broken coordinate system) |
| `supabase/migrations/015_fog_reveals_realtime.sql` | Bug 2 — realtime publication |
