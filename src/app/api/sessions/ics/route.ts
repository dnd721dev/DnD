import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/** GET /api/sessions/ics?sessionId=<uuid>
 *  Returns a downloadable .ics (iCalendar) file for the session.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: session, error } = await db
    .from('sessions')
    .select('id, title, description, scheduled_start, duration_minutes, gm_wallet')
    .eq('id', sessionId)
    .maybeSingle()

  if (error || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const start = session.scheduled_start ? new Date(session.scheduled_start) : new Date()
  const durationMs = (session.duration_minutes ?? 120) * 60 * 1000
  const end = new Date(start.getTime() + durationMs)

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dnd721.com'
  const sessionUrl = `${baseUrl}/sessions/${session.id}`

  const uid = `dnd721-session-${session.id}@dnd721.com`
  const title = (session.title ?? 'DND721 Session').replace(/[,;\\]/g, ' ')
  const description = [
    session.description ?? '',
    `Join the table: ${sessionUrl}`,
    session.gm_wallet ? `GM: ${session.gm_wallet}` : '',
  ]
    .filter(Boolean)
    .join('\\n')
    .replace(/[,;\\]/g, ' ')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DND721//Session Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `URL:${sessionUrl}`,
    `DTSTAMP:${fmt(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="dnd721-session-${session.id}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
