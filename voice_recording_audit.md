# Voice & Recording System — Full Audit

All listed files were read in full before any conclusions were drawn.

---

## Package versions

| Package | Version |
|---------|---------|
| `livekit-client` | `^2.16.0` |
| `livekit-server-sdk` | `^2.13.3` |
| `@livekit/components-react` | `^2.9.16` |
| `@livekit/components-styles` | `^1.2.0` |
| `openai` | `^6.32.0` |

---

## SECTION A — LiveKit connection

### A1. How is the LiveKit token generated?

**File:** `src/app/api/livekit-token/route.ts`

- `AccessToken` from `livekit-server-sdk`; TTL = **8 hours**; identity = wallet address (lowercased) passed as query param.
- Grants on every token:
  - `roomJoin: true`
  - `room: <roomName>`
  - `canPublish: true`
  - `canSubscribe: true`
  - `canPublishData: true`
- **`roomAdmin` is NOT granted to anyone — including the DM.**
  - The DM token is identical to a player token.
  - Without `roomAdmin`, the DM cannot remotely mute participants via LiveKit's server API.
- Room name source (`TableClient.tsx` line 201):
  ```ts
  const roomName = campaignMeta?.livekit_room_name || `session-${session?.id ?? sessionId}`
  ```
  The room name is derived from the campaign's `livekit_room_name` (set in the DB) or falls back to `session-<uuid>`. The same value is passed to both `VoiceChat` and `RecordingButton`, so the room name is consistent.
- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` are validated; returns 503 if missing.

### A2. How does VoiceChat.tsx connect?

**File:** `src/components/table/VoiceChat.tsx`

- Uses bare `livekit-client` `Room` class directly — **not** the `LiveKitRoom` React component.
- Token pre-fetch: runs as a background `useEffect` on mount, stores result in `cachedToken` state.
- On "Voice" button click → `handleConnect()`:
  1. Guards: checks URL exists, room name exists.
  2. Uses `cachedToken` if available; otherwise fetches fresh.
  3. Creates `new Room()`, registers `Connected`, `Disconnected`, `ParticipantConnected`, `ParticipantDisconnected` events.
  4. Calls `room.connect(url, token)` inside a `Promise.race` with a 10-second timeout.
- Error handling: catches any exception, calls `setError(message)`.
- Cleanup: `useEffect` returns `() => room?.disconnect()` — fires on unmount if `room` state is set.
- Audio rendering: `<RoomAudioRenderer room={room} />` — renders remote audio tracks.

**Critical gap:** `room.connect()` is called but **`room.localParticipant.setMicrophoneEnabled(true)` is never called.** The user joins the room silently — their microphone is never published. Other participants cannot hear them. `RoomAudioRenderer` will play whatever remote audio arrives, but no participant ever publishes audio, so the room is silent for everyone.

### A3. Can participants see each other?

**No meaningful participant list exists.**

The connected state only shows a count: `Voice (N)`. There is:
- No participant name list
- No speaking indicator (animated ring)
- No mute/unmute button for the local participant
- No DM-side mute controls

The UI satisfies "am I in a room?" but nothing more.

### A4. Console errors / connection failures

| Issue | Detail |
|-------|--------|
| Microphone never enabled | `setMicrophoneEnabled(true)` not called → silent room |
| Two env var names for same URL | VoiceChat uses `NEXT_PUBLIC_LIVEKIT_URL`; recording routes use `NEXT_PUBLIC_LIVEKIT_WS_URL`. Both exist in `.env.example` but if only one is populated both env vars are set. Currently harmless but fragile. |
| No `beforeunload` disconnect | Closing the browser tab leaves a ghost participant in the LiveKit room. Only `useEffect` cleanup fires on unmount. |
| Stale pre-fetched token | If the user loads the page and waits 8+ hours before clicking Voice, the pre-fetched token is expired. `cachedToken` is used without checking expiry. (Very edge-case given 8h TTL.) |
| No `roomAdmin` on DM token | DM cannot mute others. No error thrown — the capability simply doesn't exist on the token. |

---

## SECTION B — Recording system

### B5. livekit-webhook/route.ts

**Signature verification:** `WebhookReceiver.receive(body, authorization)` — reads the `Authorization` header (LiveKit signs the webhook with a JWT in that header). Will return 401 with `{ error: 'Invalid webhook signature' }` if verification fails. ✅

**Events handled:** The webhook does NOT listen for named events (`room_started`, `room_finished`, `participant_joined/left`). Instead it looks for the presence of `egressId` on the event object and branches on which DB table the ID appears in.

```
if (egressId found in session_recordings) → composite_ended path
if (egressId found in recording_tracks)   → track_ended path
otherwise                                 → returns { ok: true, type: 'unknown_egress' }
```

**Composite egress ended path:**
1. Sets `session_recordings.status = 'completed'`
2. Fires `transcribeComposite(id)` if `OPENAI_API_KEY` is set (fire-and-forget)

**Track egress ended path:**
1. Builds `fileUrl` from `RECORDING_S3_PUBLIC_BASE_URL + file_key`
2. Sets `recording_tracks.file_url = fileUrl` — but **sets no status field on `recording_tracks`** (the table has no `status` column; only `transcript_status`)
3. Fires `transcribeTrack(id)` if `OPENAI_API_KEY` is set (fire-and-forget)

**Not handled:**
- `room_finished` — if the LiveKit room closes (session ends, timeout, crash), any in-progress egress is stopped by LiveKit but the DB rows are never updated from 'recording' → 'stopped/completed'. They stay stuck at 'recording' forever.
- `egress_started` — no update to DB on egress start (fine since we set status in the POST handler, but the `egress_id` is set optimistically).

**Manual verification step needed:** Confirm the webhook URL `https://your-app.vercel.app/api/livekit-webhook` is configured in the LiveKit Cloud dashboard under the project's webhook settings. This cannot be verified in code.

