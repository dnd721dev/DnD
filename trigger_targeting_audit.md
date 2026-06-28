# Trigger / Trap Effect System — Targeting Audit

Audit written **before** any code changes, per request. Goal: add a
`target_rule` so a trigger can apply its effect to a token *other* than the one
that stepped on the tile (first use case: "lowest current HP in the party").

> **Headline finding:** the implementation spec in the task assumes a data model
> this codebase does **not** have (a jsonb `effect_data` column, `tokens.session_id`,
> `tokens.npc_hp_current/character_hp_current`, and a single `fireTriggerEffect`
> that writes token HP directly with a service client). None of those exist here.
> The real system stores trigger effects in **flat columns** and applies damage
> **client-side, gated behind a saving-throw modal, through the `apply_combat_damage`
> RPC**. The feature is still very achievable, but the resolver, the schema change,
> and especially the save/“who rolls” behavior must be adapted. See
> [§5 Design mismatches](#5-design-mismatches--adapted-plan).

---

## 1. `map_triggers` schema — what effect data is actually supported

There is **no `effect_data` jsonb column**. Effect configuration lives in flat
columns, accreted across four migrations:

| Column | Type | Source migration | Meaning |
|---|---|---|---|
| `id` | uuid PK | 002 | — |
| `session_id` | uuid FK→sessions | 002 | owning session (triggers are keyed by **session**, not encounter/map only) |
| `map_id` | uuid FK→maps, nullable | 002 | which map the trigger sits on |
| `tile_x`, `tile_y` | int | 002 | trigger tile |
| `name` | text (`'Trap'`) | 002 | label |
| `save_type` | text (`'DEX'`) | 002 | DEX\|STR\|CON\|INT\|WIS\|CHA |
| `dc` | int (15) | 002 | **perception/detection** DC (spot the trap) |
| `save_dc` | int (15) | 044 | **saving-throw** DC (resist the effect) — split from `dc` |
| `description` | text | 002 | flavor shown in the save modal |
| `is_active` | bool (true) | 002 | armed |
| `is_hidden` | bool (true) | 002 | hidden from players until spotted/tripped |
| `created_at` | timestamptz | 002 | — |
| `trigger_type` | text (`'custom'`) | 010 | `trap` \| `custom` \| `clue` \| `portal` \| … |
| `damage_dice` | text | 010 | e.g. `2d6` (rolled client-side) |
| `damage_type` | text | 010 | `fire`, `psychic`, … (display only) |
| `condition_applied` | text | 010 | condition key applied on failed save |
| `radius` | int (0) | 045 | tiles out from the tile that still trips (0 = exact tile) |
| `revealed_to` | text[] (`{}`) | 045 | wallets that have spotted it (Perception) |
| `target_map_id` | uuid, nullable | 051 | portal destination map |
| `target_x`, `target_y` | int, nullable | 051 | portal landing tile |

RLS (002): GM full access; players `SELECT` only `is_hidden=false AND is_active=true`.
Writes go exclusively through `/api/triggers` (service-role, GM-verified) —
[route.ts](src/app/api/triggers/route.ts).

**Implication for the feature:** adding `target_rule` is a flat `TEXT` column +
a real migration + Zod/route plumbing. It is **not** a free jsonb addition as the
spec assumed ("No new migration needed").

---

## 2. Trigger firing logic — full trace

There is **no centralized `fireTriggerEffect` function.** Firing is spread across
four files and an event bus. End-to-end:

### a. Detection (movement)
- A token moves → `dnd721-token-moved` is dispatched with
  `{ tokenId, tileX, tileY, mapId, encounterId }`:
  - GM drags: [MapBoard.tsx:1208-1211](src/components/table/MapBoard.tsx)
  - Player moves: [MapBoardView.tsx:1046](src/components/table/MapBoardView.tsx)

### b. Lookup ([TableClient.tsx:188-242](src/app/sessions/[id]/table/TableClient.tsx))
- Dedupes by last-triggered tile per token (`lastTriggerTileRef`).
- `GET /api/triggers?sessionId&tileX&tileY&mapId`.
  - Server-side ([route.ts:97-108](src/app/api/triggers/route.ts)) does radius-aware
    filtering (`hypot(dx,dy) ≤ radius`) and **excludes `trigger_type='clue'`**.
- Takes `triggers[0]`.
  - If `trigger_type==='portal'` → `POST /api/maps/transition` (no damage).
  - Else dispatch **`dnd721-trigger-tripped`** with `{ trigger, tokenId }`.

### c. Effect application ([PlayerSidebar.tsx:494-649](src/components/table/PlayerSidebar.tsx))
This runs on the **affected player's own client** (it needs their sheet to roll):
1. Handler (494): if the trap isn't hidden / already revealed to me → return.
2. Passive-Perception auto-spot (508-534): if `PP ≥ dc`, silently reveal via
   `/api/triggers/reveal`, return (no fire).
3. Otherwise `setTriggerPrompt({ name, saveType, dc, saveDc, description,
   damageDice, conditionApplied, tokenId })` → renders a **save-throw modal**.
4. `rollSave()` (594): rolls `1d20 + mod + pb` vs `save_dc`.
   - On **fail** (616-644):
     - `rollDice(damageDice)` → `supabase.rpc('apply_combat_damage', { p_token_id: tokenId, p_amount })` (clamps HP server-side, syncs sheet HP).
     - condition → `dnd721-conditions-toggle` event `{ key: 'token:<tokenId>', condition }`.
5. The condition event is persisted to `tokens.conditions` by
   [TableClient.tsx:164-172](src/app/sessions/[id]/table/TableClient.tsx).

### d. Manual fire ([TriggersPanel.tsx:376-379](src/components/table/TriggersPanel.tsx))
- `fireTrigger(trigger)` dispatches `dnd721-trigger-tripped` with `{ trigger }`
  and **no `tokenId`** → in `rollSave`, `tokenId` is `null`, so the damage/condition
  branches (guarded by `&& tokenId`) **no-op**. Manual fire currently only pops the
  save modal on whatever client catches it; it does not damage a specific token.

---

## 3. Does the system assume target == triggering token? **Yes.**

The damage target is the token that tripped the tile, full stop.

- **Exact line:** [PlayerSidebar.tsx:617](src/components/table/PlayerSidebar.tsx)
  ```ts
  const { damageDice, conditionApplied, tokenId } = triggerPrompt
  ```
  where `tokenId` is set at [line 546](src/components/table/PlayerSidebar.tsx)
  from `ev?.detail?.tokenId` — i.e. the moving token from `dnd721-token-moved`.
- Damage applied to that same id: [line 632](src/components/table/PlayerSidebar.tsx)
  `rpc('apply_combat_damage', { p_token_id: tokenId, ... })`.
- Condition applied to that same id: [line 642](src/components/table/PlayerSidebar.tsx)
  `key: \`token:${tokenId}\``.

No code path ever resolves a different recipient.

---

## 4. How are party tokens queried? Is there a helper?

**No existing helper, and the spec's column assumptions are wrong.**

- `tokens` has **no `session_id`** — it's keyed by `encounter_id TEXT`
  ([002:375-391](supabase/migrations/002_rebuild_backend.sql)). To go from a
  session to its tokens you must hop **sessions → encounters(session_id) → tokens(encounter_id)**.
- There is **no `is_npc`, `npc_hp_current/max`, `character_hp_current/max`.**
  Actual HP/identity columns:
  - `current_hp` = current HP, `hp` = max HP.
  - `type TEXT` ∈ `pc | monster | object`. "Party member" = `type='pc'`. "Is NPC" = `type!=='pc'`.
  - other relevant cols: `character_id`, `owner_wallet`, `conditions text[]`,
    `label`, `map_id`, `hidden`.
- The only place all tokens are loaded is MapBoard/MapBoardView via
  `.eq('encounter_id', encounterId)` ([MapBoard.tsx:398-409](src/components/table/MapBoard.tsx)) — UI state, not reusable.

So a resolver must: look up the session's encounter id, then
`from('tokens').select(...).eq('encounter_id', encId).eq('type','pc')`, and
normalize HP via `current_hp`/`hp`.

---

## 5. Design mismatches & adapted plan

The spec's code (a `triggerTargeting.ts` resolver keyed on
`session_id`/`npc_hp_current`, plus a `fireTriggerEffect`/`applyTriggerEffectToToken`
that writes `tokens` HP directly with a service client and a `session_messages`
insert) **will not compile or run here.** Concrete deltas:

