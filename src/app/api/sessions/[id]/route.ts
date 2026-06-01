import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await ctx.params

  let wallet = ''
  try {
    const body = await req.json()
    wallet = String(body.wallet ?? '').toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: session, error: fetchErr } = await db
    .from('sessions')
    .select('id, gm_wallet')
    .eq('id', sessionId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[DELETE session] fetch error', fetchErr)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (String(session.gm_wallet ?? '').toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Not your session' }, { status: 403 })
  }

  const { error: deleteErr } = await db
    .from('sessions')
    .delete()
    .eq('id', sessionId)

  if (deleteErr) {
    console.error('[DELETE session] delete error', deleteErr)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