### B6. recording/[sessionId]/route.ts

**GET:** Returns all `session_recordings` joined with `recording_tracks` for the session, ordered by `created_at` desc, limit 10. Uses `supabaseAdmin()`. ✅

**POST (start recording):**
1. Validates `RECORDING_S3_*` env vars — returns 503 if any missing.
2. Rate-limited (5 starts per 10 min per session).
3. Builds file key: `recordings/${sessionId}/${timestamp}.{ogg|mp4}`.
4. Calls `EgressClient.startRoomCompositeEgress(roomName, fileOutput, { audioOnly })`.
5. Inserts row into `session_recordings` with `egress_id`, `status='recording'`, `file_key`, `file_url` (set immediately, before the file exists on S3).
6. Calls `RoomServiceClient.listParticipants(roomName)` and for each participant with an unmuted audio track, calls `EgressClient.startTrackEgress(...)`.
7. Inserts a `recording_tracks` row per participant (or a placeholder row on failure).
8. Returns `{ recording, tracks }` with 201.

**DELETE (stop recording):**
1. Finds the active recording (`status='recording'`) for the session.
2. Calls `stopEgress(egress_id)` on the composite.
3. Calls `stopEgress(egress_id)` on each track egress.
4. Updates `session_recordings`: `status='stopped'`, `stopped_at`, `duration_sec`.
5. Returns `{ recording: updated }`.

**EgressClient construction:** Uses `NEXT_PUBLIC_LIVEKIT_WS_URL` with `.replace('wss://', 'https://')`. If `NEXT_PUBLIC_LIVEKIT_WS_URL` is unset (undefined), calling `.replace(...)` throws a `TypeError` — no null guard.

**Egress type:**
- Master mix: `RoomCompositeEgress` → captures all audio (and layout if audioOnly=false)
- Per-track: `TrackEgress` via `startTrackEgress` → single participant audio

**Storage:** S3-compatible via `RECORDING_S3_*` env vars. `EncodedFileOutput` for composite, `DirectFileOutput` for tracks.

### B7. Per-participant track recording

**Implemented.** The POST handler iterates `listParticipants(roomName)`, finds unmuted audio tracks, and calls `startTrackEgress` for each. Failures are caught per-participant and a placeholder `recording_tracks` row is created. The implementation is "best-effort" — composite always starts first and is considered the primary deliverable.

### B8. RecordingButton.tsx

- Calls `GET /api/recording/${sessionId}` on mount to load current status.
- Start: `POST /api/recording/${sessionId}` with `{ roomName, audioOnly }`. Updates local state on success. Shows `alert()` on error.
- Stop: `DELETE /api/recording/${sessionId}` with `{ recordingId }`. Updates local state.
- Active recording: red pulsing `● REC HH:MM:SS` badge, Stop button, Marker button.
- Elapsed timer: `setInterval` that calculates seconds since `started_at`.
- Markers: inline `<input>` + "Mark" button → `POST /api/recording-markers`. Markers shown in list.
- History panel: shows past recordings with status badge, download link (if `file_url`), and "Open Editor" link.
- Error handling: `alert(error)` on start failure; no error handling on stop failure.
- Only rendered for `isGm` (checked in `TableTopBar`). ✅

### B9. Database schemas

