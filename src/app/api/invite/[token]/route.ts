// GET /api/invite/[token]
// Public, unauthenticated preview of an invite — what campaign/session it joins
// and whether it's still valid. Resolved via the service role (token is the secret).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { inviteStatusOf, type InviteRow } from '@/lib/inviteServer'

type Params = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Params): Promise<Response> {
  const { token } = await params
  const db = supabaseAdmin()

  const { data: invite } = await db
    .from('invites')
    .select('id, token, campaign_id, session_id, role, max_uses, uses, expires_at, revoked')
    .eq('token', token)
    .maybeSingle()

  if (!invite) return NextResponse.json({ status: 'not_found' }, { status: 404 })

  const status = inviteStatusOf(invite as InviteRow)

  const { data: campaign } = await db
    .from('campaigns')
    .select('id, title, campaign_type')
    .eq('id', (invite as any).campaign_id)
    .maybeSingle()

  let session: { id: string; title: string | null; scheduled_start: string | null; status: string } | null = null
  if ((invite as any).session_id) {
    const { data: s } = await db
      .from('sessions')
      .select('id, title, scheduled_start, status')
      .eq('id', (invite as any).session_id)
      .maybeSingle()
    session = (s as any) ?? null
  }

  return NextResponse.json({
    status,
    role: (invite as any).role,
    campaign: campaign
      ? { id: (campaign as any).id, title: (campaign as any).title, campaign_type: (campaign as any).campaign_type ?? 'set_level' }
      : null,
    session,
  })
}
