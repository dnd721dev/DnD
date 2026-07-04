// POST /api/market/rent
// Starts a character rental after the renter paid the OWNER on-chain in
// DND721 (per-day price × days). Also completes an accepted RE-RENT bid
// (bidId) whose negotiated per-day rate replaces the listing rate.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'
import { verifyDnd721ToSeller } from '@/lib/marketVerify'

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'

const Schema = z.object({
  listingId: z.string().uuid(),
  days:      z.number().int().min(1).max(365),
  txHash:    z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  bidId:     z.string().uuid().optional(),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `market-rent:${wallet}`), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const { listingId, days, txHash, bidId } = parsed.data

  const db = supabaseAdmin()
  const { data: listing } = await db.from('market_listings').select('*').eq('id', listingId).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  const L = listing as any
  if (L.kind !== 'character_rent') return NextResponse.json({ error: 'Not a rental listing' }, { status: 400 })
  if (L.status !== 'active') return NextResponse.json({ error: 'Listing is no longer active' }, { status: 409 })
  const owner = String(L.seller_wallet).toLowerCase()
  if (owner === wallet) return NextResponse.json({ error: 'You own this character' }, { status: 400 })

  // Character must not be in an active rental.
  const { data: activeRental } = await db.from('market_rentals')
    .select('id, ends_at').eq('character_id', L.character_id).eq('status', 'active')
    .gt('ends_at', new Date().toISOString()).maybeSingle()
  if (activeRental) return NextResponse.json({ error: 'Character is currently rented' }, { status: 409 })

  // Idempotency
  const { data: used } = await db.from('market_rentals').select('id').eq('tx_hash', txHash).maybeSingle()
  if (used) return NextResponse.json({ error: 'Transaction already used' }, { status: 409 })

  // Rate: listing rate, or an accepted re-rent bid's negotiated rate.
  let perDay = Number(L.rent_per_day)
  let maxDays = Number(L.rent_max_days ?? 365)
  if (bidId) {
    const { data: bid } = await db.from('market_bids').select('*').eq('id', bidId).maybeSingle()
    if (!bid || (bid as any).listing_id !== listingId || (bid as any).kind !== 're_rent') {
      return NextResponse.json({ error: 'Bid not found for this listing' }, { status: 404 })
    }
    if (String((bid as any).bidder_wallet).toLowerCase() !== wallet) return NextResponse.json({ error: 'Not your bid' }, { status: 403 })
    if ((bid as any).status !== 'accepted') return NextResponse.json({ error: 'Bid has not been accepted' }, { status: 409 })
    perDay = Number((bid as any).amount)
    maxDays = Number((bid as any).days ?? maxDays)
  }
  if (days > maxDays) return NextResponse.json({ error: `Maximum rental is ${maxDays} days` }, { status: 400 })

  const totalTokens = perDay * days
  const result = await verifyDnd721ToSeller(txHash, totalTokens, wallet, owner, BASE_RPC)
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.status })

  const startsAt = new Date()
  const endsAt = new Date(startsAt.getTime() + days * 24 * 60 * 60 * 1000)

  const { data: rental, error: rentErr } = await db.from('market_rentals').insert({
    listing_id: listingId,
    character_id: L.character_id,
    owner_wallet: owner,
    renter_wallet: wallet,
    per_day: perDay,
    days,
    total_tokens: totalTokens,
    tx_hash: txHash,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: 'active',
  }).select().single()
  if (rentErr) return NextResponse.json({ error: rentErr.message }, { status: 500 })

  // Grant the renter play access (RLS lets the renter update while active).
  await db.from('characters').update({
    rented_to_wallet: wallet,
    rental_ends_at: endsAt.toISOString(),
  }).eq('id', L.character_id)

  if (bidId) await db.from('market_bids').update({ status: 'completed' }).eq('id', bidId)

  return NextResponse.json({ ok: true, rental })
}
