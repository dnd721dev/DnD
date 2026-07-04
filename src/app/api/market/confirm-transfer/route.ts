// POST /api/market/confirm-transfer
// Second step of an NFT sale/buyout: after payment moved the listing to
// 'awaiting_transfer', the SELLER transfers the ERC-721 to the buyer and
// submits the transfer tx here. We verify the on-chain Transfer event
// (contract, tokenId, seller → buyer) and close the sale.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'
import { verifyNftTransfer } from '@/lib/marketNft'

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'

const Schema = z.object({
  listingId: z.string().uuid(),
  txHash:    z.string().regex(/^0x[0-9a-fA-F]{64}$/),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `market-xfer:${wallet}`), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const { listingId, txHash } = parsed.data

  const db = supabaseAdmin()
  const { data: listing } = await db.from('market_listings').select('*').eq('id', listingId).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  const L = listing as any
  if (L.status !== 'awaiting_transfer') return NextResponse.json({ error: 'Listing is not awaiting transfer' }, { status: 409 })
  if (String(L.seller_wallet).toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Only the seller confirms the transfer' }, { status: 403 })
  }
  if (!L.nft_contract || !L.nft_token_id || !L.buyer_wallet) {
    return NextResponse.json({ error: 'Listing is missing NFT/buyer data' }, { status: 400 })
  }

  // Idempotency
  const { data: used } = await db.from('market_listings').select('id').eq('transfer_tx', txHash).maybeSingle()
  if (used) return NextResponse.json({ error: 'Transaction already used' }, { status: 409 })

  const result = await verifyNftTransfer(
    txHash, L.nft_contract, L.nft_token_id,
    L.seller_wallet, L.buyer_wallet, BASE_RPC,
  )
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 })

  await db.from('market_listings').update({ status: 'sold', transfer_tx: txHash }).eq('id', listingId)
  return NextResponse.json({ ok: true, status: 'sold' })
}
