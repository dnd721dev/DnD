// POST /api/maps/mint-record
// Records an on-chain DND721Maps mint in the DB after verifying the tx.
//   • edition omitted/0 → the CREATOR minted their own copy: updates the
//     maps row's mint_* columns (from migration 046).
//   • edition N → a buyer minted their numbered edition: updates their
//     map_editions row (token_id + mint_tx, migration 058).
//
// Verification: the tx must contain the maps contract's Transfer event from
// the zero address (a mint) to the caller's wallet; the token id is read
// from that event — the client never supplies it.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient, http, decodeEventLog } from 'viem'
import { base } from 'viem/chains'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'
const MAPS_NFT_ADDRESS = (process.env.NEXT_PUBLIC_MAPS_NFT_ADDRESS ?? '').toLowerCase()
const ZERO = '0x0000000000000000000000000000000000000000'

const TRANSFER_ABI = [{
  name: 'Transfer',
  type: 'event' as const,
  inputs: [
    { name: 'from',    type: 'address' as const, indexed: true },
    { name: 'to',      type: 'address' as const, indexed: true },
    { name: 'tokenId', type: 'uint256' as const, indexed: true },
  ],
}]

const Schema = z.object({
  mapId:   z.string().uuid(),
  txHash:  z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  edition: z.number().int().min(0).max(100000).optional(),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `maps-mint:${wallet}`), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  if (!/^0x[0-9a-f]{40}$/.test(MAPS_NFT_ADDRESS)) {
    return NextResponse.json({ error: 'Maps NFT contract not configured' }, { status: 503 })
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const { mapId, txHash } = parsed.data
  const edition = parsed.data.edition ?? 0

  const db = supabaseAdmin()

  // ── Verify the mint on-chain and extract the token id ───────────────────────
  let tokenId: string | null = null
  try {
    const client = createPublicClient({ chain: base, transport: http(BASE_RPC) })
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })
    if (receipt.status !== 'success') return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 })
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== MAPS_NFT_ADDRESS) continue
      try {
        const decoded = decodeEventLog({ abi: TRANSFER_ABI, data: log.data, topics: log.topics })
        const args = decoded.args as { from: string; to: string; tokenId: bigint }
        if (args.from.toLowerCase() === ZERO && args.to.toLowerCase() === wallet) {
          tokenId = args.tokenId.toString()
          break
        }
      } catch { /* not a Transfer */ }
    }
  } catch (e) {
    console.error('[maps/mint-record] receipt read failed', e)
    return NextResponse.json({ error: 'Could not verify transaction on Base' }, { status: 503 })
  }
  if (!tokenId) return NextResponse.json({ error: 'No mint to your wallet found in this transaction' }, { status: 400 })

  // ── Record it ────────────────────────────────────────────────────────────────
  if (edition === 0) {
    // Creator's copy — caller must own the map.
    const { data: map } = await db.from('maps')
      .select('id, owner_wallet, mint_tx_hash').eq('id', mapId).maybeSingle()
    if (!map || String((map as any).owner_wallet ?? '').toLowerCase() !== wallet) {
      return NextResponse.json({ error: 'Not your map' }, { status: 403 })
    }
    if ((map as any).mint_tx_hash) return NextResponse.json({ error: 'Map already minted' }, { status: 409 })
    const { error } = await db.from('maps').update({
      mint_status: 'minted',
      mint_token_id: tokenId,
      mint_tx_hash: txHash,
      mint_contract_address: MAPS_NFT_ADDRESS,
      mint_chain: 'base',
      minted_at: new Date().toISOString(),
    }).eq('id', mapId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, tokenId, edition: 0 })
  }

  // Buyer's numbered edition — caller must own that edition in the ledger.
  const { data: ed } = await db.from('map_editions')
    .select('id, owner_wallet, mint_tx')
    .eq('map_id', mapId).eq('edition_no', edition).maybeSingle()
  if (!ed || String((ed as any).owner_wallet).toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'You do not own that edition' }, { status: 403 })
  }
  if ((ed as any).mint_tx) return NextResponse.json({ error: 'Edition already minted' }, { status: 409 })
  const { error } = await db.from('map_editions')
    .update({ token_id: tokenId, mint_tx: txHash })
    .eq('id', (ed as any).id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, tokenId, edition })
}
