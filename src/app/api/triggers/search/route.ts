import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const GRID = 50 // px per tile — matches the table's fixed gridSize

const SearchSchema = z.object({
  sessionId: z.string().uuid(),
  wallet:    z.string().min(1),
  roll:      z.number().int().min(1).max(60),
  range:     z.number().int().min(1).max(10).default(2),
})

/**
 * POST /api/triggers/search
 * Active "Search for Traps": given the player's Perception roll, reveal any active
 * hidden trap within `range` tiles of the player's own token whose Perception DC ≤ roll.
 * Returns the names of newly-spotted traps. Server-side so hidden trap data never leaks.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(rateLimitKey(req, 'triggers-search'), { limit: 60, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = SearchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { sessionId, wallet, roll, range } = parsed.data
  const w = wallet.toLowerCase()
  const db = supabaseAdmin()

  // Find the player's PC token (most recently created) in this session's encounters.
  const { data: encs } = await db.from('encounters').select('id').eq('session_id', sessionId)
  const encIds = (encs ?? []).map((e: any) => e.id)
  if (encIds.length === 0) return NextResponse.json({ revealed: [], reason: 'no-encounter' })

  const { data: tokenRows } = await db
    .from('tokens')
    .select('x, y, map_id, owner_wallet, type, created_at')
    .in('encounter_id', encIds)
    .eq('owner_wallet', w)
    .order('created_at', { ascending: false })
  const tok = (tokenRows ?? [])[0]
  if (!tok) return NextResponse.json({ revealed: [], reason: 'no-token' })

  const ptx = Math.floor(Number(tok.x ?? 0) / GRID)
  const pty = Math.floor(Number(tok.y ?? 0) / GRID)

  // Candidate hidden traps within range whose DC the roll beats.
  const { data: triggers } = await db
    .from('map_triggers')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .eq('is_hidden', true)

  const revealed: string[] = []
  for (const t of triggers ?? []) {
    const already = Array.isArray(t.revealed_to) && t.revealed_to.map((x: string) => x.toLowerCase()).includes(w)
    if (already) continue
    const inRange = Math.hypot((t.tile_x ?? 0) - ptx, (t.tile_y ?? 0) - pty) <= range + 1e-9
    if (!inRange) continue
    if (roll < (t.dc ?? 0)) continue
    const current: string[] = Array.isArray(t.revealed_to) ? t.revealed_to : []
    const { error } = await db
      .from('map_triggers')
      .update({ revealed_to: [...current, w] })
      .eq('id', t.id)
      .eq('session_id', sessionId)
    if (!error) revealed.push(t.name ?? 'Trap')
  }

  return NextResponse.json({ revealed })
}