| Spec assumes | Reality | Required adaptation |
|---|---|---|
| jsonb `effect_data.target_rule` | flat columns | add `target_rule TEXT` column (migration) + Zod + route + panel |
| `tokens.session_id` | `tokens.encounter_id` only | resolve session→encounter first |
| `tokens.npc_hp_current` / `character_hp_current` | `current_hp` / `hp`, `type` | normalize on `current_hp`/`hp`, party = `type='pc'` |
| central `fireTriggerEffect` writing HP directly | client-side, save-gated, `apply_combat_damage` RPC | resolve target id, then reuse the RPC |
| `session_messages` table for chat log | rolls/feed use `session_rolls` + `onRoll()` | use the existing `onRoll`/toast surfaces |

### The one decision that needs you (genuine behavioral fork)

The current effect is **gated behind the triggering player's saving throw**, rolled
in their own modal, on their own device. When `target_rule` redirects the effect to
a **different** party member, two things become ambiguous and the spec resolves them
silently in a way that changes existing semantics:

1. **Whose save applies?** The spec's pseudo-code applies damage **with no save at
   all** (direct HP write). Options:
   - **(A)** Redirected effects ignore saves — they just hit the resolved target
     (simplest; matches the spec's pseudo-code; "the cave strikes the weak one").
   - **(B)** The resolved target rolls their own save (true to 5e, but the modal
     lives on a different client → needs a cross-device prompt; significant rework).
2. **Where does it execute?** Because the resolved target may be on another device,
   keeping this purely in the triggering player's `PlayerSidebar` means that client
   applies damage to *someone else's* token. That works (RPC + RLS allow it), but it
   means the redirected hit is **unsaved** and **instant** — i.e. option (A).

My recommendation: **(A)** for `lowest_hp_party / highest_hp_party / random_party /
lowest_hp_percent / all_party` (resolve target(s) at fire time, apply via
`apply_combat_damage` per target, no save), and keep `self` exactly as-is
(save-gated). This matches the spec's intent and pseudo-code and avoids a
cross-device save handshake. I'll confirm before implementing.

### Adapted implementation outline (pending the decision above)
1. **Migration** `054_trigger_target_rule.sql`: `ALTER TABLE map_triggers ADD COLUMN IF NOT EXISTS target_rule TEXT NOT NULL DEFAULT 'self';`
2. **Route** [/api/triggers](src/app/api/triggers/route.ts): add `targetRule` to Create/Patch Zod + insert/update maps (`target_rule`).
3. **Resolver** `src/lib/triggerTargeting.ts`: `resolveTriggerTargets(supabase, encounterId, triggeringTokenId, rule)` returning `Token[]`, using real columns (`current_hp`/`hp`, `type='pc'`), falling back to self on error/unknown rule.
4. **Wire** the resolver into the fire path. For `self`, unchanged (save modal). For other rules, resolve targets (needs the encounter id — already on the move event as `encounterId`, and obtainable for manual fire) and apply `apply_combat_damage` + condition per target, with an `onRoll`/toast line that names both the tripper and the actual victim.
5. **DM UI** [TriggersPanel.tsx](src/components/table/TriggersPanel.tsx): add the "Effect Target" `<select>` bound to `form.targetRule`, persisted through the route.

### Things that stay untouched (per "DO NOT CHANGE")
Perception/auto-spot logic, save math, fog reveal, initiative, portals, clue search,
and the entire `self` path (default) all remain byte-for-byte identical.

---

## 6. Verification mapping (once implemented)
1. `self` default → identical to today (save modal, hits tripper). ✓ guaranteed by leaving that branch untouched.
2. `lowest_hp_party` → full-HP tripper, lowest-HP victim takes it. (Resolver via `current_hp` asc.)
3. Chat/roll line names tripper ≠ victim.
4. `all_party` → loop every `type='pc'` token.
5. `random_party` → varies across fires.
6. Condition ring lands on the **resolved** token's `tokens.conditions`.
7. Manual fire + `lowest_hp_party` resolves without tile detection (needs encounter id at manual-fire site — noted gap to wire).
