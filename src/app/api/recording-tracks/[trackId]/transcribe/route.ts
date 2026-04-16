import { NextRequest, NextResponse } from 'next/server'
import { transcribeTrack } from '@/lib/transcribeRecording'

type Params = { params: Promise<{ trackId: string }> }

/** POST /api/recording-tracks/[trackId]/transcribe — re-transcribe a single track */
export async function POST(_req: NextRequest, { params }: Params) {
  const { trackId } = await params

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 })
  }

  // Fire and forget
  transcribeTrack(trackId).catch((err) =>
    console.error('re-transcribeTrack error', err)
  )

  return NextResponse.json({ ok: true, message: 'Transcription started' })
}
