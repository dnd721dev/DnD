# Combat Tracker Audit
*Generated 2026-05-02 — read every listed file before writing*

---

## A. Initiative Tracker

### A1. State Storage

| Piece of state | Where it lives | Persisted? |
|---|---|---|
| `turnIdx` | `useState` in `InitiativeTracker.tsx` | ❌ Local only |
| `round` | `useState` in `InitiativeTracker.tsx` | ❌ Local only |
| `started` | `useState` in `InitiativeTracker.tsx` | ❌ Local only |
| `condMap` (per-entry conditions) | `useState` in `InitiativeTracker.tsx` | ❌ Local only |
| `deathMap` (per-entry death saves) | Seeded from DB but mutations are local first then written | ✅ Written to `initiative_entries.death_saves` |
| `entries` | Fetched from `initiative_entries` via Supabase realtime | ✅ DB |
| `active_entry_id` | Written to `encounters.active_entry_id` via `supabase.from('encounters').update(…)` on every `nextTurn` call | ✅ DB |
| PC `active_conditions` | Stored in `characters.action_state.active_conditions` via PlayerSidebar | ✅ DB (PC only) |

**Root problem**: `turnIdx`, `round`, and `started` are all `useState`. If the GM switches away from the tab containing `InitiativeTracker` (i.e. opens the Map tab, Chat tab, etc.), React may unmount the component (or the sidebar panel hides it), resetting all three to `0 / 1 / false`. The only cross-device state is `active_entry_id`.

### A2. How "whose turn it is" propagates

1. GM calls `nextTurn()` → `setTurnIdx(i+1)` (local) + `supabase.from('encounters').update({ active_entry_id: entries[nextIdx].id })`
2. Realtime `postgres_changes` on `encounters` fires on every connected client → they read the updated `active_entry_id` from `payload.new`
3. `InitiativeTracker` uses `active_entry_id` to highlight the active row (green ring)
4. `MapBoard` / `MapBoardView` subscribe to `encounters` realtime → update `activeEntryId` → glow the matching token
5. `window.dispatchEvent(new CustomEvent('dnd721-active-initiative', { detail: { name, wallet } }))` — **same-tab only** — tells `PlayerSidebar` and `MapBoardView` on the *same device* whose turn it is

**Cross-device gap**: A player on a separate device gets the token-glow update (via `active_entry_id` realtime). They do NOT get the `round` number, `turnIdx` position, or the "it's your turn" pop-up (that uses the window event). They also cannot see whether combat has started (`started` flag is local).

### A3. Sort order

Entries are sorted in the component by `init` DESC when loaded from DB. No secondary sort key — ties are arbitrary.

### A4. Adding entries

- **Monster tokens**: `spawnMonsterToken` in `TableClient.tsx` inserts the token then immediately inserts an `initiative_entries` row with auto-rolled initiative (d20 + DEX mod). The entries list reloads via realtime.
- **PC rolls**: `handleInitiative()` in `TableClient.tsx` upserts an `initiative_entries` row on `(encounter_id, wallet_address)` conflict. This does NOT auto-add a player token to the map.
- **Manual GM add**: The InitiativeTracker has an "Add Monster" button that inserts a row.

### A5. Conditions

- `condMap` is a `Record<string, string[]>` keyed by entry id, stored as `useState`. Toggling a condition from the initiative tracker dispatches `dnd721-conditions-toggle` event (handled in `TableClient`), which updates `actorConditions` local state, which then re-dispatches `dnd721-conditions-updated` for the map tokens.
- PC conditions go through `PlayerSidebar.updateActionState({ active_conditions: [...] })` → written to `characters.action_state`.
- Monster conditions are **never written to DB** — they live entirely in `actorConditions` (TableClient local state) and `condMap` (InitiativeTracker local state). A page refresh clears them.

### A6. Death saves

`deathMap` starts as a seeded copy from `initiative_entries.death_saves`. On every toggle in InitiativeTracker, `supabase.from('initiative_entries').update({ death_saves: {...} })` is called. This is one of the few combat state items that persists cross-device. ✅

