import { NextRequest, NextResponse } from 'next/server'
import { EgressClient, RoomServiceClient } from 'livekit-server-sdk'
import { EncodedFileOutput, DirectFileOutput, S3Upload, TrackType } from '@livekit/protocol'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const StartRecordingSchema = z.object({
  roomName: z.string().min(1, 'roomName is required').max(200),
  audioOnly: z.boolean().optional().default(false),
})

const StopRecordingSchema = z.object({
  recordingId: z.string().uuid('recordingId must be a valid UUID').optional(),
})

type Params = { params: Promise<{ sessionId: string }> }

// Bug 5 fix: validate env var before calling .replace() — undefined.replace() throws TypeError
function livekitHost(): string {
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL
  if (!wsUrl) throw new Error('NEXT_PUBLIC_LIVEKIT_WS_URL is not configured')
  return wsUrl.replace('wss://', 'https://')
}

function makeEgressClient() {
  const apiKey    = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) throw new Error('LIVEKIT_API_KEY / LIVEKIT_API_SECRET not configured')
  return new EgressClient(livekitHost(), apiKey, apiSecret)
}

function makeRoomClient() {
  const apiKey    = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) throw new Error('LIVEKIT_API_KEY / LIVEKIT_API_SECRET not configured')
  return new RoomServiceClient(livekitHost(), apiKey, apiSecret)
}

function makeS3Upload(
  bucket: string, region: string, accessKey: string, secret: string
): S3Upload {
  return new S3Upload({
    accessKey,
    secret,
    region,
    bucket,
    endpoint: process.env.RECORDING_S3_ENDPOINT ?? '',
    forcePathStyle: true,
  })
}

