// DND721 recorder worker — self-hosted replacement for LiveKit Cloud egress.
//
// Watches the session_recordings table for job rows created by the app:
//   status='requested' → join the LiveKit room as a hidden bot, record every
//                        participant's audio to disk (raw PCM segments)
//   status='stopping'  → leave the room, mix segments with ffmpeg into a
//                        composite .ogg + one .ogg per participant, upload to
//                        Supabase Storage, and mark the rows completed.
//
// Uses ZERO LiveKit egress minutes — the bot is just another (hidden)
// participant subscribing to audio. Requires ffmpeg on PATH.
//
// Env (see .env.example): LIVEKIT_WS_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RECORDING_BUCKET, APP_BASE_URL?

import { createClient } from '@supabase/supabase-js'
import { AccessToken } from 'livekit-server-sdk'
import { Room, RoomEvent, TrackKind, AudioStream } from '@livekit/rtc-node'
import { spawn } from 'node:child_process'
import { mkdir, rm, readFile, stat } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// ── Config ────────────────────────────────────────────────────────────────────

const {
  LIVEKIT_WS_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  RECORDING_BUCKET = 'recordings',
  APP_BASE_URL,
  POLL_INTERVAL_MS = '3000',
} = process.env

for (const [k, v] of Object.entries({ LIVEKIT_WS_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!v) { console.error(`Missing required env var: ${k}`); process.exit(1) }
}

const SAMPLE_RATE = 48000
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const log = (...a) => console.log(new Date().toISOString(), ...a)

// ── Active jobs ───────────────────────────────────────────────────────────────
// recordingId → {
//   room, dir, startedAt,
//   segments: [{ identity, path, offsetMs, done }],
//   trackRows: Map<identity, rowId>,
// }
const jobs = new Map()

// ── Job start: join room and record ───────────────────────────────────────────

async function startJob(rec) {
  if (jobs.has(rec.id)) return
  log(`[${rec.id}] starting — room=${rec.room_name}`)

  const dir = join(tmpdir(), `dnd721-rec-${rec.id}`)
  await mkdir(dir, { recursive: true })

  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `dnd721-recorder-${rec.id.slice(0, 8)}`,
    name: 'Session Recorder',
  })
  token.addGrant({
    room: rec.room_name,
    roomJoin: true,
    canSubscribe: true,
    canPublish: false,
    canPublishData: false,
    hidden: true, // players never see the bot in the participant list
  })
  const jwt = await token.toJwt()

  const room = new Room()
  const job = {
    room,
    dir,
    startedAt: Date.now(),
    segments: [],
    trackRows: new Map(),
    rec,
  }
  jobs.set(rec.id, job)

  let segCounter = 0

  room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
    if (track.kind !== TrackKind.KIND_AUDIO) return
    const identity = participant.identity
    // Don't record other recorder bots (multiple sessions on one worker)
    if (identity.startsWith('dnd721-recorder-')) return
    const segPath = join(dir, `${sanitize(identity)}-${segCounter++}.pcm`)
    const seg = { identity, path: segPath, offsetMs: Date.now() - job.startedAt, done: false }
    job.segments.push(seg)
    log(`[${rec.id}] recording ${identity} → ${segPath} (offset ${seg.offsetMs}ms)`)
    void ensureTrackRow(job, identity)
    void pumpAudio(track, segPath, seg)
  })

  room.on(RoomEvent.Disconnected, () => {
    log(`[${rec.id}] room disconnected`)
  })

  try {
    await room.connect(LIVEKIT_WS_URL, jwt, { autoSubscribe: true, dynacast: false })
  } catch (err) {
    log(`[${rec.id}] CONNECT FAILED:`, err?.message)
    jobs.delete(rec.id)
    await db.from('session_recordings')
      .update({ status: 'failed', error: `recorder connect failed: ${String(err?.message).slice(0, 480)}` })
      .eq('id', rec.id)
    return
  }

  // Mark the row live so the app UI shows "recording"
  await db.from('session_recordings')
    .update({ status: 'recording', started_at: new Date().toISOString(), error: null })
    .eq('id', rec.id)
  log(`[${rec.id}] connected & recording`)
}

