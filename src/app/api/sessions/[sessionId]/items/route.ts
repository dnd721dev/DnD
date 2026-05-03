// GET /api/sessions/[sessionId]/items
// Returns session_items split into toRemove / toKeep for the DM end-session modal.
// DM-only.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getSessionItemPreview } from '@/lib/sessionItemProcessor'

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }

  const { sessionId } = params
  const db = supabaseAdmin()

  // DM guard
  const { data: session } = await db
    .from('sessions')
    .select('gm_wallet')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (String((session as any).gm_wallet ?? '').toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'GM only' }, { status: 403 })
  }

  try {
    const preview = await getSessionItemPreview(sessionId)
    return NextResponse.json(preview)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
