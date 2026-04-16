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

function makeEgressClient() {
  const host = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!.replace('wss://', 'https://')
  return new EgressClient(host, process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!)
}

function makeRoomClient() {
  const host = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL!.replace('wss://', 'https://')
  return new RoomServiceClient(host, process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!)
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
  const fileKey    = `recordings/${sessionId}/${timestamp}.${ext}`
  const publicBase = (process.env.RECORDING_S3_PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
  const s3Upload   = makeS3Upload(bucket, region, accessKey, secret)

  // ── 1. Start composite (room-wide) egress ────────────────────────────────
  let compositeEgress: any
  try {
    const client = makeEgressClient()
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

  const fileUrl = publicBase ? `${publicBase}/${fileKey}` : null

  const db = supabaseAdmin()
  const { data: recording, error: insertError } = await db
    .from('session_recordings')
    .insert({
      session_id: sessionId,
      room_name:  roomName,
      egress_id:  compositeEgress?.egressId ?? compositeEgress?.egress_id ?? null,
      status:     'recording',
      file_key:   fileKey,
      file_url:   fileUrl,
    })
    .select()
    .maybeSingle()

  if (insertError) {
    console.error('recording insert error', insertError)
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

        const trackUrl = publicBase ? `${publicBase}/${trackKey}` : null
        const { data: trackRow } = await db
          .from('recording_tracks')
          .insert({
            recording_id:         recording!.id,
            session_id:           sessionId,
            participant_identity: participant.identity,
            egress_id:            trackEgress?.egressId ?? trackEgress?.egress_id ?? null,
            file_key:             trackKey,
            file_url:             trackUrl,
          })
          .select()
          .maybeSingle()

        if (trackRow) trackRows.push(trackRow)
      } catch (trackErr: any) {
        console.warn(`Track egress failed for ${participant.identity}:`, trackErr?.message)
        // Store a placeholder row so the editor knows who was in the session
        const { data: trackRow } = await db
          .from('recording_tracks')
          .insert({
            recording_id:         recording!.id,
            session_id:           sessionId,
            participant_identity: participant.identity,
            transcript_status:    'failed',
          })
          .select()
          .maybeSingle()
        if (trackRow) trackRows.push(trackRow)
      }
    }
  } catch (err: any) {
    // Per-track egress is best-effort; composite is already running
    console.warn('Per-track egress setup failed (composite still running):', err?.message)
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

  const stoppedAt   = new Date().toISOString()
  const durationSec = Math.round((Date.now() - new Date(row.started_at).getTime()) / 1000)

  const { data: updated, error: updateError } = await db
    .from('session_recordings')
    .update({ status: 'stopped', stopped_at: stoppedAt, duration_sec: durationSec })
    .eq('id', recordingId ?? row.id)
    .select()
    .maybeSingle()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  return NextResponse.json({ recording: updated })
}
