import { NextResponse } from 'next/server'

const OPENSEA_API_KEY = process.env.OPENSEA_API_KEY
const CHAIN = 'base'

// Your DND721 contract on Base (from your logs)
const DND721_CONTRACT = '0xcc734d328ae06a7014eeebe5f214d421aa633eed'

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

    return NextResponse.json({ items })
  } catch (err) {
    console.error('Unexpected /api/nft error', err)
    return NextResponse.json(
      { error: 'Unexpected error in /api/nft' },
      { status: 500 },
    )
  }
}