/** GET /api/recording/[sessionId]  — latest recordings with their tracks */
export async function GET(_req: NextRequest, { params }: Params) {
  const { sessionId } = await params
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('session_recordings')
    .select('*, recording_tracks(*)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recordings: data ?? [] })
}

/** POST /api/recording/[sessionId]  — start composite + per-track recording */
export async function POST(req: NextRequest, { params }: Params) {
  const { sessionId } = await params

  // 5 recording starts per session per 10 minutes
  const rl = checkRateLimit(rateLimitKey(req, `recording:${sessionId}`), { limit: 5, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter) },
    })
  }

  const parsed = StartRecordingSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { roomName, audioOnly } = parsed.data

  const bucket    = process.env.RECORDING_S3_BUCKET
  const region    = process.env.RECORDING_S3_REGION
  const accessKey = process.env.RECORDING_S3_ACCESS_KEY
  const secret    = process.env.RECORDING_S3_SECRET
  if (!bucket || !region || !accessKey || !secret) {
    return NextResponse.json({ error: 'Recording storage not configured. Add RECORDING_S3_* env vars.' }, { status: 503 })
  }

  const timestamp  = new Date().toISOString().replace(/[:.]/g, '-')
  const ext        = audioOnly ? 'ogg' : 'mp4'
  const fileKey  = `recordings/${sessionId}/${timestamp}.${ext}`
  const s3Upload = makeS3Upload(bucket, region, accessKey, secret)

  // ── 0. Storage preflight (Recovery Wave 4) ──────────────────────────────
  // Before asking LiveKit to start an 18-second egress that may silently die
  // because Supabase Storage rejected the write, do a tiny test upload via
  // the Supabase service-role client. If this fails, the LiveKit job WILL
  // fail too — so abort early with a clear error instead of leaving a zombie
  // egress + a row stuck at status='recording'.
  //
  // This catches the most common configuration mistakes:
  //   - bucket doesn't exist
  //   - bucket exists but service role can't write (storage RLS)
  //   - RECORDING_S3_* keys are stale / rotated
  //
  // It does NOT validate the LiveKit-side S3 credentials specifically, but
  // those nearly always fail when the service-role client can't write either.
  try {
    const probeDb = supabaseAdmin()
    const probeKey = `preflight/${sessionId}-${Date.now()}.txt`
    const { error: probeErr } = await probeDb.storage
      .from(bucket)
      .upload(probeKey, new Blob([new Uint8Array([0x70, 0x6f, 0x6b, 0x65])]), {
        contentType: 'text/plain',
        upsert: true,
      })
    if (probeErr) {
      return NextResponse.json(
        {
          error:
            `Recording storage preflight failed: ${probeErr.message}. ` +
            `Verify the '${bucket}' bucket exists, is writable by the service role, ` +
            `and that RECORDING_S3_ACCESS_KEY/SECRET point at the same Supabase project.`,
        },
        { status: 503 },
      )
    }
    // Best-effort cleanup; failure here is not fatal.
    void probeDb.storage.from(bucket).remove([probeKey]).catch(() => undefined)
  } catch (probeThrow: any) {
    return NextResponse.json(
      { error: `Recording storage preflight threw: ${probeThrow?.message ?? 'unknown error'}` },
      { status: 503 },
    )
  }

  // ── 1. Start composite (room-wide) egress ────────────────────────────────
  let compositeEgress: any
  try {
    const client = makeEgressClient()   // throws if env vars missing → caught below
    compositeEgress = await client.startRoomCompositeEgress(
      roomName,
      {
        file: new EncodedFileOutput({
          filepath: fileKey,
          disableManifest: true,
          output: { case: 's3', value: s3Upload },
        }),
      },
      { audioOnly },
    )
  } catch (err: any) {
    console.error('LiveKit composite egress start error', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to start recording' }, { status: 500 })
  }

  // Bug 7 fix: do NOT store file_url at recording start — the file doesn't
  // exist on S3 yet.  The webhook sets file_url when the egress_ended event
  // fires and the file is confirmed uploaded.
  const db = supabaseAdmin()
  const compositeEgressId = compositeEgress?.egressId ?? compositeEgress?.egress_id ?? null
  const { data: recording, error: insertError } = await db
    .from('session_recordings')
    .insert({
      session_id: sessionId,
      room_name:  roomName,
      egress_id:  compositeEgressId,
      status:     'recording',
      file_key:   fileKey,
      file_url:   null,  // set by webhook when egress_ended fires
    })
    .select()
    .maybeSingle()

  if (insertError) {
    console.error('recording insert error', insertError)
    // Recording Wave 2: the LiveKit egress is ALREADY running. If we just
    // return 500, the egress runs to completion, files land on S3, the
    // webhook fires egress_ended but has no row to update → silent zombie.
    // Tear down the egress now so state stays consistent.
    if (compositeEgressId) {
      try {
        const client = makeEgressClient()
        await (client as any).stopEgress(compositeEgressId)
      } catch (stopErr: any) {
        console.error('failed to stop zombie composite egress', compositeEgressId, stopErr?.message)
      }
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // ── 2. Start per-participant track egress (best-effort) ───────────────────
  const trackRows: unknown[] = []
  try {
    const roomClient    = makeRoomClient()
    const egressClient  = makeEgressClient()
    const participants  = await roomClient.listParticipants(roomName)

    for (const participant of participants) {
      // Find the participant's audio track SID
      const audioTrack = participant.tracks?.find(
        (t: any) => t.type === TrackType.AUDIO && !t.muted
      )
      if (!audioTrack?.sid) continue

      const trackKey = `recordings/${sessionId}/${timestamp}/tracks/${participant.identity}.ogg`
      try {
        const trackEgress = await (egressClient as any).startTrackEgress(
          roomName,
          new DirectFileOutput({
            filepath: trackKey,
            disableManifest: true,
            output: { case: 's3', value: s3Upload },
          }),
          audioTrack.sid,
        )

        const trackEgressId = trackEgress?.egressId ?? trackEgress?.egress_id ?? null
        const { data: trackRow, error: trackInsertErr } = await db
          .from('recording_tracks')
          .insert({
            recording_id:         recording!.id,
            session_id:           sessionId,
            participant_identity: participant.identity,
            egress_id:            trackEgressId,
            file_key:             trackKey,
            file_url:             null,       // set by webhook when egress_ended fires
            file_status:          'recording',
          })
          .select()
          .maybeSingle()

        if (trackInsertErr) {
          console.error('track row insert FAILED for', participant.identity, trackInsertErr)
          // Recording Wave 2: don't leave a zombie track egress running. The
          // file would land on S3 but no row exists to match by egress_id.
          if (trackEgressId) {
            try { await (egressClient as any).stopEgress(trackEgressId) } catch (e: any) {
              console.error('failed to stop zombie track egress', trackEgressId, e?.message)
            }
          }
        } else if (trackRow) {
          trackRows.push(trackRow)
        }
      } catch (trackErr: any) {
        console.warn(`Track egress failed for ${participant.identity}:`, trackErr?.message)
        // Store a placeholder row so the editor knows who was in the session.
        // Bug C fix: set file_status='failed' — without an egress_id the webhook
        // can never update this row, so it must NOT default to 'recording'.
        //
        // Recording Wave 1: check the error explicitly so a column-doesn't-
        // exist failure (e.g. migration 018 not applied → no `error` column)
        // doesn't get swallowed.
        const { data: trackRow, error: placeholderErr } = await db
          .from('recording_tracks')
          .insert({
            recording_id:         recording!.id,
            session_id:           sessionId,
            participant_identity: participant.identity,
            transcript_status:    'failed',
            file_status:          'failed',
            error:                String(trackErr?.message ?? 'track egress failed').slice(0, 500),
          })
          .select()
          .maybeSingle()
        if (placeholderErr) {
          console.error('placeholder track insert FAILED for', participant.identity, placeholderErr)
        }
        if (trackRow) trackRows.push(trackRow)
      }
    }
  } catch (err: any) {
    // Per-track egress is best-effort; composite is already running.
    // Recording Wave 4B: log with full context AND persist into the
    // session_recordings.error column so the DM dashboard surfaces it.
    // Without this, a listParticipants failure silently drops every track.
    console.warn('Per-track egress setup failed sessionId=', sessionId, 'roomName=', roomName, 'err=', err?.message)
    if (recording?.id) {
      try {
        await db
          .from('session_recordings')
          .update({ error: `per-track setup failed: ${String(err?.message ?? '').slice(0, 480)}` })
          .eq('id', recording.id)
      } catch (e: any) {
        console.error('could not persist per-track setup failure', e?.message)
      }
    }
  }

  return NextResponse.json({ recording, tracks: trackRows }, { status: 201 })
}

/** DELETE /api/recording/[sessionId]  — stop composite + all track egress */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { sessionId } = await params

  const parsed = StopRecordingSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { recordingId } = parsed.data

  const db = supabaseAdmin()

  // Get the active recording row
  const { data: row, error: fetchError } = await db
    .from('session_recordings')
    .select('*')
    .eq('session_id', sessionId)
    .eq('status', 'recording')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'No active recording' }, { status: 404 })

  const client = makeEgressClient()

  // Stop composite egress
  if (row.egress_id) {
    try {
      await (client as any).stopEgress(row.egress_id)
    } catch (err: any) {
      console.error('LiveKit composite egress stop error', err)
    }
  }

  // Stop all track egress jobs for this recording
  const { data: tracks } = await db
    .from('recording_tracks')
    .select('id, egress_id')
    .eq('recording_id', recordingId ?? row.id)
    .not('egress_id', 'is', null)

  for (const track of tracks ?? []) {
    try {
      await (client as any).stopEgress(track.egress_id)
    } catch (err: any) {
      console.warn(`Track egress stop failed for ${track.id}:`, err?.message)
    }
  }

  const stoppedAt = new Date().toISOString()
  // Recording Wave 4A: started_at is NOT NULL DEFAULT now() so this is
  // usually fine, but if a row somehow has a malformed timestamp, the
  // subtraction goes NaN. Coerce defensively rather than writing NaN to
  // duration_sec (Postgres rejects NaN on INT columns → silent failure).
  const startedMs = new Date(row.started_at).getTime()
  const durationSec = Number.isFinite(startedMs)
    ? Math.max(0, Math.round((Date.now() - startedMs) / 1000))
    : 0

  const { data: updated, error: updateError } = await db
    .from('session_recordings')
    .update({ status: 'stopped', stopped_at: stoppedAt, duration_sec: durationSec })
    .eq('id', recordingId ?? row.id)
    .select()
    .maybeSingle()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ recording: updated })
}
