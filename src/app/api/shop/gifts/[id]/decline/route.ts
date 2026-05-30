// POST /api/shop/gifts/[id]/decline
// Recipient declines a pending gift. No inventory changes.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }

  const db              = supabaseAdmin()
  const { id: giftId } = await params

  const { data: gift, error: giftErr } = await db
    .from('shop_gifts')
    .select('id, recipient_wallet, status')
    .eq('id', giftId)
    .maybeSingle()

  if (giftErr || !gift) {
    return NextResponse.json({ error: 'Gift not found' }, { status: 404 })
  }
  if ((gift as any).recipient_wallet !== wallet) {
    return NextResponse.json({ error: 'This gift is not addressed to you' }, { status: 403 })
  }
  if ((gift as any).status !== 'pending') {
    return NextResponse.json({ error: `Gift already ${(gift as any).status}` }, { status: 409 })
  }

  const { error: updateErr } = await db
    .from('shop_gifts')
    .update({ status: 'declined' })
    .eq('id', giftId)

  if (updateErr) {
    console.error('[shop/gifts/decline] update error:', updateErr.message)
    return NextResponse.json({ error: 'Failed to decline gift' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
