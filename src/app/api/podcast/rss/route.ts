import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/** GET /api/podcast/rss — RSS 2.0 podcast feed (published episodes only) */
export async function GET(_req: NextRequest) {
  const db = supabaseAdmin()

  const { data: recordings, error } = await db
    .from('session_recordings')
    .select(`
      id,
      session_id,
      episode_number,
      episode_title,
      file_url,
      duration_sec,
      stopped_at,
      master_script,
      composite_transcript,
      recording_markers ( id, label, offset_sec )
    `)
    .eq('published', true)
    .in('status', ['stopped', 'completed'])
    .order('episode_number', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch session titles for each recording
  const sessionIds = [...new Set((recordings ?? []).map((r) => r.session_id))]
  const { data: sessions } = await db
    .from('sessions')
    .select('id, title')
    .in('id', sessionIds)

  const sessionMap = Object.fromEntries((sessions ?? []).map((s) => [s.id, s.title]))

  const podcastTitle       = process.env.PODCAST_TITLE       ?? 'DND721 Podcast'
  const podcastDescription = process.env.PODCAST_DESCRIPTION ?? 'Live D&D 5e sessions from the DND721 community.'
  const podcastLink        = process.env.NEXT_PUBLIC_APP_URL  ?? 'https://dnd721.xyz'
  const podcastEmail       = process.env.PODCAST_EMAIL        ?? ''
  const podcastAuthor      = process.env.PODCAST_AUTHOR       ?? 'DND721'
  const podcastImage       = process.env.PODCAST_IMAGE_URL    ?? `${podcastLink}/logo.png`

  const items = (recordings ?? []).map((rec) => {
    const sessionTitle = sessionMap[rec.session_id] ?? 'Untitled Session'
    const epTitle      = rec.episode_title ?? sessionTitle
    const epNumber     = rec.episode_number ?? ''

    // Description: first 500 chars of master script or composite transcript
    const rawText =
      extractPlainText(rec.master_script) ??
      extractPlainText(rec.composite_transcript) ??
      sessionTitle
    const description = xmlEscape(rawText.slice(0, 500).trim())

    // Duration in HH:MM:SS for iTunes
    const duration = rec.duration_sec ? formatDuration(rec.duration_sec) : ''

    // Build podcast:chapters JSON (Podcast Index spec)
    const markers: Array<{ id: string; label: string; offset_sec: number }> =
      (rec as any).recording_markers ?? []
    const chaptersJson =
      markers.length > 0
        ? JSON.stringify({
            version: '1.2.0',
            chapters: markers
              .sort((a, b) => a.offset_sec - b.offset_sec)
              .map((m) => ({ startTime: m.offset_sec, title: m.label })),
          })
        : null

    // Guess MIME type from file extension
    const ext      = rec.file_url?.split('.').pop()?.toLowerCase()
    const mimeType = ext === 'mp3' ? 'audio/mpeg' : ext === 'ogg' ? 'audio/ogg' : 'audio/mp4'
    const enclosureUrl = rec.file_url ?? ''

    const pubDate = rec.stopped_at
      ? new Date(rec.stopped_at).toUTCString()
      : new Date().toUTCString()

    return `
    <item>
      <title>${xmlEscape(epTitle)}</title>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">dnd721-recording-${rec.id}</guid>
      ${enclosureUrl ? `<enclosure url="${xmlEscape(enclosureUrl)}" type="${mimeType}" length="0"/>` : ''}
      ${duration ? `<itunes:duration>${duration}</itunes:duration>` : ''}
      ${epNumber ? `<itunes:episode>${epNumber}</itunes:episode>` : ''}
      <itunes:title>${xmlEscape(epTitle)}</itunes:title>
      <itunes:episodeType>full</itunes:episodeType>
      ${chaptersJson
        ? `<podcast:chapters url="data:application/json+chapters;base64,${Buffer.from(chaptersJson).toString('base64')}" type="application/json+chapters"/>`
        : ''}
    </item>`
  })

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:podcast="https://podcastindex.org/namespace/1.0"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xmlEscape(podcastTitle)}</title>
    <link>${xmlEscape(podcastLink)}</link>
    <description>${xmlEscape(podcastDescription)}</description>
    <language>en-us</language>
    <itunes:author>${xmlEscape(podcastAuthor)}</itunes:author>
    ${podcastEmail ? `<itunes:owner><itunes:email>${xmlEscape(podcastEmail)}</itunes:email></itunes:owner>` : ''}
    <itunes:image href="${xmlEscape(podcastImage)}"/>
    <itunes:category text="Games &amp; Hobbies"/>
    <itunes:explicit>false</itunes:explicit>
    ${items.join('\n')}
  </channel>
</rss>`

  return new NextResponse(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  })
}

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Extract plain text from a master_script (strips ## headers) or a JSON transcript */
function extractPlainText(raw: string | null | undefined): string | null {
  if (!raw) return null
  // Try JSON transcript first
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.text === 'string') return parsed.text
  } catch { /* not JSON */ }
  // Strip Markdown headings
  return raw.replace(/^##.*$/gm, '').replace(/\n{3,}/g, '\n\n').trim()
}
