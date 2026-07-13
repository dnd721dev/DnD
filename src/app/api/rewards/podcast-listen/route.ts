// POST /api/rewards/podcast-listen
// Awarded when a user has actually listened to a session podcast for a
// meaningful stretch (the player fires this after 60s of playback).
// Once per recording per wallet.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { awardPoints } from '@/lib/rewards'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const Schema = z.object({
  recordingId: z.string().uuid(),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `rewards-listen:${wallet}`), { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'recordingId required' }, { status: 400 })
  const { recordingId } = parsed.data

  const db = supabaseAdmin()
  const { data: rec } = await db.from('session_recordings')
    .select('id').eq('id', recordingId).maybeSingle()
  if (!rec) return NextResponse.json({ error: 'Recording not found' }, { status: 404 })

  const result = await awardPoints(db, {
    wallet,
    action: 'podcast_listen',
    refId: recordingId,
  })
  return NextResponse.json({ ok: true, awarded: result.awarded, points: result.points })
}
