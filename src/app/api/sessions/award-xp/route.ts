import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/** POST /api/sessions/award-xp
 *  Awards XP equally to all CAYA participants in a completed CAYA session.
 *  Body: { session_id: string, xp_amount: number, gm_wallet: string }
 */
export async function POST(req: NextRequest) {
  let body: { session_id?: string; xp_amount?: number; gm_wallet?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { session_id, xp_amount, gm_wallet } = body

  if (!session_id || typeof session_id !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }
  if (!xp_amount || typeof xp_amount !== 'number' || xp_amount <= 0 || !Number.isInteger(xp_amount)) {
    return NextResponse.json({ error: 'xp_amount must be a positive integer' }, { status: 400 })
  }
  if (!gm_wallet || typeof gm_wallet !== 'string') {
    return NextResponse.json({ error: 'gm_wallet required' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Fetch and validate session
  const { data: session, error: sessionErr } = await db
    .from('sessions')
    .select('id, gm_wallet, status, session_type, xp_award')
    .eq('id', session_id)
    .maybeSingle()

  if (sessionErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if ((session.gm_wallet ?? '').toLowerCase() !== gm_wallet.toLowerCase()) {
    return NextResponse.json({ error: 'Only the session GM can award XP' }, { status: 403 })
  }

  if (session.session_type !== 'caya') {
    return NextResponse.json({ error: 'XP awards only apply to CAYA sessions' }, { status: 400 })
  }

  if (session.status !== 'completed') {
    return NextResponse.json({ error: 'Session must be completed before awarding XP' }, { status: 400 })
  }

  // Fetch player participants
  const { data: participants, error: partErr } = await db
    .from('session_participants')
    .select('wallet_address')
    .eq('session_id', session_id)
    .eq('role', 'player')

  if (partErr || !participants?.length) {
    return NextResponse.json({ error: 'No player participants found' }, { status: 400 })
  }

  const wallets = participants.map((p: any) => p.wallet_address)

  // Fetch CAYA characters belonging to participant wallets
  const { data: characters, error: charErr } = await db
    .from('characters')
    .select('id, experience_points')
    .in('wallet_address', wallets)
    .eq('is_caya', true)

  if (charErr) {
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
  }

  if (!characters?.length) {
    return NextResponse.json({ error: 'No CAYA characters found for participants' }, { status: 400 })
  }

  // Update each CAYA character's XP
  const updates = await Promise.all(
    characters.map((char: any) =>
      db
        .from('characters')
        .update({ experience_points: (char.experience_points ?? 0) + xp_amount })
        .eq('id', char.id)
    )
  )

  const updateErrors = updates.filter((r) => r.error)
  if (updateErrors.length > 0) {
    console.error('XP update errors:', updateErrors.map((r) => r.error))
    return NextResponse.json({ error: 'Some XP updates failed' }, { status: 500 })
  }

  // Record xp_award on the session
  await db
    .from('sessions')
    .update({ xp_award: xp_amount })
    .eq('id', session_id)

  return NextResponse.json({
    ok: true,
    awarded_to: characters.length,
    xp_amount,
  })
}
