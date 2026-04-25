import { NextRequest, NextResponse } from 'next/server'
import { WebhookReceiver } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { transcribeTrack, transcribeComposite } from '@/lib/transcribeRecording'

function makeReceiver() {
  const apiKey    = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  // Bug 13 fix: validate env vars before creating receiver
  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY / LIVEKIT_API_SECRET not configured')
  }
  return new WebhookReceiver(apiKey, apiSecret)
}

/** POST /api/livekit-webhook  — receives LiveKit room/egress events */
export async function POST(req: NextRequest) {
  const body          = await req.text()
  const authorization = req.headers.get('Authorization') ?? ''

  let event: any
  try {
    const receiver = makeReceiver()
    event = await receiver.receive(body, authorization)
  } catch (err: any) {
    console.error('LiveKit webhook verification failed', err?.message)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  const db        = supabaseAdmin()
  const eventType = event.event as string | undefined  // e.g. "room_finished", "egress_ended"

  // ── Bug 4 fix: handle room_finished ──────────────────────────────────────────
  // When a LiveKit room closes (session ends, timeout, crash), mark any active
  // recordings as stopped so they don't stay stuck at status='recording' forever.
  if (eventType === 'room_finished') {
    const roomName: string | undefined = event.room?.name ?? event.roomName
    if (roomName) {
      await db
        .from('session_recordings')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .eq('room_name', roomName)
        .eq('status', 'recording')
    }
    return NextResponse.json({ ok: true, type: 'room_finished' })
  }

  // ── Egress events ─────────────────────────────────────────────────────────────
  const egressId: string | undefined =
    event.egressInfo?.egressId ?? event.egress_info?.egress_id

  if (!egressId) {
    // Not an egress event we handle — ignore
    return NextResponse.json({ ok: true, type: 'ignored', event: eventType })
  }

  const publicBase = (process.env.RECORDING_S3_PUBLIC_BASE_URL ?? '').replace(/\/$/, '')

  // ── Handle composite egress ending ───────────────────────────────────────────
  const { data: compositeRow } = await db
    .from('session_recordings')
    .select('id, file_key')
    .eq('egress_id', egressId)
    .maybeSingle()

  if (compositeRow) {
    // Bug 7 fix: compute and save file_url NOW (when the file is confirmed on S3),
    // not at recording-start time when the file doesn't exist yet.
    const fileUrl = publicBase && compositeRow.file_key
      ? `${publicBase}/${compositeRow.file_key}`
      : null

    await db
      .from('session_recordings')
      .update({ status: 'completed', file_url: fileUrl })
      .eq('id', compositeRow.id)

    // Fire-and-forget transcription (runs after response returns)
    if (process.env.OPENAI_API_KEY) {
      transcribeComposite(compositeRow.id).catch((err) =>
        console.error('transcribeComposite error after webhook', err)
      )
    }

    return NextResponse.json({ ok: true, type: 'composite_ended', id: compositeRow.id })
  }

  // ── Handle per-track egress ending ───────────────────────────────────────────
  const { data: trackRow } = await db
    .from('recording_tracks')
    .select('id, recording_id, file_key')
    .eq('egress_id', egressId)
    .maybeSingle()

  if (trackRow) {
    const fileUrl = publicBase && trackRow.file_key
      ? `${publicBase}/${trackRow.file_key}`
      : null

    // Bug 10 + 11 fix: set file_url AND file_status='ready' so the UI knows
    // the audio is available for download, independently of transcript status.
    await db
      .from('recording_tracks')
      .update({ file_url: fileUrl, file_status: 'ready' })
      .eq('id', trackRow.id)

    // Bug 10 fix: check if all sibling tracks are now ready; if the composite
    // is also completed, mark the overall recording as completed.
    const { data: siblings } = await db
      .from('recording_tracks')
      .select('file_status')
      .eq('recording_id', trackRow.recording_id)

    const allTracksReady = siblings?.every((t) => t.file_status === 'ready') ?? false
    if (allTracksReady) {
      // Only upgrade to 'completed' if composite is already done
      await db
        .from('session_recordings')
        .update({ status: 'completed' })
        .eq('id', trackRow.recording_id)
        .eq('status', 'stopped')  // only promote from stopped, not re-set if already completed
    }

    // Fire-and-forget transcription
    if (process.env.OPENAI_API_KEY) {
      transcribeTrack(trackRow.id).catch((err) =>
        console.error('transcribeTrack error after webhook', err)
      )
    }

    return NextResponse.json({ ok: true, type: 'track_ended', id: trackRow.id })
  }

  return NextResponse.json({ ok: true, type: 'unknown_egress' })
}
