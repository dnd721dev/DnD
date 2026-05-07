// src/app/api/homebrew/monsters/route.ts
//
// GET    — fetch all published homebrew monsters + current user's own monsters
// POST   — create a new homebrew monster (validates required fields)
// PATCH  — update an existing monster (owner only, validated by creator_wallet)
// DELETE — delete a monster (owner only)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const REQUIRED_COLS =
  'id, creator_wallet, name, cr, xp, size, type, subtype, alignment, ' +
  'ac, hp, hit_dice, speed, str, dex, con, int_score, wis, cha, ' +
  'saving_throws, skills, damage_resistances, damage_immunities, ' +
  'damage_vulnerabilities, condition_immunities, senses, languages, ' +
  'traits, actions, bonus_actions, reactions, legendary_actions, ' +
  'legendary_action_count, token_image_url, description, is_published, ' +
  'created_at, updated_at'

function wallet(req: NextRequest): string | null {
  const w = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!w || !/^0x[0-9a-f]{40}$/i.test(w)) return null
  return w
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<Response> {
  const db = supabaseAdmin()
  const w = req.headers.get('x-wallet-address')?.toLowerCase() ?? null

  // Build query: all published + current user's drafts
  let query = db
    .from('homebrew_monsters')
    .select(REQUIRED_COLS)
    .order('name')

  if (w && /^0x[0-9a-f]{40}$/i.test(w)) {
    // Fetch published OR own monsters
    query = query.or(`is_published.eq.true,creator_wallet.eq.${w}`)
  } else {
    query = query.eq('is_published', true)
  }

  const { data, error } = await query
  if (error) {
    console.error('[homebrew/monsters GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ monsters: data ?? [] })
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<Response> {
  const w = wallet(req)
  if (!w) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Required field validation
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (body.ac == null) {
    return NextResponse.json({ error: 'ac (Armor Class) is required' }, { status: 400 })
  }
  if (body.hp == null) {
    return NextResponse.json({ error: 'hp (Hit Points) is required' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    creator_wallet:         w,
    name:                   String(body.name).trim(),
    cr:                     body.cr ?? '0',
    xp:                     body.xp ?? null,
    size:                   body.size ?? null,
    type:                   body.type ?? null,
    subtype:                body.subtype ?? null,
    alignment:              body.alignment ?? null,
    ac:                     Number(body.ac),
    hp:                     Number(body.hp),
    hit_dice:               body.hit_dice ?? null,
    speed:                  body.speed ?? null,
    str:                    Number(body.str ?? 10),
    dex:                    Number(body.dex ?? 10),
    con:                    Number(body.con ?? 10),
    int_score:              Number(body.int_score ?? 10),
    wis:                    Number(body.wis ?? 10),
    cha:                    Number(body.cha ?? 10),
    saving_throws:          body.saving_throws ?? {},
    skills:                 body.skills ?? [],
    damage_resistances:     body.damage_resistances ?? null,
    damage_immunities:      body.damage_immunities ?? null,
    damage_vulnerabilities: body.damage_vulnerabilities ?? null,
    condition_immunities:   body.condition_immunities ?? [],
    senses:                 body.senses ?? null,
    languages:              body.languages ?? null,
    traits:                 body.traits ?? [],
    actions:                body.actions ?? [],
    bonus_actions:          body.bonus_actions ?? [],
    reactions:              body.reactions ?? [],
    legendary_actions:      body.legendary_actions ?? [],
    legendary_action_count: Number(body.legendary_action_count ?? 3),
    token_image_url:        body.token_image_url ?? null,
    description:            body.description ?? null,
    is_published:           body.is_published !== false,
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('homebrew_monsters')
    .insert(payload)
    .select(REQUIRED_COLS)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[homebrew/monsters POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ monster: data }, { status: 201 })
}

// ── PATCH ─────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest): Promise<Response> {
  const w = wallet(req)
  if (!w) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const id = body.id
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Verify ownership
  const { data: existing } = await db
    .from('homebrew_monsters')
    .select('creator_wallet')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Monster not found' }, { status: 404 })
  if ((existing as any).creator_wallet !== w) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Build update (exclude id and creator_wallet)
  const { id: _id, creator_wallet: _cw, ...updates } = body
  const payload = { ...updates, updated_at: new Date().toISOString() }

  const { data, error } = await db
    .from('homebrew_monsters')
    .update(payload)
    .eq('id', id)
    .select(REQUIRED_COLS)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[homebrew/monsters PATCH]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ monster: data })
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest): Promise<Response> {
  const w = wallet(req)
  if (!w) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 })

  const db = supabaseAdmin()

  // Verify ownership
  const { data: existing } = await db
    .from('homebrew_monsters')
    .select('creator_wallet')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Monster not found' }, { status: 404 })
  if ((existing as any).creator_wallet !== w) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await db.from('homebrew_monsters').delete().eq('id', id)
  if (error) {
    console.error('[homebrew/monsters DELETE]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
