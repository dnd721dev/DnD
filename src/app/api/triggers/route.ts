import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const CreateSchema = z.object({
  sessionId:        z.string().uuid(),
  gmWallet:         z.string().min(1),
  mapId:            z.string().uuid().nullable().optional(),
  tileX:            z.number().int(),
  tileY:            z.number().int(),
  name:             z.string().min(1).max(80).default('Trap'),
  saveType:         z.enum(['DEX', 'STR', 'CON', 'INT', 'WIS', 'CHA']).default('DEX'),
  dc:               z.number().int().min(1).max(30).default(15),
  description:      z.string().max(500).optional(),
  triggerType:      z.string().max(30).optional(),
  damageDice:       z.string().max(20).optional(),
  damageType:       z.string().max(30).optional(),
  conditionApplied: z.string().max(30).optional(),
})

const PatchSchema = z.object({
  id: z.string().uuid(),
  gmWallet: z.string().min(1),
  sessionId: z.string().uuid(),
  isActive: z.boolean().optional(),
  isHidden: z.boolean().optional(),
})

async function verifyGm(db: ReturnType<typeof supabaseAdmin>, sessionId: string, wallet: string) {
  const { data } = await db.from('sessions').select('gm_wallet').eq('id', sessionId).maybeSingle()
  return data?.gm_wallet?.toLowerCase() === wallet.toLowerCase()
}

/** GET /api/triggers?sessionId=&mapId=&tileX=&tileY=&gmWallet= */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const sessionId = searchParams.get('sessionId')
  const mapId = searchParams.get('mapId')
  const tileX = searchParams.get('tileX')
  const tileY = searchParams.get('tileY')
  const gmWallet = searchParams.get('gmWallet')?.toLowerCase() ?? null

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const db = supabaseAdmin()

  let isGm = false
  if (gmWallet) {
    isGm = await verifyGm(db, sessionId, gmWallet)
  }

  // Tile-based lookup means movement detection — hidden traps still fire when
  // stepped on (detection ≠ visibility).  Only filter is_hidden for list views.
  const isTileDetection = tileX !== null && tileY !== null

  let query = db
    .from('map_triggers')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (!isGm && !isTileDetection) {
    // List view: players only see non-hidden triggers (revealed traps)
    query = query.eq('is_hidden', false)
  }

  // Tile-specific lookup (for trigger detection on movement)
  if (isTileDetection) {
    query = query.eq('tile_x', parseInt(tileX!)).eq('tile_y', parseInt(tileY!))
    if (mapId) query = query.eq('map_id', mapId)
  } else if (mapId) {
    query = query.eq('map_id', mapId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ triggers: data ?? [] })
}

/** POST /api/triggers — GM creates a trigger */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(rateLimitKey(req, 'triggers'), { limit: 60, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { sessionId, gmWallet, mapId, tileX, tileY, name, saveType, dc, description,
          triggerType, damageDice, damageType, conditionApplied } = parsed.data
  const db = supabaseAdmin()

  if (!(await verifyGm(db, sessionId, gmWallet))) {
    return NextResponse.json({ error: 'Only the GM can create triggers' }, { status: 403 })
  }

  const { data, error } = await db
    .from('map_triggers')
    .insert({
      session_id:        sessionId,
      map_id:            mapId ?? null,
      tile_x:            tileX,
      tile_y:            tileY,
      name,
      save_type:         saveType,
      dc,
      description:       description        ?? null,
      trigger_type:      triggerType        ?? 'custom',
      damage_dice:       damageDice         ?? null,
      damage_type:       damageType         ?? null,
      condition_applied: conditionApplied   ?? null,
    })
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trigger: data }, { status: 201 })
}

/** PATCH /api/triggers — toggle active or hidden */
export async function PATCH(req: NextRequest) {
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { id, gmWallet, sessionId, isActive, isHidden } = parsed.data
  const db = supabaseAdmin()

  if (!(await verifyGm(db, sessionId, gmWallet))) {
    return NextResponse.json({ error: 'Only the GM can modify triggers' }, { status: 403 })
  }

  const update: Record<string, any> = {}
  if (isActive !== undefined) update.is_active = isActive
  if (isHidden !== undefined) update.is_hidden = isHidden

  const { data, error } = await db
    .from('map_triggers')
    .update(update)
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ trigger: data })
}

/** DELETE /api/triggers?id=&sessionId=&gmWallet= */
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  const sessionId = searchParams.get('sessionId')
  const gmWallet = searchParams.get('gmWallet')

  if (!id || !sessionId || !gmWallet) {
    return NextResponse.json({ error: 'id, sessionId, and gmWallet required' }, { status: 400 })
  }

  const db = supabaseAdmin()

  if (!(await verifyGm(db, sessionId, gmWallet))) {
    return NextResponse.json({ error: 'Only the GM can delete triggers' }, { status: 403 })
  }

  const { error } = await db.from('map_triggers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
