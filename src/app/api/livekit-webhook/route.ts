import { NextRequest, NextResponse } from 'next/server'
import { WebhookReceiver } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { transcribeTrack, transcribeComposite } from '@/lib/transcribeRecording'

function makeReceiver() {
  return new WebhookReceiver(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
  )
}

/** POST /api/livekit-webhook  — receives LiveKit room/egress events */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const authorization = req.headers.get('Authorization') ?? ''

  let event: any
  try {
    const receiver = makeReceiver()
    event = await receiver.receive(body, authorization)
  } catch (err: any) {
    console.error('LiveKit webhook verification failed', err?.message)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  const egressId: string | undefined =
    event.egressInfo?.egressId ?? event.egress_info?.egress_id

  if (!egressId) {
    // Not an egress event — ignore
    return NextResponse.json({ ok: true })
  }

  const db = supabaseAdmin()

  // ── Handle composite egress ending ───────────────────────────────────────
  const { data: compositeRow } = await db
    .from('session_recordings')
    .select('id, file_key')
    .eq('egress_id', egressId)
    .maybeSingle()

  if (compositeRow) {
    await db
      .from('session_recordings')
      .update({ status: 'completed' })
      .eq('id', compositeRow.id)

    // Fire-and-forget transcription (runs after response)
    if (process.env.OPENAI_API_KEY) {
      transcribeComposite(compositeRow.id).catch((err) =>
        console.error('transcribeComposite error after webhook', err)
      )
    }

    return NextResponse.json({ ok: true, type: 'composite_ended', id: compositeRow.id })
  }

  // ── Handle per-track egress ending ───────────────────────────────────────
  const { data: trackRow } = await db
    .from('recording_tracks')
    .select('id, recording_id, file_key')
    .eq('egress_id', egressId)
    .maybeSingle()

  if (trackRow) {
    // Update the file_url now that the file is available
    const publicBase = (process.env.RECORDING_S3_PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
    const fileUrl    = publicBase && trackRow.file_key ? `${publicBase}/${trackRow.file_key}` : null

    await db
      .from('recording_tracks')
      .update({ file_url: fileUrl })
      .eq('id', trackRow.id)

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
