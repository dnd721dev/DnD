# Session Lifecycle — Implementation Summary

---

## 1. Session States and Available Features

| State     | Chat | Voice | Shop (free claim) | Shop (purchase) | Token movement | Combat | Recording |
|-----------|------|-------|-------------------|-----------------|----------------|--------|-----------|
| setup     | ✗    | ✗     | ✗                 | ✗               | GM only        | ✗      | ✗         |
| lobby     | ✓    | ✓     | ✗ (visible, greyed) | ✓             | GM only        | ✗      | ✗         |
| active    | ✓    | ✓     | ✓                 | ✓               | ✓ (on your turn) | ✓   | ✓ (GM)    |
| paused    | ✓    | ✓     | ✗                 | ✗               | ✗              | ✗      | ✗         |
| completed | ✗    | ✗     | ✗                 | ✗               | ✗              | ✗      | ✗         |

All gates are defined in `src/lib/sessionGates.ts` → `SESSION_GATES`.

---

## 2. Shop Item Classification and Tracking

### Tiers
| Tier | Type    | Cost         | Claim limit                          |
|------|---------|--------------|--------------------------------------|
| A    | Free    | Free         | Once per session (or once per day if no session) |
| B    | Free    | Free         | Once per calendar day                |
| C    | Paid    | $1.50–$2.00  | Unlimited purchases                  |
| D    | Paid    | $4.00–$5.00  | Unlimited purchases                  |
| E    | Paid    | $10.00–$25.00| Unlimited purchases                  |

### Per-status shop UI
- **setup** → amber banner: "Items can be claimed once the lobby opens." Free/paid buttons replaced by "Unavailable"
- **lobby** → Free Tier A/B buttons show "Available when session starts"; paid purchases enabled
- **active** → Full shop access; Tier A/B free claim buttons active
- **paused** → amber banner: "Session is paused." All claim/purchase disabled
- **completed** → amber banner: "Session ended — no new purchases." All buttons disabled

---

## 3. Items at Session End

No items auto-remove at session end — purchased and claimed items are written directly to `characters.inventory_items` at the time of claim/purchase. Once in inventory, they persist permanently.

---

## 4. DM Controls the Session Lifecycle

The DM updates `sessions.status` via Supabase (e.g., from the campaign management page or directly via SQL). The realtime subscription in `TableClient.tsx` propagates the change to all connected clients within ~1 second.

### Suggested DM workflow:
1. **Create session** → status defaults to `setup`
2. **Open lobby** → update status to `lobby` (voice chat enables for all)
3. **Start session** → update status to `active` (all features unlock)
4. **Pause** → update status to `paused` (pause overlay shown to players)
5. **Resume** → update status back to `active` (overlay dismissed)
6. **End** → GM clicks "End Session" button → status set to `completed`

---

## 5. Player Experience Per State Change

Changes detected in `TableClient.tsx` realtime subscription. Toast duration: 4 seconds.

| Transition         | Player sees                                               |
|--------------------|-----------------------------------------------------------|
| setup → lobby      | Toast: "🟡 Lobby is open! Voice chat is available."      |
| lobby → active     | Toast: "⚔️ Session has started!"                         |
| active → paused    | Full-screen pause overlay with "Waiting for GM to resume" |
| paused → active    | Overlay dismissed + toast: "▶ Session resumed!"          |
| → completed        | Pause overlay dismissed; status banner shows "Session Ended" |

**PlayerSidebar status banner** always shows the current state at the top of the panel using `STATUS_CONFIG` color-coded labels.

---

## 6. Testing the Full Flow

```bash
# 1. Create a session (status = 'setup' after migration 020)
# 2. Open the table page — verify:
#    - Chat input shows "Chat opens when the lobby starts."
#    - Shop shows "Items can be claimed once the lobby opens."
#    - Record button hidden
#    - Start Combat button disabled

# 3. Set status = 'lobby' in Supabase:
UPDATE sessions SET status = 'lobby' WHERE id = '<id>';
# Verify: toast fires, chat unlocks, shop shows paid buttons, free buttons greyed

# 4. Set status = 'active':
UPDATE sessions SET status = 'active' WHERE id = '<id>';
# Verify: toast "⚔️ Session started!", all features unlock, Start Combat enabled

# 5. Set status = 'paused':
UPDATE sessions SET status = 'paused' WHERE id = '<id>';
# Verify: pause overlay appears for players, features gate

# 6. Set status = 'active' again:
UPDATE sessions SET status = 'active' WHERE id = '<id>';
# Verify: overlay gone, "▶ Session resumed!" toast

# 7. Click "End Session" button (GM):
# Verify: status = 'completed', shop/chat disabled, banner shows "Session Ended"
```

---

## 7. Files Changed (Fixes 5–8 + auto-redirect)

| File | Change |
|------|--------|
| `supabase/migrations/020_session_lifecycle_status.sql` | Renames old statuses, adds sessions to realtime pub |
| `src/lib/sessionGates.ts` | New — all lifecycle gate functions |
| `src/components/table/tableclient/types.ts` | Re-exports `SessionStatus` from sessionGates; broadens `status` field |
| `src/app/sessions/[id]/table/TableClient.tsx` | `sessionStatus` state, realtime sub, pause overlay, toasts, prop threading, idle redirect |
| `src/components/table/tableclient/components/TableTopBar.tsx` | Threads `sessionStatus` to `RecordingButton` |
| `src/components/table/tableclient/components/RecordingButton.tsx` | Hides record buttons when `!canRecord` |
| `src/components/table/InitiativeTracker.tsx` | Disables Start Combat when `!canUseCombat` |
| `src/components/table/GMSidebar.tsx` | Forwards `sessionStatus` to `InitiativeTracker` + `TableChat` |
| `src/components/table/TableChat.tsx` | Disables input when `!canChat`, shows contextual message |
| `src/components/table/tableclient/components/MapSection.tsx` | Threads `sessionStatus` to `MapBoard`/`MapBoardView` |
| `src/components/table/MapBoard.tsx` | Gates GM token dragging with `dmCanPlaceTokens` |
| `src/components/table/MapBoardView.tsx` | Gates player token dragging via `canMoveToken` check |
| `src/components/table/PlayerSidebar.tsx` | Status banner, `sessionStatus` prop, threads to `TableChat` |
| `src/components/shop/ShopModal.tsx` | Per-status gate banners and button gating |
