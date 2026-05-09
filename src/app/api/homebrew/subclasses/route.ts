// src/app/api/homebrew/subclasses/route.ts
//
// GET    — fetch all published homebrew subclasses + current user's own
// POST   — create a new homebrew subclass (validates required fields)
// PATCH  — update an existing subclass (owner only, validated by creator_wallet)
// DELETE — delete a subclass (owner only)

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const REQUIRED_COLS =
  'id, creator_wallet, name, parent_class, subclass_type, description, ' +
  'features, is_published, created_at, updated_at'

function wallet(req: NextRequest): string | null {
  const w = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!w || !/^0x[0-9a-f]{40}$/i.test(w)) return null
  return w
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest): Promise<Response> {
  const db = supabaseAdmin()
  const w = req.headers.get('x-wallet-address')?.toLowerCase() ?? null

  let query = db
    .from('homebrew_subclasses')
    .select(REQUIRED_COLS)
    .order('parent_class')
    .order('name')

  if (w && /^0x[0-9a-f]{40}$/i.test(w)) {
    query = query.or(`is_published.eq.true,creator_wallet.eq.${w}`)
  } else {
    query = query.eq('is_published', true)
  }

  const { data, error } = await query
  if (error) {
    console.error('[homebrew/subclasses GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ subclasses: data ?? [] })
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

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!body.parent_class || typeof body.parent_class !== 'string' || !body.parent_class.trim()) {
    return NextResponse.json({ error: 'parent_class is required' }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    creator_wallet: w,
    name:           String(body.name).trim(),
    parent_class:   String(body.parent_class).trim(),
    subclass_type:  body.subclass_type ? String(body.subclass_type).trim() : null,
    description:    body.description   ? String(body.description)          : null,
    features:       Array.isArray(body.features) ? body.features : [],
    is_published:   body.is_published !== false,
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('homebrew_subclasses')
    .insert(payload)
    .select(REQUIRED_COLS)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[homebrew/subclasses POST]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ subclass: data }, { status: 201 })
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
    .from('homebrew_subclasses')
    .select('creator_wallet')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Subclass not found' }, { status: 404 })
  if ((existing as any).creator_wallet !== w) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: _id, creator_wallet: _cw, ...updates } = body
  const payload = { ...updates, updated_at: new Date().toISOString() }

  const { data, error } = await db
    .from('homebrew_subclasses')
    .update(payload)
    .eq('id', id)
    .select(REQUIRED_COLS)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[homebrew/subclasses PATCH]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ subclass: data })
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
    .from('homebrew_subclasses')
    .select('creator_wallet')
    .eq('id', id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Subclass not found' }, { status: 404 })
  if ((existing as any).creator_wallet !== w) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await db.from('homebrew_subclasses').delete().eq('id', id)
  if (error) {
    console.error('[homebrew/subclasses DELETE]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
