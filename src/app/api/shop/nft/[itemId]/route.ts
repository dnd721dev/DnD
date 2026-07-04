// GET /api/shop/nft/[itemId]
// ERC-721 tokenURI metadata for a tier E shop item. Stable forever — the
// on-chain mint stores this URL as the token URI.

import { NextRequest, NextResponse } from 'next/server'
import { getShopItem } from '@/lib/shopData'
import { buildNftMetadata } from '@/lib/shopNft'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  const { itemId } = await ctx.params
  const item = getShopItem(itemId)
  if (!item || item.tier !== 'E') {
    return NextResponse.json({ error: 'Not an NFT shop item' }, { status: 404 })
  }
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  return NextResponse.json(buildNftMetadata(item, baseUrl), {
    headers: { 'Cache-Control': 'public, max-age=86400' },
  })
}
