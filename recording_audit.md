# Recording System Audit
All files read before any code was changed.

---

## SECTION A — Webhook investigation

### A1. What header does LiveKit use for its webhook HMAC signature?

`X-Livekit-Signature`

The current code (`src/app/api/livekit-webhook/route.ts`, line 23) correctly reads this header:
```typescript
const signature = req.headers.get('X-Livekit-Signature') ?? ''
```
The header name is correct. ✓

---

### A2. What does `WebhookReceiver.receive()` do on a bad signature?

It **throws** an error. The current handler catches the throw and returns **HTTP 401**:
```typescript
} catch (err: any) {
  console.error('[livekit-webhook] verification failed:', ...)
  return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
}
```

**This is a problem.** LiveKit's webhook delivery system retries on non-2xx responses.
Returning 401 on signature failure means LiveKit will keep retrying indefinitely
(or until its internal retry limit), burning quota. Worse, if the signature is
intermittently valid but the handler has an internal error later, retrying on the
same payload is safe — but returning 401 on a body-mismatch is not recoverable.

**Recommendation:** Return `200 { error: 'Invalid webhook signature' }` on verification
failure so LiveKit stops retrying a payload that will never succeed.

---

### A3. What exact field holds the egress ID in the `egress_ended` payload?

The handler reads:
```typescript
const egressId: string | undefined =
  event.egressInfo?.egressId ?? event.egress_info?.egress_id
```

LiveKit v2 proto serialization uses camelCase (`egressInfo.egressId`) for JS/TS SDKs.
The snake_case fallback (`egress_info.egress_id`) covers older or HTTP-JSON payloads.
Both are checked — this is correct. ✓

The composite row lookup (`session_recordings.egress_id`) and track row lookup
(`recording_tracks.egress_id`) both use this extracted `egressId`. ✓

---

### A4. Does the webhook return 200 on signature failure?

**No — it returns 401.**

As noted in A2, this causes LiveKit to retry. The recommended fix is to return
200 on all non-recoverable failures (bad signature, env vars missing) so LiveKit
does not retry payloads that will always fail.

---

### A5. Is the webhook endpoint registered in LiveKit?

Cannot be verified from code alone — requires checking the LiveKit dashboard or
environment configuration. The endpoint URL must be configured in LiveKit Cloud as:
```
https://dcent-six-omega.vercel.app/api/livekit-webhook
```
(or whatever the production Vercel URL is + the route path).

**If this URL is wrong or not registered at all, zero webhook events will be
delivered, explaining why all 20 rows are stuck at `file_status: 'recording'`.**

---

### A6. What does `room_finished` do vs `egress_ended`?

`room_finished`:
- Fires when the LiveKit room closes (session ends, timeout, crash)
- Updates `session_recordings.status = 'stopped'` WHERE `room_name = roomName AND status = 'recording'`
- Does NOT update any `recording_tracks` rows
- Returns 200 immediately after the update

`egress_ended`:
- Fires when a specific egress job finishes uploading to S3
- For composite: updates `session_recordings.status = 'completed'`, sets `file_url`
- For per-track: updates `recording_tracks.file_url = fileUrl, file_status = 'ready'`;
  checks if all sibling tracks are ready; if so, promotes recording to 'completed'
- Fires transcription after returning 200

**Gap:** If `room_finished` fires but `egress_ended` never fires (webhook not registered,
S3 upload pending, etc.), `session_recordings.status` goes to 'stopped' but all
`recording_tracks` rows stay at `file_status = 'recording'` forever.

---

### A7. Does `egress_id` get saved when recording starts?

**Yes, for successful egress starts.** In `POST /api/recording/[sessionId]` (route.ts):

```typescript
const compositeEgress = await client.startRoomCompositeEgress(...)
// ...
await db.from('session_recordings').insert({
  egress_id: compositeEgress?.egressId ?? compositeEgress?.egress_id ?? null,
  ...
})
```

And for successful per-track egress:
```typescript
const trackEgress = await egressClient.startTrackEgress(...)
await db.from('recording_tracks').insert({
  egress_id: trackEgress?.egressId ?? trackEgress?.egress_id ?? null,
  ...
})
```

✓ `egress_id` is saved for successfully started egresses.

**BUG: Placeholder failure rows have no `egress_id` AND no explicit `file_status`.**

When a per-track egress fails to start for a participant, a placeholder row is inserted:
```typescript
await db.from('recording_tracks').insert({
  recording_id:         recording!.id,
  session_id:           sessionId,
  participant_identity: participant.identity,
  transcript_status:    'failed',
  // ← NO egress_id set
  // ← NO file_status set — defaults to 'recording' via column default
})
```