**`session_recordings`** (from `002_rebuild_backend.sql`):

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| session_id | UUID FK→sessions | |
| room_name | TEXT NOT NULL | |
| egress_id | TEXT | composite egress ID |
| status | TEXT DEFAULT 'recording' | recording \| stopped \| failed (webhook also sets 'completed') |
| file_key | TEXT | S3 object key |
| file_url | TEXT | public URL (set at start, before file exists) |
| started_at | TIMESTAMPTZ DEFAULT now() | |
| stopped_at | TIMESTAMPTZ | |
| duration_sec | INT | |
| composite_transcript | TEXT | whisper verbose_json |
| composite_transcript_status | TEXT DEFAULT 'none' | none \| pending \| done \| failed |
| master_script | TEXT | assembled speaker-labeled script |
| master_script_status | TEXT DEFAULT 'none' | none \| pending \| done \| failed |
| published | BOOLEAN DEFAULT false | |
| episode_number | INT | |
| episode_title | TEXT | |
| created_at | TIMESTAMPTZ | |

**`recording_tracks`** (from `add_recording_podcast.sql`):

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| recording_id | UUID FK→session_recordings | |
| session_id | UUID | |
| participant_identity | TEXT NOT NULL | wallet address |
| egress_id | TEXT | per-track egress ID |
| file_key | TEXT | S3 object key |
| file_url | TEXT | set by webhook when egress ends |
| transcript | TEXT | whisper verbose_json string |
| transcript_status | TEXT DEFAULT 'none' | none \| pending \| done \| failed |
| created_at | TIMESTAMPTZ | |

**Note: No `status` column on `recording_tracks`.** There is no way to distinguish "egress still running" from "egress ended and file is ready" other than `file_url IS NOT NULL`.

**`recording_markers`** (from `002_rebuild_backend.sql`):

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| recording_id | UUID FK→session_recordings | |
| session_id | UUID | |
| label | TEXT NOT NULL | |
| offset_sec | INT DEFAULT 0 | seconds from recording start |
| created_at | TIMESTAMPTZ | |

### B10. How does recording stop?

- **Manual stop:** DM clicks "Stop" → `DELETE /api/recording/${sessionId}` → server calls `stopEgress` for composite + all tracks → updates DB to `status='stopped'`, `stopped_at`, `duration_sec`.
- **Webhook completion:** LiveKit fires `egress_ended` → webhook handler updates `status='completed'`. This is the final "file is ready" state.
- **Automatic on session end:** NOT implemented. If the session ends (or the LiveKit room times out), in-progress recordings are not explicitly stopped via the API.
- **EgressClient.stopEgress** is called correctly using the stored `egress_id`.

---

## SECTION C — Recording storage and access

### C11. Where are recordings stored?

**S3-compatible storage** via env vars:
- `RECORDING_S3_BUCKET`
- `RECORDING_S3_REGION`
- `RECORDING_S3_ACCESS_KEY`
- `RECORDING_S3_SECRET`
- `RECORDING_S3_ENDPOINT` (empty for AWS; set for Supabase Storage S3 API / R2 / MinIO)
- `RECORDING_S3_PUBLIC_BASE_URL` (e.g. `https://<project>.supabase.co/storage/v1/object/public/recordings`)

Composite files: `recordings/${sessionId}/${timestamp}.{ogg|mp4}`
Per-track files: `recordings/${sessionId}/${timestamp}/tracks/${identity}.ogg`

### C12. How are recording URLs generated?

**Composite:** `file_url` is computed at recording start time and stored immediately:
```ts
const fileUrl = publicBase ? `${publicBase}/${fileKey}` : null
```
The file does **not yet exist** on S3 when this URL is stored. It only becomes valid after the egress ends and LiveKit uploads it.

**Per-track:** `file_url` is set in the webhook handler when egress ends:
```ts
const fileUrl = publicBase && trackRow.file_key ? `${publicBase}/${trackRow.file_key}` : null
```
This is correct — the URL is set only when the file is confirmed uploaded.

**URL type:** Permanent public URLs (not presigned). The S3 bucket must have the objects publicly readable, or the `RECORDING_S3_PUBLIC_BASE_URL` must point to a public bucket policy.

### C13. Recording page (src/app/sessions/[id]/recording/[recordingId]/page.tsx)

This is a **recording editor**, not a simple playback page. It has:

- **Header:** date, duration, status, Download master link (if `file_url`), Publish/Unpublish button.
- **Script tab:** editable `<textarea>` with the assembled master script. Regenerate, Save, and two download buttons (`.md`, `.txt`).
- **Chapters tab:** sortable list of markers, edit/delete per marker, add new marker form, export chapters.json.
- **Tracks tab:** per-participant transcript editors with re-transcribe button. Download link per track if `file_url` set.
- **No `<audio>` playback element anywhere.** The page has download links but no in-page audio player.
- Loads via `GET /api/recording/${sessionId}` + `GET /api/recording-markers?recordingId=...`.
- No realtime subscription — status updates require manual page refresh.

### C14. transcribeRecording.ts

**Service:** OpenAI Whisper via `openai` SDK (`model: 'whisper-1'`, `response_format: 'verbose_json'`, `timestamp_granularities: ['segment']`).

