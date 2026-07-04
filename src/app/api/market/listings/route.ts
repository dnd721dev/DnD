// /api/market/listings
// GET  — browse active listings (?kind=item|character_rent|map, ?mine=1)
// POST — create a listing (item from a character's inventory, a character
//        rental, or a private map NFT with owner-chosen rarity).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

/** Lazily close out rentals whose term has ended: clear the character's
 *  rented_to fields and mark the rental row ended. Called from GET. */
async function expireRentals(db: ReturnType<typeof supabaseAdmin>) {
  const nowIso = new Date().toISOString()
  const { data: expired } = await db
    .from('market_rentals')
    .select('id, character_id')
    .eq('status', 'active')
    .lt('ends_at', nowIso)
  for (const r of expired ?? []) {
    await db.from('market_rentals').update({ status: 'ended' }).eq('id', (r as any).id)
    await db.from('characters')
      .update({ rented_to_wallet: null, rental_ends_at: null })
      .eq('id', (r as any).character_id)
      .lt('rental_ends_at', nowIso) // don't clobber a newer re-rent
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const db = supabaseAdmin()
  await expireRentals(db)

  const kind = req.nextUrl.searchParams.get('kind')
  const mine = req.nextUrl.searchParams.get('mine') === '1'
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null

  let q = db.from('market_listings').select('*').order('created_at', { ascending: false })
  if (mine && wallet) q = q.eq('seller_wallet', wallet)
  else q = q.eq('status', 'active')
  if (kind) q = q.eq('kind', kind)

  const { data: listings, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Join display data (character summary, map summary, active rental).
  const charIds = [...new Set((listings ?? []).map((l: any) => l.character_id).filter(Boolean))]
  const mapIds  = [...new Set((listings ?? []).map((l: any) => l.map_id).filter(Boolean))]

  const [chars, maps, rentals, bids] = await Promise.all([
    charIds.length
      ? db.from('characters').select('id, name, level, main_job, avatar_url, wallet_address, rented_to_wallet, rental_ends_at').in('id', charIds)
      : Promise.resolve({ data: [] as any[] }),
    mapIds.length
      ? db.from('maps').select('id, name, image_url, visibility, owner_wallet').in('id', mapIds)
      : Promise.resolve({ data: [] as any[] }),
    db.from('market_rentals').select('*').eq('status', 'active'),
    wallet
      ? db.from('market_bids').select('*').eq('status', 'pending')
      : Promise.resolve({ data: [] as any[] }),
  ])

  return NextResponse.json({
    listings: listings ?? [],
    characters: (chars as any).data ?? [],
    maps: (maps as any).data ?? [],
    rentals: (rentals as any).data ?? [],
    bids: (bids as any).data ?? [],
  })
}

const CreateSchema = z.object({
  kind: z.enum(['item', 'character_rent', 'map']),
  // item
  characterId:  z.string().uuid().optional(),
  itemKey:      z.string().min(1).optional(),
  // rental
  rentPerDay:   z.number().positive().optional(),
  rentMaxDays:  z.number().int().min(1).max(365).optional(),
  // map
  mapId:        z.string().uuid().optional(),
  rarity:       z.number().int().min(1).max(100000).optional(),
  // pricing
  currency:     z.enum(['dnd721', 'eth']).default('dnd721'),
  priceTokens:  z.number().positive().optional(),
  priceEth:     z.number().positive().optional(),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `market-list:${wallet}`), { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  }
  const b = parsed.data
  const db = supabaseAdmin()

  const row: Record<string, any> = {
    kind: b.kind,
    seller_wallet: wallet,
    currency: b.currency,
    price_tokens: b.currency === 'dnd721' ? (b.priceTokens ?? null) : null,
    price_eth:    b.currency === 'eth'    ? (b.priceEth ?? null)    : null,
  }

  if (b.kind === 'item') {
    if (!b.characterId || !b.itemKey) return NextResponse.json({ error: 'characterId and itemKey required' }, { status: 400 })
    if (!row.price_tokens && !row.price_eth) return NextResponse.json({ error: 'Price required' }, { status: 400 })
    const { data: char } = await db.from('characters')
      .select('id, wallet_address, inventory_items').eq('id', b.characterId).maybeSingle()
    if (!char || String((char as any).wallet_address).toLowerCase() !== wallet) {
      return NextResponse.json({ error: 'Not your character' }, { status: 403 })
    }
    const inv: any[] = Array.isArray((char as any).inventory_items) ? (char as any).inventory_items : []
    const item = inv.find((i) => i.key === b.itemKey && (i.qty ?? 0) > 0)
    if (!item) return NextResponse.json({ error: 'Item not in that character\'s inventory' }, { status: 404 })
    row.item_key = item.key
    row.item_name = item.name
    row.source_character_id = b.characterId
  }

  if (b.kind === 'character_rent') {
    if (!b.characterId || !b.rentPerDay || !b.rentMaxDays) {
      return NextResponse.json({ error: 'characterId, rentPerDay, rentMaxDays required' }, { status: 400 })
    }
    const { data: char } = await db.from('characters')
      .select('id, wallet_address, rented_to_wallet').eq('id', b.characterId).maybeSingle()
    if (!char || String((char as any).wallet_address).toLowerCase() !== wallet) {
      return NextResponse.json({ error: 'Not your character' }, { status: 403 })
    }
    // one active rental listing per character
    const { data: dup } = await db.from('market_listings')
      .select('id').eq('kind', 'character_rent').eq('character_id', b.characterId).eq('status', 'active').maybeSingle()
    if (dup) return NextResponse.json({ error: 'Character already listed for rent' }, { status: 409 })
    row.character_id = b.characterId
    row.rent_per_day = b.rentPerDay
    row.rent_max_days = b.rentMaxDays
    row.currency = 'dnd721' // rentals settle in DND721 per spec
  }

  if (b.kind === 'map') {
    if (!b.mapId || !b.rarity) return NextResponse.json({ error: 'mapId and rarity required' }, { status: 400 })
    if (!row.price_tokens && !row.price_eth) return NextResponse.json({ error: 'Price required' }, { status: 400 })
    const { data: map } = await db.from('maps')
      .select('id, owner_wallet, visibility').eq('id', b.mapId).maybeSingle()
    if (!map || String((map as any).owner_wallet ?? '').toLowerCase() !== wallet) {
      return NextResponse.json({ error: 'Not your map' }, { status: 403 })
    }
    const { data: dup } = await db.from('market_listings')
      .select('id').eq('kind', 'map').eq('map_id', b.mapId).eq('status', 'active').maybeSingle()
    if (dup) return NextResponse.json({ error: 'Map already listed' }, { status: 409 })
    // Privating the map is part of listing it — the owner picked a rarity.
    await db.from('maps').update({ visibility: 'private' }).eq('id', b.mapId)
    row.map_id = b.mapId
    row.map_rarity = b.rarity
  }

  const { data: inserted, error } = await db.from('market_listings').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, listing: inserted }, { status: 201 })
}

/** DELETE /api/market/listings?id= — seller cancels an active listing. */
export async function DELETE(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const db = supabaseAdmin()
  const { data: listing } = await db.from('market_listings').select('id, seller_wallet, status').eq('id', id).maybeSingle()
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  if (String((listing as any).seller_wallet).toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Not your listing' }, { status: 403 })
  }
  if ((listing as any).status !== 'active') return NextResponse.json({ error: 'Listing not active' }, { status: 409 })
  await db.from('market_listings').update({ status: 'cancelled' }).eq('id', id)
  return NextResponse.json({ ok: true })
}
