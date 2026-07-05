// POST /api/maps/sync-editions
// Fire-and-forget reconciliation of minted map editions against on-chain
// token ownership (see src/lib/mapEditionSync.ts). Called when the map
// library loads so access revocations/grants from external NFT sales
// (e.g. OpenSea) take effect promptly. Throttled per edition server-side.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { syncMintedEditions } from '@/lib/mapEditionSync'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest): Promise<Response> {
  const rl = checkRateLimit(rateLimitKey(req, 'maps-sync'), { limit: 12, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const mapId = req.nextUrl.searchParams.get('mapId') ?? undefined
  try {
    await syncMintedEditions(supabaseAdmin(), { mapId })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[maps/sync-editions] failed', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