### A7. Legendary actions

Stored in `legendaryMap` — `useState` in `InitiativeTracker.tsx`. Buttons increment/decrement. No DB write. Reset on unmount. ❌

---

## B. Tokens / Map

### B1. Schema (tokens table)

```
id            uuid PK
encounter_id  text → encounters.id CASCADE
map_id        uuid → maps.id SET NULL
label         text
name          text
x, y          int  (pixel coords, not tile coords)
color         text
hp            int  (max HP)
current_hp    int  (current HP)
ac            int
type          text  pc | monster | object
monster_id    text  SRD slug
owner_wallet  text
character_id  uuid → characters.id SET NULL
token_image_url text
```

### B2. HP write paths

| Source | Column written | Notes |
|---|---|---|
| GM: TokenHUD drag | `tokens.current_hp` | Realtime → all clients |
| GM: DMPanel HP slider | `tokens.current_hp` | Via target token id from `dnd721-target-selected` event |
| Player: PlayerSidebar `updateHP` | `characters.hit_points_current` | Also handles temp HP absorption |
| MonsterStatPanel damage roll | **Nothing** | Roll shown in dice log only |

Player HP tracked in two separate columns (`tokens.current_hp` for map + `characters.hit_points_current` for character sheet) — these can diverge. No sync exists between them.

### B3. PC token placement

Auto-spawn was intentionally removed (comment in TableClient: "PC tokens are now placed manually by the GM via the initiative tracker '📍 Place' button"). The button calls into InitiativeTracker which upserts a token with `owner_wallet` set.

### B4. Movement enforcement

- Client: `MapBoardView.canMoveToken(token)` checks: (a) `token.owner_wallet` matches current wallet, (b) `isMyTurn` (derived from `active_entry_id` match), (c) remaining movement budget (action_state.move_used_ft vs speed).
- Server: `move_my_token` Supabase RPC enforces ownership via `lower(owner_wallet) = v_caller_wallet`. Does NOT enforce turn order or movement budget.

### B5. Resistance / immunity

Stored in `MapBoard` component `useState` (`resistanceMap`, `immunityMap`). Never persisted. Resets on unmount / refresh. Only visible on the GM's device.

---

## C. Actions System

### C1. Architecture

- `SheetAction` type defines: id, name, category, actionType, gates, cost, effects[]
- Registries: `CORE_ACTIONS`, `CLASS_ACTIONS`, `SUBCLASS_ACTIONS`, `DND721_ACTIONS` (in `src/lib/actions/registry.ts`)
- Displayed and evaluated in `PlayerSidebar.tsx`
- Gate evaluation: `canUseAction` from `src/lib/actions/canUseAction.ts` (also a duplicate in `src/lib/actions/logic.ts`)

### C2. Per-turn / per-rest tracking

- `action_used_turn`, `bonus_used_turn`, `reaction_used_round` are booleans in `characters.action_state`
- Written by `PlayerSidebar.updateActionState()` → `characters.action_state` JSONB column
- Reset: `action_used_turn` and `bonus_used_turn` must be reset by the GM manually (no auto-reset on `nextTurn`). `reaction_used_round` resets on `dnd721-new-round` window event — **same-tab only**.

### C3. Dash action

- `core-dash` in registry, `cost: { type: 'none' }` (no resource). 
- When used in PlayerSidebar → sets `dashing: true` in action_state → `MapBoardView.canMoveToken` checks `actionState.dashing` → doubles effective speed (allows full speed × 2).
- `dashing` is cleared at turn start when action_state is reset (but there is no auto-reset — GM must reset or it clears when action_state is reloaded at next session).

### C4. Duplicate canUseAction

`src/lib/actions/canUseAction.ts` and `src/lib/actions/logic.ts` both export `canUseAction`. The `index.ts` re-exports from `canUseAction.ts`. `PlayerSidebar` imports from `@/lib/actions/canUseAction` (the non-logic version). These implementations differ slightly (logic.ts accepts optional params; canUseAction.ts requires them). This is a latent consistency bug.

---

## D. DM Controls

