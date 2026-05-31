import { NextRequest, NextResponse } from 'next/server'
import { WebhookReceiver } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { transcribeTrack, transcribeComposite } from '@/lib/transcribeRecording'
import { cascadeFailedTracks } from '@/lib/recordingCascade'

function makeReceiver() {
  const apiKey    = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  // Bug 13 fix: validate env vars before creating receiver
  if (!apiKey || !apiSecret) {
    throw new Error('LIVEKIT_API_KEY / LIVEKIT_API_SECRET not configured')
  }
  return new WebhookReceiver(apiKey, apiSecret)
}

/**
 * Recording Wave 1: persist a failure message onto the offending recording row
 * so the DM Dashboard's Recordings panel surfaces it without a code read.
 *
 * Best-effort — if the write itself fails (the same column-doesn't-exist
 * problem that triggered this code path), we just log. Never throws.
 */
async function recordWebhookFailure(
  db: ReturnType<typeof supabaseAdmin>,
  table: 'session_recordings' | 'recording_tracks',
  rowId: string,
  message: string,
) {
  try {
    if (table === 'session_recordings') {
      const { error } = await db.from('session_recordings').update({ error: message.slice(0, 500) }).eq('id', rowId)
      if (error) console.error('[livekit-webhook] could not persist failure on session_recordings:', error)
    } else {
      const { error } = await db.from('recording_tracks').update({ error: message.slice(0, 500) }).eq('id', rowId)
      if (error) console.error('[livekit-webhook] could not persist failure on recording_tracks:', error)
    }
  } catch (e: any) {
    console.error('[livekit-webhook] recordWebhookFailure threw:', e?.message)
  }
}