function sanitize(s) {
  return String(s).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64)
}

async function ensureTrackRow(job, identity) {
  if (job.trackRows.has(identity)) return
  job.trackRows.set(identity, null) // reserve to avoid double insert
  const { data } = await db
    .from('recording_tracks')
    .insert({
      recording_id: job.rec.id,
      session_id: job.rec.session_id,
      participant_identity: identity,
      file_status: 'recording',
    })
    .select('id')
    .maybeSingle()
  if (data?.id) job.trackRows.set(identity, data.id)
}

/** Stream decoded audio frames from a track into a raw s16le PCM file. */
async function pumpAudio(track, segPath, seg) {
  const out = createWriteStream(segPath)
  try {
    const stream = new AudioStream(track, { sampleRate: SAMPLE_RATE, numChannels: 1 })
    for await (const frame of stream) {
      // frame.data is an Int16Array of mono samples
      out.write(Buffer.from(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength))
    }
  } catch (err) {
    log(`pump error for ${segPath}:`, err?.message)
  } finally {
    seg.done = true
    out.end()
  }
}

// ── Job stop: mix, upload, finalize ──────────────────────────────────────────

async function stopJob(rec) {
  const job = jobs.get(rec.id)
  if (!job) {
    // Worker restarted mid-recording and lost the buffers — mark failed
    // honestly instead of leaving the row stuck at 'stopping'.
    await db.from('session_recordings')
      .update({ status: 'failed', error: 'recorder worker restarted mid-recording; audio lost' })
      .eq('id', rec.id)
    return
  }
  jobs.delete(rec.id)
  log(`[${rec.id}] stopping…`)

  try { await job.room.disconnect() } catch { /* already gone */ }
  // Give pumps a moment to flush final frames
  await sleep(750)

  const durationSec = Math.max(1, Math.round((Date.now() - job.startedAt) / 1000))
  const segments = []
  for (const s of job.segments) {
    try {
      const st = await stat(s.path)
      if (st.size > 4800) segments.push(s) // ignore <50ms fragments
    } catch { /* file never materialized */ }
  }

  const publicBase = `${SUPABASE_URL}/storage/v1/object/public/${RECORDING_BUCKET}`

  if (segments.length === 0) {
    log(`[${rec.id}] no audio captured`)
    await db.from('session_recordings')
      .update({ status: 'failed', stopped_at: new Date().toISOString(), duration_sec: durationSec, error: 'no audio captured (nobody spoke or nobody was in voice)' })
      .eq('id', rec.id)
    await rm(job.dir, { recursive: true, force: true })
    return
  }

  try {
    // ── Composite: all segments delayed to their offsets, mixed ─────────────
    const compositePath = join(job.dir, 'composite.ogg')
    await ffmpegMix(segments, compositePath)
    const compositeKey = rec.file_key || `recordings/${rec.session_id}/${rec.id}.ogg`
    await upload(compositeKey, compositePath)

    // ── Per-participant tracks ───────────────────────────────────────────────
    const byIdentity = new Map()
    for (const s of segments) {
      if (!byIdentity.has(s.identity)) byIdentity.set(s.identity, [])
      byIdentity.get(s.identity).push(s)
    }
    for (const [identity, segs] of byIdentity) {
      const trackPath = join(job.dir, `track-${sanitize(identity)}.ogg`)
      const trackKey = `recordings/${rec.session_id}/${rec.id}/tracks/${sanitize(identity)}.ogg`
      try {
        await ffmpegMix(segs, trackPath)
        await upload(trackKey, trackPath)
        const rowId = job.trackRows.get(identity)
        if (rowId) {
          await db.from('recording_tracks')
            .update({ file_key: trackKey, file_url: `${publicBase}/${trackKey}`, file_status: 'ready' })
            .eq('id', rowId)
        }
      } catch (err) {
        log(`[${rec.id}] track mix/upload failed for ${identity}:`, err?.message)
        const rowId = job.trackRows.get(identity)
        if (rowId) {
          await db.from('recording_tracks')
            .update({ file_status: 'failed', error: String(err?.message).slice(0, 480) })
            .eq('id', rowId)
        }
      }
    }

    await db.from('session_recordings')
      .update({
        status: 'completed',
        stopped_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_sec: durationSec,
        file_key: compositeKey,
        file_url: `${publicBase}/${compositeKey}`,
        error: null,
      })
      .eq('id', rec.id)
    log(`[${rec.id}] completed — ${durationSec}s, ${segments.length} segments`)

    // Best-effort: kick the app's transcription pipeline
    if (APP_BASE_URL) {
      fetch(`${APP_BASE_URL.replace(/\/$/, '')}/api/recording/${rec.session_id}/transcribe`, { method: 'POST' })
        .catch((e) => log(`[${rec.id}] transcribe kick failed:`, e?.message))
    }
  } catch (err) {
    log(`[${rec.id}] finalize FAILED:`, err?.message)
    await db.from('session_recordings')
      .update({ status: 'failed', stopped_at: new Date().toISOString(), duration_sec: durationSec, error: `finalize failed: ${String(err?.message).slice(0, 480)}` })
      .eq('id', rec.id)
  } finally {
    await rm(job.dir, { recursive: true, force: true }).catch(() => {})
  }
}

