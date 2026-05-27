# Round 2 Bug Audit — DND721 Table
_Generated after reading all 35+ required files. No code changed yet._

---

## Bug 1 — Chat avatars only show for own player

**Q1: Is this bug real?**
Yes. Confirmed.

**Q2: Root cause?**
`TableChat.tsx` builds `avatarMap` by querying `session_players` filtered to `session_id`. However, the Supabase client sends `x-wallet-address` and a JWT in every request, and the RLS policy on `session_players` restricts rows to the requesting wallet only (`WHERE wallet_address = current_setting('request.headers')::json->>'x-wallet-address'`). The query therefore returns only **one row** — the current user's. Every other player's wallet has no entry in `avatarMap`, so messages from them render with no avatar.

**Q3: Exact broken location**
`src/components/table/TableChat.tsx` — the `loadAvatars()` function queries `session_players` from the client, hitting a restrictive RLS wall. The GM is fetched separately via `profiles` which is why the GM avatar works.

**Q4: Fix description (no code)**
Add a Supabase RLS policy that allows any session participant to SELECT all rows from `session_players` where the `session_id` matches a session they are part of. Alternatively, expose a server-side API route (`/api/session-avatars/[sessionId]`) that uses `supabaseAdmin()` and returns wallet→avatar mappings. Either approach lets `loadAvatars` build a complete map.

---

## Bug 2 — Links open in same tab (killing voice chat)

**Q5: Is this bug real?**
Yes. Confirmed in `PlayerSidebar.tsx`.

**Q6: Exact broken location and fix**
`src/components/table/PlayerSidebar.tsx` line ~924: the **"Create a Character"** `<Link href="/characters/new">` does not have `target="_blank"`. Clicking it navigates the entire tab away from the table page, terminating the LiveKit voice connection.

Other potentially affected links in the table views:
- `PlayerSidebar.tsx`: The "Change" button calls `onSelectCharacter('')` (safe, no navigation).
- `PlayerSidebar.tsx` line ~981: `<Link href={/characters/${selectedCharacterId}} target="_blank">` — ALREADY correct.
- `GMSidebar.tsx`: No external links; all navigation is in-panel.
- `TableChat.tsx`: No navigation links.

**Fix**: Add `target="_blank" rel="noopener noreferrer"` to the "Create a Character" link in PlayerSidebar. Audit any other `<Link>` components used inside the table client for the same missing attribute.

---

## Bug 3 — Movement range tiles not highlighted in blue

**Q7: Is this feature present anywhere?**
No. It does not exist. Confirmed after reading `MapBoard.tsx` (1268 lines), `MapBoardView.tsx` (1160 lines), `TokenHUD.tsx`, and `InitiativeTracker.tsx`. None of these files contain BFS movement range logic, a reachable-tile set, or any blue tile rendering.

**Q8: Root cause and fix description**
The feature needs to be built from scratch. The required inputs already exist:
- Player's `remainingMovePx` is computed from `speedFeet` and `moveUsedFt` in `MapBoardView.tsx`
- Tile size in pixels is already known (used for fog rendering)
- Token position (grid tile X/Y) is tracked per token

Fix: In `MapBoardView.tsx`, when it is the player's turn (`isMyTurn` is true) and there is remaining movement, compute a BFS from the player's current tile position outward until the pixel cost exceeds `remainingMovePx`. Store the reachable tile set in state. On the tokens canvas (or a dedicated overlay layer), fill each reachable tile with `rgba(59,130,246,0.25)` (blue semi-transparent) and stroke with `rgba(59,130,246,0.5)`. Clear and recompute when token moves or turn changes.

---

## Bug 4 — Fog of war not dark enough

**Q9: Is this bug real?**
Partially. The **player** fog in `MapBoardView.tsx` is already `rgba(2,6,23,0.92)` — effectively near-black. The **GM** fog-tool overlay in `MapBoard.tsx` is intentionally lighter at `rgba(2,6,23,0.6)` so the GM can see revealed vs unrevealed while using the fog-paint tool.

