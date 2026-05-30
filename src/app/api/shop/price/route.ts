// GET /api/shop/price
// Returns the current DND721/USD price from GeckoTerminal (free, no API key).
// Waterfall: token endpoint → pools endpoint → stale cache → env var fallback.
// Cached in memory for 60 seconds.

import { NextResponse } from 'next/server'

// Preserve mixed-case address in URLs — some APIs are case-sensitive.
const DND721_ADDRESS_RAW   = '0x85878508D21db40D53Aa38571022e6673dabe317'
const DND721_ADDRESS_LOWER = DND721_ADDRESS_RAW.toLowerCase()
const GECKO_TOKEN_URL      = `https://api.geckoterminal.com/api/v2/networks/base/tokens/${DND721_ADDRESS_RAW}`
const GECKO_POOLS_URL      = `https://api.geckoterminal.com/api/v2/networks/base/tokens/${DND721_ADDRESS_RAW}/pools?page=1`
const CACHE_TTL_MS         = 60_000
const FETCH_TIMEOUT_MS     = 8_000
const FALLBACK_PRICE       = Number(process.env.DND721_PRICE_USD_FALLBACK ?? '0.01')

const GECKO_HEADERS = {
  Accept:       'application/json;version=20230302',
  'User-Agent': 'dnd721-shop/1.0 (+https://dnd721.com)',
}

let cachedPrice:    number | null = null
let cacheExpiresAt: number        = 0

export const dynamic = 'force-dynamic'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { signal: controller.signal, headers })
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchGeckoTokenPrice(): Promise<number> {
  const res = await fetchWithTimeout(GECKO_TOKEN_URL, GECKO_HEADERS)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GeckoTerminal token endpoint returned ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = await res.json() as { data?: { attributes?: { price_usd?: string | null } } }
  const raw  = json.data?.attributes?.price_usd
  if (!raw) {
    console.warn('[shop/price] price_usd null on token endpoint. Response:', JSON.stringify(json).slice(0, 500))
    throw new Error('price_usd null on token endpoint')
  }
  const price = Number(raw)
  if (!Number.isFinite(price) || price <= 0) throw new Error(`Invalid price_usd: ${raw}`)
  return price
}

async function fetchGeckoPoolsPrice(): Promise<number> {
  const res = await fetchWithTimeout(GECKO_POOLS_URL, GECKO_HEADERS)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`GeckoTerminal pools endpoint returned ${res.status}: ${body.slice(0, 200)}`)
  }
  type Pool = { attributes?: { token_price_usd?: string | null; reserve_in_usd?: string | null } }
  const json = await res.json() as { data?: Pool[] }
  const pools = (json.data ?? [])
    .map(p => ({
      price:   Number(p.attributes?.token_price_usd ?? ''),
      reserve: Number(p.attributes?.reserve_in_usd  ?? '0'),
    }))
    .filter(p => Number.isFinite(p.price) && p.price > 0)
    .sort((a, b) => b.reserve - a.reserve)

  if (pools.length === 0) throw new Error('No valid pool price found')
  return pools[0]!.price
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  void DND721_ADDRESS_LOWER  // used for future comparisons

  if (cachedPrice !== null && Date.now() < cacheExpiresAt) {
    return NextResponse.json({ priceUsd: cachedPrice, cached: true, source: 'cache' })
  }

  // 1. Try the token endpoint
  try {
    const price    = await fetchGeckoTokenPrice()
    cachedPrice    = price
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
    return NextResponse.json({ priceUsd: price, cached: false, source: 'geckoterminal' })
  } catch (err) {
    console.warn('[shop/price] token endpoint failed:', err instanceof Error ? err.message : err)
  }

  // 2. Try the pools endpoint
  try {
    const price    = await fetchGeckoPoolsPrice()
    cachedPrice    = price
    cacheExpiresAt = Date.now() + CACHE_TTL_MS
    return NextResponse.json({ priceUsd: price, cached: false, source: 'geckoterminal-pools' })
  } catch (err) {
    console.warn('[shop/price] pools endpoint failed:', err instanceof Error ? err.message : err)
  }

  // 3. Stale cache
  if (cachedPrice !== null) {
    return NextResponse.json({ priceUsd: cachedPrice, cached: true, stale: true, source: 'cache' })
  }

  // 4. Env var / hardcoded fallback
  const fallback = Number.isFinite(FALLBACK_PRICE) && FALLBACK_PRICE > 0 ? FALLBACK_PRICE : 0.01
  console.warn('[shop/price] all sources failed — using fallback:', fallback,
    '— set DND721_PRICE_USD_FALLBACK env var to a sensible value')
  return NextResponse.json({ priceUsd: fallback, cached: false, source: 'fallback' })
}
