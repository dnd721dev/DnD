# Round 2 Bug Report — DND721 Table
_Read the full audit in `round2_bug_audit.md` before approving fixes._

---

## Priority Groups

### 🔴 Group 1 — HIGH (session-breaking)

#### BUG-10: Player damage doesn't auto-reduce token HP
**Severity**: HIGH  
**File**: `src/components/table/PlayerSidebar.tsx`  
**Symptom**: When a player rolls weapon damage, the targeted token's HP is not reduced. Only GM monster attacks (via `MonsterStatPanel.tsx`) auto-apply damage.  
**Fix**: In `doWeaponDamage()`, add the same `supabase.from('tokens').update({ current_hp: newHp }).eq('id', target.id)` call that `MonsterStatPanel.tsx` already has. Gate on `lastAttackHit === true && target?.id`.

#### BUG-02: "Create a Character" link kills voice chat
**Severity**: HIGH  
**File**: `src/components/table/PlayerSidebar.tsx` line ~924  
**Symptom**: Clicking "Create a Character" navigates the current browser tab away from `/sessions/[id]/table`, terminating the LiveKit voice connection.  
**Fix**: Add `target="_blank" rel="noopener noreferrer"` to `<Link href="/characters/new">`.

---

### 🟠 Group 2 — MEDIUM (gameplay broken, workaround exists)

#### BUG-01: Chat avatars only show for current user
**Severity**: MEDIUM  
**File**: `src/components/table/TableChat.tsx` + DB migration needed  
**Symptom**: `avatarMap` is populated by querying `session_players` from the Supabase client. RLS restricts that table to each user's own row. Other players' avatars never appear.  
**Fix**: Add a Supabase RLS policy that allows any authenticated user to SELECT `session_players` rows for sessions they participate in. No frontend changes needed once RLS is fixed.

#### BUG-05: XP awarded but level never increases
**Severity**: MEDIUM  
**File**: `src/app/api/sessions/award-xp/route.ts`  
**Symptom**: CAYA session XP is correctly stored in `characters.experience_points` but `characters.level` is never updated, so characters never level up.  
**Fix**: After the XP update, compute the new level from D&D 5e 2024 XP thresholds and run `UPDATE characters SET level = $newLevel WHERE id = $charId` if the level changed.  
**XP thresholds**: 300/900/2700/6500/14000/23000/34000/48000/64000/85000/100000/120000/140000/165000/195000/225000/265000/305000/355000 (levels 2–20).

#### BUG-06: Environment triggers fire repeatedly + one-shot traps
**Severity**: MEDIUM  
**File**: `src/app/sessions/[id]/table/TableClient.tsx`  
**Symptom**: `dnd721-token-moved` fires on every committed move. If a player commits any move while on a trap tile (e.g., mini-adjusting position), the trap fires again.  
**Fix**: In `TableClient.tsx`, maintain a `lastTriggerTile` `useRef<Map<tokenId, {x,y}>>`. Only check triggers when the token's tile actually changes. Optionally, after a one-shot trigger fires, PATCH the trigger to `is_active: false`.

