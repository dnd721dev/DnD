# Combat Tracker Bug Report
*Generated 2026-05-02 — WAIT FOR APPROVAL before touching any code*

---

## CRITICAL

### BUG-CRIT-1 — Initiative state resets on tab switch

| Field | Value |
|---|---|
| **Category** | State persistence |
| **File** | `src/components/table/InitiativeTracker.tsx` |
| **Symptom** | When the GM clicks away from the tab containing the initiative tracker (or the sidebar panel collapses), `turnIdx`, `round`, and `started` reset to `0`, `1`, `false`. Combat appears to restart from the top when returning. |
| **Root cause** | `turnIdx`, `round`, `started` are all `useState`. No Supabase column backs them up. Only `encounters.active_entry_id` is persisted. |
| **Fix** | Add `turn_index INT`, `round_number INT`, and `combat_started BOOLEAN` columns to `encounters`. Write them on every `nextTurn` / `prevTurn` call. Seed local state from the DB row on mount (alongside the existing `active_entry_id` read). |
| **Priority** | P0 |

---

### BUG-CRIT-2 — Turn advancement is same-device only

| Field | Value |
|---|---|
| **Category** | Realtime sync |
| **Files** | `src/components/table/InitiativeTracker.tsx` |
| **Symptom** | When the GM clicks "Next Turn", only the GM's browser advances to the next combatant. Player devices see the glowing token change (because `active_entry_id` updates) but never see the round number tick up, never see the "It's your turn" banner in PlayerSidebar, and never see the combat tracker highlight the correct row. |
| **Root cause** | `nextTurn()` calls `setTurnIdx` (local state) and `setRound` (local state). The `window.dispatchEvent(new CustomEvent('dnd721-active-initiative', …))` is same-tab only. |
| **Fix** | Depends on CRIT-1 fix: once `turn_index` and `round_number` are persisted to `encounters`, all clients read them on the realtime `UPDATE` event. The `dnd721-active-initiative` window event can remain for same-device optimization; the PlayerSidebar should also derive `isMyTurn` from `active_entry_id` via the existing realtime path (it already does via `MapBoardView`, but `PlayerSidebar`'s `activeWalletLower` still depends on the window event). Add a Supabase realtime listener in PlayerSidebar for `encounters.active_entry_id` changes as a fallback. |
| **Priority** | P0 |

---

### BUG-CRIT-3 — "It's your turn" notification doesn't reach other devices

| Field | Value |
|---|---|
| **Category** | Realtime sync |
| **Files** | `src/components/table/InitiativeTracker.tsx`, `src/components/table/PlayerSidebar.tsx` |
| **Symptom** | Player on a different device never receives the "it's your turn" modal/banner in PlayerSidebar. They can see the glowing token (via `active_entry_id`) but the sidebar never shows the turn notification. |
| **Root cause** | `PlayerSidebar` sets `activeWalletLower` from the `dnd721-active-initiative` window event, which is only broadcast on the GM's device. Players can only receive it if they are on the same machine as the GM. |
| **Fix** | PlayerSidebar (and the player's MapBoardView already does this) should derive `isMyTurn` directly from the `encounters.active_entry_id` realtime subscription. On UPDATE, compare the new `active_entry_id` → lookup the entry's `wallet_address` → if it matches the current user's wallet, show the turn banner. |
| **Priority** | P0 |

---

## HIGH

### BUG-HIGH-1 — Monster conditions not persisted or shared

| Field | Value |
|---|---|
| **Category** | State persistence |
| **Files** | `src/components/table/DMPanel.tsx`, `src/app/sessions/[id]/table/TableClient.tsx` |
| **Symptom** | DM toggles "Poisoned" on a monster. It appears to work (condition ring shows on GM screen). On page refresh, or when a second GM window is open, all monster conditions are gone. Players never see condition rings on monsters. |
| **Root cause** | `actorConditions` state lives in `TableClient`. DMPanel dispatches `dnd721-conditions-toggle` → TableClient updates `actorConditions` (local) → TableClient dispatches `dnd721-conditions-updated` (local). No DB write occurs for monster conditions. |
| **Fix** | Add a `conditions TEXT[]` column to `tokens` (or store as JSONB). When a condition is toggled for a `token:<id>` key, write `tokens.conditions` via `supabase.from('tokens').update({ conditions: [...] })`. All clients already subscribe to token realtime. |
| **Priority** | P1 |

---

### BUG-HIGH-2 — Trigger damage and conditions never applied

| Field | Value |
|---|---|
| **Category** | Missing feature / data model unused |
| **Files** | `src/components/table/TriggersPanel.tsx`, `src/app/api/triggers/route.ts` |
| **Symptom** | DM creates a trap with `damage_dice: "2d6"` and `condition_applied: "poisoned"`. When a player steps on it, they see a save modal and roll. Even if they fail, no damage is dealt and no condition is applied. The fields exist in the DB row but are never read after trigger detection. |
| **Root cause** | `fireTrigger()` in TriggersPanel only dispatches `dnd721-trigger-tripped`. The trigger detail object contains `damage_dice`, `condition_applied`, `save_type`, `dc` — but the only consumer (PlayerSidebar) only reads `save_type` and `dc` for the roll prompt. On a failed save, it logs the result and dismisses the modal. |
| **Fix** | In PlayerSidebar `rollSave()`: after determining success/failure, if the trigger has `damage_dice`, roll it and call `onRoll` with the damage. Then call an API endpoint (or direct supabase update) to write damage to the token. If `condition_applied` is set on a failure, dispatch `dnd721-conditions-toggle` for the player's own character/token. Requires HIGH-1 fix to persist the condition. |
| **Priority** | P1 |

---

### BUG-HIGH-3 — Monster attack rolls don't deal damage

| Field | Value |
|---|---|
| **Category** | Missing feature |
| **Files** | `src/components/table/MonsterStatPanel.tsx` |
| **Symptom** | GM clicks "Attack Roll" in MonsterStatPanel, rolls hit against player AC — shows "HIT". Clicks "Damage Roll". Number appears in dice log. Player HP is unchanged. GM must manually find the player's token, click it, and enter the damage separately. |
| **Root cause** | `handleAttackRoll` and `handleDamageRoll` call `onRoll(…)` (adds to dice log) and update local component state only. There is no call to `supabase.from('tokens').update({ current_hp: ... })` or to any API endpoint. |
| **Fix** | After a damage roll, if there is a target token selected (`openMonsterToken` prop) and `lastAttackHit` is true, calculate the new HP and call `supabase.from('tokens').update({ current_hp: newHp }).eq('id', targetToken.id)`. Respect resistance/immunity by reading token conditions. |
| **Priority** | P1 |

---

### BUG-HIGH-4 — GM token movement doesn't trigger traps

| Field | Value |
|---|---|
| **Category** | Missing feature |
| **Files** | `src/components/table/MapBoard.tsx`, `src/app/sessions/[id]/table/TableClient.tsx` |
| **Symptom** | GM drags a monster token (or PC token via GM-move) onto a trap tile. No trigger fires. The trigger detection only works when a player moves their own token. |
| **Root cause** | `dnd721-token-moved` is dispatched inside `MapBoardView` after `move_my_token` RPC succeeds. `MapBoard` (the GM view) updates tokens via direct `supabase.from('tokens').update(…)` calls and never dispatches `dnd721-token-moved`. |
| **Fix** | After any successful token update in `MapBoard` (drag-drop handler), dispatch `dnd721-token-moved { tokenId, tileX: Math.floor(newX / gridSize), tileY: Math.floor(newY / gridSize), mapId }`. The existing TableClient listener will then run trigger detection. |
| **Priority** | P1 |

---

### BUG-HIGH-5 — Old "End Session" button bypasses lifecycle API

| Field | Value |
|---|---|
| **Category** | Integration |
| **Files** | `src/app/sessions/[id]/table/TableClient.tsx` (`handleEndSession`), `src/components/table/tableclient/components/TableTopBar.tsx` |
| **Symptom** | GM clicks "End Session" in the top bar. Session marks completed. However: session_items are not cleaned up from inventories, active recordings are not stopped, active encounters are not marked ended, and `processSessionEndItems` never runs. |
| **Root cause** | `handleEndSession` writes `status: 'completed'` directly to `sessions` table via the anon supabase client (respects RLS update-own policy). It does not call `POST /api/sessions/[sessionId]/status` with `action: 'end_session'`. |
| **Fix** | Replace the direct `supabase.from('sessions').update({ status: 'completed' })` call in `handleEndSession` with a fetch to `POST /api/sessions/${session.id}/status` with body `{ action: 'end_session' }` and the wallet header. This will trigger all the side effects. Remove the duplicate "End Session" button from TableTopBar once `SessionControlPanel` (in GMSidebar Admin tab) covers the same flow. |
| **Priority** | P1 |

---

## MEDIUM

### BUG-MED-1 — XP grant panel gated on wrong status value

| Field | Value |
|---|---|
| **Category** | Logic bug |
| **File** | `src/components/table/DMPanel.tsx` |
| **Symptom** | DM opens the XP tab. The grant panel never appears, even during an active session. |
| **Root cause** | `sessionStatus === 'in_progress'` — the old pre-migration status value. Since migration 020/021 the value is `'active'`. |
| **Fix** | Change to `sessionStatus === 'active'`. One-line fix. |
| **Priority** | P2 |

---

### BUG-MED-2 — useSessionWithCampaign realtime only syncs current_map_id

| Field | Value |
|---|---|
| **Category** | Realtime sync |
| **File** | `src/components/table/tableclient/hooks/useSessionWithCampaign.ts` |
| **Symptom** | If the GM updates the session title, status, or other fields while players are on the table page, those clients never see the update (except `current_map_id`). Status changes go through the separate TableClient subscription, but title / description / required_level / xp_award changes are never reflected without a page refresh. |
| **Root cause** | The realtime handler only patches `current_map_id`. |
| **Fix** | Spread all changed fields from `payload.new` into the session state, selectively updating known-safe display fields (title, description, status, xp_award, required_level, current_map_id). |
| **Priority** | P2 |

---

### BUG-MED-3 — Resistance / immunity not persisted or shared

| Field | Value |
|---|---|
| **Category** | State persistence |
| **File** | `src/components/table/MapBoard.tsx` |
| **Symptom** | GM marks a monster as resistant to fire. On page refresh, or on a different GM device, the resistance is gone. Players can never see which tokens have resistances. |
| **Root cause** | `resistanceMap` and `immunityMap` are `useState` in `MapBoard`. No DB column. |
| **Fix** | Add a `resistances TEXT[]` and `immunities TEXT[]` column to `tokens`. Write via `supabase.from('tokens').update({…})` on toggle. All clients already subscribe to token realtime. |
| **Priority** | P2 |

---

### BUG-MED-4 — Legendary action count resets on unmount

| Field | Value |
|---|---|
| **Category** | State persistence |
| **File** | `src/components/table/InitiativeTracker.tsx` |
| **Symptom** | GM uses one legendary action from a boss monster. Switches to another sidebar tab and back. Legendary action count is back to full. |
| **Root cause** | `legendaryMap` is `useState`. |
| **Fix** | Add `legendary_used INT` to `initiative_entries`. Write on each use. Or include in the existing `death_saves` JSONB pattern with a separate column. |
| **Priority** | P2 |

---

### BUG-MED-5 — PC HP tracked in two separate columns

| Field | Value |
|---|---|
| **Category** | Data consistency |
| **Files** | `src/components/table/PlayerSidebar.tsx`, `src/components/table/TokenHUD.tsx` |
| **Symptom** | Player heals themselves via the PlayerSidebar (updates `characters.hit_points_current`). The token on the map still shows the old HP. GM adjusts HP via TokenHUD (updates `tokens.current_hp`). The character sheet HP is unaffected. The two numbers diverge. |
| **Root cause** | No sync exists between `characters.hit_points_current` and `tokens.current_hp`. They are updated independently. |
| **Fix** | When a PC token is placed, its `character_id` FK is set. When `tokens.current_hp` changes for a PC token, a DB trigger (or API endpoint) should also write `characters.hit_points_current`. Alternatively, have TokenHUD write both columns in a single call. |
| **Priority** | P2 |

---

### BUG-MED-6 — Reaction not reset on new round for remote clients

| Field | Value |
|---|---|
| **Category** | State sync |
| **Files** | `src/components/table/PlayerSidebar.tsx`, `src/components/table/InitiativeTracker.tsx` |
| **Symptom** | At the start of a new round the player's reaction refreshes on the GM's device but not on the player's own device (different machine). |
| **Root cause** | `dnd721-new-round` is a window event dispatched by `InitiativeTracker`. `PlayerSidebar` listens for it and calls `updateActionState({ reaction_used_round: false })`. This only works on the same device as the GM. |
| **Fix** | When `nextTurn` increments the round, write a `round_number` to `encounters` (CRIT-1 fix). All clients' `PlayerSidebar` should listen for this realtime increment and reset `reaction_used_round` via `updateActionState`. |
| **Priority** | P2 |

---

## LOW

### BUG-LOW-1 — handleEndSession posts to non-existent session_messages table

| Field | Value |
|---|---|
| **Category** | Missing migration |
| **File** | `src/app/sessions/[id]/table/TableClient.tsx` |
| **Symptom** | When GM ends a session, a "The GM has ended the session" system message fails silently. No error shown to user. |
| **Root cause** | `supabase.from('session_messages').insert(…)` — `session_messages` is referenced in TableClient but not present in any migration file. |
| **Fix** | Either create the migration for `session_messages`, or remove the dead insert. |
| **Priority** | P3 |

---

### BUG-LOW-2 — No DB-level unique constraint on initiative_entries (encounter_id, wallet_address)

| Field | Value |
|---|---|
| **Category** | Data integrity |
| **File** | `supabase/migrations/002_rebuild_backend.sql` |
| **Symptom** | Rapid double-click on "Roll Initiative" can insert two rows for the same player in the same encounter. The upsert `onConflict` hint relies on an index that may not exist. |
| **Root cause** | The schema defines no `UNIQUE(encounter_id, wallet_address)` index on `initiative_entries`. The upsert `onConflict` silently degrades to an insert if the index is missing. |
| **Fix** | Add `CREATE UNIQUE INDEX IF NOT EXISTS initiative_entries_encounter_wallet_uniq ON initiative_entries(encounter_id, wallet_address) WHERE wallet_address IS NOT NULL;` |
| **Priority** | P3 |

---

### BUG-LOW-3 — Dash flag not cleared when a new turn starts

| Field | Value |
|---|---|
| **Category** | Rule correctness |
| **Files** | `src/components/table/InitiativeTracker.tsx`, `src/components/table/PlayerSidebar.tsx` |
| **Symptom** | A player uses Dash on their turn, doubling their movement. On their next turn, `dashing: true` is still in `action_state`, so they still have doubled movement budget until they manually untick the action. |
| **Root cause** | `nextTurn()` does not reset any per-turn flags in `action_state` for the outgoing combatant. |
| **Fix** | On each `nextTurn()`, for the previous entry, if it was a PC (`is_pc` = true), write `characters.action_state = { ...action_state, action_used_turn: false, bonus_used_turn: false, dashing: false, move_used_ft: 0 }`. Alternatively, InitiativeTracker can dispatch a window event (`dnd721-turn-ended { wallet }`) that PlayerSidebar catches to clear its own per-turn flags. |
| **Priority** | P3 |

---

## Fix Priority Order

```
P0  CRIT-1   Persist turnIdx / round / started to encounters table
P0  CRIT-2   All clients follow turn order via realtime encounters columns
P0  CRIT-3   Player turn notification via realtime (not window event)
P1  HIGH-1   Persist monster conditions to tokens.conditions column
P1  HIGH-2   Apply trigger damage + condition on failed save
P1  HIGH-3   MonsterStatPanel damage applies to tokens.current_hp
P1  HIGH-4   GM token move dispatches dnd721-token-moved for trigger detection
P1  HIGH-5   handleEndSession uses lifecycle API (not direct DB write)
P2  MED-1    DMPanel XP gate: 'in_progress' → 'active'
P2  MED-2    useSessionWithCampaign spreads all realtime fields
P2  MED-3    Persist token resistance/immunity to tokens table
P2  MED-4    Persist legendary action count to initiative_entries
P2  MED-5    Sync characters.hit_points_current ↔ tokens.current_hp for PCs
P2  MED-6    Reaction reset via round_number realtime (not window event)
P3  LOW-1    Create session_messages migration or remove dead insert
P3  LOW-2    Add UNIQUE index on initiative_entries(encounter_id, wallet_address)
P3  LOW-3    Clear per-turn flags (dashing, action_used_turn, etc.) on nextTurn
```
