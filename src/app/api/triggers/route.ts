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
  saveDc:           z.number().int().min(1).max(30).default(15),
  description:      z.string().max(500).optional(),
  triggerType:      z.string().max(30).optional(),
  damageDice:       z.string().max(20).optional(),
  damageType:       z.string().max(30).optional(),
  conditionApplied: z.string().max(30).optional(),
  radius:           z.number().int().min(0).max(20).default(0),
})

const PatchSchema = z.object({
  id:               z.string().uuid(),
  gmWallet:         z.string().min(1),
  sessionId:        z.string().uuid(),
  // toggle fields
  isActive:         z.boolean().optional(),
  isHidden:         z.boolean().optional(),
  // full-edit fields
  name:             z.string().min(1).max(80).optional(),
  saveType:         z.enum(['DEX', 'STR', 'CON', 'INT', 'WIS', 'CHA']).optional(),
  dc:               z.number().int().min(1).max(30).optional(),
  saveDc:           z.number().int().min(1).max(30).optional(),
  triggerType:      z.string().max(30).optional(),
  damageDice:       z.string().max(20).optional(),
  damageType:       z.string().max(30).optional(),
  conditionApplied: z.string().max(30).optional(),
  description:      z.string().max(500).optional(),
  radius:           z.number().int().min(0).max(20).optional(),
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
  // Player wallet — used for list view to also include traps revealed to this player.
  const wallet = searchParams.get('wallet')?.toLowerCase() ?? null

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

  // Tile-specific lookup is radius-aware now, so we can't filter tile in SQL.
  if (!isTileDetection && mapId) query = query.eq('map_id', mapId)
  if (isTileDetection && mapId) query = query.eq('map_id', mapId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let triggers = data ?? []

  if (isTileDetection) {
    // Radius-aware detection: a trap fires when the moving token's tile is within
    // `radius` tiles of the trap tile (radius 0 → exact tile only).
    const tx = parseInt(tileX!)
    const ty = parseInt(tileY!)
    triggers = triggers.filter((t: any) => {
      const r = Number(t.radius ?? 0)
      return Math.hypot((t.tile_x ?? 0) - tx, (t.tile_y ?? 0) - ty) <= r + 1e-9
    })
  } else if (!isGm) {
    // List view: players see non-hidden traps OR traps revealed to their wallet.
    triggers = triggers.filter((t: any) =>
      !t.is_hidden || (wallet && Array.isArray(t.revealed_to) && t.revealed_to.map((w: string) => w.toLowerCase()).includes(wallet))
    )
  }

  return NextResponse.json({ triggers })
}

/** POST /api/triggers — GM creates a trigger */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(rateLimitKey(req, 'triggers'), { limit: 60, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { sessionId, gmWallet, mapId, tileX, tileY, name, saveType, dc, saveDc, description,
          triggerType, damageDice, damageType, conditionApplied, radius } = parsed.data
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
      save_dc:           saveDc,
      description:       description        ?? null,
      trigger_type:      triggerType        ?? 'custom',
      damage_dice:       damageDice         ?? null,
      damage_type:       damageType         ?? null,
      condition_applied: conditionApplied   ?? null,
      radius:            radius             ?? 0,
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

  const {
    id, gmWallet, sessionId, isActive, isHidden,
    name, saveType, dc, saveDc, triggerType, damageDice, damageType, conditionApplied, description, radius,
  } = parsed.data
  const db = supabaseAdmin()

  if (!(await verifyGm(db, sessionId, gmWallet))) {
    return NextResponse.json({ error: 'Only the GM can modify triggers' }, { status: 403 })
  }

  const update: Record<string, any> = {}
  if (isActive         !== undefined) update.is_active         = isActive
  if (isHidden         !== undefined) update.is_hidden         = isHidden
  if (name             !== undefined) update.name              = name
  if (saveType         !== undefined) update.save_type         = saveType
  if (dc               !== undefined) update.dc               = dc
  if (saveDc           !== undefined) update.save_dc           = saveDc
  if (triggerType      !== undefined) update.trigger_type      = triggerType
  if (damageDice       !== undefined) update.damage_dice       = damageDice
  if (damageType       !== undefined) update.damage_type       = damageType
  if (conditionApplied !== undefined) update.condition_applied = conditionApplied
  if (description      !== undefined) update.description       = description
  if (radius           !== undefined) update.radius            = radius

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
