// POST /api/invite/create
// GM creates a shareable invite link for a campaign (optionally a session).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { walletFromRequest } from '@/lib/inviteServer'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'
import { sendTelegramMessage } from '@/lib/telegram'

const Schema = z.object({
  campaignId:     z.string().uuid(),
  sessionId:      z.string().uuid().optional(),
  role:           z.enum(['player', 'gm']).optional().default('player'),
  maxUses:        z.number().int().positive().max(1000).optional(),
  expiresInHours: z.number().int().positive().max(24 * 365).optional(),
  /** When true, post a recruitment announcement to the Telegram group. */
  announce:       z.boolean().optional().default(false),
})

function makeToken(): string {
  // url-safe slug from two uuids, no dashes
  return (randomUUID() + randomUUID()).replace(/-/g, '').slice(0, 24)
}

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = walletFromRequest(req)
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const rl = checkRateLimit(rateLimitKey(req, `invite-create:${wallet}`), { limit: 30, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const { campaignId, sessionId, role, maxUses, expiresInHours, announce } = parsed.data

  const db = supabaseAdmin()

  // Caller must be the campaign's GM.
  const { data: campaign } = await db
    .from('campaigns')
    .select('id, gm_wallet, title, description')
    .eq('id', campaignId)
    .maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (String((campaign as any).gm_wallet).toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Only the GM can create invites' }, { status: 403 })
  }

  // If a session is specified, it must belong to this campaign.
  let sessionRow: { title: string | null; description: string | null; scheduled_start: string | null } | null = null
  if (sessionId) {
    const { data: sess } = await db
      .from('sessions')
      .select('id, campaign_id, title, description, scheduled_start')
      .eq('id', sessionId)
      .maybeSingle()
    if (!sess || (sess as any).campaign_id !== campaignId) {
      return NextResponse.json({ error: 'Session does not belong to this campaign' }, { status: 400 })
    }
    sessionRow = {
      title: (sess as any).title ?? null,
      description: (sess as any).description ?? null,
      scheduled_start: (sess as any).scheduled_start ?? null,
    }
  }

  const token = makeToken()
  const expires_at = expiresInHours
    ? new Date(Date.now() + expiresInHours * 3600_000).toISOString()
    : null

  const { data: invite, error } = await db
    .from('invites')
    .insert({
      token,
      campaign_id: campaignId,
      session_id:  sessionId ?? null,
      created_by:  wallet,
      role,
      max_uses:    maxUses ?? null,
      expires_at,
    })
    .select('id, token')
    .single()

  if (error || !invite) {
    console.error('[invite/create] insert error:', error?.message)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }

  // Prefer the request's own origin (the public domain the GM is on) over
  // NEXT_PUBLIC_APP_URL (the wallet deep-link host, often a LAN IP in dev).
  const origin =
    req.headers.get('origin') ??
    (req.headers.get('host') ? `${new URL(req.url).protocol}//${req.headers.get('host')}` : null) ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin
  const url = `${origin}/join/${invite.token}`

  // Best-effort recruitment announcement to the Telegram group. A Telegram
  // failure must never fail invite creation.
  if (announce) {
    try {
      const c = campaign as any
      const lines: string[] = [`🎲 New invite — ${c.title ?? 'a campaign'}`, '']
      let sessionLine = `🗓 Session: ${sessionRow?.title || 'TBA'}`
      if (sessionRow?.scheduled_start) {
        const when = new Date(sessionRow.scheduled_start)
        if (!Number.isNaN(when.getTime())) {
          sessionLine += `  ·  ${when.toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
          })}`
        }
      }
      lines.push(sessionLine)
      // Session-specific blurb (only for session invites), then the campaign overview.
      if (sessionRow?.description) lines.push(`📝 ${sessionRow.description}`)
      if (c.description) lines.push(`📖 ${c.description}`)
      lines.push(
        '',
        "🛒 Don't forget to grab your gear from Bishop's Shop before you play!",
        `${origin}/shop`,
        '',
        `👉 Join: ${url}`,
      )
      const r = await sendTelegramMessage(lines.join('\n'))
      console.log('[invite/create] announce result:', r.ok ? 'sent' : `failed: ${r.error}`)
    } catch (e) {
      console.error('[invite/create] telegram announce failed', e)
    }
  }

  return NextResponse.json({ token: invite.token, url })
}