These rows get `file_status = 'recording'` from the column default. Since they
have no `egress_id`, no `egress_ended` webhook can ever update them. They will
remain stuck at `file_status = 'recording'` forever.

**Fix:** Set `file_status: 'failed'` in the placeholder insert.

---

### A8. Does the webhook update `file_status` to `'ready'`?

**Yes, for tracked egresses.** The `egress_ended` handler:
```typescript
await db
  .from('recording_tracks')
  .update({ file_url: fileUrl, file_status: 'ready' })
  .eq('id', trackRow.id)
```

This is correct for rows that have a matching `egress_id`. ✓

However, this update only works if:
1. The webhook is actually being called (endpoint registered in LiveKit)
2. The `egress_ended` event carries the matching `egressId`
3. The `recording_tracks` row exists with that `egress_id`
4. Migration 016 (`file_status` column) has been applied to live Supabase

---

### A9. Does the webhook look up `recording_tracks` by `egress_id`?

**Yes:**
```typescript
const { data: trackRow } = await db
  .from('recording_tracks')
  .select('id, recording_id, file_key')
  .eq('egress_id', egressId)
  .maybeSingle()
```

There is an index on `egress_id`:
```sql
CREATE INDEX recording_tracks_egress_id_idx ON recording_tracks(egress_id)
  WHERE egress_id IS NOT NULL;
```
✓ Efficient lookup. ✓ Handles NULL egress_ids (placeholder rows) by excluding them
from the index — they won't match any `egress_ended` event, which is correct
behavior (but means they stay stuck unless `file_status` is set to 'failed' upfront).

---

### A10. Any race conditions or ordering issues?

**Potential ordering issue: `room_finished` fires before `egress_ended`.**

When a room closes, LiveKit fires `room_finished` first, then `egress_ended` for
each active egress job (after S3 upload completes). The current code:

1. `room_finished` → marks recording as 'stopped' in `session_recordings`
2. `egress_ended` (composite) → promotes to 'completed', sets file_url
3. `egress_ended` (per-track) → sets file_url + file_status='ready' on tracks;
   promotes recording to 'completed' if all tracks ready

Step 2 and 3 check `AND status = 'stopped'` / `AND status != 'completed'` which is
correct — they won't double-update. ✓

**However, all three events require webhook delivery.** If the webhook is not registered
or can't reach the Vercel endpoint, none of these transitions happen.

---

## SECTION B — Recording page access after session ends

### B1. Is there a link to the recording editor from the session detail page?

**No.** `src/app/sessions/[id]/page.tsx` shows:
- Session title, status, description
- "Back to campaign" link
- "Join Table" button

There is **no mention of recordings** on this page. No link to the recording editor.

---

### B2. Is there a link from the campaigns sessions list?

**No.** `src/app/campaigns/[id]/sessions/SessionsClient.tsx` shows each session as:
- Session title + status + type badges
- "Open Session" link → `/sessions/${session.id}`
- "Join Table" link → `/sessions/${session.id}/table`

There is **no "View Recording" link** anywhere in the campaigns sessions list.

---

### B3. Where is the recording editor accessible from?

**Only from `RecordingButton` inside `TableTopBar` inside the table page.**

The "Open Editor" link (`/sessions/${sessionId}/recording/${r.id}`) only appears in
`RecordingButton`'s history panel, which:
1. Only renders when `isGm === true`
2. Requires `showHistory` state to be `true` (user clicked "🗂" button)
3. Requires `pastRecordings.length > 0` (status !== 'recording')
4. Is only accessible while the GM is on the **live table page**

Once the session ends and the GM navigates away, the only way to reach the recording
editor is to go back to `/sessions/${sessionId}/table`, which may no longer work
for a completed session.

**There is no persistent, discoverable navigation path to recordings after session ends.**

---

### B4. Can the session detail page link to recordings?

Yes — it queries the session by ID, knows the `session_id`, and could query
`session_recordings` to show a list of recordings with links to the editor.

Currently, `src/app/sessions/[id]/page.tsx` does NOT query `session_recordings`.

---

### B5. Can the campaigns sessions list link to recordings?

Yes — it has access to each `session.id` and could fetch the recording status.
Currently it does not.

---

## SECTION C — Stuck recordings in database

### C1. Why are all 20 `recording_tracks` rows stuck at `file_status: 'recording'`?

Multiple compounding causes identified:

