// GET /api/shop/price
// Returns the current DND721/USD price from GeckoTerminal (free, no API key).
// Falls back to DND721_PRICE_USD_FALLBACK env var if GeckoTerminal is unavailable.
// Cached in memory for 60 seconds.

import { NextResponse } from 'next/server'

const DND721_ADDRESS = '0x85878508D21db40D53Aa38571022e6673dabe317'.toLowerCase()
const GECKO_URL      = `https://api.geckoterminal.com/api/v2/networks/base/tokens/${DND721_ADDRESS}`
const CACHE_TTL_MS   = 60_000
const FALLBACK_PRICE = Number(process.env.DND721_PRICE_USD_FALLBACK ?? '0.01')

let cachedPrice:    number | null = null
let cacheExpiresAt: number        = 0

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  if (cachedPrice !== null && Date.now() < cacheExpiresAt) {
    return NextResponse.json({ priceUsd: cachedPrice, cached: true, source: 'cache' })
  }

  try {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 5_000)

    const res = await fetch(GECKO_URL, {
      signal:  controller.signal,
      headers: { Accept: 'application/json;version=20230302' },
    })
    clearTimeout(timeout)

    if (!res.ok) throw new Error(`GeckoTerminal returned ${res.status}`)

    const json = await res.json() as {
      data?: { attributes?: { price_usd?: string | null } }
    }

    const raw = json.data?.attributes?.price_usd
    if (!raw) throw new Error('No price_usd in GeckoTerminal response')

    const price = Number(raw)
    if (!Number.isFinite(price) || price <= 0) throw new Error(`Invalid price: ${raw}`)

    cachedPrice    = price
    cacheExpiresAt = Date.now() + CACHE_TTL_MS

    return NextResponse.json({ priceUsd: price, cached: false, source: 'geckoterminal' })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.warn('[shop/price] GeckoTerminal fetch failed:', msg)

    if (cachedPrice !== null) {
      return NextResponse.json({ priceUsd: cachedPrice, cached: true, stale: true, source: 'cache' })
    }

    const fallback = Number.isFinite(FALLBACK_PRICE) && FALLBACK_PRICE > 0 ? FALLBACK_PRICE : 0.01
    console.warn('[shop/price] using fallback price:', fallback)
    return NextResponse.json({ priceUsd: fallback, cached: false, source: 'fallback' })
  }
}
