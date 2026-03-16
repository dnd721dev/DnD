import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/** GET /api/sessions/recap?sessionId=<uuid>
 *  Returns a Markdown recap of the session — participants, rolls, initiative, recordings.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const db = supabaseAdmin()

  const [sessionRes, participantsRes, rollsRes, initiativeRes, recordingsRes, handoutsRes] =
    await Promise.all([
      db
        .from('sessions')
        .select('id, title, description, scheduled_start, duration_minutes, gm_wallet, status')
        .eq('id', sessionId)
        .maybeSingle(),
      db
        .from('session_participants')
        .select('wallet_address, role, rsvp_status')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true }),
      db
        .from('session_rolls')
        .select('roller_name, roll_type, label, formula, result_total, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(200),
      db
        .from('initiative_entries')
        .select('name, init, hp, is_pc')
        .in(
          'encounter_id',
          (
            await db
              .from('encounters')
              .select('id')
              .eq('session_id', sessionId)
          ).data?.map((e: any) => e.id) ?? []
        )
        .order('init', { ascending: false }),
      db
        .from('session_recordings')
        .select('status, started_at, stopped_at, duration_sec, file_url')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true }),
      db
        .from('session_handouts')
        .select('title, content, content_type, revealed')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true }),
    ])

  const session = sessionRes.data
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'

  const fmtDur = (sec: number | null) => {
    if (!sec) return ''
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const short = (w: string) => `${w.slice(0, 6)}…${w.slice(-4)}`

  const lines: string[] = []

  // Header
  lines.push(`# ${session.title ?? 'DND721 Session Recap'}`)
  lines.push('')
  if (session.description) lines.push(`> ${session.description}`, '')
  lines.push(`**Date:** ${fmt(session.scheduled_start)}`)
  lines.push(`**Duration:** ${session.duration_minutes} min planned`)
  lines.push(`**Status:** ${session.status}`)
  if (session.gm_wallet) lines.push(`**GM:** \`${short(session.gm_wallet)}\``)
  lines.push('')

  // Participants
  const parts = participantsRes.data ?? []
  if (parts.length > 0) {
    lines.push('## Participants')
    lines.push('')
    lines.push('| Wallet | Role | RSVP |')
    lines.push('|--------|------|------|')
    for (const p of parts) {
      lines.push(`| \`${short(p.wallet_address)}\` | ${p.role} | ${p.rsvp_status} |`)
    }
    lines.push('')
  }

  // Recordings
  const recs = recordingsRes.data ?? []
  const stoppedRecs = recs.filter(r => r.status === 'stopped')
  if (stoppedRecs.length > 0) {
    lines.push('## Recordings')
    lines.push('')
    for (const r of stoppedRecs) {
      const dur = fmtDur(r.duration_sec)
      lines.push(`- **Started:** ${fmt(r.started_at)}${dur ? ` · **Duration:** ${dur}` : ''}`)
      if (r.file_url) lines.push(`  [Download Recording](${r.file_url})`)
    }
    lines.push('')
  }

  // Initiative order
  const init = initiativeRes.data ?? []
  if (init.length > 0) {
    lines.push('## Initiative Order')
    lines.push('')
    lines.push('| Name | Initiative | HP | Type |')
    lines.push('|------|-----------|-----|------|')
    for (const e of init) {
      lines.push(`| ${e.name} | ${e.init} | ${e.hp ?? '—'} | ${e.is_pc ? 'PC' : 'Monster'} |`)
    }
    lines.push('')
  }

  // Rolls summary
  const rolls = rollsRes.data ?? []
  if (rolls.length > 0) {
    lines.push('## Dice Log')
    lines.push('')

    // Stats
    const nat20s = rolls.filter(r => r.result_total === 20 && r.formula?.includes('d20'))
    const nat1s = rolls.filter(r => r.result_total === 1 && r.formula?.includes('d20'))
    if (nat20s.length > 0) lines.push(`🎉 **Nat 20s this session:** ${nat20s.length}`)
    if (nat1s.length > 0) lines.push(`💀 **Nat 1s this session:** ${nat1s.length}`)
    lines.push('')

    lines.push('| Time | Roller | Label | Formula | Result |')
    lines.push('|------|--------|-------|---------|--------|')
    for (const r of rolls.slice(0, 100)) {
      const time = new Date(r.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      lines.push(`| ${time} | ${r.roller_name ?? '—'} | ${r.label ?? '—'} | \`${r.formula ?? '—'}\` | **${r.result_total}** |`)
    }
    if (rolls.length > 100) lines.push(`\n_...and ${rolls.length - 100} more rolls_`)
    lines.push('')
  }

  // Revealed handouts
  const handouts = (handoutsRes.data ?? []).filter((h: any) => h.revealed)
  if (handouts.length > 0) {
    lines.push('## Revealed Handouts')
    lines.push('')
    for (const h of handouts) {
      lines.push(`### ${h.title}`)
      if (h.content_type === 'text') lines.push(h.content)
      else if (h.content_type === 'image') lines.push(`![${h.title}](${h.content})`)
      else lines.push(`[${h.title}](${h.content})`)
      lines.push('')
    }
  }

  // Footer
  lines.push('---')
  lines.push(`_Exported from DND721 · ${new Date().toUTCString()}_`)

  const markdown = lines.join('\n')
  const filename = `recap-${(session.title ?? 'session').toLowerCase().replace(/\s+/g, '-')}.md`

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
