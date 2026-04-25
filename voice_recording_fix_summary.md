# Voice & Recording — Fix Summary

All 14 bugs from `voice_recording_bugs.md` fixed. `npx tsc --noEmit` exits clean.

---

## Bug 1 — CRITICAL: Microphone never enabled (silent room)

**File:** `src/components/table/VoiceChat.tsx`

Added `await newRoom.localParticipant.setMicrophoneEnabled(true)` immediately after `newRoom.connect()` resolves. Previously the room connected silently — no audio track was ever published.

---

## Bug 2 — CRITICAL: No participant list, speaking indicators, or mute controls

**File:** `src/components/table/VoiceChat.tsx` (major rewrite)

Complete rebuild of the VoiceChat component:
- Tracks `room.remoteParticipants` via `RoomEvent.ParticipantConnected/Disconnected`
- Subscribes to `RoomEvent.ActiveSpeakersChanged` for per-participant speaking indicators (animated ring)
- Subscribes to `RoomEvent.TrackMuted/Unmuted` to keep mute state current
- Resolves wallet → display name via `profiles` table (cached in ref to avoid repeat fetches)
- Shows a dropdown panel on click: local "You" row + all remote participants with name, speaking dot, mute icon
- Local mute/unmute toggle button beside the main Voice button
- DM-only "Mute" button per remote participant (calls `/api/livekit-mute`)

---

## Bug 3 — HIGH: DM has no roomAdmin grant

**Files:**
- `src/app/api/livekit-token/route.ts` — added `sessionId` query param; DB-verifies that the caller's identity matches `sessions.gm_wallet` before adding `roomAdmin: true` to the token grant. All other participants receive `roomAdmin: false`.
- `src/app/api/livekit-mute/route.ts` — **new file**: server-side GM mute endpoint. Verifies `callerWallet === sessions.gm_wallet` before calling `RoomServiceClient.mutePublishedTrack`.
- `src/components/table/tableclient/components/TableTopBar.tsx` — passes `isGm` and `sessionId` props to `VoiceChat` so it can include `sessionId` in token requests and show the DM mute buttons.

---

## Bug 4 — HIGH: No room_finished handler — stuck recordings

**File:** `src/app/api/livekit-webhook/route.ts`

Added `room_finished` event detection at the top of the POST handler. When `event.event === 'room_finished'`, sets all `session_recordings WHERE room_name = X AND status = 'recording'` to `status = 'stopped'`. This prevents recordings from staying permanently stuck when the LiveKit room closes without an explicit Stop click.

---

## Bug 5 — HIGH: `NEXT_PUBLIC_LIVEKIT_WS_URL` crash if unset

**File:** `src/app/api/recording/[sessionId]/route.ts`

Replaced unsafe `process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!.replace(...)` with a `livekitHost()` helper that throws `Error('NEXT_PUBLIC_LIVEKIT_WS_URL is not configured')` if the env var is absent. The error is caught by the existing try/catch and returned as a 500 with a clear message instead of an unhandled TypeError. Same guard added to `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET` in `makeEgressClient` and `makeRoomClient`.

---

## Bug 6 — HIGH: No beforeunload disconnect — ghost participants

**File:** `src/components/table/VoiceChat.tsx`

Added:
```ts
useEffect(() => {
  const handler = () => room?.disconnect()
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [room])
```
Fires on browser tab close / hard navigation, disconnecting the participant from the LiveKit room and stopping their track contribution to any active egress.

---

## Bug 7 — HIGH: `file_url` stored before file exists on S3

**Files:**
- `src/app/api/recording/[sessionId]/route.ts` — removed `file_url` and the per-track `file_url` from both INSERT statements. Both set to `null` at recording start. Removed now-unused `publicBase` variable from the POST body.
- `src/app/api/livekit-webhook/route.ts` — composite egress path now computes `file_url = publicBase + file_key` and stores it on `session_recordings` when the egress_ended event fires (i.e., when the file is confirmed on S3).

The recording editor page now gates the Download button on `status === 'completed'` rather than `file_url !== null`.

---

## Bug 8 — MEDIUM: No audio player or chapter-marker seeking

**File:** `src/app/sessions/[id]/recording/[recordingId]/page.tsx`

Added a **▶ Player** tab (new default tab) containing:
- `<audio ref={masterAudioRef} src={recording.file_url} controls />` for the master mix — shown only when `status === 'completed'`
- Individual `<audio>` players per track (gated on `file_status === 'ready'`)
- Chapter markers list; clicking any marker calls `masterAudioRef.current.currentTime = marker.offset_sec` and resumes playback
- Timestamps in the Chapters tab are also clickable for seeking
- Processing banner shown while `status` is `recording` or `stopped`