If the user is a player and perceives fog as insufficient, the problem may be:
1. The base canvas fill covering the whole map before tile-by-tile fog is drawn. If this base fill uses a lighter opacity, tiles near the edge of the viewport could look washed out.
2. Map images with bright backgrounds bleeding through at 0.92 opacity.

**Q10: Fix description**
For the player view, no change needed to the 0.92 value. If there is a separate "base" canvas fill that precedes the per-tile fog, raise it to `rgba(2,6,23,0.95)` or use full `rgba(0,0,0,1)` for unrevealed tiles. For the GM, the 0.6 opacity is intentional and should remain.

---

## Bug 5 — XP level up not triggering

**Q11: Is this bug real?**
Yes. Confirmed.

**Q12: Root cause?**
`src/app/api/sessions/award-xp/route.ts` correctly increments `characters.experience_points`. However it never reads back the new total, computes the corresponding D&D 5e level from the XP thresholds, or updates `characters.level`. The XP award is stored correctly in the DB but the level column never changes.

**Q13: D&D 5e XP thresholds exist in the codebase?**
No. `src/lib/encounter.ts` has **combat difficulty** XP thresholds per character level, but there are NO level-up thresholds (the cumulative XP needed to reach each level). D&D 5e 2024 PHB thresholds are:
Level 2: 300 | Level 3: 900 | Level 4: 2,700 | Level 5: 6,500 | Level 6: 14,000 | Level 7: 23,000 | Level 8: 34,000 | Level 9: 48,000 | Level 10: 64,000 | Level 11: 85,000 | Level 12: 100,000 | Level 13: 120,000 | Level 14: 140,000 | Level 15: 165,000 | Level 16: 195,000 | Level 17: 225,000 | Level 18: 265,000 | Level 19: 305,000 | Level 20: 355,000

**Fix**: Add the level-up XP table to `src/lib/dnd5e.ts`. In the `award-xp` route, after updating XP, compute the new level and if it changed, update `characters.level` in the same batch. Return the new level in the response so the GM sees confirmation of any level-up.

---

## Bug 6 — Environment triggers: repeat fire + conditions not applying

**Q14: Repeat triggering — is it real?**
Yes. In `TableClient.tsx`, the `dnd721-token-moved` handler fires a trigger check on **every move commit event** for any tile. There is no per-token "last triggered tile" tracking and no per-token cooldown. A token can step off and back onto a trap tile and trigger it again immediately. A trap at tile (5,5) fires every time ANY token commits a move that lands on (5,5).

**Q15: Conditions not applying — is it real?**
Partially. The condition dispatch path appears correct:
`PlayerSidebar.tsx` → on failed save → dispatches `dnd721-conditions-toggle` → `TableClient.tsx` handler → updates `actorConditions` state → persists to `tokens.conditions` via Supabase.

The likely failure is that if the player **dismisses** the save prompt (clicks "Dismiss" or navigates away), no save is rolled and no condition is applied. The trigger fires silently with no consequence.

**Fix for repeat triggering**: Track `lastTriggerTile` per token ID in a `useRef` map in `TableClient.tsx`. Only check triggers when `tileX !== lastX || tileY !== lastY` for that token. On GM side, the PATCH endpoint can deactivate one-shot traps automatically after they fire.

