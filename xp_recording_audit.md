# XP & Recording Systems — Audit Report

Derived from reading all relevant source files. Ordered by feature area.
**No code has been changed yet — awaiting approval.**

---

## ALREADY DONE (no work needed)

### ✓ Realtime: `session_recordings` in publication
Migration 016 confirms both tables are in the Supabase realtime publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE session_recordings;
ALTER PUBLICATION supabase_realtime ADD TABLE recording_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE recording_markers;
```
No migration needed.

### ✓ RecordingButton has realtime subscription
`RecordingButton.tsx` lines 56–79 subscribe to `postgres_changes` on
`session_recordings` filtered by `session_id`. Status transitions update
local state without a page refresh.

### ✓ Recording page has realtime subscription
`/sessions/[id]/recording/[recordingId]/page.tsx` lines 150–181 subscribe
to both `session_recordings` (by `id`) and `recording_tracks` (by
`recording_id`). Processing notices auto-update.

### ✓ Recording page audio player + downloads
Player tab has `<audio>` element with the master `file_url`, per-track
`<audio>` players, and download links gated on `file_status === 'ready'`.
No issues.

### ✓ DMPanel XP Award (both variants)
`DMPanel.tsx` lines 634–722 implement mid-session XP award (active CAYA
sessions) and end-of-session XP award (completed CAYA sessions). Both
sections are conditional on `sessionType === 'caya'`, have preset buttons,
custom-amount inputs, and success/error feedback.

### ✓ `award-xp` API route
`/api/sessions/award-xp/route.ts` — validates session, confirms GM identity,
fetches CAYA characters from participant wallets, increments XP, records
`xp_award` on the session. Correct.

### ✓ `award-xp-mid` API route
`/api/sessions/award-xp-mid/route.ts` — uses `session_players` table
(the canonical table per migration 007). Correct for active sessions.

---

## BUGS / GAPS (need implementation)

### Gap C — TableTopBar has no "Recording Ready → View" button

**Files:**
- `src/components/table/tableclient/components/TableTopBar.tsx`
- `src/components/table/tableclient/components/RecordingButton.tsx`

**Current state:**
- `RecordingButton` is GM-only (`{isGm && <RecordingButton .../>}` in TableTopBar line 49).
- `RecordingButton`'s state (recordings list, active recording) is entirely internal.
- No recording status is surfaced to players or shown as a prominent "ready" notification.
- There is no "Recording Ready → View" button anywhere in the topbar.

**What's needed:**
1. A Supabase realtime subscription inside `TableTopBar` (or a new `useRecordingReady` hook)
   that watches `session_recordings` for the current `sessionId` and tracks whether
   any recording has `status === 'completed'`.
2. A "🎙 Recording Ready → View" `<Link>` button rendered next to the Record button
   (visible to **all** users, not just GM) when `readyRecording !== null`.
3. The subscription fires on INSERT and UPDATE, so newly completed recordings appear
   immediately without a page refresh.

**Spec:**
```tsx
// Shown when any recording for this session has status === 'completed'
<Link href={`/sessions/${sessionId}/recording/${readyRecording.id}`}>
  🎙 Recording Ready → View
</Link>
```
- Style: amber pill, small text, same row as Record button.
- Visible to all participants (not just GM).
- Disappears if the only completed recording is deleted (no DELETE subscription
  needed for MVP — a page refresh handles that edge case).

---

### Gap D — DM Panel has no "Session Recordings" section

**File:** `src/components/table/DMPanel.tsx`

**Current state:**
- Tools tab has: Place Characters, Inspiration, d20 Mode, Quick Rolls, Custom Roll,
  Encounter Calculator, Mid-session XP Award, End-of-session XP Award.
- No section for recordings.
- DM cannot see or access recordings from within the table.

**What's needed:**
A "Session Recordings" section at the bottom of the Tools tab that:
1. Fetches `session_recordings` for `sessionId` on mount (simple
   `supabase.from('session_recordings').select('*').eq('session_id', sessionId)` call).
2. Shows each recording as a row with:
   - Status badge (recording / stopped / completed / failed)
   - Duration (`duration_sec` formatted as `MM:SS`)
   - `[Open Editor]` → `Link` to `/sessions/${sessionId}/recording/${r.id}`
   - `[↓ Download]` → `<a href={r.file_url}>` when `file_url` is non-null
3. Subscribes to `session_recordings` realtime INSERT + UPDATE so new recordings
   and status changes (processing → completed) appear without refresh.
4. Shows "No recordings yet" when list is empty.
5. Requires `sessionId` prop (already passed to DMPanel).

**Schema note:** The `DMPanel` already receives `sessionId?: string | null` as a prop,
so no prop changes are needed in GMSidebar or TableClient.

---

### Inconsistency: `award-xp` uses `session_participants`, `award-xp-mid` uses `session_players`

**Files:**
- `src/app/api/sessions/award-xp/route.ts` line 54: `from('session_participants')`
- `src/app/api/sessions/award-xp-mid/route.ts` line 48: `from('session_players')`

**What this means:**
- Migration 002 created `session_participants` (older, used by `award-xp`).
- Migration 007 created `session_players` (newer, used by the live table and mid-session XP).
- The end-of-session `award-xp` route queries `session_participants.role='player'`, but the
  active table used by the live session system is `session_players`.
- If participants are only in `session_players` (the newer table), `award-xp` will find
  zero participants and fail with "No player participants found".

**Fix needed:** Update `award-xp` to query `session_players` instead of
`session_participants` (matching `award-xp-mid`).

---

## Files to Change

| Gap | File(s) | Action |
|-----|---------|--------|
| C | `TableTopBar.tsx` | Add `useRecordingReady` hook + "Recording Ready → View" button |
| D | `DMPanel.tsx` | Add "Session Recordings" section to Tools tab |
| XP inconsistency | `src/app/api/sessions/award-xp/route.ts` | Change `session_participants` → `session_players` |

## Files NOT to Change

| File | Reason |
|------|--------|
| `RecordingButton.tsx` | Already has realtime; no changes needed |
| `recording/[recordingId]/page.tsx` | Audio player, downloads, realtime all correct |
| `award-xp-mid/route.ts` | Already uses correct `session_players` table |
| Supabase migrations | Realtime publication already includes both tables |
| `TableClient.tsx` | No recording state needed here — `TableTopBar` subscribes directly |

## Implementation Order

1. Fix `award-xp` route (`session_participants` → `session_players`)
2. Add "Session Recordings" section to `DMPanel.tsx`
3. Add `useRecordingReady` hook + "Recording Ready → View" button to `TableTopBar.tsx`
4. Run `npx tsc --noEmit` — fix any errors
5. Write `verification_steps.md` with manual test checklist
