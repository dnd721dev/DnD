# Recording Recovery — Manual Verification Checklist

Use this after deploying the fixes to confirm the pipeline is working end-to-end.

---

## 1. Verify env vars are set in Vercel

In Vercel → Project → Settings → Environment Variables, confirm all of the following
exist and are non-empty for the **Production** environment:

- [ ] `LIVEKIT_API_KEY`
- [ ] `LIVEKIT_API_SECRET`
- [ ] `NEXT_PUBLIC_LIVEKIT_WS_URL`
- [ ] `RECORDING_S3_BUCKET`
- [ ] `RECORDING_S3_REGION`
- [ ] `RECORDING_S3_ACCESS_KEY`
- [ ] `RECORDING_S3_SECRET`
- [ ] `RECORDING_S3_PUBLIC_BASE_URL`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Confirm LiveKit webhook URL is registered

In the LiveKit dashboard → your project → Settings → Webhooks:

- [ ] A webhook entry exists pointing to `https://<your-domain>/api/livekit-webhook`
- [ ] It is **enabled**
- [ ] The events list includes at minimum: `egress_ended`, `room_finished`

---

## 3. Confirm the DB migration ran

In Supabase → SQL editor, run:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'session_recordings'
  AND column_name IN ('completed_at', 'error');

SELECT column_name
FROM information_schema.columns
WHERE table_name = 'recording_tracks'
  AND column_name IN ('error', 'file_status');
```

- [ ] `session_recordings.completed_at` exists
- [ ] `session_recordings.error` exists
- [ ] `recording_tracks.error` exists
- [ ] `recording_tracks.file_status` exists (from migration 016)

---

## 4. Send a test webhook to confirm signature passes

Use the LiveKit CLI or `curl` to post a minimal event with the correct signature:

```bash
# From the LiveKit CLI (lk):
lk webhook test --url https://<your-domain>/api/livekit-webhook
```

Or inspect Vercel → Functions → `/api/livekit-webhook` → Logs after a real recording.

- [ ] Log line: `[livekit-webhook] received body=...` appears (Fix 1 logging)
- [ ] Log line: `[livekit-webhook] event=egress_ended egressId=...` appears
- [ ] **No** `LiveKit webhook verification failed` error in the logs

---

## 5. Recover existing stuck recordings

For any recording currently stuck at `status = 'stopped'` with no `file_url`, hit the
recovery endpoint:

```bash
curl -X POST https://<your-domain>/api/recording/<sessionId>/recover \
  -H "Content-Type: application/json" \
  -d '{"recordingId": "<uuid>"}'
```

Or use the recovery UI button added to the recording page.

In Supabase → Table editor → `session_recordings`:

- [ ] Stuck rows now have `status = 'completed'` (if egress already finished on S3)
- [ ] Or `status = 'failed'` with an `error` message if egress failed

---

## 6. Start a live test recording

1. Open a session with at least one participant.
2. Click **Start Recording**.
3. Speak for ~30 seconds.
4. Click **Stop Recording**.
5. Watch Vercel logs for the webhook route.

- [ ] `egress_ended` event arrives within ~60 seconds of stop
- [ ] `session_recordings.status` changes from `stopped` → `completed` in real time
- [ ] `recording_tracks.file_status` changes to `ready` for each participant track
- [ ] Recording page banner disappears without a page reload

---

## 7. Verify polling fallback

To confirm the polling fallback (Fix 7) works independently of realtime:

1. Open the recording page for a recording in `status = 'stopped'`.
2. In browser DevTools → Network, block `wss://` (disable WebSocket connections).
3. Wait up to 15 seconds.
4. Manually update the row in Supabase to `status = 'completed'`.
5. Within ~15 seconds the page should refresh status via the poll.

- [ ] Page updates without realtime within 15 seconds