### D1. DMPanel layout

DMPanel has tabs: Combat, Spells, XP, Notes. The **Combat tab** listens for `dnd721-target-selected` events, shows the selected token, and allows:
- HP adjustment via delta (`± 1 / 5 / 10 / 20`)
- Condition toggles (15 standard conditions)

### D2. Condition write path from DMPanel

1. DMPanel `toggleTargetCondition(condition)` → dispatches `dnd721-conditions-toggle { key: "token:<id>", condition }`
2. TableClient listener → updates `actorConditions` local state
3. TableClient `useEffect` on `actorConditions` → dispatches `dnd721-conditions-updated { map: actorConditions }`
4. InitiativeTracker listener → updates `condMap` local state
5. MapBoard token ring listener → reads `condMap` to show condition rings

**No DB write at any step.** Conditions for monsters (and for PCs when set by the GM via DMPanel) are ephemeral.

### D3. XP section gate bug

In `DMPanel.tsx`, the XP tab renders `GrantXPPanel` only when `sessionStatus === 'in_progress'`. The valid lifecycle value is `'active'`, not `'in_progress'` (the old pre-migration value). This means the XP panel is **never visible** to the DM.

### D4. MonsterStatPanel

- Attack and damage rolls are computed locally and dispatched via `onRoll` callback to add them to the dice log.
- Hit/miss detection works: compares roll total to target token's AC from the `dnd721-target-selected` event.
- **No write to `tokens.current_hp`**. The GM must manually open TokenHUD or use DMPanel to apply damage.

---

## E. Triggers

### E1. Data model

`map_triggers` table:
```
id, session_id, map_id, tile_x, tile_y, name
save_type (DEX|STR|…), dc, description
trigger_type, damage_dice, damage_type, condition_applied
is_active, is_hidden, created_at
```

### E2. Detection flow

1. `MapBoardView` dispatches `dnd721-token-moved { tokenId, tileX, tileY, mapId }` after a successful move
2. TableClient listener fetches `GET /api/triggers?sessionId=&tileX=&tileY=&mapId=`
3. If triggers found → dispatches `dnd721-trigger-tripped { trigger: triggers[0] }` (only the first trigger fires)
4. `PlayerSidebar` listens → shows a modal prompting the player to roll their save
5. `TriggersPanel` (GM) has a "Fire" button that directly dispatches `dnd721-trigger-tripped` with any selected trigger

### E3. What happens when a trigger fires

- Player sees a modal to roll their saving throw (result goes to dice log only)
- `damage_dice`, `damage_type`, `condition_applied` fields are **never used** — the trigger has no mechanical consequence beyond the dice roll prompt
- No damage is applied to the token
- No condition is applied
- The trigger does not auto-mark as used/spent (is_active stays true)

### E4. Coverage gap

`dnd721-token-moved` is only dispatched in `MapBoardView` (player movement). When a **GM** drags a monster token in `MapBoard` onto a trigger tile, no detection occurs. Trigger detection is player-movement-only.

---

## F. Damage / HP Mechanics

### F1. Resistance / immunity calculation

`TokenHUD.tsx` takes `onHPChange` with a calculated final HP. It reads `resistanceMap`/`immunityMap` from MapBoard (passed as prop from `onResistanceCheck` callback context). The calculation:
- Immunity: delta becomes 0
- Resistance: `Math.ceil(delta / 2)` (for negative deltas/damage)
- Vulnerability: `delta * 2`

This resistance data is MapBoard local state — not visible to players or other clients.

### F2. Temp HP

