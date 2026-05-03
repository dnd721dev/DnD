# Session Lifecycle — Audit Report
## Fixes 5–8 Pre-Implementation Audit

---

## 1. Current State

### Sessions table — existing status values
From `supabase/migrations/002_rebuild_backend.sql`:
```
status TEXT NOT NULL DEFAULT 'planned'
-- comment: planned | in_progress | completed | cancelled
```

**Problem:** The spec defines a new set of states: `setup | lobby | active | paused | completed`.  
These do not match the current values. A **DB migration is required** to:
1. Add the new status values
2. Map old values to new (suggested: `planned→setup`, `in_progress→active`, `cancelled→setup`)

### Sessions realtime publication
From `supabase/migrations/013_session_rolls_realtime.sql` — session_rolls was added.
**Need to verify** if `sessions` itself is in the realtime publication. Fix 7 depends on it.

---

## 2. File-by-File Audit

### `src/lib/sessionGates.ts` — **NEW FILE REQUIRED**
Does not exist. Will be created verbatim from spec.

---

### `src/components/table/MapBoard.tsx`
- **Current:** Token dragging is always allowed for GM. No `sessionStatus` prop.
- **Fix 5 requires:** Accept `sessionStatus` prop; gate token dragging with `canInteractWithMap()`.
- **Impact:** Prop must be threaded from `MapSection` → `MapBoard`/`MapBoardView`.
- **Touch points:** `MapBoard.tsx`, `MapBoardView.tsx`, `MapSection.tsx` (props chain).

---

### `src/components/shop/ShopModal.tsx`
- **Current:** Claim/purchase buttons are controlled by `alreadyClaimed` and wallet state only. No session-status awareness.
- **Fix 5 & 8 require:** Accept `sessionStatus` prop; gate `canClaimFreeItems`, `canPurchaseItems`; show contextual banners per status.
- **Impact:** `ShopModal.tsx` prop signature change. Callers: `TableClient.tsx` (passes `sessionId` already), `src/app/shop/page.tsx`.

---

### `src/components/table/tableclient/components/RecordingButton.tsx`
- **Current:** Always shows record button to GM. Props: `{ sessionId, roomName }`.
- **Fix 5 requires:** Accept `sessionStatus?: string`; hide/disable when `!canRecord(sessionStatus)`.
- **Impact:** Prop addition to `RecordingButton`. Caller: `TableTopBar.tsx` (must receive and pass `sessionStatus`). `TableTopBar` caller: `TableClient.tsx`.

---

### `src/components/table/TableChat.tsx`
- **Current:** Always enabled if `senderWallet` is set. Props: `{ sessionId, senderWallet, senderName }`.
- **Fix 5 requires:** Accept `sessionStatus?: string`; disable textarea + Send button when `!canChat(sessionStatus)`.
- **Impact:** Prop addition. `TableChat` is used in both `GMSidebar` and `PlayerSidebar`. Both need to receive and forward `sessionStatus`.

---

### `src/components/table/InitiativeTracker.tsx`
- **Current:** Props: `{ encounterId, sessionId, onRoundChange }`. "Start Combat" button always enabled.
- **Fix 5 requires:** Accept `sessionStatus?: string`; disable Start Combat when `!canUseCombat(sessionStatus)`.
- **Impact:** Prop addition. Caller: `GMSidebar.tsx`.

---

### `src/components/table/PlayerSidebar.tsx`
- **Current:** Props do not include `sessionStatus`. No status banner.
- **Fix 6 requires:** Accept `sessionStatus?: string | null`; render status banner at top; show toast when status transitions.
- **Impact:** Prop addition. Caller: `TableClient.tsx`.

---

### `src/components/table/GMSidebar.tsx`
- **Current:** Already accepts `sessionStatus?: string | null`. Does not pass it down to sub-components.
- **Fix 5 requires:** Forward `sessionStatus` to `InitiativeTracker`, `TableChat`.
- **Impact:** Minor — thread prop through to children.