---

## Bug 9 — MEDIUM: No realtime subscriptions — status never auto-updates

**Migration:** `supabase/migrations/016_recording_tracks_realtime_file_status.sql`
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE recording_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE recording_markers;
```

**`src/components/table/tableclient/components/RecordingButton.tsx`:**
Added `supabase.channel` subscription on `session_recordings` filtered by `session_id`. When a row is updated (e.g., status changes from 'stopped' → 'completed'), the recording state in the RecordingButton updates without a page refresh.

**`src/app/sessions/[id]/recording/[recordingId]/page.tsx`:**
Added dual subscription on `session_recordings` (by `id`) and `recording_tracks` (by `recording_id`). Processing banner disappears automatically when status changes to 'completed'; track audio/download buttons appear when `file_status` changes to 'ready'.

---

## Bug 10 — MEDIUM: Track egress webhook doesn't update recording status

**File:** `src/app/api/livekit-webhook/route.ts`

The track_ended path now:
1. Updates `recording_tracks` with both `file_url` and `file_status = 'ready'`
2. Checks if all sibling tracks for the same recording have `file_status = 'ready'`
3. If yes, attempts to promote `session_recordings.status` from `'stopped'` → `'completed'`

This handles the edge case where all individual tracks finish before the composite egress ends.

---

## Bug 11 — MEDIUM: No `file_status` column on `recording_tracks`

**Migration:** `supabase/migrations/016_recording_tracks_realtime_file_status.sql`
```sql
ALTER TABLE recording_tracks
  ADD COLUMN IF NOT EXISTS file_status TEXT NOT NULL DEFAULT 'recording';
```
Values: `recording | ready | failed`. Set to `'ready'` by the webhook when the track egress ends. Back-fill sets all existing rows with `file_url IS NOT NULL` to `'ready'`.

Recording route now inserts `file_status: 'recording'` for new track rows. Recording editor page gates Download buttons and the Re-transcribe button on `file_status === 'ready'`.

---

## Bug 12 — MEDIUM: Stale pre-fetched token used without expiry check

**File:** `src/components/table/VoiceChat.tsx`

Changed cached token storage from a React state `useState<string | null>` to a ref `useRef<{ value: string; fetchedAt: number } | null>`. In `handleConnect`, the cached token is discarded and a fresh one fetched if `Date.now() - fetchedAt > 7 * 60 * 60 * 1000` (7 hours; leaving 1 h buffer before the 8 h TTL expires).

---

## Bug 13 — LOW: LIVEKIT_API_KEY/SECRET not validated in webhook

**File:** `src/app/api/livekit-webhook/route.ts`

`makeReceiver()` now throws `Error('LIVEKIT_API_KEY / LIVEKIT_API_SECRET not configured')` if either env var is absent. The existing try/catch returns 401 with a clear log message rather than silently failing all webhook calls with incorrect signatures.

---

## Bug 14 — LOW: Wallet addresses shown instead of display names in Tracks tab

**File:** `src/app/sessions/[id]/recording/[recordingId]/page.tsx`

After `fetchRecording`, all `participant_identity` values (wallet addresses) are batch-fetched from `profiles.display_name`. Results stored in `nameMap` state. The Player tab, Tracks tab, and all download link filenames use `nameMap[identity] ?? shortenWallet(identity)`.

---

## Files changed

| File | Change |
|------|--------|
| `src/components/table/VoiceChat.tsx` | Bugs 1, 2, 6, 12 — complete rewrite |
| `src/components/table/tableclient/components/TableTopBar.tsx` | Bug 3 — pass isGm + sessionId to VoiceChat |
| `src/app/api/livekit-token/route.ts` | Bug 3 — roomAdmin for verified DM |
| `src/app/api/livekit-mute/route.ts` | Bug 3 — **new file** GM mute endpoint |
| `src/app/api/livekit-webhook/route.ts` | Bugs 4, 7, 10, 13 |
| `src/app/api/recording/[sessionId]/route.ts` | Bugs 5, 7 |
| `src/app/sessions/[id]/recording/[recordingId]/page.tsx` | Bugs 8, 9, 14 |
| `src/components/table/tableclient/components/RecordingButton.tsx` | Bug 9 |
| `supabase/migrations/016_recording_tracks_realtime_file_status.sql` | Bugs 9, 11 — **new file** |
