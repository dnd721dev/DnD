import { NextResponse } from 'next/server'

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY
const CHAIN = process.env.DND721_CHAIN ?? 'base'
const DND721_CONTRACT = process.env.DND721_CONTRACT_ADDRESS ?? '0xcc734d328ae06a7014eeebe5f214d421aa633eed'

export async function GET(req: Request) {
  try {
    if (!OPENSEA_API_KEY) {
      console.error('Missing OPENSEA_API_KEY env var')
      return NextResponse.json(
        { error: 'Server not configured: OPENSEA_API_KEY missing' },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(req.url)
    const owner = searchParams.get('owner')

    if (!owner) {
      return NextResponse.json(
        { error: 'Missing owner query param' },
        { status: 400 },
      )
    }

    // 1) Get all NFTs owned by this wallet on Base from OpenSea
    const listRes = await fetch(
      `https://api.opensea.io/api/v2/chain/${CHAIN}/account/${owner}/nfts?limit=50`,
      {
        headers: {
          accept: 'application/json',
          'x-api-key': OPENSEA_API_KEY,
        },
        // cache a bit so we don't hammer the API
        next: { revalidate: 30 },
      },
    )

    if (!listRes.ok) {
      const text = await listRes.text()
      console.error('OpenSea list error:', listRes.status, text)
      return NextResponse.json(
        { error: 'Failed to fetch NFTs from OpenSea' },
        { status: 502 },
      )
    }

    const listJson: any = await listRes.json()
    const nfts = Array.isArray(listJson.nfts) ? listJson.nfts : []

    // 2) Keep only your DND721 collection (by contract address)
    const filtered = nfts.filter((nft: any) => {
      const contractAddress =
        nft.contract_address ||
        nft.contract ||
        nft.collection?.contract_address

      if (!contractAddress) return false
      return (
        contractAddress.toLowerCase() === DND721_CONTRACT.toLowerCase()
      )
    })

    // 3) For each NFT, call the OpenSea metadata endpoint to get traits
    const items = await Promise.all(
      filtered.map(async (nft: any) => {
        const contractAddress =
          nft.contract_address ||
          nft.contract ||
          nft.collection?.contract_address ||
          DND721_CONTRACT

        const tokenId = String(
          nft.identifier || nft.token_id || nft.tokenId || '',
        )

        let metadata: any = null

        if (contractAddress && tokenId) {
          try {
            const metaRes = await fetch(
              `https://api.opensea.io/api/v2/chain/${CHAIN}/contract/${contractAddress}/nfts/${tokenId}`,
              {
                headers: {
                  accept: 'application/json',
                  'x-api-key': OPENSEA_API_KEY,
                },
                next: { revalidate: 60 },
              },
            )

            if (metaRes.ok) {
              const metaJson: any = await metaRes.json()
              const inner = metaJson.nft ?? metaJson

              // Normalize shape so your mapMeta() can read it
              metadata = {
                name: inner.name,
                description: inner.description,
                image: inner.image_url ?? inner.image,
                // traits on OpenSea; map to attributes so our mapper sees them
                attributes: inner.traits ?? inner.attributes ?? [],
              }
            } else {
              console.error(
                'OpenSea metadata error',
                contractAddress,
                tokenId,
                metaRes.status,
              )
            }
          } catch (e) {
            console.error('Error fetching metadata from OpenSea', e)
          }
        }

        // Fallback: if metadata call fails, at least keep basic info
        if (!metadata) {
          metadata = {
            name: nft.name,
            description: nft.description,
            image: nft.image_url,
          }
        }

        return {
          contract: contractAddress,
          tokenId,
          metadata,
        }
      }),
    )

    // ── Marketplace NFT rentals ─────────────────────────────────────────────
    // Append NFTs actively RENTED to this wallet so the renter can build a
    // character with them until the rental ends. Flagged `rented` with the
    // expiry so the picker can badge them.
    try {
      const { supabaseAdmin } = await import('@/lib/supabaseAdmin')
      const db = supabaseAdmin()
      const { data: rentals } = await db
        .from('market_rentals')
        .select('nft_contract, nft_token_id, ends_at, listing_id')
        .eq('renter_wallet', owner.toLowerCase())
        .eq('status', 'active')
        .gt('ends_at', new Date().toISOString())
        .not('nft_contract', 'is', null)

      if (rentals && rentals.length > 0) {
        const listingIds = rentals.map((r: any) => r.listing_id).filter(Boolean)
        const { data: listings } = listingIds.length
          ? await db.from('market_listings').select('id, nft_name, nft_image').in('id', listingIds)
          : { data: [] as any[] }
        const listingById = Object.fromEntries((listings ?? []).map((l: any) => [l.id, l]))

        for (const r of rentals as any[]) {
          // Skip if the wallet somehow also owns it outright
          if (items.some((i: any) => i.contract?.toLowerCase() === r.nft_contract && String(i.tokenId) === String(r.nft_token_id))) continue
          const meta = listingById[r.listing_id]
          ;(items as any[]).push({
            contract: r.nft_contract,
            tokenId: String(r.nft_token_id),
            metadata: {
              name: meta?.nft_name ?? `DND721 #${r.nft_token_id} (rented)`,
              description: 'Rented via the DND721 marketplace.',
              image: meta?.nft_image ?? null,
              attributes: [],
            },
            rented: true,
            rentalEndsAt: r.ends_at,
          })
        }
      }
    } catch (e) {
      console.error('[api/nft] rental append failed (non-fatal)', e)
    }

    return NextResponse.json({ items })
  } catch (err) {
    console.error('Unexpected /api/nft error', err)
    return NextResponse.json(
      { error: 'Unexpected error in /api/nft' },
      { status: 500 },
    )
  }
}