**Fully implemented** — not stubbed. Three exported functions:
- `transcribeTrack(trackId)` — fetches audio file from `file_url`, transcribes, saves JSON string to `recording_tracks.transcript`. When all sibling tracks are done, calls `buildMasterScript`.
- `transcribeComposite(recordingId)` — same for composite recording.
- `buildMasterScript(recordingId)` — assembles speaker-labeled Markdown script from all completed per-track transcripts, sorted by segment timestamp. Falls back to composite transcript if no individual tracks exist.

**Trigger:** Auto-triggered by webhook on egress end (fire-and-forget). Also manually triggerable via `POST /api/recording/${sessionId}/transcribe`.

**Potential failure mode:** `transcribeTrack` fetches audio from the public `file_url`. If the bucket is not publicly accessible or the URL is wrong, `fetchAsFile` will throw and the track status will be set to 'failed'.

---

## SECTION D — Markers

### D15. recording-markers/route.ts

- **Purpose:** Chapter markers pinned to a second offset within a recording (e.g., "Boss fight starts" at 00:12:34).
- **When created:** During active recording via the RecordingButton inline marker input (offset = elapsed seconds). Also on the editor page (Chapters tab) with manual offset input.
- **Tied to timestamp:** Yes — `offset_sec` is the number of seconds from recording start.
- **Seeking UI:** The editor page lists markers by offset but clicking a marker does NOT seek any audio player (there is no audio player). The spec requires click-to-seek but it is not implemented.

---

## SECTION E — Database connections

### E16. Recording-related columns by table

**`sessions`**: Does NOT have `recording_master_url`, `recording_tracks` jsonb, or `egress_id`. Recordings are stored in the separate `session_recordings` table. The sessions table IS in the realtime publication (`ALTER PUBLICATION supabase_realtime ADD TABLE sessions`).

**`session_recordings`**: All columns present — see B9 above. In realtime publication. ✅

**`recording_tracks`**: All columns present — see B9 above. **NOT in any realtime publication.** No `status` column (only `transcript_status`).

**`recording_markers`**: All columns present. **NOT in any realtime publication.**

### E17. Service role key usage

All recording API routes call `supabaseAdmin()` which uses `SUPABASE_SERVICE_ROLE_KEY`. This bypasses RLS for all recording writes. ✅

Note: The RLS policy on `session_recordings` references `session_participants`:
```sql
CREATE POLICY "session_recordings_participant_select" ON session_recordings FOR SELECT USING (
  EXISTS (SELECT 1 FROM session_participants sp WHERE ...)
);
```
The active session membership table used in the app is `session_players`, not `session_participants`. This RLS mismatch means direct Supabase client queries by non-GM participants would be blocked. Since the frontend uses `supabaseAdmin()` via API routes, this does not currently break anything — but it is inconsistent.

### E18. Realtime subscription for recording status

**`session_recordings` IS in the realtime publication** (`ALTER PUBLICATION supabase_realtime ADD TABLE session_recordings`). However, **no frontend component currently subscribes to it.** Neither `TableClient.tsx`, `RecordingButton.tsx`, nor the recording editor page sets up a `supabase.channel(...).on('postgres_changes', { table: 'session_recordings' }, ...)` subscription.

The result: when a recording's status changes from 'recording' → 'stopped' → 'completed', the DM's UI only updates if they click "Stop" themselves (local state update) or manually refresh. The recording editor page has no live update mechanism at all.

**`recording_tracks` and `recording_markers` are NOT in the realtime publication** — even if someone added a subscription, no events would fire.

---

## Environment variable summary

| Var | Used in | Validated? |
|-----|---------|-----------|
| `NEXT_PUBLIC_LIVEKIT_URL` | `VoiceChat.tsx` (client) | Guard: `if (!url) return setError(...)` ✅ |
| `NEXT_PUBLIC_LIVEKIT_WS_URL` | `recording/route.ts` (server) | **No guard** — `undefined.replace(...)` crashes ⚠ |
| `LIVEKIT_API_KEY` | `livekit-token/route.ts`, `webhook`, `recording` | `livekit-token` checks; others use `!` assertion |
| `LIVEKIT_API_SECRET` | same as above | Same |
| `RECORDING_S3_BUCKET` | `recording/route.ts` | Checked, returns 503 ✅ |
| `RECORDING_S3_REGION` | same | Checked ✅ |
| `RECORDING_S3_ACCESS_KEY` | same | Checked ✅ |
| `RECORDING_S3_SECRET` | same | Checked ✅ |
| `RECORDING_S3_ENDPOINT` | same | Falls back to `''` — OK |
| `RECORDING_S3_PUBLIC_BASE_URL` | `recording/route.ts`, `webhook` | Falls back to `''` — file_url becomes null |
| `OPENAI_API_KEY` | `transcribeRecording.ts`, transcribe routes | Checked in routes; throws in lib if missing |
