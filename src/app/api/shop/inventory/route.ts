// GET /api/shop/inventory
// Returns today's active shop inventory plus the caller's purchase status.
// Wallet identity comes from x-wallet-address header (set by supabase.ts client).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getOrCreateActiveInventory } from '@/lib/shopInventory'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const inventory = await getOrCreateActiveInventory()
    const wallet    = req.headers.get('x-wallet-address')?.toLowerCase() ?? null

    let purchasedToday:  string[]                               = []
    let activeSession:   { id: string; title: string | null } | null = null

    if (wallet) {
      const db   = supabaseAdmin()
      const today = new Date().toISOString().slice(0, 10)

      // Purchases made since midnight UTC today
      const { data: purchases } = await db
        .from('shop_purchases')
        .select('item_id')
        .eq('wallet_address', wallet)
        .gte('created_at', `${today}T00:00:00Z`)

      purchasedToday = (purchases ?? []).map((p) => String(p.item_id))

      // Check if the player is currently in an active session
      const { data: sessionRows } = await db
        .from('session_participants')
        .select('session_id, sessions!inner(id, title, status)')
        .eq('wallet_address', wallet)
        .eq('sessions.status', 'active')
        .limit(1)

      if (sessionRows && sessionRows.length > 0) {
        const row = sessionRows[0] as any
        const s   = row.sessions
        activeSession = { id: String(s.id), title: s.title ?? null }
      }
    }

    return NextResponse.json({
      inventory,
      purchasedToday,
      activeSession,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[shop/inventory] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
