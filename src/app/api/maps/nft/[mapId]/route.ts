// GET /api/maps/nft/[mapId]?edition=3
// ERC-721 tokenURI metadata for a DND721 map NFT. The on-chain token stores
// this URL, so it must stay stable. `edition` distinguishes numbered copies
// (1..rarity); edition=0 (or omitted) is the creator's own copy.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ mapId: string }> },
): Promise<Response> {
  const { mapId } = await ctx.params
  const editionParam = req.nextUrl.searchParams.get('edition')
  const edition = editionParam ? Math.max(0, parseInt(editionParam, 10) || 0) : 0

  const db = supabaseAdmin()
  const { data: map } = await db
    .from('maps')
    .select('id, name, image_url, owner_wallet')
    .eq('id', mapId)
    .maybeSingle()
  if (!map) return NextResponse.json({ error: 'Map not found' }, { status: 404 })

  // Rarity comes from the map's marketplace listing (latest one wins).
  const { data: listing } = await db
    .from('market_listings')
    .select('map_rarity')
    .eq('kind', 'map')
    .eq('map_id', mapId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const rarity = Number((listing as any)?.map_rarity ?? 1)

  const M = map as any
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const editionLabel = edition === 0 ? "Creator's Copy" : `${edition} of ${rarity}`

  return NextResponse.json({
    name: `${M.name ?? 'DND721 Map'}${edition === 0 ? " — Creator's Copy" : ` — Edition ${edition}/${rarity}`}`,
    description:
      `A playable battle map created on DND721. Owning an edition unlocks this private map ` +
      `for use in campaigns and sessions on the platform.\n\nRarity: 1:${rarity} · ${editionLabel}`,
    image: M.image_url ?? `${baseUrl}/bishop.jpg`,
    external_url: `${baseUrl}/market`,
    attributes: [
      { trait_type: 'Type', value: 'Battle Map' },
      { trait_type: 'Rarity', value: `1:${rarity}` },
      { trait_type: 'Edition', value: editionLabel },
      { trait_type: 'Platform Utility', value: 'Unlocks map use in DND721 campaigns' },
    ],
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
