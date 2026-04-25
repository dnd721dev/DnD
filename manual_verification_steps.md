# Manual Verification Steps — Voice & Recording System

Run these checks after deploying the latest code and applying migration 016.

---

## Pre-flight

- [ ] Migration `016_recording_tracks_realtime_file_status.sql` applied in Supabase
- [ ] LiveKit webhook URL configured in LiveKit Cloud dashboard:
      `https://your-app.vercel.app/api/livekit-webhook`
- [ ] All required env vars set (see `.env.example`):
      `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_LIVEKIT_WS_URL`,
      `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`,
      `RECORDING_S3_BUCKET`, `RECORDING_S3_REGION`,
      `RECORDING_S3_ACCESS_KEY`, `RECORDING_S3_SECRET`,
      `RECORDING_S3_PUBLIC_BASE_URL`

---

## SECTION 1 — Voice chat

### Setup
Open **Browser A** as the session DM (GM wallet).
Open **Browser B** as a player (different wallet).
Both navigate to the same session table page.

### Step 1 — Both connect to voice

1. DM clicks **🎙 Voice** in Browser A.
2. Browser should request microphone permission — grant it.
3. **Expected:** Button changes to "Voice (1)" with green pulse.
4. Player clicks **🎙 Voice** in Browser B.
5. **Expected:** Both browsers now show "Voice (2)".
6. **Verify (Bug 1 fix):** Speak in Browser A — you should hear yourself in Browser B.
   If voice is silent, the `setMicrophoneEnabled(true)` call failed.

### Step 2 — Participant list

1. Click the **"Voice (2)"** button to open the panel.
2. **Expected (Bug 2 fix):**
   - "You" row with local mute toggle.
   - Other participant's display name (from profiles table) — not raw wallet address.
3. Speak in Browser B — the other participant's dot should animate (speaking indicator).

### Step 3 — Local mute/unmute

1. In Browser A, click the **🎙** button (mute toggle) next to the Voice button.
2. **Expected:** Button turns red 🔇, "muted" shown in participant panel.
3. Speak — Browser B should hear nothing.
4. Click again to unmute — voice resumes.

### Step 4 — DM mute

1. In Browser A (DM), open the participant panel.
2. Find the player row — click **Mute**.
3. **Expected (Bug 3 fix):** Player's mic icon in both browsers updates to 🔇.
4. Player cannot unmute via the panel (only the DM can restore — or the player refreshes).

### Step 5 — Tab close / beforeunload (Bug 6 fix)

1. With Browser B connected, hard-close Browser B (⌘W / Ctrl+W).
2. Within ~5 seconds, Browser A should update to "Voice (1)".
3. **Expected:** No ghost participant persists.

---

## SECTION 2 — Recording

### Step 6 — Start recording (DM only)

1. In Browser A (DM), click **⏺ Record**.
2. **Expected:** Button changes to **● REC 00:00** with red pulse and Stop button.
3. Confirm no alert dialog (a 503 means S3 env vars are missing).

### Step 7 — Add a chapter marker

1. Click **🔖** to open the marker panel.
2. Type "Combat starts" and press Enter (or click **+ Mark**).
3. **Expected:** Marker appears in the list with timestamp (e.g., "00:34").

### Step 8 — Stop recording

1. Click **Stop**.
2. **Expected:** Button reverts to the "⏺ Record" / "🎙" start buttons.
3. Recording row should appear in the history panel (🗂) with status **◼ Stopped**.
4. Within ~30 seconds (after LiveKit flushes the file), status should update to **✓ Done** automatically (Bug 9 realtime fix).
   - If it doesn't auto-update, check the webhook is configured in the LiveKit dashboard.

---

## SECTION 3 — Recording page

### Step 9 — Open the recording

1. Click **Open Editor** on the recording in the history panel.
2. URL: `/sessions/[id]/recording/[recordingId]`

### Step 10 — Processing state

1. If opened while status = 'stopped', page should show:
   **⏳ Recording is being processed… This page updates automatically when it's ready.**
2. Once the webhook fires (status = 'completed'), the processing banner disappears **without refresh** (Bug 9 realtime fix).

### Step 11 — Audio player (Bug 8 fix)

1. Once status = 'completed', the **▶ Player** tab should show the master recording `<audio>` player.
2. Press Play — confirm the session audio plays.
3. **Expected:** Download button **⬇ Download Master Mix** appears only when `status === 'completed'` (Bug 7 fix — not before).

### Step 12 — Individual tracks

1. Scroll to **Individual Tracks** on the Player tab.
2. Each participant has their display name (Bug 14 fix — not raw wallet address).
3. If track egresses completed, each track has its own `<audio>` player and download button.
4. Download a track — confirm it is a valid OGG audio file.

### Step 13 — Chapter marker seeking (Bug 8 fix)

1. On the Player tab, under **Chapter Markers**, click the timestamp (e.g., "00:34").
2. **Expected:** Master audio player seeks to that position and begins playing.

### Step 14 — Realtime update on recording page (Bug 9 fix)

1. On a second tab, have the DM start a new recording.
2. On the recording page of a previous session, verify it does NOT auto-refresh
   (subscriptions are scoped to that recording's ID).
3. In the same recording page, start transcription while waiting — verify status
   badges update in real time as transcript_status changes.

### Step 15 — Generate transcript

1. Click **↺ Regenerate** on the Script tab.
2. Status shows "⏳ Transcribing…".
3. Once complete (may take 1–5 min for a long session), script text appears.
4. Verify the script contains speaker-labeled sections like:
   ```
   ## [00:00] 0xAbCd…1234
   Hello, welcome to the session…
   ```
   (names will be wallet addresses here; the script uses LiveKit identity as speaker label)

---

## SECTION 4 — Edge cases

### Step 16 — Missing NEXT_PUBLIC_LIVEKIT_WS_URL (Bug 5 fix)

On staging with the var unset:
1. Click Record → **Expected:** Clean error message `NEXT_PUBLIC_LIVEKIT_WS_URL is not configured`, not a 500 server crash.

### Step 17 — Webhook signature (Bug 13 fix)

Send a fake webhook with curl:
```sh
curl -X POST https://your-app.vercel.app/api/livekit-webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"room_finished"}'
```
**Expected:** 401 response `{ "error": "Invalid webhook signature" }`.

### Step 18 — Stuck recording recovery (Bug 4 fix)

1. Start a recording.
2. In LiveKit dashboard, manually close the room (or let it time out).
3. **Expected:** Within seconds, the RecordingButton should update from "● REC" to the start state (status flipped to 'stopped' by the room_finished webhook handler).
4. A new recording can be started immediately.
