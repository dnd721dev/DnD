# Voice & Recording System — Bug Report

All bugs derive from the full audit in `voice_recording_audit.md`.
No fix code has been written yet.

---

## Bug 1

**Priority:** CRITICAL

**Location:** `src/components/table/VoiceChat.tsx` — `handleConnect()` (after `newRoom.connect()`)

**Symptom:** Users who click "Voice" and see "Voice (1)" as connected cannot hear anyone and no one can hear them. The room appears connected but the channel is completely silent.

**Root cause:** `Room.connect()` in livekit-client does **not** automatically enable the local microphone. After connecting, the application must explicitly call:
```ts
await newRoom.localParticipant.setMicrophoneEnabled(true)
```
This call is entirely absent. Every participant joins with no published audio track. `RoomAudioRenderer` correctly renders remote audio, but since no one publishes, nothing is ever received.

**Fix required:**
```ts
await Promise.race([newRoom.connect(url, token!), timeout]);
await newRoom.localParticipant.setMicrophoneEnabled(true);  // ← add this
setRoom(newRoom);
```

---

## Bug 2

**Priority:** CRITICAL

**Location:** `src/components/table/VoiceChat.tsx` — entire component

**Symptom:** The Voice UI shows only a participant count (`Voice (3)`). There is no list of who is connected, no speaking indicator, no mute/unmute button, and the DM cannot silence a disruptive player. All spec requirements for the participant panel are absent.

**Root cause:** The component was never built out past a proof-of-concept. It registers `ParticipantConnected/Disconnected` events only to count participants; it never iterates `room.remoteParticipants` or subscribes to `TrackPublished` / `ActiveSpeakersChanged` events.

**Fix required:**
1. Iterate `room.remoteParticipants` (a `Map`) to render names and mute states.
2. Subscribe to `RoomEvent.ActiveSpeakersChanged` to show a speaking ring per participant.
3. Add a mute/unmute toggle for `room.localParticipant` (button updates `isMicrophoneEnabled`).
4. For DM: add per-participant mute button that calls `room.localParticipant` to send a mute request **or** use the server-side `RoomServiceClient.mutePublishedTrack` from an API route (required because `roomAdmin` is needed for remote mute).
5. Show display names fetched from the `profiles` table (not raw wallet addresses).

---

## Bug 3

**Priority:** HIGH

**Location:** `src/app/api/livekit-token/route.ts` — `at.addGrant()`

**Symptom:** The DM has no administrative control over the LiveKit room. They cannot remotely mute a participant even if the UI tries to call it. Any attempt to use `RoomServiceClient.mutePublishedTrack` server-side for a room where the DM's token has no `roomAdmin` grant will be silently ignored by the LiveKit infrastructure.

**Root cause:** All participants (DM and players) receive identical token grants. The `roomAdmin: true` grant is never set for the DM.

