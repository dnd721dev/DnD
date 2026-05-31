// POST /api/invite/create
// GM creates a shareable invite link for a campaign (optionally a session).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { walletFromRequest } from '@/lib/inviteServer'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const Schema = z.object({
  campaignId:     z.string().uuid(),
  sessionId:      z.string().uuid().optional(),
  role:           z.enum(['player', 'gm']).optional().default('player'),
  maxUses:        z.number().int().positive().max(1000).optional(),
  expiresInHours: z.number().int().positive().max(24 * 365).optional(),
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
  const { campaignId, sessionId, role, maxUses, expiresInHours } = parsed.data

  const db = supabaseAdmin()

  // Caller must be the campaign's GM.
  const { data: campaign } = await db
    .from('campaigns')
    .select('id, gm_wallet')
    .eq('id', campaignId)
    .maybeSingle()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (String((campaign as any).gm_wallet).toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Only the GM can create invites' }, { status: 403 })
  }

  // If a session is specified, it must belong to this campaign.
  if (sessionId) {
    const { data: sess } = await db
      .from('sessions')
      .select('id, campaign_id')
      .eq('id', sessionId)
      .maybeSingle()
    if (!sess || (sess as any).campaign_id !== campaignId) {
      return NextResponse.json({ error: 'Session does not belong to this campaign' }, { status: 400 })
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
  return NextResponse.json({ token: invite.token, url: `${origin}/join/${invite.token}` })
}
