import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function openai() {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  return new OpenAI({ apiKey: key })
}

type VerboseSegment = { start: number; end: number; text: string }

/** Fetch a file from a public URL and return it as a File object for the OpenAI SDK */
async function fetchAsFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch audio file: ${res.status} ${url}`)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'audio/ogg' })
}

/** Transcribe an individual participant track */
export async function transcribeTrack(trackId: string): Promise<void> {
  const db = supabaseAdmin()

  const { data: track, error } = await db
    .from('recording_tracks')
    .select('id, file_url, recording_id')
    .eq('id', trackId)
    .maybeSingle()

  if (error || !track?.file_url) {
    console.error('transcribeTrack: track not found or no file_url', error)
    return
  }

  await db
    .from('recording_tracks')
    .update({ transcript_status: 'pending' })
    .eq('id', trackId)

  try {
    const filename = track.file_url.split('/').pop() ?? 'track.ogg'
    const file = await fetchAsFile(track.file_url, filename)

    const result = await openai().audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    // Store as JSON string so we keep timestamps for script building
    const transcript = JSON.stringify(result)

    await db
      .from('recording_tracks')
      .update({ transcript, transcript_status: 'done' })
      .eq('id', trackId)

    // Check if all tracks for this recording are done → build master script
    const { data: sibling } = await db
      .from('recording_tracks')
      .select('transcript_status')
      .eq('recording_id', track.recording_id)

    const allDone = sibling?.every((t) => t.transcript_status === 'done')
    if (allDone) {
      await buildMasterScript(track.recording_id)
    }
  } catch (err) {
    console.error('transcribeTrack error', err)
    await db
      .from('recording_tracks')
      .update({ transcript_status: 'failed' })
      .eq('id', trackId)
  }
}

/** Transcribe the composite (mixed) recording */
export async function transcribeComposite(recordingId: string): Promise<void> {
  const db = supabaseAdmin()

  const { data: rec } = await db
    .from('session_recordings')
    .select('id, file_url')
    .eq('id', recordingId)
    .maybeSingle()

  if (!rec?.file_url) return

  await db
    .from('session_recordings')
    .update({ composite_transcript_status: 'pending' })
    .eq('id', recordingId)

  try {
    const filename = rec.file_url.split('/').pop() ?? 'recording.mp4'
    const file = await fetchAsFile(rec.file_url, filename)

    const result = await openai().audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    await db
      .from('session_recordings')
      .update({
        composite_transcript: JSON.stringify(result),
        composite_transcript_status: 'done',
      })
      .eq('id', recordingId)
  } catch (err) {
    console.error('transcribeComposite error', err)
    await db
      .from('session_recordings')
      .update({ composite_transcript_status: 'failed' })
      .eq('id', recordingId)
  }
}

/** Build a speaker-labeled master script from all completed tracks */
export async function buildMasterScript(recordingId: string): Promise<void> {
  const db = supabaseAdmin()

  await db
    .from('session_recordings')
    .update({ master_script_status: 'pending' })
    .eq('id', recordingId)

  try {
    const { data: tracks } = await db
      .from('recording_tracks')
      .select('participant_identity, transcript, transcript_status')
      .eq('recording_id', recordingId)
      .eq('transcript_status', 'done')

    if (!tracks?.length) {
      // Fall back to composite transcript if no individual tracks
      const { data: rec } = await db
        .from('session_recordings')
        .select('composite_transcript')
        .eq('id', recordingId)
        .maybeSingle()

      if (rec?.composite_transcript) {
        const parsed = JSON.parse(rec.composite_transcript)
        const text = parsed.text ?? parsed
        const script = `## Session Recording\n\n${typeof text === 'string' ? text : JSON.stringify(text)}`
        await db
          .from('session_recordings')
          .update({ master_script: script, master_script_status: 'done' })
          .eq('id', recordingId)
      }
      return
    }

    // Collect all segments with speaker identity
    type Segment = { start: number; text: string; speaker: string }
    const segments: Segment[] = []

    for (const track of tracks) {
      const speaker = track.participant_identity ?? 'Unknown'
      try {
        const parsed = JSON.parse(track.transcript)
        const rawSegments: VerboseSegment[] = parsed.segments ?? []
        for (const seg of rawSegments) {
          segments.push({ start: seg.start, text: seg.text.trim(), speaker })
        }
      } catch {
        // Plain text fallback
        segments.push({ start: 0, text: track.transcript, speaker })
      }
    }

    // Sort by timestamp
    segments.sort((a, b) => a.start - b.start)

    // Group consecutive segments by the same speaker
    const lines: string[] = []
    let currentSpeaker = ''
    let buffer: string[] = []
    let sectionStart = 0

    function flushBuffer() {
      if (!buffer.length) return
      const ts = formatTimestamp(sectionStart)
      lines.push(`## [${ts}] ${currentSpeaker}`)
      lines.push(buffer.join(' '))
      lines.push('')
    }

    for (const seg of segments) {
      if (seg.speaker !== currentSpeaker) {
        flushBuffer()
        currentSpeaker = seg.speaker
        sectionStart = seg.start
        buffer = [seg.text]
      } else {
        buffer.push(seg.text)
      }
    }
    flushBuffer()

    const script = lines.join('\n')

    await db
      .from('session_recordings')
      .update({ master_script: script, master_script_status: 'done' })
      .eq('id', recordingId)
  } catch (err) {
    console.error('buildMasterScript error', err)
    await db
      .from('session_recordings')
      .update({ master_script_status: 'failed' })
      .eq('id', recordingId)
  }
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
