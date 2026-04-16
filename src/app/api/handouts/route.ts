import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const CreateHandoutSchema = z.object({
  sessionId: z.string().uuid(),
  uploaderWallet: z.string().min(1),
  title: z.string().min(1).max(120),
  content: z.string().min(1).max(4000),
  contentType: z.enum(['text', 'image', 'url']).default('text'),
})

const ToggleRevealSchema = z.object({
  id: z.string().uuid(),
  revealed: z.boolean(),
  gmWallet: z.string().min(1),
})

/** GET /api/handouts?sessionId=&gmWallet= — returns all (GM) or revealed (players) */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const sessionId = searchParams.get('sessionId')
  const gmWallet = searchParams.get('gmWallet')?.toLowerCase() ?? null

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const db = supabaseAdmin()

  // If gmWallet provided, verify they're the GM before returning hidden ones
  let isGm = false
  if (gmWallet) {
    const { data: session } = await db
      .from('sessions')
      .select('gm_wallet')
      .eq('id', sessionId)
      .maybeSingle()
    isGm = session?.gm_wallet?.toLowerCase() === gmWallet
  }

  let query = db
    .from('session_handouts')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (!isGm) {
    query = query.eq('revealed', true)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ handouts: data ?? [] })
}

/** POST /api/handouts — create a handout (GM only) */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(rateLimitKey(req, 'handouts'), { limit: 30, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = CreateHandoutSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { sessionId, uploaderWallet, title, content, contentType } = parsed.data
  const wallet = uploaderWallet.toLowerCase()

  // Verify the requester is the session GM
  const db = supabaseAdmin()
  const { data: session } = await db.from('sessions').select('gm_wallet').eq('id', sessionId).maybeSingle()
  if (!session || session.gm_wallet?.toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Only the GM can create handouts' }, { status: 403 })
  }

  const { data, error } = await db
    .from('session_handouts')
    .insert({ session_id: sessionId, uploader_wallet: wallet, title, content, content_type: contentType })
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ handout: data }, { status: 201 })
}

/** PATCH /api/handouts — toggle revealed (GM only) */
export async function PATCH(req: NextRequest) {
  const parsed = ToggleRevealSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { id, revealed, gmWallet } = parsed.data
  const wallet = gmWallet.toLowerCase()

  const db = supabaseAdmin()

  // Verify caller is the session GM
  const { data: handout } = await db
    .from('session_handouts')
    .select('session_id')
    .eq('id', id)
    .maybeSingle()

  if (!handout) return NextResponse.json({ error: 'Handout not found' }, { status: 404 })

  const { data: session } = await db
    .from('sessions')
    .select('gm_wallet')
    .eq('id', handout.session_id)
    .maybeSingle()

  if (!session || session.gm_wallet?.toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Only the GM can reveal handouts' }, { status: 403 })
  }

  const { data, error } = await db
    .from('session_handouts')
    .update({ revealed })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ handout: data })
}

/** DELETE /api/handouts?id=&gmWallet= */
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  const gmWallet = searchParams.get('gmWallet')?.toLowerCase() ?? null

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!gmWallet) return NextResponse.json({ error: 'gmWallet required' }, { status: 400 })

  const db = supabaseAdmin()

  // Fetch the handout to get the session, then verify the caller is the session GM
  const { data: handout } = await db
    .from('session_handouts')
    .select('session_id')
    .eq('id', id)
    .maybeSingle()

  if (!handout) return NextResponse.json({ error: 'Handout not found' }, { status: 404 })

  const { data: session } = await db
    .from('sessions')
    .select('gm_wallet')
    .eq('id', handout.session_id)
    .maybeSingle()

  if (!session || session.gm_wallet?.toLowerCase() !== gmWallet) {
    return NextResponse.json({ error: 'Only the GM can delete handouts' }, { status: 403 })
  }

  const { error } = await db.from('session_handouts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
