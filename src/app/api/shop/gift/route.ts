// POST /api/shop/gift
// Allows a player to gift a C/D/E tier item to another player's wallet.
// The gifter pays the on-chain token cost; the gift sits pending until the
// recipient accepts it at /shop/gifts.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getShopItem } from '@/lib/shopData'
import { getOrCreateActiveInventory } from '@/lib/shopInventory'
import { verifyDnd721Transfer } from '@/lib/shopVerify'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const TREASURY = (process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '').toLowerCase()
const BASE_RPC  = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'

const Schema = z.object({
  txHash:          z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'Invalid tx hash'),
  itemId:          z.string().min(1),
  tier:            z.enum(['C', 'D', 'E']),
  recipientWallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid recipient wallet'),
  expectedUsd:     z.number().positive(),
  tokenPriceUsd:   z.number().positive(),
})

export async function POST(req: NextRequest): Promise<Response> {
  const gifterWallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!gifterWallet || !/^0x[0-9a-f]{40}$/.test(gifterWallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }

  // Rate limit: 5 gifts per wallet per minute
  const rl = checkRateLimit(rateLimitKey(req, `shop-gift:${gifterWallet}`), { limit: 5, windowMs: 60_000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const { txHash, itemId, tier, recipientWallet, expectedUsd, tokenPriceUsd } = parsed.data
  const recipientLower = recipientWallet.toLowerCase()

  if (gifterWallet === recipientLower) {
    return NextResponse.json({ error: 'Cannot gift to yourself' }, { status: 400 })
  }

  const item = getShopItem(itemId)
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  if (item.tier !== tier) return NextResponse.json({ error: 'Tier mismatch' }, { status: 400 })
  if (!item.price_usd) return NextResponse.json({ error: 'Item has no price' }, { status: 400 })

  const db = supabaseAdmin()

  // Confirm recipient has at least one character
  const { count } = await db
    .from('characters')
    .select('id', { count: 'exact', head: true })
    .eq('wallet_address', recipientLower)
  if (!count || count === 0) {
    return NextResponse.json({ error: 'Recipient has no characters in this game' }, { status: 404 })
  }

  // Idempotency: reject duplicate tx hashes across both gifts and purchases
  const { data: existingGift } = await db
    .from('shop_gifts')
    .select('id')
    .eq('tx_hash', txHash)
    .maybeSingle()
  if (existingGift) return NextResponse.json({ error: 'Transaction already used for a gift' }, { status: 409 })

  const { data: existingPurchase } = await db
    .from('shop_purchases')
    .select('id')
    .eq('tx_hash', txHash)
    .maybeSingle()
  if (existingPurchase) return NextResponse.json({ error: 'Transaction already used for a purchase' }, { status: 409 })

  // Verify item is in today's active inventory
  const inventory = await getOrCreateActiveInventory()
  const tierKey   = `list_${tier.toLowerCase()}` as 'list_c' | 'list_d' | 'list_e'
  const list      = (inventory[tierKey] ?? []) as Array<{ id: string }>
  if (!list.some((i) => i.id === itemId)) {
    return NextResponse.json({ error: 'Item not available today' }, { status: 409 })
  }

  // On-chain verification
  try {
    const result = await verifyDnd721Transfer(txHash, expectedUsd, tokenPriceUsd, TREASURY, BASE_RPC)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.status })
    }

    // Record the pending gift (item NOT added to inventory until accepted)
    const { data: gift, error: insertErr } = await db
      .from('shop_gifts')
      .insert({
        gifter_wallet:    gifterWallet,
        tx_hash:          txHash,
        item_id:          itemId,
        item_name:        item.name,
        tier,
        price_usd:        item.price_usd,
        price_tokens:     result.tokensTransferred,
        recipient_wallet: recipientLower,
        inventory_id:     inventory.id,
      })
      .select('id')
      .single()

    if (insertErr || !gift) {
      console.error('[shop/gift] insert error:', insertErr?.message)
      return NextResponse.json({ error: 'Failed to record gift' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, giftId: gift.id, itemName: item.name })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[shop/gift] on-chain error:', msg)
    return NextResponse.json({ error: `On-chain verification failed: ${msg}` }, { status: 500 })
  }
}
