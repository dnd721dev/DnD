// POST /api/shop/verify-purchase
// Verifies an ERC-20 transfer on Base chain and credits the item to the character.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient, http, decodeEventLog } from 'viem'
import { base } from 'viem/chains'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getShopItem } from '@/lib/shopData'
import { usdToDnd721Wei } from '@/lib/shopPricing'
import { addItemToCharacterInventory, getOrCreateActiveInventory } from '@/lib/shopInventory'
import { recordSessionItem } from '@/lib/sessionItemProcessor'
import { DND721_TOKEN_ADDRESS } from '@/lib/dnd721Token'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const TREASURY = (process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '').toLowerCase()
const MAX_TX_AGE_MS = 15 * 60 * 1000  // 15 minutes

const TRANSFER_ABI = [{
  name: 'Transfer',
  type: 'event' as const,
  inputs: [
    { name: 'from',  type: 'address' as const, indexed: true  },
    { name: 'to',    type: 'address' as const, indexed: true  },
    { name: 'value', type: 'uint256' as const, indexed: false },
  ],
}]

const Schema = z.object({
  txHash:      z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid tx hash'),
  itemId:      z.string().min(1),
  tier:        z.enum(['C', 'D', 'E']),
  characterId: z.string().uuid('characterId must be a valid UUID'),
  sessionId:   z.string().uuid().optional(),
  /** Expected USD amount — used for slippage tolerance check */
  expectedUsd: z.number().positive(),
  /** DND721 price in USD at time of purchase (for amount verification) */
  tokenPriceUsd: z.number().positive(),
})

function makeClient() {
  const rpc = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'
  return createPublicClient({ chain: base, transport: http(rpc) })
}

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }

  // Rate limit: 10 verifications per wallet per minute
  const rl = checkRateLimit(rateLimitKey(req, `shop-verify:${wallet}`), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const { txHash, itemId, tier, characterId, sessionId, expectedUsd, tokenPriceUsd } = parsed.data

  const item = getShopItem(itemId)
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  if (item.tier !== tier) return NextResponse.json({ error: 'Tier mismatch' }, { status: 400 })
  if (!item.price_usd) return NextResponse.json({ error: 'Item has no price' }, { status: 400 })

  const db = supabaseAdmin()

  // Idempotency: reject duplicate tx hashes
  const { data: existing } = await db
    .from('shop_purchases')
    .select('id')
    .eq('tx_hash', txHash)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'Transaction already used' }, { status: 409 })

  // Verify item is in today's active inventory
  const inventory = await getOrCreateActiveInventory()
  const tierKey   = `list_${tier.toLowerCase()}` as 'list_c' | 'list_d' | 'list_e'
  const list      = (inventory[tierKey] ?? []) as Array<{ id: string }>
  if (!list.some((i) => i.id === itemId)) {
    return NextResponse.json({ error: 'Item not available today' }, { status: 409 })
  }

  // Verify character belongs to wallet
  const { data: char } = await db
    .from('characters')
    .select('id, wallet_address')
    .eq('id', characterId)
    .maybeSingle()
  if (!char) return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  if (String((char as any).wallet_address).toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Character does not belong to this wallet' }, { status: 403 })
  }

  // ── On-chain verification ────────────────────────────────────────────────────
  if (!TREASURY) {
    return NextResponse.json({ error: 'Treasury wallet not configured' }, { status: 503 })
  }

  try {
    const client  = makeClient()
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })

    if (receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 })
    }

    // Check transaction age — fetch the block timestamp
    const block = await client.getBlock({ blockNumber: receipt.blockNumber })
    const txTimeMs = Number(block.timestamp) * 1000
    if (Date.now() - txTimeMs > MAX_TX_AGE_MS) {
      return NextResponse.json({ error: 'Transaction is too old (max 15 minutes)' }, { status: 400 })
    }

    // Find the Transfer event from the DND721 contract to the treasury
    const contractAddr = DND721_TOKEN_ADDRESS.toLowerCase()
    let transferValue: bigint | null = null

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddr) continue

      try {
        const decoded = decodeEventLog({
          abi:    TRANSFER_ABI,
          data:   log.data,
          topics: log.topics,
        })
        const args = decoded.args as { from: string; to: string; value: bigint }
        if (args.to.toLowerCase() === TREASURY) {
          transferValue = args.value
          break
        }
      } catch {
        // Not a Transfer event — skip
      }
    }

    if (transferValue === null) {
      return NextResponse.json(
        { error: 'No DND721 transfer to treasury found in this transaction' },
        { status: 400 },
      )
    }

    // Verify amount — allow up to 5% under-pay to account for price fluctuation
    const expectedWei = usdToDnd721Wei(expectedUsd, tokenPriceUsd)
    const minRequired = (expectedWei * 95n) / 100n

    if (transferValue < minRequired) {
      return NextResponse.json(
        { error: `Insufficient payment. Expected ~${expectedWei} wei, got ${transferValue} wei` },
        { status: 400 },
      )
    }

    // ── Record purchase ────────────────────────────────────────────────────────
    const tokensTransferred = Number(transferValue) / 1e18

    const { error: insertErr } = await db.from('shop_purchases').insert({
      wallet_address: wallet,
      item_id:        itemId,
      item_name:      item.name,
      tier,
      price_usd:      item.price_usd,
      price_tokens:   tokensTransferred,
      tx_hash:        txHash,
      session_id:     sessionId ?? null,
      inventory_id:   inventory.id,
      character_id:   characterId,
    })
    if (insertErr) {
      console.error('[shop/verify-purchase] insert error:', insertErr.message)
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })
    }

    // Add to character inventory
    try {
      await addItemToCharacterInventory(characterId, item)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[shop/verify-purchase] inventory write error:', msg)
      return NextResponse.json({ ok: true, itemName: item.name, inventoryError: msg })
    }

    // Track in session_items (best-effort — non-fatal if it errors)
    if (sessionId) {
      await recordSessionItem({ sessionId, characterId, walletAddress: wallet, item })
    }

    return NextResponse.json({ ok: true, itemName: item.name })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[shop/verify-purchase] on-chain error:', msg)
    return NextResponse.json(
      { error: `On-chain verification failed: ${msg}` },
      { status: 500 },
    )
  }
}