#### BUG-09: GM can't pull up monster stat block from map token
**Severity**: MEDIUM  
**File**: `src/components/table/GMSidebar.tsx`  
**Symptom**: Right-clicking a token fires `dnd721-target-selected`. `DMPanel` (inside GMSidebar's "🎲 Tools" tab) correctly listens for this event and loads the stat block. But `GMSidebar` itself doesn't auto-switch to the Tools tab, so if the GM is on another tab, the stat block is loaded but invisible.  
**Fix**: Add a `useEffect` in `GMSidebar.tsx` listening for `dnd721-target-selected` that calls `setActiveTab('tools')`.

#### BUG-11: Attack dice/formula in sidebar doesn't match character sheet
**Severity**: MEDIUM  
**Files**: `src/components/table/PlayerSidebar.tsx` + `src/components/character-sheet/calc.ts`  
**Symptom**: PlayerSidebar looks up weapons via `WEAPON_DB[item.key]`. If the key is absent or the weapon is custom, it falls back to generic `1d8`. Character sheet uses `computeMainAttack()` which reads `inventory_items` directly. Players see different numbers.  
**Fix**: Import and call `deriveStats()` (or just `computeMainAttack()`) in `PlayerSidebar.tsx` using the already-loaded `sheet` data. Replace `mainDice`, `mainAtkMod`, and `mainDmgMod` with values from `DerivedStats.attackFormula`, `DerivedStats.attackBonus`, `DerivedStats.damageFormula`.

#### BUG-08: Movement remaining doesn't update cross-component in real-time
**Severity**: MEDIUM  
**Files**: `src/components/table/MapBoardView.tsx` + `src/components/table/PlayerSidebar.tsx`  
**Symptom**: After committing a move, the movement bar in PlayerSidebar may lag or not update because the two components have separate state. Also: the `characters.action_state` JSONB update may clobber other keys if not read-modify-write.  
**Fix 1**: In `MapBoardView.tsx`, ensure the `action_state` update merges into the existing JSONB object (read `action_state` first, then spread-update only `move_used_ft`).  
**Fix 2**: In `TableClient.tsx`, wire a shared `moveUsedFt` state value that MapBoardView updates directly (as a callback) and PlayerSidebar reads. This bypasses the Supabase round-trip latency for the visual update.

#### BUG-03: No movement range tile highlighting
**Severity**: MEDIUM  
**File**: `src/components/table/MapBoardView.tsx`  
**Symptom**: Players have no visual indication of which tiles they can reach with remaining movement.  
**Fix**: Implement BFS from player's current tile for `remainingMovePx / pixelsPerTile` steps. Store the reachable tile set in state. On the token canvas render pass, when `isMyTurn`, draw each reachable tile with `rgba(59,130,246,0.25)` fill and `rgba(59,130,246,0.6)` stroke. Clear and recompute on move commit or turn change.

---

### 🟡 Group 3 — LOW / UX polish

#### BUG-07: PlayerSidebar shows "Not started" on NPC turns
**Severity**: LOW-MEDIUM  
**File**: `src/components/table/PlayerSidebar.tsx`  
**Symptom**: When `encounters.active_wallet = null` (NPC turn), all players see "Not started" in the turn indicator. Players think the combat system broke.  
**Fix**: Add a branch: `activeWalletLower === null && activeName !== null` → display `"⚔ NPC Turn: {activeName}"` in amber/orange. Only show "Not started" when both wallet and name are null.

#### BUG-04: Fog of war opacity
**Severity**: LOW  
**Finding**: Player fog is already `rgba(2,6,23,0.92)` (near-black). GM fog is intentionally `rgba(2,6,23,0.6)`. No change needed for the player view. If the GM perceives it as "not dark enough" on their own screen in fog-edit mode, this is acceptable because they need to see revealed tiles.  
**Status**: No code change needed. Document the intentional difference in a comment.

---

## Files Modified Per Fix

| Bug | Files to Touch |
|-----|---------------|
| BUG-10 | `PlayerSidebar.tsx` |
| BUG-02 | `PlayerSidebar.tsx` |
| BUG-01 | DB migration (new RLS policy on `session_players`) |
| BUG-05 | `award-xp/route.ts`, `lib/dnd5e.ts` (add XP table) |
| BUG-06 | `TableClient.tsx` |
| BUG-09 | `GMSidebar.tsx` |
| BUG-11 | `PlayerSidebar.tsx` |
| BUG-08 | `MapBoardView.tsx`, `TableClient.tsx` |
| BUG-03 | `MapBoardView.tsx` |
| BUG-07 | `PlayerSidebar.tsx` |
| BUG-04 | No change |

---

## Implementation Order (if approved)

1. **BUG-10 + BUG-02** (same file, highest impact, safest changes)
2. **BUG-09 + BUG-07** (both ~5-line fixes in sidebar components)
3. **BUG-01** (DB migration for RLS — isolated, no frontend change)
4. **BUG-05** (award-xp route + dnd5e.ts constant — self-contained)
5. **BUG-06** (TableClient trigger dedup — medium complexity)
6. **BUG-11** (PlayerSidebar weapon calc — medium complexity, uses existing functions)
7. **BUG-08** (Movement cross-state — needs careful JSONB merge + shared state)
8. **BUG-03** (BFS movement range — largest new feature, standalone canvas code)
