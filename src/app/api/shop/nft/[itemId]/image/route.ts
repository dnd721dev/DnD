// GET /api/shop/nft/[itemId]/image
// The full generative artwork for a tier E item, rendered as SVG.
// Deterministic per item — safe to cache aggressively.

import { NextRequest, NextResponse } from 'next/server'
import { getShopItem } from '@/lib/shopData'
import { renderItemArtSvg } from '@/lib/shopNft'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  const { itemId } = await ctx.params
  const item = getShopItem(itemId)
  if (!item || item.tier !== 'E') {
    return NextResponse.json({ error: 'Not an NFT shop item' }, { status: 404 })
  }
  return new NextResponse(renderItemArtSvg(item), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  })
}