PlayerSidebar absorbs damage into temp HP before applying to regular HP. `characters.temp_hp` is written to DB. TokenHUD has a separate temp HP field; it also handles absorption. These two implementations are independent — PC temp HP tracked in `characters.temp_hp`, monster temp HP tracked via TokenHUD which writes `tokens.current_hp` (but does not store temp HP separately — it's calculated on damage application in the UI only).

### F3. Concentration

PlayerSidebar triggers a CON save when the player takes damage while the `concentration` string is in `active_conditions`. Roll goes to dice log. If failed, dispatches `dnd721-concentration-broken { wallet }` window event and removes `concentration` from the player's `action_state.active_conditions`.

### F4. Death saves

Tracked in `initiative_entries.death_saves` JSONB `{ s: number, f: number }`. Written to DB from InitiativeTracker on each toggle. ✅ Cross-device persistent.

No auto-trigger when `tokens.current_hp` reaches 0. DM must manually mark death saves.

---

## G. Realtime Sync

### G1. Subscriptions in play

| Channel | Table | Filter | Consumer |
|---|---|---|---|
| `session-status-<id>` | sessions | UPDATE, id=eq.sessionId | TableClient — status transitions |
| `session-meta-<id>` | sessions | UPDATE, id=eq.sessionId | useSessionWithCampaign — only syncs `current_map_id` (BUG: other fields ignored) |
| `initiative-<encounterId>` | initiative_entries | *, encounter_id=eq.x | InitiativeTracker — full reload on any change |
| `encounter-<encounterId>` | encounters | *, id=eq.x | InitiativeTracker — reads `active_entry_id` |
| `map-tokens-<encounterId>` | tokens | *, encounter_id=eq.x | MapBoard / MapBoardView |
| `map-encounter-<encounterId>` | encounters | *, id=eq.x | MapBoard / MapBoardView — reads `active_entry_id` for token glow |
| `session-rolls-<id>` | session_rolls | INSERT, session_id=eq.x | useSessionRolls |
| `player-actions-<charId>` | characters | *, id=eq.x | PlayerSidebar — action_state |
| `player-sheet-preview-<charId>` | characters | *, id=eq.x | PlayerSidebar — full sheet |
| `session-items` | session_items | Per RLS policy | Available via realtime publication |

### G2. useSessionWithCampaign gap

The realtime handler only patches `current_map_id`:
```typescript
setSession((prev) =>
  prev ? { ...prev, current_map_id: updated.current_map_id ?? null } : prev
)
```
Status changes, title edits, gm_wallet changes — none of these propagate to clients that loaded the session before the change.

### G3. Turn advancement is same-device only

`nextTurn()` / `prevTurn()` → local state changes + `encounters.active_entry_id` write.  
Other clients: see token glow change. Do NOT see: round number, whether combat has started, `turnIdx` position.

### G4. Condition sync gap

No realtime subscription on `characters.action_state` for non-owner clients. PC conditions visible to other clients only if they re-load or the PC themselves updates their own action_state. GM-set monster conditions are pure local state with no subscription.

---

## H. Known Bugs Summary

### CRITICAL (break gameplay for all clients)

| ID | Component | Symptom | Root cause |
|---|---|---|---|
| CRIT-1 | InitiativeTracker | Turn index and round reset when GM switches tabs | `turnIdx`, `round`, `started` are `useState` — unmounts lose state |
| CRIT-2 | nextTurn / prevTurn | Other clients cannot follow turn order | `turnIdx` is local; only `active_entry_id` is synced |
| CRIT-3 | dnd721-active-initiative | Player turn notification doesn't reach other devices | Window CustomEvent is same-tab only |

### HIGH (breaks specific features)

| ID | Component | Symptom | Root cause |
|---|---|---|---|
| HIGH-1 | DMPanel conditions | Monster/NPC conditions not visible to players or other GM windows | No DB write; local state in `actorConditions` only |
| HIGH-2 | TriggersPanel / trigger effects | Traps have no mechanical effect | `damage_dice`, `condition_applied` never applied — event fires but no damage/condition write |
| HIGH-3 | MonsterStatPanel | Attack rolls don't deal damage | `handleAttackRoll` / `handleDamageRoll` only call `onRoll` (dice log); no `tokens.current_hp` write |
| HIGH-4 | Trigger detection | GM token moves don't trip triggers | `dnd721-token-moved` only dispatched from `MapBoardView`, not `MapBoard` |
| HIGH-5 | handleEndSession (TableTopBar) | Old "End Session" button bypasses lifecycle API | Writes `status: 'completed'` directly to sessions table; `processSessionEndItems`, stop-recordings, end-encounters side effects are skipped |

### MEDIUM (degraded experience)

| ID | Component | Symptom | Root cause |
|---|---|---|---|
| MED-1 | DMPanel | XP grant panel never shown | `sessionStatus === 'in_progress'` should be `'active'` |
| MED-2 | useSessionWithCampaign | Session title, status, etc. don't sync on remote update | Realtime handler only patches `current_map_id` |
| MED-3 | MapBoard resistance | Resistance / immunity not shared or persisted | Local `useState` in MapBoard only |
| MED-4 | Legendary actions | Legendary action count resets on unmount | Local `useState` in InitiativeTracker only |
| MED-5 | canUseAction | Duplicate implementation risk | `canUseAction.ts` vs `logic.ts` — slightly different signatures |
| MED-6 | PC HP desync | Player character HP can diverge from map token HP | `characters.hit_points_current` and `tokens.current_hp` updated independently |
| MED-7 | Reaction reset | Reaction not reset on new round for remote clients | `dnd721-new-round` is window event (same-tab only); remote players don't reset |

### LOW (minor / cosmetic)

| ID | Component | Symptom | Root cause |
|---|---|---|---|
| LOW-1 | handleEndSession chat | `session_messages` insert may fail | Table not in any migration file |
| LOW-2 | Initiative upsert | Duplicate PC entries possible if wallet conflict undetected | Unique constraint relies on upsert `onConflict` but no DB-level unique index on `(encounter_id, wallet_address)` |
| LOW-3 | Dash not auto-cleared | `dashing` flag persists across turns | No reset when `nextTurn` fires |

---

## Appendix: File index

| File | Role in combat |
|---|---|
| `src/components/table/InitiativeTracker.tsx` | Turn order UI, local combat state, death saves |
| `src/components/table/MapBoard.tsx` | GM map view, token CRUD, realtime tokens |
| `src/components/table/MapBoardView.tsx` | Player map view, movement enforcement, trigger dispatch |
| `src/components/table/TokenHUD.tsx` | HP / temp HP / resistance UI, writes `tokens.current_hp` |
| `src/components/table/DMPanel.tsx` | HP adjust, conditions, XP grant (gated by wrong status) |
| `src/components/table/TriggersPanel.tsx` | Trigger CRUD, fire button (event only, no effects) |
| `src/components/table/MonsterStatPanel.tsx` | Attack roll UI (dice log only, no HP write) |
| `src/components/table/MonsterLibrary.tsx` | Monster list, spawns via callback |
| `src/components/table/PlayerSidebar.tsx` | Player actions, HP self-update, conditions, saves |
| `src/components/table/GMSidebar.tsx` | GM panel host, passes sessionStatus props |
| `src/app/sessions/[id]/table/TableClient.tsx` | Orchestrator, sessionStatus realtime, trigger detection |
| `src/components/table/tableclient/hooks/useEncounter.ts` | Ensures one encounter row per session |
| `src/components/table/tableclient/hooks/useSessionRolls.ts` | Dice log realtime |
| `src/lib/conditions.ts` | Condition definitions + `getActiveConditionMechanics()` |
| `src/lib/actions/registry.ts` | All class/core/DND721 action definitions |
| `src/lib/actions/canUseAction.ts` | Exported gate evaluator |
| `src/lib/actions/logic.ts` | Duplicate gate evaluator (unused externally) |
| `src/app/api/triggers/route.ts` | Trigger CRUD + tile detection query |
| `src/app/api/roll/route.ts` | Server dice roll + session_rolls persist |
| `supabase/migrations/002_rebuild_backend.sql` | encounters, initiative_entries, tokens schema |
| `supabase/migrations/add_initiative_active_entry.sql` | FK encounters.active_entry_id |
| `supabase/migrations/add_death_saves_to_initiative.sql` | death_saves JSONB column |
| `supabase/migrations/009_tokens_pc_columns.sql` | character_id, token_image_url on tokens |
| `supabase/migrations/012_move_my_token_ownership.sql` | move_my_token RPC with ownership enforcement |