**Fix required:** In `/api/livekit-token/route.ts`, accept an `isGm` parameter (e.g. verify the caller is the session's `gm_wallet` via a DB lookup or an additional query param validated server-side) and add `roomAdmin: true` to the DM's token:
```ts
at.addGrant({
  roomJoin: true,
  room,
  canPublish: true,
  canSubscribe: true,
  canPublishData: true,
  roomAdmin: isGm,   // ← add this
})
```

---

## Bug 4

**Priority:** HIGH

**Location:** `src/app/api/livekit-webhook/route.ts` — missing `room_finished` handler

**Symptom:** If a LiveKit room closes (session ends, server-side timeout, network outage) without the DM explicitly clicking Stop, the `session_recordings` rows remain stuck at `status = 'recording'` forever. The RecordingButton will show "● REC" indefinitely and any subsequent recording attempt will see a stale "active" row.

**Root cause:** The webhook only checks for `egressId` presence. It does not handle `room_finished` events. When a room closes, LiveKit stops all egresses (firing `egress_ended` for each), so the individual file rows would be updated — but the webhook processes composite vs track egresses separately and only sets `status='completed'` on one. If egresses end before the `room_finished` event is processed there is still a timing window.

More critically: the `GET /api/recording/${sessionId}` fetch in `RecordingButton` looks for `status === 'recording'` to determine the active recording. A stuck row means a new recording can never start (rate-limit aside, the UI will show the stuck row as active).

**Fix required:**
1. Parse the event type from the LiveKit webhook payload.
2. On `room_finished`: query `session_recordings WHERE status='recording' AND room_name=$room`, set them all to `status='stopped'`, set `stopped_at=now()`.
3. Also stop any stale egresses via `EgressClient.stopEgress` on a best-effort basis.

---

## Bug 5

**Priority:** HIGH

**Location:** `src/app/api/recording/[sessionId]/route.ts` — `makeEgressClient()` and `makeRoomClient()`

**Symptom:** If the `NEXT_PUBLIC_LIVEKIT_WS_URL` environment variable is not set, clicking Record crashes the Next.js server route with an unhandled `TypeError: Cannot read properties of undefined (reading 'replace')` rather than a clean 503 error message.

**Root cause:**
```ts
function makeEgressClient() {
  const host = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!.replace('wss://', 'https://')
  // ↑ if env var is undefined, .replace() throws TypeError
}
```
The `!` non-null assertion bypasses TypeScript's check but does not prevent a runtime crash.

**Fix required:**
```ts
function makeEgressClient() {
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL
  if (!wsUrl) throw new Error('NEXT_PUBLIC_LIVEKIT_WS_URL is not configured')
  const host = wsUrl.replace('wss://', 'https://')
  return new EgressClient(host, ...)
}
```
Add the same guard to `makeRoomClient()`. Catch this in the POST handler and return a 503.

---

## Bug 6

**Priority:** HIGH

**Location:** `src/components/table/VoiceChat.tsx` — no `beforeunload` handler

**Symptom:** When a user closes the browser tab or navigates away without clicking "Leave", they remain as a connected participant in the LiveKit room. Other participants still see the ghost participant in their count and the ghost may hold a recording egress track open, causing the per-track file to never finalise.

**Root cause:** Room cleanup only happens in `useEffect(() => () => room?.disconnect(), [room])` which fires on React unmount — a process that doesn't happen on hard page close/reload.

**Fix required:**
```ts
useEffect(() => {
  const handler = () => room?.disconnect()
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [room])
```

---

## Bug 7

**Priority:** HIGH

**Location:** `src/app/api/livekit-webhook/route.ts` — composite egress path

**Symptom:** After the webhook fires, the composite recording's `status` is `'completed'` (set by webhook), but the `RecordingButton` type definition says the valid statuses are `'recording' | 'stopped' | 'completed' | 'failed'`. However, when the DM clicks Stop, the DELETE handler sets `status = 'stopped'`. The webhook then upgrades it to `'completed'`. This is intentionally designed, **but** the Recording page's status display only shows the raw value — it never explains to the DM that `'stopped'` is an intermediate state (waiting for LiveKit to flush the file) vs `'completed'` (file confirmed available).

More importantly: the composite `file_url` is set **at recording start** (before the file exists). The recording editor page renders a Download button as soon as `file_url` is non-null, even while `status = 'recording'`. Clicking Download before the egress ends results in a 403/404 from S3.

**Root cause:**
```ts
const fileUrl = publicBase ? `${publicBase}/${fileKey}` : null
// Stored in DB immediately; file doesn't exist until egress ends
await db.from('session_recordings').insert({ file_url: fileUrl, ... })
```

**Fix required:** Do not store `file_url` in the initial INSERT. Set it in the webhook handler the same way track URLs are set — only after the egress completes and the file is confirmed:
```ts
// In webhook, composite path:
const fileUrl = publicBase && compositeRow.file_key
  ? `${publicBase}/${compositeRow.file_key}` : null
await db.from('session_recordings')
  .update({ status: 'completed', file_url: fileUrl })
  .eq('id', compositeRow.id)
```
The recording editor page should gate the Download button on `status === 'completed'` not on `file_url !== null`.

---

## Bug 8

**Priority:** MEDIUM

**Location:** `src/app/sessions/[id]/recording/[recordingId]/page.tsx` — no audio player

**Symptom:** The recording page has no `<audio>` element. Users can download the file but cannot preview it in-browser. The spec requires an audio player with chapter-marker seeking.

**Root cause:** The page was built as an editor (transcript/chapter management) but the playback UI was never added.

**Fix required:**
1. Add `<audio ref={audioRef} src={recording.file_url ?? undefined} controls />` (or a styled custom player) in the Script and Tracks tabs.
2. Clicking a chapter marker in the Chapters tab should call `audioRef.current.currentTime = marker.offset_sec`.
3. Per-track players in the Tracks tab: one `<audio>` per track with `src={track.file_url}`.
4. Gate all players behind `recording.status === 'completed'` — show "Processing…" indicator while status is 'recording' or 'stopped'.

---

## Bug 9

**Priority:** MEDIUM

**Location:** `src/app/sessions/[id]/recording/[recordingId]/page.tsx` and `src/components/table/tableclient/components/RecordingButton.tsx` — no realtime subscription

**Symptom:** When a recording finishes processing (status changes to 'completed', transcript is generated), neither the recording editor page nor the RecordingButton updates automatically. The DM must refresh the page to see the completed state.

**Root cause:** `session_recordings` is in the realtime publication but no component subscribes to it. `recording_tracks` and `recording_markers` are not in the publication at all.

**Fix required:**
1. Add `ALTER PUBLICATION supabase_realtime ADD TABLE recording_tracks` to a migration.
2. In the recording editor page, add a Supabase realtime subscription on `session_recordings` filtered by `id = recordingId`. On `UPDATE`, call `fetchRecording()` to refresh state.
3. In `RecordingButton`, add a subscription on `session_recordings` filtered by `session_id = sessionId`. When status changes to 'completed', update the recording state locally and show a "Recording ready" indicator.

---

## Bug 10

**Priority:** MEDIUM

**Location:** `src/app/api/livekit-webhook/route.ts` — track egress ended path, line ~75

**Symptom:** When a per-track egress ends, the webhook updates `recording_tracks.file_url` but does not update any status indicator. The recording editor page's Tracks tab shows a Download button based on `track.file_url !== null`, which requires a page refresh to appear. The overall recording status (`session_recordings.status`) is also never set to 'completed' based on track completion — only the composite egress drives that.

**Root cause:** The webhook track path:
```ts
await db.from('recording_tracks')
  .update({ file_url: fileUrl })   // ← only file_url updated
  .eq('id', trackRow.id)
```
No status field update. No check for "all tracks done → update parent recording".

**Fix required:**
1. Add a status transition: when a track egress ends, if `file_url` is set successfully, the track is ready for download. A lightweight convention: use a DB column (see Bug 11) or repurpose the existing `transcript_status` to track audio readiness separately.
2. After updating the track, check if all sibling tracks have their `file_url` set. If yes, and the composite is also 'completed', set `session_recordings.status = 'completed'`.

---

## Bug 11

**Priority:** MEDIUM

**Location:** `supabase/migrations/add_recording_podcast.sql` and `002_rebuild_backend.sql` — `recording_tracks` schema

**Symptom:** There is no column on `recording_tracks` to indicate whether the audio file is ready (egress finished) vs still recording. The only status column is `transcript_status` which tracks a completely separate pipeline. The Tracks tab on the editor page shows "No transcript yet. Click ↺ Re-transcribe" with no indication that the audio hasn't finished uploading yet.

**Root cause:** The schema was designed with transcription in mind but not audio file readiness. There is no `audio_status` or `file_status` column.

**Fix required:** Add a migration:
```sql
ALTER TABLE recording_tracks
  ADD COLUMN IF NOT EXISTS file_status TEXT NOT NULL DEFAULT 'recording';
  -- recording | ready | failed
```
Set `file_status = 'ready'` in the webhook when `file_url` is updated. The editor page gates the Download button on `file_status === 'ready'`.

---

## Bug 12

**Priority:** MEDIUM

**Location:** `src/components/table/VoiceChat.tsx` — cached token age

**Symptom:** If a user opens the session page but doesn't click "Voice" for a significant time, and the session runs longer than 8 hours, the pre-fetched token will be expired when they finally click Voice. They will connect with an expired JWT and LiveKit will reject the connection.

**Root cause:** `cachedToken` is stored in state with no expiry timestamp. It is used without checking how old it is:
```ts
let token = cachedToken;
if (!token) { /* fetch fresh */ }
// ↑ never checks if cachedToken is still valid
```

**Fix required:** Store the token fetch time alongside the token. In `handleConnect`, if `Date.now() - tokenFetchedAt > 7 * 60 * 60 * 1000` (7 hours, leaving 1 hour buffer), discard the cached token and fetch a fresh one.

---

## Bug 13

**Priority:** LOW

**Location:** `src/app/api/livekit-webhook/route.ts` — LIVEKIT_API_KEY/SECRET not validated

**Symptom:** If `LIVEKIT_API_KEY` or `LIVEKIT_API_SECRET` is not set, `makeReceiver()` creates a `WebhookReceiver` with `undefined` values. Verification will fail for every webhook call, returning 401 — silently breaking all recording completion updates.

**Root cause:**
```ts
function makeReceiver() {
  return new WebhookReceiver(
    process.env.LIVEKIT_API_KEY!,    // ← undefined if not set
    process.env.LIVEKIT_API_SECRET!, // ← undefined if not set
  )
}
```

**Fix required:** Add an env check at the top of the POST handler and return 500 with a clear message:
```ts
const apiKey = process.env.LIVEKIT_API_KEY
const apiSecret = process.env.LIVEKIT_API_SECRET
if (!apiKey || !apiSecret) {
  return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 500 })
}
```

---

## Bug 14

**Priority:** LOW

**Location:** `src/app/sessions/[id]/recording/[recordingId]/page.tsx` — participant identity is raw wallet

**Symptom:** The Tracks tab shows participant identities as raw wallet addresses (e.g. `0xAbCd…1234`) instead of display names. The audio recording is labeled with the wallet, not the character or player name.

**Root cause:** `recording_tracks.participant_identity` stores the LiveKit identity which equals the wallet address (set in `VoiceChat.tsx` as `identity = address?.toLowerCase()`). The editor page renders `track.participant_identity` directly with no lookup.

**Fix required:** In the recording editor page, after loading tracks, batch-fetch `profiles.display_name` for all `participant_identity` values and replace wallet addresses with display names in the UI.

---

## Summary table

| # | Priority | Location | Symptom |
|---|----------|----------|---------|
| 1 | CRITICAL | VoiceChat.tsx | Microphone never enabled — silent room |
| 2 | CRITICAL | VoiceChat.tsx | No participant list, speaking indicator, or mute controls |
| 3 | HIGH | livekit-token/route.ts | DM has no roomAdmin — cannot mute participants |
| 4 | HIGH | livekit-webhook/route.ts | No room_finished handler — stuck 'recording' rows |
| 5 | HIGH | recording/route.ts | NEXT_PUBLIC_LIVEKIT_WS_URL crash if unset |
| 6 | HIGH | VoiceChat.tsx | No beforeunload disconnect — ghost participants |
| 7 | HIGH | recording/route.ts + webhook | file_url stored before file exists → premature download link |
| 8 | MEDIUM | recording/[recordingId]/page.tsx | No audio player; no chapter-marker seeking |
| 9 | MEDIUM | recording page + RecordingButton | No realtime subscription — status never auto-updates |
| 10 | MEDIUM | livekit-webhook/route.ts | Track egress path doesn't update recording status |
| 11 | MEDIUM | recording_tracks schema | No file_status column — can't tell if audio is ready |
| 12 | MEDIUM | VoiceChat.tsx | Stale token used without expiry check |
| 13 | LOW | livekit-webhook/route.ts | LIVEKIT_API_KEY/SECRET not validated — silent 401s |
| 14 | LOW | recording/[recordingId]/page.tsx | Wallet addresses shown instead of display names |
