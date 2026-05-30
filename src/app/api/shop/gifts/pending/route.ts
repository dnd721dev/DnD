// GET /api/shop/gifts/pending
// Returns all pending gifts addressed to the authenticated wallet.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }

  const db = supabaseAdmin()

  const { data, error } = await db
    .from('shop_gifts')
    .select('id, item_id, item_name, tier, price_usd, gifter_wallet, created_at, expires_at')
    .eq('recipient_wallet', wallet)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[shop/gifts/pending] fetch error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch gifts' }, { status: 500 })
  }

  return NextResponse.json({ gifts: data ?? [] })
}
