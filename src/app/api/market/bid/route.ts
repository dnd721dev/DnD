// /api/market/bid
// POST — a renter (or prospective renter) submits an end-of-rental bid on a
//        character listing: RE-RENT (amount = tokens/day, days = length) or
//        BUY (amount = total DND721 offer).
// PATCH — the owner accepts or declines a pending bid. Accepting a re-rent
//        bid lets the bidder complete via /api/market/rent (bidId); accepting
//        a buy bid lets them complete via /api/market/buy (bidId).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const CreateSchema = z.object({
  listingId: z.string().uuid(),
  kind:      z.enum(['re_rent', 'buy']),
  amount:    z.number().positive(),
  days:      z.number().int().min(1).max(365).optional(),
  message:   z.string().max(280).optional(),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `market-bid:${wallet}`), { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const { listingId, kind, amount, days, message } = parsed.data
  if (kind === 're_rent' && !days) return NextResponse.json({ error: 'days required for a re-rent bid' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: listing } = await db.from('market_listings').select('*').eq('id', listingId).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  const L = listing as any
  if (L.kind !== 'character_rent') return NextResponse.json({ error: 'Bids apply to character rental listings' }, { status: 400 })
  if (String(L.seller_wallet).toLowerCase() === wallet) return NextResponse.json({ error: 'You own this listing' }, { status: 400 })

  // Attach the bidder's most recent rental of this character (context for the owner).
  const { data: lastRental } = await db.from('market_rentals')
    .select('id').eq('listing_id', listingId).eq('renter_wallet', wallet)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  const { data: bid, error } = await db.from('market_bids').insert({
    listing_id: listingId,
    rental_id: (lastRental as any)?.id ?? null,
    bidder_wallet: wallet,
    kind,
    amount,
    days: days ?? null,
    message: message ?? null,
    status: 'pending',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, bid }, { status: 201 })
}

const RespondSchema = z.object({
  bidId:  z.string().uuid(),
  accept: z.boolean(),
})

export async function PATCH(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })

  const parsed = RespondSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const { bidId, accept } = parsed.data

  const db = supabaseAdmin()
  const { data: bid } = await db.from('market_bids').select('*').eq('id', bidId).maybeSingle()
  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
  const B = bid as any
  if (B.status !== 'pending') return NextResponse.json({ error: 'Bid already resolved' }, { status: 409 })

  const { data: listing } = await db.from('market_listings').select('seller_wallet').eq('id', B.listing_id).maybeSingle()
  if (!listing || String((listing as any).seller_wallet).toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Only the owner can respond to bids' }, { status: 403 })
  }

  await db.from('market_bids').update({ status: accept ? 'accepted' : 'declined' }).eq('id', bidId)
  return NextResponse.json({ ok: true, status: accept ? 'accepted' : 'declined' })
}
