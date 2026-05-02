// GET /api/shop/price
// Returns the current DND721/USD price from DexScreener.
// Cached in memory for 60 seconds to avoid hammering the free API.

import { NextResponse } from 'next/server'

const DND721_ADDRESS = '0x85878508D21db40D53Aa38571022e6673dabe317'.toLowerCase()
const CACHE_TTL_MS   = 60_000  // 60 seconds

let cachedPrice:     number | null = null
let cacheExpiresAt:  number        = 0

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  // Return cached price if still valid
  if (cachedPrice !== null && Date.now() < cacheExpiresAt) {
    return NextResponse.json({ priceUsd: cachedPrice, cached: true })
  }

  try {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 5_000)

    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${DND721_ADDRESS}`,
      { signal: controller.signal },
    )
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`DexScreener returned ${res.status}`)

    const json = await res.json() as {
      pairs?: Array<{ priceUsd?: string; liquidity?: { usd?: number } }>
    }

    const pairs = json.pairs ?? []
    if (pairs.length === 0) throw new Error('No pairs found for DND721')

    // Pick the pair with the highest USD liquidity
    const best = pairs
      .filter((p) => p.priceUsd && Number(p.priceUsd) > 0)
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0]

    if (!best?.priceUsd) throw new Error('No valid price found')

    const price = Number(best.priceUsd)
    cachedPrice    = price
    cacheExpiresAt = Date.now() + CACHE_TTL_MS

    return NextResponse.json({ priceUsd: price, cached: false })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[shop/price] DexScreener fetch failed:', msg)

    // Return last known price if available
    if (cachedPrice !== null) {
      return NextResponse.json({ priceUsd: cachedPrice, cached: true, stale: true })
    }

    // Absolute fallback: return null so the UI can show a warning
    return NextResponse.json(
      { priceUsd: null, error: 'Price unavailable' },
      { status: 503 },
    )
  }
}