**Root Cause A: Webhook not registered or wrong URL**
The most likely single cause. If the LiveKit webhook URL was never configured in the
LiveKit Cloud dashboard to point at `https://dcent-six-omega.vercel.app/api/livekit-webhook`,
then zero `egress_ended` events have ever reached the server. Every single recording
started stays stuck at `file_status = 'recording'` because nothing updates them.

**Root Cause B: Placeholder failure rows**
Any participant whose per-track egress failed to start gets a placeholder `recording_tracks`
row with `transcript_status = 'failed'` but `file_status = 'recording'` (column default)
and NO `egress_id`. Even if the webhook is perfectly configured, these rows can never
be updated by the webhook. They need `file_status = 'failed'` set at insert time.

**Root Cause C: Webhook returning 401 on signature failures**
If the webhook URL is registered but there's a transient HMAC verification failure
(e.g., clock skew, body encoding), the handler returns 401 causing LiveKit to retry.
Over repeated retries, eventually the row stays stuck as the webhooks pile up and
exhaust LiveKit's retry budget.

**Root Cause D: Migration 016 applied but back-fill found no rows with `file_url`**
Migration 016's back-fill: `UPDATE recording_tracks SET file_status = 'ready' WHERE
file_url IS NOT NULL AND file_status = 'recording'`. If webhooks never fired, no rows
have `file_url` set, so the back-fill updates nothing. The 20 rows remain at
`file_status = 'recording'`.

---

### C2. Is `file_status` column present in the migration?

`file_status` is NOT in the original `recording_tracks` table definition in
`add_recording_podcast.sql` or `002_rebuild_backend.sql`.

It was added by **`016_recording_tracks_realtime_file_status.sql`**:
```sql
ALTER TABLE recording_tracks
  ADD COLUMN IF NOT EXISTS file_status TEXT NOT NULL DEFAULT 'recording';
```

The user can see `file_status = 'recording'` in Supabase, confirming migration 016
has been applied to the live database. ✓

---

### C3. Is `recording_tracks` in the realtime publication?

Also added by migration 016:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE recording_tracks;
```

If migration 016 is applied, `recording_tracks` is in the realtime publication. ✓

---

### C4. Is there a recovery mechanism?

**Yes — `POST /api/recording/[sessionId]/recover`** exists and queries LiveKit's
`listEgress` API to check the actual status of a recording's egress job. It:
1. Checks egress status: 3=complete, 4=failed, 5=aborted
2. Updates `session_recordings.status` accordingly
3. Also iterates all `recording_tracks` for the recording and updates their `file_status`
   based on each track's egress status

**But there is no UI button to trigger recovery.** It can only be called via curl/API.
A "Recover" button in the recording editor or history panel would make this accessible.

---

### C5. Why are `session_recordings` likely stuck at `status: 'recording'` or `'stopped'` too?

`room_finished` fires when the LiveKit room closes and moves the recording to 'stopped'.
If the room was properly closed and the webhook was delivered, `session_recordings.status`
should be 'stopped'. If the webhook was never delivered, it stays at 'recording'.

The transition to 'completed' requires `egress_ended` to fire for the composite egress.
If the webhook is not registered, the composite recording also stays at 'stopped' or
'recording' and never becomes 'completed'.

---

## Summary of Findings

| # | File/System | Severity | Root Cause | Fix |
|---|-------------|----------|------------|-----|
| A | LiveKit Cloud Config | **CRITICAL** | Webhook URL likely not registered — zero egress events delivered | Register `https://dcent-six-omega.vercel.app/api/livekit-webhook` in LiveKit dashboard |
| B | livekit-webhook/route.ts L35 | HIGH | Returns 401 on signature failure — LiveKit retries indefinitely | Return 200 on signature failure |
| C | recording/[sessionId]/route.ts L183-195 | HIGH | Placeholder failure rows get `file_status='recording'` default, never updated | Add `file_status: 'failed'` to placeholder insert |
| D | Sessions/[id]/page.tsx | HIGH | No link to recordings from session detail page | Add recordings section to session detail page |
| E | SessionsClient.tsx | MEDIUM | No "View Recording" link in campaign sessions list | Add recording link to sessions list when session is completed |
| F | RecordingButton.tsx | MEDIUM | Recovery endpoint exists but no UI to trigger it | Add "Recover" button in recording history panel |
| G | livekit-webhook/route.ts | LOW | No explicit 200 return path after all known event types | Ensure all code paths return 200 |

---

## Awaiting approval before writing any fix code.
