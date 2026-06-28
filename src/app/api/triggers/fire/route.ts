import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'
import { resolveTriggerTargets } from '@/lib/triggerTargeting'

// POST /api/triggers/fire — fire a trigger whose target_rule redirects the
// effect to a token OTHER than the one that tripped it. Resolves the victim(s)
// server-side and inserts one trigger_save_events row per victim, which their
// own client picks up via realtime to roll its save (see PlayerSidebar).
//
// 'self' triggers never come here — they keep the original same-device path.

const Body = z.object({
  sessionId:           z.string().uuid(),
  callerWallet:        z.string().min(1),
  triggerId:           z.string().uuid(),
  triggeringTokenId:   z.string().uuid().nullable().optional(),
  triggeringTokenLabel: z.string().max(120).nullable().optional(),
})

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(rateLimitKey(req, 'triggers-fire'), { limit: 120, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = Body.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { sessionId, callerWallet, triggerId, triggeringTokenId, triggeringTokenLabel } = parsed.data
  const caller = callerWallet.toLowerCase()
  const db = supabaseAdmin()

  // Authorize: caller is the session GM or a participant of the session.
  const { data: sess } = await db.from('sessions').select('gm_wallet').eq('id', sessionId).maybeSingle()
  if (!sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  let authorized = sess.gm_wallet?.toLowerCase() === caller
  if (!authorized) {
    const { data: sp } = await db
      .from('session_players')
      .select('wallet_address')
      .eq('session_id', sessionId)
      .ilike('wallet_address', caller)
      .maybeSingle()
    authorized = !!sp
  }
  if (!authorized) return NextResponse.json({ error: 'Not authorized for this session' }, { status: 403 })

  // Load the trigger (must belong to this session and be active).
  const { data: trig } = await db
    .from('map_triggers')
    .select('*')
    .eq('id', triggerId)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (!trig || !trig.is_active) return NextResponse.json({ error: 'Trigger not found or inactive' }, { status: 404 })
  if (trig.trigger_type === 'portal' || trig.trigger_type === 'clue') {
    return NextResponse.json({ error: 'This trigger type does not deal effects' }, { status: 400 })
  }

  const rule = trig.target_rule ?? 'self'
  if (rule === 'self') {
    // Self is handled client-side; nothing to fan out.
    return NextResponse.json({ mode: 'self', count: 0 })
  }

  // The encounter that owns this session's tokens.
  const { data: enc } = await db
    .from('encounters')
    .select('id')
    .eq('session_id', sessionId)
    .limit(1)
    .maybeSingle()
  if (!enc?.id) return NextResponse.json({ error: 'No encounter for session' }, { status: 404 })

  const targets = await resolveTriggerTargets(db, {
    encounterId: String(enc.id),
    triggeringTokenId: triggeringTokenId ?? null,
    rule,
  })
  if (targets.length === 0) return NextResponse.json({ mode: 'redirect', count: 0 })

  const effect = {
    name:              trig.name ?? 'Trap',
    save_type:         trig.save_type ?? 'DEX',
    save_dc:           trig.save_dc ?? trig.dc ?? 15,
    damage_dice:       trig.damage_dice ?? null,
    damage_type:       trig.damage_type ?? null,
    condition_applied: trig.condition_applied ?? null,
    description:       trig.description ?? null,
  }

  const rows = targets.map((t) => ({
    session_id:          sessionId,
    trigger_id:          triggerId,
    target_token_id:     t.id,
    target_wallet:       t.owner_wallet ? t.owner_wallet.toLowerCase() : null,
    triggering_token_id: triggeringTokenId ?? null,
    triggering_label:    triggeringTokenLabel ?? null,
    effect,
  }))

  const { error } = await db.from('trigger_save_events').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ mode: 'redirect', count: rows.length })
}