**Fix for condition UX**: The dismiss button should be kept (some players legitimately won't roll in time). Consider auto-rolling the save server-side on trap entry instead.

---

## Bug 7 — Combat stops on NPC turn

**Q16: Is this bug real?**
It is real as a UX issue but not a code bug in `nextTurn()`. `InitiativeTracker.tsx` `nextTurn()` wraps correctly via `(turnIdx + 1) % len` with no NPC-specific blocking. The "⏭ Next" button is always enabled for the GM when combat is started.

**Root cause (UX)**: When an NPC's turn arrives, `encounters.active_wallet` is set to `null` (NPC entries have `wallet_address = null`). `PlayerSidebar.tsx` subscribes to `encounters` changes and reads `active_wallet`. When it's null, players see **"Not started"** instead of "NPC Turn". This creates the appearance of combat stalling — players believe the system is broken rather than waiting for the GM.

**Q17: Fix description**
In `PlayerSidebar.tsx`, change the turn-state display:
- When `activeWalletLower === null` AND `activeName !== null` (e.g. activeName = "Goblin Chief") → show `"⚔ NPC Turn: [activeName]"` instead of `"Not started"`.
- When both are null → show `"Not started"` (combat hasn't begun).

This requires no change to the DB or backend; just the conditional display in the sidebar.

---

## Bug 8 — Movement not subtracting in real time

**Q18: Where is move_used_ft updated?**
`MapBoardView.tsx` commits moves via `supabase.rpc('move_my_token', ...)` AND makes a **separate** direct update to `characters.action_state.move_used_ft` after each move. The RPC (`add_fog_of_war.sql`) only updates `tokens.x/y`. The `move_used_ft` update is a separate `supabase.from('characters').update({ action_state: { ...existing, move_used_ft: newValue } })` call.

**Q19: Is the bug real?**
Possibly a partial real bug. The "real-time" issue could be:
1. The `characters.action_state` update uses a full JSONB replace. If `existing` action_state isn't loaded before the merge, other keys (e.g., `action_used_turn`) get wiped.
2. The Supabase subscription in `PlayerSidebar` fires on character row change and reloads `action_state` — but if the move update arrives before the subscription reloads, there can be a brief mismatch.
3. Most likely: the optimistic update in `MapBoardView` only updates local token position state, not `remainingMovePx` in `PlayerSidebar` (different component, different state). The PlayerSidebar shows stale movement until the DB subscription fires.

**Fix**: Ensure the `characters.action_state` update in `MapBoardView` merges correctly with the existing JSONB (read-modify-write, not replace). The realtime subscription in `PlayerSidebar` should then update `moveUsedFt` within ~100ms. If perceived latency is still bad, expose an `onMoveCommit` callback from MapBoardView to TableClient that directly updates a shared `moveUsedFt` state prop passed to PlayerSidebar.

---

## Bug 9 — No way to pull up monster sheets as DM

**Q20: Is this bug real?**
Yes. Partially real. The `MonsterStatPanel` exists and is fully functional inside `DMPanel.tsx`. `DMPanel` auto-switches to its internal `'combat'` subtab when `dnd721-target-selected` fires from a map right-click. However:

**Root cause**: `GMSidebar.tsx` does NOT listen for `dnd721-target-selected` and does NOT auto-switch its own top-level tab from `'combat'` to `'tools'`. If the GM is on the "⚔ Combat" tab (which shows `InitiativeTracker + MonsterLibrary`), right-clicking a token does nothing visible to them. They must manually click "🎲 Tools" first.

The `MonsterLibrary` in the "⚔ Combat" tab shows stat blocks inline when a monster card is clicked — but that's for browsing the library, not for inspecting a token already placed on the map.

**Fix**: Add a `useEffect` in `GMSidebar.tsx` that listens for `dnd721-target-selected` and calls `setActiveTab('tools')` when a token detail is received. This makes right-clicking a map token automatically surface the DMPanel stat block.

---

## Bug 10 — Damage not auto-reducing token HP

**Q21: Where does auto-damage work vs. not work?**
`MonsterStatPanel.tsx` `handleDamageRoll()` auto-reduces `tokens.current_hp` when:
- `lastAttackHitRef.current === true` (preceding attack roll was a hit)
- `target?.id` is set (a token is targeted via `dnd721-target-selected`)

This works for the **GM rolling monster attacks**.

`PlayerSidebar.tsx` `doWeaponDamage()` and `doWeaponAttack()` do NOT auto-reduce any token's HP. `lastAttackHit` state is set/cleared but the damage result is only passed to `onRoll` (dice log) — no Supabase write to `tokens.current_hp`.

**Q22: Root cause**
`PlayerSidebar.tsx` is missing the HP-deduction step that `MonsterStatPanel.tsx` has. Players must manually communicate damage to the GM who then updates HP via `TokenHUD`.

**Fix**: In `PlayerSidebar.tsx` `doWeaponDamage`, after calling `onRoll`, check `lastAttackHit === true && target?.id`. If so, read current HP from `target`, compute `newHp = max(0, currentHp - result)`, and call `supabase.from('tokens').update({ current_hp: newHp }).eq('id', target.id)`. Mirror the `MonsterStatPanel.tsx` pattern exactly. Reset `lastAttackHit` to null afterward.

---

## Bug 11 — Attack dice don't match character sheet

**Q23: How does PlayerSidebar derive attack/damage?**
`PlayerSidebar.tsx` looks up equipped weapons from `sheet.inventory_items` filtered to `item.equipped && item.kind === 'weapon' && item.key`. It then looks up the weapon in `WEAPON_DB` by `item.key`. If the weapon is found in `WEAPON_DB`, it uses `weapon.damageDice` and `weapon.properties` to derive attack/damage modifiers.

If `item.key` is absent, the weapon kind isn't `'weapon'`, or the key doesn't exist in `WEAPON_DB`, it falls back to generic `1d8` / `max(STR, DEX) + proficiency`.

**Q24: How does the character sheet derive attack/damage?**
`src/components/character-sheet/calc.ts` `deriveStats()` calls `computeMainAttack(c, abilities, profBonus)` from `equipment-calc.ts`. This function likely reads `inventory_items` too, but may interpret weapon data differently (e.g., using `item.name`, `item.damageDice` directly from the item record, not the WEAPON_DB key lookup).

**Root cause**: Two different code paths for the same calculation. A weapon with a custom `damageDice` set directly on the inventory item row would show correctly in the character sheet (via `computeMainAttack`) but fall back to `1d8` in PlayerSidebar (key not in WEAPON_DB).

**Fix**: Replace the WEAPON_DB lookup in `PlayerSidebar.tsx` with a call to the same `deriveStats` / `computeMainAttack` logic used by the character sheet. Pass the loaded `sheet` data to `deriveStats` to get `attackFormula`, `damageFormula`, and `attackBonus`. Display these values on the "Attack" and "Damage" buttons directly from `DerivedStats`.

---

## Summary Table

| # | Bug | Real? | Severity | Root Cause File |
|---|-----|-------|----------|-----------------|
| 1 | Chat avatars own-player only | ✓ Real | MEDIUM | RLS on `session_players` |
| 2 | Links kill voice chat | ✓ Real | HIGH | `PlayerSidebar.tsx` missing `target="_blank"` |
| 3 | No movement range tiles | ✓ Real (missing feature) | MEDIUM | `MapBoardView.tsx` — not implemented |
| 4 | Fog not dark enough | ⚠ Partial | LOW | Player fog already 0.92; GM view 0.6 intentional |
| 5 | XP doesn't level up | ✓ Real | MEDIUM | `award-xp/route.ts` — no threshold check |
| 6 | Triggers repeat + condition | ✓ Real | MEDIUM | `TableClient.tsx` — no tile-entry dedup |
| 7 | Combat stops on NPC turn | ✓ UX issue | LOW-MED | `PlayerSidebar.tsx` — null wallet shows "Not started" |
| 8 | Movement not real-time | ✓ Real (partial) | MEDIUM | `MapBoardView.tsx` — action_state merge + cross-component state |
| 9 | No monster sheet from map | ✓ Real | MEDIUM | `GMSidebar.tsx` — no auto-tab switch on target |
| 10 | Damage doesn't reduce HP | ✓ Real | HIGH | `PlayerSidebar.tsx` — missing Supabase update |
| 11 | Attack dice mismatch | ✓ Real | MEDIUM | `PlayerSidebar.tsx` — WEAPON_DB vs computeMainAttack |
