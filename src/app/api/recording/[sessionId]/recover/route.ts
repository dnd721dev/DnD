// POST /api/recording/[sessionId]/recover
// Queries LiveKit for the current egress status of a stuck recording and
// updates the DB to match. Useful for recordings stuck behind a webhook
// delivery gap, signature mismatch, or egress failure.
//
// Recovery Wave 2: the previous version silently swallowed LiveKit errors
// (`.catch(() => [])`), making it impossible to tell whether the egress
// genuinely had no status or whether listEgress itself failed. Now every
// LiveKit error is captured, persisted into session_recordings.error, AND
// returned to the caller so the UI can show it.
import { NextRequest, NextResponse } from 'next/server'
import { EgressClient } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { cascadeFailedTracks } from '@/lib/recordingCascade'

const Schema = z.object({
  recordingId: z.string().uuid('recordingId must be a valid UUID'),
})

type Params = { params: Promise<{ sessionId: string }> }

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

/**
 * Recovery Wave 2: call LiveKit listEgress and return either the list or a
 * structured error. Never throws — the caller decides how to surface the
 * failure (UI + persisted column).
 */
async function safeListEgress(client: any, egressId: string): Promise<
  { ok: true; list: any[] } | { ok: false; error: string }
> {
  try {
    const list: any[] = await client.listEgress({ egressId })
    return { ok: true, list: Array.isArray(list) ? list : [] }
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err ?? 'unknown LiveKit error').slice(0, 480) }
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const { sessionId } = await params
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { recordingId } = parsed.data

  const db = supabaseAdmin()

  // Load the recording row
  const { data: recording, error: fetchErr } = await db
    .from('session_recordings')
    .select('id, session_id, egress_id, status, file_key')
    .eq('id', recordingId)
    .eq('session_id', sessionId)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!recording) return NextResponse.json({ error: 'Recording not found' }, { status: 404 })

  // Already completed — nothing to do
  if (recording.status === 'completed') {
    return NextResponse.json({ recovered: false, reason: 'already_completed', recording })
  }

  const publicBase = (process.env.RECORDING_S3_PUBLIC_BASE_URL ?? '').replace(/\/$/, '')

  try {
    const client = makeEgressClient()

    // Recovery Wave 2: capture listEgress failures cleanly.
    let lookupResult: { ok: true; list: any[] } | { ok: false; error: string }
    if (recording.egress_id) {
      lookupResult = await safeListEgress(client, recording.egress_id)
    } else {
      lookupResult = { ok: false, error: 'recording row has no egress_id — was it created before LiveKit returned a job?' }
    }

    if (!lookupResult.ok) {
      // Persist the actual reason so the dashboard renders it.
      const detail = `recover: listEgress failed — ${lookupResult.error}`
      await db.from('session_recordings').update({ error: detail }).eq('id', recordingId)
      return NextResponse.json(
        { error: detail, recovered: false, reason: 'livekit_list_failed' },
        { status: 502 },
      )
    }

    const info = lookupResult.list[0]
    // EgressStatus values: 0=starting, 1=active, 2=ending, 3=complete, 4=failed, 5=aborted
    const COMPLETE = 3
    const FAILED   = 4
    const ABORTED  = 5

    if (info?.status === COMPLETE) {
      const fileUrl = publicBase && recording.file_key
        ? `${publicBase}/${recording.file_key}`
        : null

      const { error: completeUpdErr } = await db
        .from('session_recordings')
        .update({ status: 'completed', completed_at: new Date().toISOString(), file_url: fileUrl })
        .eq('id', recordingId)
      if (completeUpdErr) {
        return NextResponse.json({ error: completeUpdErr.message }, { status: 500 })
      }

      // Also recover all tracks for this recording
      const { data: tracks } = await db
        .from('recording_tracks')
        .select('id, egress_id, file_key, file_status')
        .eq('recording_id', recordingId)

      for (const track of tracks ?? []) {
        if (track.file_status === 'ready') continue
        if (!track.egress_id) continue
        const trackLookup = await safeListEgress(client, track.egress_id)
        if (!trackLookup.ok) {
          // Persist per-track error but keep iterating.
          await db
            .from('recording_tracks')
            .update({ error: `recover: ${trackLookup.error}`.slice(0, 480) })
            .eq('id', track.id)
          continue
        }
        const trackInfo = trackLookup.list[0]
        if (trackInfo?.status === COMPLETE) {
          const trackFileUrl = publicBase && track.file_key
            ? `${publicBase}/${track.file_key}`
            : null
          await db
            .from('recording_tracks')
            .update({ file_url: trackFileUrl, file_status: 'ready' })
            .eq('id', track.id)
        } else if (trackInfo?.status === FAILED || trackInfo?.status === ABORTED) {
          await db
            .from('recording_tracks')
            .update({ file_status: 'failed', error: `LiveKit egress ${trackInfo.status === FAILED ? 'failed' : 'aborted'}: ${trackInfo.error ?? '(no detail)'}`.slice(0, 480) })
            .eq('id', track.id)
        }
      }

      return NextResponse.json({ recovered: true, reason: 'egress_complete', recordingId })
    }

    if (info?.status === FAILED || info?.status === ABORTED) {
      // Recovery Wave 2 + 3: write the LiveKit failure detail and cascade to
      // all child tracks so the editor no longer shows "Track still recording…".
      const livekitErr = info?.error ?? info?.errorCode ?? '(no detail)'
      const detail = `LiveKit egress ${info.status === FAILED ? 'failed' : 'aborted'}: ${livekitErr}`.slice(0, 480)
      const { error: failedUpdErr } = await db
        .from('session_recordings')
        .update({ status: 'failed', error: detail })
        .eq('id', recordingId)
      if (failedUpdErr) {
        return NextResponse.json({ error: failedUpdErr.message }, { status: 500 })
      }
      await cascadeFailedTracks(db, recordingId, `parent recording failed: ${detail.slice(0, 200)}`)
      return NextResponse.json({ recovered: true, reason: 'egress_failed', detail, recordingId })
    }

    // Egress still active or status unknown — at least don't leave 'recording'
    if (recording.status === 'recording') {
      const { error: stopUpdErr } = await db
        .from('session_recordings')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .eq('id', recordingId)
      if (stopUpdErr) {
        return NextResponse.json({ error: stopUpdErr.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      recovered: false,
      reason: 'egress_still_active_or_unknown',
      info: info ? { status: info.status, error: info.error ?? null } : null,
    })
  } catch (err: any) {
    console.error('[recover] error querying LiveKit egress:', err?.message)
    const detail = String(err?.message ?? 'Failed to query egress status').slice(0, 480)
    await db.from('session_recordings').update({ error: `recover threw: ${detail}` }).eq('id', recordingId)
    return NextResponse.json({ error: detail }, { status: 500 })
  }
}
