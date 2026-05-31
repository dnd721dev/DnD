// POST /api/invite/[token]/accept
// The connected wallet accepts an invite: joins the campaign (and the session,
// for session invites). Idempotent. Wallet is taken from the verified JWT.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { walletFromRequest, inviteStatusOf, type InviteRow } from '@/lib/inviteServer'

type Params = { params: Promise<{ token: string }> }

export async function POST(req: NextRequest, { params }: Params): Promise<Response> {
  const { token } = await params
  const wallet = walletFromRequest(req)
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const db = supabaseAdmin()

  const { data: inviteRow } = await db
    .from('invites')
    .select('id, token, campaign_id, session_id, role, max_uses, uses, expires_at, revoked')
    .eq('token', token)
    .maybeSingle()
  if (!inviteRow) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })

  const invite = inviteRow as InviteRow
  const status = inviteStatusOf(invite)
  if (status !== 'valid') return NextResponse.json({ error: `Invite ${status}` }, { status: 409 })

  const role = invite.role === 'gm' ? 'gm' : 'player'

  // Join the campaign (idempotent).
  const { error: cpErr } = await db
    .from('campaign_participants')
    .upsert(
      { campaign_id: invite.campaign_id, wallet_address: wallet, role },
      { onConflict: 'campaign_id,wallet_address' },
    )
  if (cpErr) {
    console.error('[invite/accept] campaign join error:', cpErr.message)
    return NextResponse.json({ error: 'Failed to join campaign' }, { status: 500 })
  }

  // Join the session too, for session invites (idempotent).
  if (invite.session_id) {
    const { error: spErr } = await db
      .from('session_players')
      .upsert(
        { session_id: invite.session_id, wallet_address: wallet, role },
        { onConflict: 'session_id,wallet_address' },
      )
    if (spErr) {
      console.error('[invite/accept] session join error:', spErr.message)
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 })
    }
  }

  // Count the use (best-effort; not transactional but adequate for soft limits).
  await db.from('invites').update({ uses: invite.uses + 1 }).eq('id', invite.id)

  // Does this player still need to pick a campaign character?
  let needsCharacter = false
  if (role === 'player') {
    const { count } = await db
      .from('campaign_character_selections')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', invite.campaign_id)
      .eq('wallet_address', wallet)
    needsCharacter = !count || count === 0
  }

  return NextResponse.json({
    ok: true,
    campaignId: invite.campaign_id,
    sessionId: invite.session_id,
    role,
    needsCharacter,
  })
}
