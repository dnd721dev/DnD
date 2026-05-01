# Recording Stuck in "Processing" — Full Audit
_All file reads completed before this document was written._

---

## Section A — Webhook Delivery

**A1. Does the webhook route exist and is it reachable?**
Yes. `src/app/api/livekit-webhook/route.ts` exports `POST`, which Next.js maps to
`POST /api/livekit-webhook`. No `middleware.ts` exists in the project, and `next.config.js`
contains only a webpack alias shim — no route rewrites, no blocked paths. The route is
reachable by LiveKit's servers with no framework-level interference.

**A2. Could a Vercel edge-runtime restriction block it?**
No. The route has no `export const runtime = 'edge'` declaration. It runs in the default
Node.js serverless runtime. `req.text()` and `req.headers.get()` are both available.

**A3. Is the webhook URL registered in the LiveKit dashboard?**
This is a deploy-time configuration question; the code cannot answer it. However, the
route is correctly structured to receive LiveKit events, so if the URL is wrong in the
dashboard that is the only remaining delivery-layer problem.

---

## Section B — Signature Verification

**B1. What header does LiveKit send?**
LiveKit Cloud sends the HMAC-SHA256 signature in the HTTP header named
`X-Livekit-Signature`. This is documented in the LiveKit webhook reference and is what
`WebhookReceiver.receive(body, token)` expects as its second argument.

**B2. What header does the code read?**

```ts
// src/app/api/livekit-webhook/route.ts  line 19
const authorization = req.headers.get('Authorization') ?? ''
```

The code reads `Authorization`, not `X-Livekit-Signature`.

**B3. What is the impact?**
`req.headers.get('Authorization')` returns `null` for every LiveKit POST, so
`authorization` is always `''`.  `WebhookReceiver.receive(body, '')` throws
`"invalid token"` (or equivalent) on every call.  The `catch` block logs the error and
immediately returns **HTTP 401**.  **No code below the try/catch ever runs.**  The
database is never updated.  This is the single root cause of all stuck recordings.

**B4. Are the env-var guards correct?**
Yes. `makeReceiver()` checks `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` before
constructing the `WebhookReceiver`, throwing a clear error if either is absent.

---

## Section C — Database Writes

**C1. Is `supabaseAdmin()` used (bypasses RLS)?**
Yes. The webhook imports and calls `supabaseAdmin()` from `@/lib/supabaseAdmin`.
`supabaseAdmin()` uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses all RLS policies.
This is correct — webhook routes have no user session to satisfy RLS.

**C2. Does `session_recordings` have an `egress_id` column?**
Yes. Defined in `002_rebuild_backend.sql`:
```sql
egress_id TEXT,
```
The POST route saves it at insert time:
```ts
egress_id: compositeEgress?.egressId ?? compositeEgress?.egress_id ?? null,
```

**C3. Does `recording_tracks` have an `egress_id` column?**
Yes. Also defined in `002_rebuild_backend.sql` and the index exists:
```sql
CREATE INDEX IF NOT EXISTS recording_tracks_egress_id_idx ON recording_tracks(egress_id)
  WHERE egress_id IS NOT NULL;
```
Saved at insert time in the POST route.

**C4. Does `recording_tracks` have a `file_status` column?**
Yes, added by migration `016_recording_tracks_realtime_file_status.sql`:
```sql
ALTER TABLE recording_tracks ADD COLUMN IF NOT EXISTS file_status TEXT NOT NULL DEFAULT 'recording';
```

**C5. Are `completed_at` and `error` columns present?**
**No.** Neither `session_recordings` nor `recording_tracks` has a `completed_at` or
`error` column. The webhook sets `status: 'completed'` but never stores a timestamp for
it. The recording page cannot display when a recording finished. A migration is needed.

**C6. Does the webhook handle `egress_ended` by event type?**
No. The current code handles `room_finished` explicitly by event type, then falls through
to egress matching for *all* other events. If LiveKit sends an `egress_started` or
`egress_updated` event (which also carry an `egressId`), the code would incorrectly try
to mark the recording as completed on the *start* event. The handler must filter on
`eventType === 'egress_ended'` before doing the status promotion.

---

## Section D — Realtime Delivery

**D1. Is `session_recordings` in the Supabase realtime publication?**
Yes. `002_rebuild_backend.sql` line:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE session_recordings;
```

**D2. Is `recording_tracks` in the Supabase realtime publication?**
Yes, added by migration `016_recording_tracks_realtime_file_status.sql`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE recording_tracks;
```

**D3. Are the subscriptions on the recording page correctly scoped?**
The recording page (`src/app/sessions/[id]/recording/[recordingId]/page.tsx`) sets up:
- `session_recordings` subscription filtered by `id=eq.${recordingId}` ✅
- `recording_tracks` subscription filtered by `recording_id=eq.${recordingId}` ✅

Both subscriptions call `setRecording` / `setTracks` on change, which triggers a
re-render. The subscriptions are correct *if the DB is ever updated*, but since the
webhook never fires (wrong header), the DB never changes and realtime never fires.

**D4. Is there a polling fallback?**
**No.** The recording page relies entirely on realtime subscriptions. If:
- the webhook header bug is fixed but the Supabase realtime connection drops
- the user navigates to the page after the recording already completed (initial load
  shows `status='stopped'`, webhook already ran and set `status='completed'`, realtime
  missed it)
- the Supabase realtime service has a hiccup

…the page will stay stuck showing "⏳ Audio is being processed…" forever. A polling
fallback on every 15 seconds is needed.

---

## Section E — UI State Machine

**E1. When does the "processing" banner disappear?**
The recording page computes:
```ts
const isProcessing = recording.status === 'recording' || recording.status === 'stopped'
```
The banner clears when `status` becomes `'completed'`. This is correct once the DB is
updated.

**E2. Does `RecordingButton`'s type include `'completed'`?**
Yes. `RecordingRow` in `RecordingButton.tsx` types status as
`'recording' | 'stopped' | 'completed' | 'failed'`. No type mismatch.

**E3. Are there any `started_at` null-safety issues in the DELETE route?**
`session_recordings` has `started_at TIMESTAMPTZ NOT NULL DEFAULT now()`, so it cannot
be null. The DELETE route computes:
```ts
const durationSec = Math.round((Date.now() - new Date(row.started_at).getTime()) / 1000)
```
This is safe.

---

## Summary of Bugs

| # | Severity | Bug | File | Fix |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | Wrong webhook header: reads `Authorization` instead of `X-Livekit-Signature` | `livekit-webhook/route.ts:19` | Fix 3 |
| 2 | 🟠 HIGH | No logging in webhook — impossible to diagnose from Vercel logs | `livekit-webhook/route.ts` | Fix 1 |
| 3 | 🟠 HIGH | No polling fallback on recording page | `recording/[recordingId]/page.tsx` | Fix 7 |
| 4 | 🟡 MEDIUM | Webhook promotes status on all egress events, not just `egress_ended` | `livekit-webhook/route.ts` | Fix 4 |
| 5 | 🟡 MEDIUM | `completed_at` and `error` columns missing from schema | migrations | Fix 8 |
| 6 | 🟢 LOW | No recovery endpoint for recordings stuck before this fix was deployed | — | Fix 6 |
