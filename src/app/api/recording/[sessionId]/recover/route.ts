// POST /api/recording/[sessionId]/recover
// Queries LiveKit for the current egress status of a stuck recording and
// updates the DB to match.  Useful for recordings that were stuck before the
// webhook header bug was fixed (and for any future webhook delivery gaps).
import { NextRequest, NextResponse } from 'next/server'
import { EgressClient } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'

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
    const egressList: any[] = recording.egress_id
      ? await (client as any).listEgress({ egressId: recording.egress_id }).catch(() => [])
      : []

    const info = egressList[0]
    // EgressStatus values: 0=starting, 1=active, 2=ending, 3=complete, 4=failed, 5=aborted
    const COMPLETE = 3
    const FAILED   = 4
    const ABORTED  = 5

    if (info?.status === COMPLETE) {
      const fileUrl = publicBase && recording.file_key
        ? `${publicBase}/${recording.file_key}`
        : null

      await db
        .from('session_recordings')
        .update({ status: 'completed', completed_at: new Date().toISOString(), file_url: fileUrl })
        .eq('id', recordingId)

      // Also recover all tracks for this recording
      const { data: tracks } = await db
        .from('recording_tracks')
        .select('id, egress_id, file_key, file_status')
        .eq('recording_id', recordingId)

      for (const track of tracks ?? []) {
        if (track.file_status === 'ready') continue
        const trackEgressList: any[] = track.egress_id
          ? await (client as any).listEgress({ egressId: track.egress_id }).catch(() => [])
          : []
        const trackInfo = trackEgressList[0]
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
            .update({ file_status: 'failed', error: `egress status: ${trackInfo.status}` })
            .eq('id', track.id)
        }
      }

      return NextResponse.json({ recovered: true, reason: 'egress_complete', recordingId })
    }

    if (info?.status === FAILED || info?.status === ABORTED) {
      await db
        .from('session_recordings')
        .update({ status: 'failed', error: `egress status: ${info.status}` })
        .eq('id', recordingId)
      return NextResponse.json({ recovered: true, reason: 'egress_failed', recordingId })
    }

    // Egress still active or status unknown — mark stopped so at least it's not 'recording'
    if (recording.status === 'recording') {
      await db
        .from('session_recordings')
        .update({ status: 'stopped', stopped_at: new Date().toISOString() })
        .eq('id', recordingId)
    }

    return NextResponse.json({ recovered: false, reason: 'egress_still_active_or_unknown', info })
  } catch (err: any) {
    console.error('[recover] error querying LiveKit egress:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Failed to query egress status' }, { status: 500 })
  }
}
