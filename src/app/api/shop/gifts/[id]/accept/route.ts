// POST /api/shop/gifts/[id]/accept
// Recipient accepts a pending gift. The item is added to their chosen character's
// inventory immediately. C/D tier gifts are session-scoped; E gifts are permanent.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getShopItem } from '@/lib/shopData'
import { addItemToCharacterInventory } from '@/lib/shopInventory'
import { recordSessionItem, classifyGiftItem } from '@/lib/sessionItemProcessor'

const Schema = z.object({
  characterId: z.string().uuid('characterId must be a valid UUID'),
  sessionId:   z.string().uuid().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const { characterId, sessionId } = parsed.data
  const { id: giftId } = await params

  const db = supabaseAdmin()

  // Fetch and validate the gift
  const { data: gift, error: giftErr } = await db
    .from('shop_gifts')
    .select('*')
    .eq('id', giftId)
    .maybeSingle()

  if (giftErr || !gift) {
    return NextResponse.json({ error: 'Gift not found' }, { status: 404 })
  }
  if ((gift as any).recipient_wallet !== wallet) {
    return NextResponse.json({ error: 'This gift is not addressed to you' }, { status: 403 })
  }
  if ((gift as any).status !== 'pending') {
    return NextResponse.json({ error: `Gift already ${(gift as any).status}` }, { status: 409 })
  }

  // Verify character belongs to recipient wallet
  const { data: char } = await db
    .from('characters')
    .select('id, wallet_address')
    .eq('id', characterId)
    .maybeSingle()
  if (!char) return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  if (String((char as any).wallet_address).toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Character does not belong to this wallet' }, { status: 403 })
  }

  const item = getShopItem((gift as any).item_id)
  if (!item) return NextResponse.json({ error: 'Item no longer available' }, { status: 404 })

  // Add to character inventory
  try {
    await addItemToCharacterInventory(characterId, item)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[shop/gifts/accept] inventory write error:', msg)
    return NextResponse.json({ error: 'Failed to add item to inventory' }, { status: 500 })
  }

  // Track in session_items using gift classification rules:
  //   C/D → auto_remove = true (1 session use)
  //   E   → auto_remove = false (permanent)
  if (sessionId) {
    const classification = classifyGiftItem(item)
    const { item_type, auto_remove_on_session_end } = classification

    const { error: siErr } = await db.from('session_items').insert({
      session_id:               sessionId,
      character_id:             characterId,
      wallet_address:           wallet,
      item_id:                  item.id,
      item_name:                item.name,
      item_tier:                item.tier,
      item_type,
      source:                   'shop',
      auto_remove_on_session_end,
    })
    if (siErr) {
      console.error('[shop/gifts/accept] session_items insert error:', siErr.message)
    }
  }

  // Mark gift as accepted
  const { error: updateErr } = await db
    .from('shop_gifts')
    .update({
      status:            'accepted',
      recipient_char_id: characterId,
      accepted_at:       new Date().toISOString(),
    })
    .eq('id', giftId)

  if (updateErr) {
    console.error('[shop/gifts/accept] status update error:', updateErr.message)
  }

  const permanent = item.tier === 'E'

  return NextResponse.json({
    ok:       true,
    itemName: item.name,
    permanent,
    message:  permanent
      ? `${item.name} permanently added to your inventory!`
      : `${item.name} added for this session — it will be removed when the session ends.`,
  })
}
