import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { transcribeTrack, transcribeComposite, buildMasterScript } from '@/lib/transcribeRecording'

type Params = { params: Promise<{ sessionId: string }> }

/**
 * POST /api/recording/[sessionId]/transcribe
 * Manual fallback: kicks off transcription for all tracks + composite of the latest recording.
 * Body: { recordingId?: string }  — defaults to most recent stopped/completed recording.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { sessionId } = await params

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const recordingId: string | undefined = body?.recordingId

  const db = supabaseAdmin()
  let query = db
    .from('session_recordings')
    .select('id')
    .eq('session_id', sessionId)
    .in('status', ['stopped', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)

  if (recordingId) {
    query = db
      .from('session_recordings')
      .select('id')
      .eq('id', recordingId)
      .eq('session_id', sessionId)
      .limit(1)
  }

  const { data: rec, error } = await query.maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rec) return NextResponse.json({ error: 'No recording found' }, { status: 404 })

  // Fetch all tracks for this recording
  const { data: tracks } = await db
    .from('recording_tracks')
    .select('id')
    .eq('recording_id', rec.id)

  // Kick off all transcriptions concurrently (fire-and-forget, respond immediately)
  const jobs: Promise<void>[] = [transcribeComposite(rec.id)]
  for (const track of tracks ?? []) {
    jobs.push(transcribeTrack(track.id))
  }

  // Wait a moment to catch fast errors, then respond
  const settled = await Promise.allSettled(
    jobs.map((p) => Promise.race([p, new Promise<void>((r) => setTimeout(r, 500))]))
  )

  const failed = settled.filter((r) => r.status === 'rejected').length

  // Master script will be built automatically once all tracks complete (inside transcribeTrack)
  // But also trigger a rebuild in case everything was already done
  buildMasterScript(rec.id).catch(console.error)

  return NextResponse.json({
    ok: true,
    recordingId: rec.id,
    trackCount: tracks?.length ?? 0,
    earlyErrors: failed,
    message: 'Transcription started. Check transcript_status fields for progress.',
  })
}
