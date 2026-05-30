// POST /api/shop/verify-purchase
// Verifies an ERC-20 transfer on Base chain and credits the item to the character.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getShopItem } from '@/lib/shopData'
import { addItemToCharacterInventory, getOrCreateActiveInventory } from '@/lib/shopInventory'
import { recordSessionItem } from '@/lib/sessionItemProcessor'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'
import { verifyDnd721Transfer } from '@/lib/shopVerify'

const TREASURY    = (process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '').toLowerCase()
const BASE_RPC    = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'

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
  try {
    const result = await verifyDnd721Transfer(txHash, expectedUsd, tokenPriceUsd, TREASURY, BASE_RPC)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.status })
    }

    // ── Record purchase ────────────────────────────────────────────────────────
    const { error: insertErr } = await db.from('shop_purchases').insert({
      wallet_address: wallet,
      item_id:        itemId,
      item_name:      item.name,
      tier,
      price_usd:      item.price_usd,
      price_tokens:   result.tokensTransferred,
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
