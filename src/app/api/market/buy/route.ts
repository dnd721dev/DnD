// POST /api/market/buy
// Completes a purchase after the buyer paid the SELLER on-chain (DND721 or ETH).
//   • kind='item' — moves the item from the seller's character inventory to the
//     buyer's chosen character; listing → sold.
//   • kind='map'  — allocates the next numbered edition (1 of {rarity}) to the
//     buyer; listing → sold once all editions are gone.
//   • kind='character_rent' + an ACCEPTED buy bid — transfers the character to
//     the buyer outright (wallet_address changes hands); listing → sold.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'
import { verifyDnd721ToSeller, verifyEthToSeller } from '@/lib/marketVerify'

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'

const Schema = z.object({
  listingId:        z.string().uuid(),
  txHash:           z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  /** item purchases: which of the buyer's characters receives the item */
  buyerCharacterId: z.string().uuid().optional(),
  /** character buyout: the accepted buy bid being completed */
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
  const { listingId, txHash, buyerCharacterId, bidId } = parsed.data

  const db = supabaseAdmin()

  const { data: listing } = await db.from('market_listings').select('*').eq('id', listingId).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  const L = listing as any
  if (L.status !== 'active') return NextResponse.json({ error: 'Listing is no longer active' }, { status: 409 })
  const seller = String(L.seller_wallet).toLowerCase()
  if (seller === wallet) return NextResponse.json({ error: 'You are the seller' }, { status: 400 })

  // Idempotency across all settlement tables.
  const [{ data: usedEd }, { data: usedRe }] = await Promise.all([
    db.from('map_editions').select('id').eq('tx_hash', txHash).maybeSingle(),
    db.from('market_rentals').select('id').eq('tx_hash', txHash).maybeSingle(),
  ])
  if (usedEd || usedRe) return NextResponse.json({ error: 'Transaction already used' }, { status: 409 })

  // ── Determine expected price ────────────────────────────────────────────────
  let expectedTokens: number | null = null
  let expectedEth: number | null = null
  let bid: any = null

  if (L.kind === 'character_rent') {
    if (!bidId) return NextResponse.json({ error: 'Character buyout requires an accepted bid' }, { status: 400 })
    const { data } = await db.from('market_bids').select('*').eq('id', bidId).maybeSingle()
    bid = data
    if (!bid || bid.listing_id !== listingId || bid.kind !== 'buy') {
      return NextResponse.json({ error: 'Bid not found for this listing' }, { status: 404 })
    }
    if (String(bid.bidder_wallet).toLowerCase() !== wallet) return NextResponse.json({ error: 'Not your bid' }, { status: 403 })
    if (bid.status !== 'accepted') return NextResponse.json({ error: 'Bid has not been accepted by the owner' }, { status: 409 })
    expectedTokens = Number(bid.amount) // buyouts settle in DND721
  } else if (L.currency === 'dnd721') {
    expectedTokens = Number(L.price_tokens)
  } else {
    expectedEth = Number(L.price_eth)
  }

  // ── Verify payment to the seller ────────────────────────────────────────────
  const result = expectedTokens != null
    ? await verifyDnd721ToSeller(txHash, expectedTokens, wallet, seller, BASE_RPC)
    : await verifyEthToSeller(txHash, expectedEth!, wallet, seller, BASE_RPC)
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.status })

  // ── Apply effects ───────────────────────────────────────────────────────────
  if (L.kind === 'item') {
    if (!buyerCharacterId) return NextResponse.json({ error: 'buyerCharacterId required' }, { status: 400 })
    const { data: buyerChar } = await db.from('characters')
      .select('id, wallet_address, inventory_items').eq('id', buyerCharacterId).maybeSingle()
    if (!buyerChar || String((buyerChar as any).wallet_address).toLowerCase() !== wallet) {
      return NextResponse.json({ error: 'Not your character' }, { status: 403 })
    }
    // Remove one from the seller character's inventory…
    if (L.source_character_id) {
      const { data: srcChar } = await db.from('characters')
        .select('id, inventory_items').eq('id', L.source_character_id).maybeSingle()
      if (srcChar) {
        const inv: any[] = Array.isArray((srcChar as any).inventory_items) ? (srcChar as any).inventory_items : []
        const next = inv
          .map((i) => i.key === L.item_key ? { ...i, qty: Math.max(0, (i.qty ?? 1) - 1) } : i)
          .filter((i) => (i.qty ?? 0) > 0)
        await db.from('characters').update({ inventory_items: next }).eq('id', L.source_character_id)
      }
    }
    // …and give it to the buyer's character.
    const inv: any[] = Array.isArray((buyerChar as any).inventory_items) ? (buyerChar as any).inventory_items : []
    const idx = inv.findIndex((i) => i.key === L.item_key)
    const next = idx >= 0
      ? inv.map((i, n) => n === idx ? { ...i, qty: (i.qty ?? 0) + 1 } : i)
      : [{ key: L.item_key, name: L.item_name, qty: 1, kind: 'misc' }, ...inv]
    await db.from('characters').update({ inventory_items: next }).eq('id', buyerCharacterId)
    await db.from('market_listings').update({ status: 'sold' }).eq('id', listingId)
    return NextResponse.json({ ok: true, kind: 'item', itemName: L.item_name })
  }

  if (L.kind === 'map') {
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
    return NextResponse.json({ ok: true, kind: 'map', edition: `${editionNo} of ${size}` })
  }

  // character buyout (accepted bid, payment verified above)
  await db.from('characters').update({
    wallet_address: wallet, rented_to_wallet: null, rental_ends_at: null,
  }).eq('id', L.character_id)
  await db.from('market_rentals').update({ status: 'ended' })
    .eq('listing_id', listingId).eq('status', 'active')
  await db.from('market_listings').update({ status: 'sold' }).eq('id', listingId)
  await db.from('market_bids').update({ status: 'completed' }).eq('id', bid.id)
  return NextResponse.json({ ok: true, kind: 'character_buy' })
}