/** Mix raw PCM segments (with their start offsets) into one Opus .ogg. */
function ffmpegMix(segments, outPath) {
  const args = ['-y', '-hide_banner', '-loglevel', 'error']
  for (const s of segments) {
    args.push('-f', 's16le', '-ar', String(SAMPLE_RATE), '-ac', '1', '-i', s.path)
  }
  let filter = ''
  const labels = []
  segments.forEach((s, i) => {
    const d = Math.max(0, Math.round(s.offsetMs))
    filter += `[${i}]adelay=${d}|${d}[a${i}];`
    labels.push(`[a${i}]`)
  })
  if (segments.length === 1) {
    filter += `${labels[0]}anull[out]`
  } else {
    filter += `${labels.join('')}amix=inputs=${segments.length}:normalize=0:dropout_transition=0[out]`
  }
  args.push('-filter_complex', filter, '-map', '[out]', '-c:a', 'libopus', '-b:a', '48k', outPath)

  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => { err += d })
    p.on('error', (e) => reject(new Error(`ffmpeg spawn failed (is ffmpeg installed?): ${e.message}`)))
    p.on('close', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${err.slice(-400)}`)))
  })
}

async function upload(key, path) {
  const body = await readFile(path)
  const { error } = await db.storage.from(RECORDING_BUCKET).upload(key, body, {
    contentType: 'audio/ogg',
    upsert: true,
  })
  if (error) throw new Error(`storage upload ${key}: ${error.message}`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── Main poll loop ────────────────────────────────────────────────────────────

async function tick() {
  const { data, error } = await db
    .from('session_recordings')
    .select('id, session_id, room_name, status, file_key')
    .in('status', ['requested', 'stopping'])
    .order('created_at', { ascending: true })
    .limit(20)
  if (error) { log('poll error:', error.message); return }

  for (const rec of data ?? []) {
    if (rec.status === 'requested') await startJob(rec).catch((e) => log('startJob threw:', e?.message))
    else if (rec.status === 'stopping') await stopJob(rec).catch((e) => log('stopJob threw:', e?.message))
  }
}

log(`DND721 recorder worker up — polling every ${POLL_INTERVAL_MS}ms, bucket=${RECORDING_BUCKET}`)
setInterval(() => void tick(), Number(POLL_INTERVAL_MS))
void tick()

// Graceful shutdown: finalize any live jobs so audio isn't lost.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    log(`${sig} — finalizing ${jobs.size} active job(s)…`)
    const active = [...jobs.entries()]
    for (const [id, job] of active) {
      await stopJob({ ...job.rec, id }).catch(() => {})
    }
    process.exit(0)
  })
}
