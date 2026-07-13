// GET /api/rewards
// Reward summary: caller's total + recent history, plus the community
// leaderboard (top 20 by points).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  const db = supabaseAdmin()

  const [{ data: leaders }, mine, history] = await Promise.all([
    db.from('reward_totals').select('*').order('total_points', { ascending: false }).limit(20),
    wallet
      ? db.from('reward_totals').select('*').eq('wallet', wallet).maybeSingle()
      : Promise.resolve({ data: null }),
    wallet
      ? db.from('reward_points').select('action, points, note, created_at')
          .eq('wallet', wallet).order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as any[] }),
  ])

  return NextResponse.json({
    me: (mine as any).data ?? (wallet ? { wallet, total_points: 0, awards: 0 } : null),
    history: (history as any).data ?? [],
    leaderboard: leaders ?? [],
  })
}
