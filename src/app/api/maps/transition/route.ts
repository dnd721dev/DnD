import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'
import { switchPlayerMap, getSessionGm } from '@/lib/playerMapSwitch'

const Schema = z.object({
  sessionId:    z.string().uuid(),
  callerWallet: z.string().min(1),
  tokenId:      z.string().uuid(),
  triggerId:    z.string().uuid(),
})

/**
 * POST /api/maps/transition — a portal trigger fired under a token. The
 * destination (map + tile) is resolved SERVER-SIDE from the trigger so a client
 * can't pick an arbitrary map. Switches only the token's owner. Auth: GM or the
 * token owner (the player whose token stepped on it).
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(rateLimitKey(req, 'map-transition'), { limit: 120, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { sessionId, callerWallet, tokenId, triggerId } = parsed.data
  const caller = callerWallet.toLowerCase()
  const db = supabaseAdmin()

  // Load the portal trigger (scoped to this session).
  const { data: trigger } = await db
    .from('map_triggers')
    .select('trigger_type, target_map_id, target_x, target_y')
    .eq('id', triggerId)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (!trigger) return NextResponse.json({ error: 'Trigger not found' }, { status: 404 })
  if (trigger.trigger_type !== 'portal' || !trigger.target_map_id) {
    return NextResponse.json({ error: 'Not a portal' }, { status: 400 })
  }

  // Resolve the token's owner — that's the player who moves.
  const { data: token } = await db
    .from('tokens')
    .select('owner_wallet')
    .eq('id', tokenId)
    .maybeSingle()
  const owner = token?.owner_wallet ? String(token.owner_wallet).toLowerCase() : null
  if (!owner) return NextResponse.json({ error: 'Token has no owner' }, { status: 400 })

  const gm = await getSessionGm(db, sessionId)
  if (caller !== gm && caller !== owner) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  }

  const result = await switchPlayerMap(db, {
    sessionId,
    targetWallet: owner,
    mapId: trigger.target_map_id,
    x: trigger.target_x,
    y: trigger.target_y,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true, mapId: trigger.target_map_id })
}
