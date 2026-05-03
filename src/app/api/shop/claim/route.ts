// POST /api/shop/claim
// Free claim for Tier A (once per session) and Tier B (once per day).
// Adds the item to the chosen character's inventory.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getShopItem } from '@/lib/shopData'
import { addItemToCharacterInventory, getOrCreateActiveInventory } from '@/lib/shopInventory'
import { recordSessionItem } from '@/lib/sessionItemProcessor'

const Schema = z.object({
  itemId:      z.string().min(1),
  tier:        z.enum(['A', 'B']),
  characterId: z.string().uuid('characterId must be a valid UUID'),
  sessionId:   z.string().uuid().optional(),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const { itemId, tier, characterId, sessionId } = parsed.data

  const item = getShopItem(itemId)
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  if (item.tier !== tier) return NextResponse.json({ error: 'Tier mismatch' }, { status: 400 })

  const db = supabaseAdmin()

  // Verify item is in today's active inventory
  const inventory = await getOrCreateActiveInventory()
  const tierKey   = `list_${tier.toLowerCase()}` as 'list_a' | 'list_b'
  const list      = (inventory[tierKey] ?? []) as Array<{ id: string }>
  if (!list.some((i) => i.id === itemId)) {
    return NextResponse.json({ error: 'Item not available today' }, { status: 409 })
  }

  // Verify character belongs to this wallet
  const { data: char } = await db
    .from('characters')
    .select('id, wallet_address')
    .eq('id', characterId)
    .maybeSingle()
  if (!char) return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  if (String((char as any).wallet_address).toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Character does not belong to this wallet' }, { status: 403 })
  }

  const today = new Date().toISOString().slice(0, 10)

  // ── Tier A: once per session (or once per day if no session) ────────────────
  if (tier === 'A') {
    if (sessionId) {
      const { data: dup } = await db
        .from('shop_purchases')
        .select('id')
        .eq('wallet_address', wallet)
        .eq('tier', 'A')
        .eq('session_id', sessionId)
        .limit(1)
        .maybeSingle()
      if (dup) return NextResponse.json({ error: 'Already claimed your free item this session' }, { status: 409 })
    } else {
      const { data: dup } = await db
        .from('shop_purchases')
        .select('id')
        .eq('wallet_address', wallet)
        .eq('tier', 'A')
        .gte('created_at', `${today}T00:00:00Z`)
        .limit(1)
        .maybeSingle()
      if (dup) return NextResponse.json({ error: 'Already claimed your free item today' }, { status: 409 })
    }
  }

  // ── Tier B: once per calendar day ───────────────────────────────────────────
  if (tier === 'B') {
    const { data: dup } = await db
      .from('shop_purchases')
      .select('id')
      .eq('wallet_address', wallet)
      .eq('tier', 'B')
      .gte('created_at', `${today}T00:00:00Z`)
      .limit(1)
      .maybeSingle()
    if (dup) return NextResponse.json({ error: 'Already claimed your free item today' }, { status: 409 })
  }

  // Record purchase
  const { error: insertErr } = await db.from('shop_purchases').insert({
    wallet_address: wallet,
    item_id:        itemId,
    item_name:      item.name,
    tier,
    price_usd:      null,
    price_tokens:   null,
    tx_hash:        null,
    session_id:     sessionId ?? null,
    inventory_id:   inventory.id,
    character_id:   characterId,
  })
  if (insertErr) {
    console.error('[shop/claim] insert error:', insertErr.message)
    return NextResponse.json({ error: 'Failed to record claim' }, { status: 500 })
  }

  // Add to character inventory
  try {
    await addItemToCharacterInventory(characterId, item)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[shop/claim] inventory write error:', msg)
    // Purchase was recorded; inventory write failed — return partial success
    return NextResponse.json({ ok: true, itemName: item.name, inventoryError: msg })
  }

  // Track in session_items (best-effort — non-fatal if it errors)
  if (sessionId) {
    await recordSessionItem({ sessionId, characterId, walletAddress: wallet, item })
  }

  return NextResponse.json({ ok: true, itemName: item.name })
}