---

### `src/app/sessions/[id]/table/TableClient.tsx`
- **Current:** Manages `session.status` from DB. Does NOT have a dedicated `sessionStatus` state, does NOT subscribe to realtime session updates.
- **Fix 7 requires:** Add `sessionStatus` state; add `useEffect` Supabase realtime subscription on `sessions` table; handle status transitions (toast, pause overlay, end screen).
- **Impact:** Core change. All the gated props flow from here downward.

---

## 3. Prop Threading Map

```
TableClient.tsx
  sessionStatus (new state from realtime sub)
  ├── TableTopBar
  │   └── RecordingButton  ← needs sessionStatus
  ├── MapSection            ← needs sessionStatus
  │   ├── MapBoard          ← needs sessionStatus
  │   └── MapBoardView      ← needs sessionStatus
  ├── ShopModal             ← needs sessionStatus
  ├── GMSidebar             ← already has it, needs to forward
  │   ├── InitiativeTracker ← needs sessionStatus
  │   └── TableChat         ← needs sessionStatus
  └── PlayerSidebar         ← needs sessionStatus (for banner + toast)
      └── TableChat         ← needs sessionStatus
```

---

## 4. DB Migration Required

New file: `supabase/migrations/020_session_lifecycle_status.sql`

```sql
-- Add new lifecycle status values by widening the column.
-- Migrate existing rows:
--   planned    → setup
--   in_progress → active
--   cancelled  → setup   (safest fallback)
--   completed  stays completed

UPDATE sessions SET status = 'setup'   WHERE status = 'planned';
UPDATE sessions SET status = 'active'  WHERE status = 'in_progress';
UPDATE sessions SET status = 'setup'   WHERE status = 'cancelled';

-- Add sessions to realtime publication (for Fix 7)
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
```

---

## 5. New UI States (Fix 6 — PlayerSidebar banner)

| Status    | Banner text                  | Color       | Icon |
|-----------|------------------------------|-------------|------|
| setup     | Session Starting Soon        | gray-700    | ⏳   |
| lobby     | Lobby Open — Get Ready       | blue-800    | 🟡   |
| active    | Session Live                 | green-800   | 🟢   |
| paused    | Session Paused               | yellow-800  | ⏸   |
| completed | Session Ended                | gray-800    | ✓    |

---

## 6. Scope Boundaries

The following are **explicitly excluded** per spec:
- Map rendering / fog of war
- Dice rolling logic
- Character sheet calculations
- NFT minting flow
- Wallet connection
- Any existing API routes not listed above

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| DB status migration breaks existing sessions | Medium | Migration maps known values; completed stays untouched |
| Prop threading touches many files | Medium | All changes are additive (optional props with defaults) |
| sessions not in realtime publication | Low | Migration adds it |
| InitiativeTracker is very large (~1000 lines) | Low | Only need to add one prop and gate one button |
| ShopModal currently reads sessionId only | Low | sessionStatus is a new optional prop, defaults to permissive |

---

## 8. Recommended Execution Order (after approval)

1. **Migration** `020_session_lifecycle_status.sql` — status rename + realtime pub
2. **`src/lib/sessionGates.ts`** — new file, exact spec
3. **`TableClient.tsx`** — add `sessionStatus` state + realtime subscription
4. **`RecordingButton.tsx`** + **`TableTopBar.tsx`** — thread `sessionStatus`, gate record
5. **`InitiativeTracker.tsx`** + **`GMSidebar.tsx`** — thread `sessionStatus`, gate Start Combat
6. **`TableChat.tsx`** — gate chat input
7. **`MapBoard.tsx`** + **`MapBoardView.tsx`** + **`MapSection.tsx`** — thread `sessionStatus`, gate token movement
8. **`PlayerSidebar.tsx`** — add status banner + transition toasts
9. **`ShopModal.tsx`** — per-status messaging and button gating

---

*Awaiting approval to proceed.*
