// POST /api/market/buy
// Records a completed purchase in the DB after on-chain settlement.
//
//   • kind='nft' — the buyer bought through the trustless DND721Market
//     contract: ONE transaction paid the seller and delivered the NFT
//     atomically. We verify the contract's `Sold` event and mark the DB
//     listing sold. (No privileged server-side transfers — the server only
//     reads chain state.)
//   • kind='map' — buyer paid the seller directly (DND721/ETH transfer,
//     verified); we allocate the next numbered edition.
//   • kind='nft_rent' + accepted BUY bid — the owner re-listed the NFT
//     on-chain reserved for the bidder; the bidder buys through the contract
//     (same atomic `Sold` verification).
//   • legacy 'character_rent' buyout — direct payment verified, character
//     row transferred.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'
import { verifyDnd721ToSeller, verifyEthToSeller } from '@/lib/marketVerify'
import { verifyMarketSale, marketContractConfigured } from '@/lib/marketNft'

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'

const Schema = z.object({
  listingId:        z.string().uuid(),
  txHash:           z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  /** buyout: the accepted buy bid being completed */
  bidId:            z.string().uuid().optional(),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `market-buy:${wallet}`), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const { listingId, txHash, bidId } = parsed.data

  const db = supabaseAdmin()

  const { data: listing } = await db.from('market_listings').select('*').eq('id', listingId).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  const L = listing as any
  if (L.status !== 'active') return NextResponse.json({ error: 'Listing is no longer active' }, { status: 409 })
  const seller = String(L.seller_wallet).toLowerCase()
  if (seller === wallet) return NextResponse.json({ error: 'You are the seller' }, { status: 400 })

  // Idempotency across all settlement tables.
  const [{ data: usedEd }, { data: usedRe }, { data: usedTx }] = await Promise.all([
    db.from('map_editions').select('id').eq('tx_hash', txHash).maybeSingle(),
    db.from('market_rentals').select('id').eq('tx_hash', txHash).maybeSingle(),
    db.from('market_listings').select('id').eq('transfer_tx', txHash).maybeSingle(),
  ])
  if (usedEd || usedRe || usedTx) return NextResponse.json({ error: 'Transaction already used' }, { status: 409 })

  // ── NFT sale via the trustless market contract ──────────────────────────────
  if (L.kind === 'nft') {
    if (!L.nft_contract || !L.nft_token_id) {
      return NextResponse.json({ error: 'Listing is missing NFT data' }, { status: 400 })
    }
    if (marketContractConfigured()) {
      // The buyer's tx IS the settlement: atomic pay + deliver via the
      // contract. Verify its Sold event.
      const sale = await verifyMarketSale(txHash, L.nft_contract, L.nft_token_id, seller, wallet, BASE_RPC)
      if (!sale.ok) return NextResponse.json({ error: sale.reason }, { status: 400 })
      await db.from('market_listings').update({
        status: 'sold', buyer_wallet: wallet, transfer_tx: txHash,
      }).eq('id', listingId)
      return NextResponse.json({ ok: true, kind: 'nft', status: 'sold', delivered: true })
    }
    // Legacy fallback (contract not configured): direct payment to seller,
    // then a manual transfer confirmed via /api/market/confirm-transfer.
    const pay = L.currency === 'eth'
      ? await verifyEthToSeller(txHash, Number(L.price_eth), wallet, seller, BASE_RPC)
      : await verifyDnd721ToSeller(txHash, Number(L.price_tokens), wallet, seller, BASE_RPC)
    if (!pay.ok) return NextResponse.json({ error: pay.reason }, { status: pay.status })
    await db.from('market_listings').update({
      status: 'awaiting_transfer', buyer_wallet: wallet,
    }).eq('id', listingId)
    return NextResponse.json({ ok: true, kind: 'nft', status: 'awaiting_transfer' })
  }

  // ── Map edition sale (direct payment to the seller) ─────────────────────────
  if (L.kind === 'map') {
    const pay = L.currency === 'eth'
      ? await verifyEthToSeller(txHash, Number(L.price_eth), wallet, seller, BASE_RPC)
      : await verifyDnd721ToSeller(txHash, Number(L.price_tokens), wallet, seller, BASE_RPC)
    if (!pay.ok) return NextResponse.json({ error: pay.reason }, { status: pay.status })

    const size = Number(L.map_rarity ?? 1)
    const editionNo = Number(L.editions_sold ?? 0) + 1
    if (editionNo > size) return NextResponse.json({ error: 'All editions sold' }, { status: 409 })
    const { error: edErr } = await db.from('map_editions').insert({
      map_id: L.map_id, listing_id: listingId, owner_wallet: wallet,
      edition_no: editionNo, edition_size: size, tx_hash: txHash,
    })
    if (edErr) return NextResponse.json({ error: edErr.message }, { status: 500 })
    await db.from('market_listings').update({
      editions_sold: editionNo,
      ...(editionNo >= size ? { status: 'sold' } : {}),
    }).eq('id', listingId)
    return NextResponse.json({ ok: true, kind: 'map', edition: `${editionNo} of ${size}`, editionNo })
  }

  // ── Rental buyouts require an accepted bid ──────────────────────────────────
  if (!bidId) return NextResponse.json({ error: 'Buyout requires an accepted bid' }, { status: 400 })
  const { data: bidRow } = await db.from('market_bids').select('*').eq('id', bidId).maybeSingle()
  const bid = bidRow as any
  if (!bid || bid.listing_id !== listingId || bid.kind !== 'buy') {
    return NextResponse.json({ error: 'Bid not found for this listing' }, { status: 404 })
  }
  if (String(bid.bidder_wallet).toLowerCase() !== wallet) return NextResponse.json({ error: 'Not your bid' }, { status: 403 })
  if (bid.status !== 'accepted') return NextResponse.json({ error: 'Bid has not been accepted by the owner' }, { status: 409 })

  if (L.kind === 'nft_rent') {
    if (marketContractConfigured() && L.nft_contract && L.nft_token_id) {
      // Owner accepted the bid by listing the NFT on-chain reserved for this
      // bidder; the bidder's buy() tx settled it atomically.
      const sale = await verifyMarketSale(txHash, L.nft_contract, L.nft_token_id, seller, wallet, BASE_RPC)
      if (!sale.ok) return NextResponse.json({ error: sale.reason }, { status: 400 })
      await db.from('market_rentals').update({ status: 'ended' })
        .eq('listing_id', listingId).eq('status', 'active')
      await db.from('market_bids').update({ status: 'completed' }).eq('id', bid.id)
      await db.from('market_listings').update({
        status: 'sold', buyer_wallet: wallet, transfer_tx: txHash,
      }).eq('id', listingId)
      return NextResponse.json({ ok: true, kind: 'nft_buyout', status: 'sold', delivered: true })
    }
    // Legacy fallback: direct payment, then manual transfer.
    const pay = await verifyDnd721ToSeller(txHash, Number(bid.amount), wallet, seller, BASE_RPC)
    if (!pay.ok) return NextResponse.json({ error: pay.reason }, { status: pay.status })
    await db.from('market_rentals').update({ status: 'ended' })
      .eq('listing_id', listingId).eq('status', 'active')
    await db.from('market_bids').update({ status: 'completed' }).eq('id', bid.id)
    await db.from('market_listings').update({
      status: 'awaiting_transfer', buyer_wallet: wallet,
    }).eq('id', listingId)
    return NextResponse.json({ ok: true, kind: 'nft_buyout', status: 'awaiting_transfer' })
  }

  // Legacy character buyout — direct payment verified, character row moves.
  const pay = await verifyDnd721ToSeller(txHash, Number(bid.amount), wallet, seller, BASE_RPC)
  if (!pay.ok) return NextResponse.json({ error: pay.reason }, { status: pay.status })
  await db.from('characters').update({
    wallet_address: wallet, rented_to_wallet: null, rental_ends_at: null,
  }).eq('id', L.character_id)
  await db.from('market_rentals').update({ status: 'ended' })
    .eq('listing_id', listingId).eq('status', 'active')
  await db.from('market_listings').update({ status: 'sold' }).eq('id', listingId)
  await db.from('market_bids').update({ status: 'completed' }).eq('id', bid.id)
  return NextResponse.json({ ok: true, kind: 'character_buy' })
}
