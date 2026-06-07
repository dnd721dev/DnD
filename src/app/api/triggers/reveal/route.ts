import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const RevealSchema = z.object({
  sessionId: z.string().uuid(),
  triggerId: z.string().uuid(),
  wallet:    z.string().min(1),
})

/**
 * POST /api/triggers/reveal
 * Player-initiated: appends the player's wallet to a trigger's revealed_to array
 * after a successful Perception check. Only mutates the reveal list — no GM check.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(rateLimitKey(req, 'triggers-reveal'), { limit: 120, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = RevealSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { sessionId, triggerId, wallet } = parsed.data
  const w = wallet.toLowerCase()
  const db = supabaseAdmin()

  // Load the current reveal list (scoped to this session for safety).
  const { data: row, error: loadErr } = await db
    .from('map_triggers')
    .select('id, revealed_to')
    .eq('id', triggerId)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'Trigger not found' }, { status: 404 })

  const current: string[] = Array.isArray(row.revealed_to) ? row.revealed_to : []
  if (current.map((x) => x.toLowerCase()).includes(w)) {
    return NextResponse.json({ trigger: row }) // already revealed — no-op
  }

  const { data, error } = await db
    .from('map_triggers')
    .update({ revealed_to: [...current, w] })
    .eq('id', triggerId)
    .eq('session_id', sessionId)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trigger: data })
}
