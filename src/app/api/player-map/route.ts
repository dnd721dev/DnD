import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'
import { switchPlayerMap, getSessionGm } from '@/lib/playerMapSwitch'

const Schema = z.object({
  sessionId:    z.string().uuid(),
  callerWallet: z.string().min(1),
  targetWallet: z.string().min(1),
  mapId:        z.string().uuid(),
  x:            z.number().int().optional(),
  y:            z.number().int().optional(),
})

/**
 * POST /api/player-map — set a player's current map (and move their token onto
 * it). Used by the GM "Party Maps" assignment UI. Auth: the session GM may move
 * anyone; a player may only move themselves.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(rateLimitKey(req, 'player-map'), { limit: 60, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { sessionId, callerWallet, targetWallet, mapId, x, y } = parsed.data
  const caller = callerWallet.toLowerCase()
  const target = targetWallet.toLowerCase()
  const db = supabaseAdmin()

  const gm = await getSessionGm(db, sessionId)
  if (gm == null) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (caller !== gm && caller !== target) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  // The destination map must belong to this session.
  const { data: map } = await db.from('maps').select('id').eq('id', mapId).eq('session_id', sessionId).maybeSingle()
  if (!map) return NextResponse.json({ error: 'Map not in this session' }, { status: 400 })

  const result = await switchPlayerMap(db, { sessionId, targetWallet: target, mapId, x, y })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