/** POST /api/livekit-webhook  — receives LiveKit room/egress events */
export async function POST(req: NextRequest) {
  const body = await req.text()

  // LiveKit Cloud sends the signed webhook JWT in the standard Authorization
  // header — that is what WebhookReceiver.receive(body, authHeader) expects.
  // (A prior change read X-Livekit-Signature, a header LiveKit does NOT send,
  // so receive() threw on every call and the DB was never updated.) Accept
  // X-Livekit-Signature only as a defensive fallback for odd proxies.
  const authHeader   = req.headers.get('Authorization')
  const sigHeader    = req.headers.get('X-Livekit-Signature')
  const signature    = authHeader ?? sigHeader ?? ''
  const headerUsed   = authHeader ? 'Authorization' : sigHeader ? 'X-Livekit-Signature' : 'none'

  // Log every incoming webhook so failures are visible in Vercel logs
  console.log('[livekit-webhook] received body=', body.slice(0, 200),
    'headerUsed=', headerUsed, 'sig=', signature.slice(0, 20))

  let event: any
  try {
    const receiver = makeReceiver()
    event = await receiver.receive(body, signature)
  } catch (err: any) {
    console.error('[livekit-webhook] verification failed:', err?.message,
      '| sig header present:', Boolean(signature))
    // Bug B fix: return 200 on signature failure so LiveKit does NOT retry
    // a payload that will never pass verification (retries on non-2xx only).
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 200 })
  }

  const db        = supabaseAdmin()
  const eventType = event.event as string | undefined  // e.g. "room_finished", "egress_ended"

  console.log('[livekit-webhook] event=', eventType)

  // ── Bug 4 fix: handle room_finished ──────────────────────────────────────────
  // When a LiveKit room closes (session ends, timeout, crash), mark any active
  // recordings as stopped so they don't stay stuck at status='recording' forever.
  if (eventType === 'room_finished') {
    const roomName: string | undefined = event.room?.name ?? event.roomName
    // Recording Wave 4C: secondary match by any egressId referenced in the
    // event payload, so a room rename mid-session doesn't leave recordings
    // stuck at status='recording' forever. LiveKit's room_finished payload
    // can include egress_jobs / egressJobs with the egressId we know.
    const eventEgressIds: string[] = Array.isArray(event.room?.egressJobs)
      ? event.room.egressJobs.map((j: any) => j?.egressId).filter(Boolean)
      : Array.isArray(event.egressJobs)
      ? event.egressJobs.map((j: any) => j?.egressId).filter(Boolean)
      : []
    console.log('[livekit-webhook] room_finished roomName=', roomName, 'egressIds=', eventEgressIds)

    // Recovery Wave 3: collect every recording id we touch so we can cascade
    // their still-recording tracks to `failed`. Without this, when LiveKit
    // tears down the room, the composite goes to `stopped` but the editor
    // shows "Track still recording…" forever for tracks whose egress_ended
    // event never arrived.
    const affectedIds = new Set<string>()

    if (roomName) {
      const { data: byRoom, error: roomFinishedErr } = await db
        .from('session_recordings')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .eq('room_name', roomName)
        .eq('status', 'recording')
        .select('id')
      if (roomFinishedErr) {
        console.error('[livekit-webhook] room_finished update FAILED roomName=', roomName, 'err=', roomFinishedErr)
        return NextResponse.json({ error: roomFinishedErr.message }, { status: 500 })
      }
      for (const r of (byRoom as any[] | null) ?? []) {
        if (r?.id) affectedIds.add(r.id)
      }
    }

    // Also stop any recordings matched by egress_id from the payload — covers
    // the rare case where roomName drifted from what we persisted.
    if (eventEgressIds.length > 0) {
      const { data: byEgress, error: egressIdMatchErr } = await db
        .from('session_recordings')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .in('egress_id', eventEgressIds)
        .eq('status', 'recording')
        .select('id')
      if (egressIdMatchErr) {
        console.error('[livekit-webhook] room_finished egress_id fallback update FAILED err=', egressIdMatchErr)
        // Don't return 500 — primary match by roomName already succeeded
        // (or already returned 500 above). Best-effort secondary path.
      }
      for (const r of (byEgress as any[] | null) ?? []) {
        if (r?.id) affectedIds.add(r.id)
      }
    }

    // Recovery Wave 3: cascade still-recording tracks to `failed` for every
    // affected recording. Idempotent — only touches rows still in `recording`.
    for (const id of affectedIds) {
      await cascadeFailedTracks(db, id, `room_finished: parent recording terminated without egress_ended`)
    }

    return NextResponse.json({ ok: true, type: 'room_finished', affected: affectedIds.size })
  }

  // Fix 4: only act on egress_ended — not egress_started or egress_updated.
  // Previously, any egress event with an egressId would trigger a status
  // promotion to 'completed', which would fire on egress_started too.
  if (eventType !== 'egress_ended') {
    console.log('[livekit-webhook] ignoring non-terminal event:', eventType)
    return NextResponse.json({ ok: true, type: 'ignored', event: eventType })
  }

  // ── egress_ended ─────────────────────────────────────────────────────────────
  const egressId: string | undefined =
    event.egressInfo?.egressId ?? event.egress_info?.egress_id

  console.log('[livekit-webhook] egress_ended egressId=', egressId)

  if (!egressId) {
    console.warn('[livekit-webhook] egress_ended with no egressId — ignoring')
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

    console.log('[livekit-webhook] composite ended id=', compositeRow.id, 'fileUrl=', fileUrl)

    // Recording Wave 1: check + log + persist the failure into the row's
    // `error` column so the DM dashboard shows it. Most likely cause of a
    // silent failure here is migration 018 not being applied (no
    // `completed_at` column).
    const { error: compositeUpdateErr } = await db
      .from('session_recordings')
      .update({ status: 'completed', completed_at: new Date().toISOString(), file_url: fileUrl })
      .eq('id', compositeRow.id)

    if (compositeUpdateErr) {
      console.error('[livekit-webhook] composite update FAILED id=', compositeRow.id, 'err=', compositeUpdateErr)
      await recordWebhookFailure(db, 'session_recordings', compositeRow.id, `composite update: ${compositeUpdateErr.message}`)
      return NextResponse.json({ error: compositeUpdateErr.message }, { status: 500 })
    }

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

    console.log('[livekit-webhook] track ended id=', trackRow.id, 'fileUrl=', fileUrl)

    // Bug 10 + 11 fix: set file_url AND file_status='ready' so the UI knows
    // the audio is available for download, independently of transcript status.
    // Recording Wave 1: check + log + persist the failure. Most likely cause
    // of silent failure is migration 016 not being applied (no `file_status`
    // column on recording_tracks).
    const { error: trackUpdateErr } = await db
      .from('recording_tracks')
      .update({ file_url: fileUrl, file_status: 'ready' })
      .eq('id', trackRow.id)

    if (trackUpdateErr) {
      console.error('[livekit-webhook] track update FAILED id=', trackRow.id, 'err=', trackUpdateErr)
      await recordWebhookFailure(db, 'recording_tracks', trackRow.id, `track update: ${trackUpdateErr.message}`)
      return NextResponse.json({ error: trackUpdateErr.message }, { status: 500 })
    }

    // Bug 10 fix: check if all sibling tracks are now ready; if the composite
    // is also completed, mark the overall recording as completed.
    const { data: siblings, error: siblingsErr } = await db
      .from('recording_tracks')
      .select('file_status')
      .eq('recording_id', trackRow.recording_id)

    if (siblingsErr) {
      console.error('[livekit-webhook] sibling fetch FAILED recording_id=', trackRow.recording_id, 'err=', siblingsErr)
      // Don't fail the whole webhook for this — the per-track update already
      // succeeded; just skip the promotion this round and let a later track
      // event try again.
    }

    const allTracksReady = siblings?.every((t) => t.file_status === 'ready') ?? false
    if (allTracksReady) {
      // Only upgrade to 'completed' if composite is already done.
      // Recording Wave 1: check the error here too.
      const { error: promoteErr } = await db
        .from('session_recordings')
        .update({ status: 'completed' })
        .eq('id', trackRow.recording_id)
        .eq('status', 'stopped')  // only promote from stopped, not re-set if already completed
      if (promoteErr) {
        console.error('[livekit-webhook] recording promote FAILED id=', trackRow.recording_id, 'err=', promoteErr)
        await recordWebhookFailure(db, 'session_recordings', trackRow.recording_id, `recording promote: ${promoteErr.message}`)
        return NextResponse.json({ error: promoteErr.message }, { status: 500 })
      }
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
