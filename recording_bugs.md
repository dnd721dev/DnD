# Recording System Bug Report
Written after full audit — no code has been changed yet.

---

## Bug A — Webhook not registered (suspected primary cause of all 20 stuck rows)

**Priority: CRITICAL**

**Root cause:**
No code issue — configuration issue. If the LiveKit webhook URL is not registered
in the LiveKit Cloud dashboard, zero `egress_ended` events will ever reach the server.

Every recording started will stay stuck at:
- `recording_tracks.file_status = 'recording'` forever
- `session_recordings.status = 'recording'` or `'stopped'` forever

**How to verify:**
Log in to the LiveKit Cloud dashboard → Project Settings → Webhooks.
Check if `https://dcent-six-omega.vercel.app/api/livekit-webhook` is listed.

**Fix:**
Register the webhook URL in LiveKit Cloud dashboard:
```
https://dcent-six-omega.vercel.app/api/livekit-webhook
```
(or whatever the production domain is)

No code changes required for this fix.

---

## Bug B — Webhook returns 401 on signature failure; LiveKit retries forever

**Priority: HIGH**

**Root cause:**
`src/app/api/livekit-webhook/route.ts`, lines 33–36:
```typescript
} catch (err: any) {
  console.error('[livekit-webhook] verification failed:', err?.message, ...)
  return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
}
```

LiveKit's delivery system retries any webhook that returns a non-2xx response.
Returning 401 on a signature mismatch means LiveKit will retry the same payload
repeatedly, burning request quota and filling logs with errors.
A bad-signature payload will NEVER succeed regardless of retries.

**Fix:**
Return `200` instead of `401` on signature failure:
```typescript
} catch (err: any) {
  console.error('[livekit-webhook] verification failed:', err?.message, ...)
  return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 200 })
}
```

---

## Bug C — Placeholder failure rows stuck at `file_status: 'recording'` forever

**Priority: HIGH**

**Root cause:**
`src/app/api/recording/[sessionId]/route.ts`, lines 183–195.

When per-track egress fails to start for a participant, a placeholder row is inserted:
```typescript
await db.from('recording_tracks').insert({
  recording_id:         recording!.id,
  session_id:           sessionId,
  participant_identity: participant.identity,
  transcript_status:    'failed',
  // ← NO egress_id
  // ← NO file_status — defaults to 'recording' via column definition
})
```

The column definition is `file_status TEXT NOT NULL DEFAULT 'recording'`.
Since no `egress_id` is set, no `egress_ended` webhook event can ever find and
update this row. It stays at `file_status = 'recording'` permanently.

**Fix:**
Add `file_status: 'failed'` to the placeholder insert:
```typescript
await db.from('recording_tracks').insert({
  recording_id:         recording!.id,
  session_id:           sessionId,
  participant_identity: participant.identity,
  transcript_status:    'failed',
  file_status:          'failed',   // ← add this
})
```

---

## Bug D — No UI path to recordings after session ends

**Priority: HIGH**

**Root cause:**
After a session ends and the GM navigates away from `/sessions/${id}/table`, there is
no way to reach the recording editor (`/sessions/${id}/recording/${recordingId}`) from
any other page.

- `src/app/sessions/[id]/page.tsx` — no recording section, no link
- `src/app/campaigns/[id]/sessions/SessionsClient.tsx` — no recording link

The only path to recordings is:
1. Return to the live table page
2. Find the "🗂" history button in `RecordingButton`
3. Toggle `showHistory` to reveal the "Open Editor" link

This requires knowing which session had a recording, navigating back to the table
(which may be confusing for a completed session), and finding a two-click buried panel.

**Fix:**
Add a "🎙 Recording" section to `src/app/sessions/[id]/page.tsx` that:
1. Fetches recordings for the session via `GET /api/recording/${sessionId}`
2. Lists each recording with status badge and "Open Editor" link
3. Only visible to the GM (check `isGm`)

Optionally: add a "View Recording" link to the campaigns sessions list for completed sessions.

---

## Bug E — Recovery endpoint has no UI trigger

**Priority: MEDIUM**

**Root cause:**
`src/app/api/recording/[sessionId]/recover/route.ts` exists and correctly queries
LiveKit's `listEgress` API to recover stuck recordings. But there is no button or
UI anywhere to call it.

To recover the 20 stuck rows today, the GM or admin would need to:
1. Know the recording UUID for each stuck recording
2. Call `POST /api/recording/${sessionId}/recover` with `{ recordingId: "..." }` via curl

This is not accessible to a non-technical user.

**Fix:**
Add a "Recover" button in `RecordingButton`'s history panel for recordings that are
in a stuck state (`status === 'stopped'` with no `file_url`):
```tsx
{r.status === 'stopped' && !r.file_url && (
  <button onClick={() => recoverRecording(r)} className="...">
    ↻ Recover
  </button>
)}
```

---

## Summary Table

| # | File | Severity | Root Cause | Fix |
|---|------|----------|------------|-----|
| A | LiveKit Cloud Config (no code) | **CRITICAL** | Webhook URL not registered → zero events delivered | Register URL in LiveKit dashboard |
| B | livekit-webhook/route.ts L35 | HIGH | 401 on signature failure → LiveKit retries forever | Return 200 on failure |
| C | recording/[sessionId]/route.ts L183-195 | HIGH | Placeholder failure rows default to `file_status='recording'` with no `egress_id` | Set `file_status: 'failed'` in placeholder insert |
| D | sessions/[id]/page.tsx | HIGH | No recording section on session detail page | Add recording list to session detail page |
| E | recording/[sessionId]/recover/route.ts | MEDIUM | Recovery endpoint exists but no UI trigger | Add "Recover" button in RecordingButton history panel |

---

## Recovery Plan for the 20 Existing Stuck Rows

The 20 rows already in the DB can be recovered via one of two approaches:

**Option 1 — Trigger recover endpoint for each recording (if webhook is now working)**
After registering the webhook, call:
```
POST /api/recording/${sessionId}/recover
Body: { "recordingId": "..." }
```
for each stuck recording. The endpoint queries LiveKit's `listEgress` to check the
actual egress status. If the egress completed, it will set `file_status = 'ready'`
and `file_url` on the tracks.

**Option 2 — SQL direct update (if all tracks are from failed per-track egress)**
If all 20 rows are placeholder failure rows (no `egress_id`), they can never be
updated by the webhook. Update them directly in Supabase:
```sql
UPDATE recording_tracks
SET file_status = 'failed'
WHERE file_status = 'recording'
  AND egress_id IS NULL;
```

**Option 3 — Migration backfill (already partially done by migration 016)**
Migration 016 back-fills rows where `file_url IS NOT NULL AND file_status = 'recording'`.
Since the 20 rows have no `file_url` (webhooks never fired), this didn't help them.

---

## Awaiting approval before writing any fix code.
