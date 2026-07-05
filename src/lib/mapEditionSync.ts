// src/lib/mapEditionSync.ts  — SERVER ONLY
// Keeps map-edition platform access in lockstep with the on-chain NFT.
//
// A map edition's utility (using the private map in campaigns) belongs to
// whoever CURRENTLY holds its DND721Maps token. When the token is resold —
// on the DND721 marketplace or externally on OpenSea — this sync moves the
// edition's owner_wallet to the new holder and revokes the seller, keeping
// the map's rarity intact: the same numbered edition simply changes hands.
//
// Called lazily from marketplace reads and map-library loads, throttled per
// edition via synced_at so we don't hammer the RPC.

import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import type { supabaseAdmin } from './supabaseAdmin'

const BASE_RPC = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'
const MAPS_NFT_ADDRESS = (process.env.NEXT_PUBLIC_MAPS_NFT_ADDRESS ?? '').toLowerCase()

const SYNC_COOLDOWN_MIN = 5     // per-edition re-check throttle
const MAX_PER_SWEEP = 25        // bound RPC reads per request

const OWNER_OF_ABI = [{
  name: 'ownerOf',
  type: 'function' as const,
  stateMutability: 'view' as const,
  inputs: [{ name: 'tokenId', type: 'uint256' as const }],
  outputs: [{ type: 'address' as const }],
}]

/** Reconcile minted editions' owner_wallet with on-chain ownerOf().
 *  Pass mapId to scope to one map; otherwise sweeps the stalest editions. */
export async function syncMintedEditions(
  db: ReturnType<typeof supabaseAdmin>,
  opts: { mapId?: string } = {},
): Promise<void> {
  if (!/^0x[0-9a-f]{40}$/.test(MAPS_NFT_ADDRESS)) return

  const staleBefore = new Date(Date.now() - SYNC_COOLDOWN_MIN * 60_000).toISOString()
  let q = db.from('map_editions')
    .select('id, map_id, owner_wallet, token_id, synced_at')
    .not('token_id', 'is', null)
    .or(`synced_at.is.null,synced_at.lt.${staleBefore}`)
    .limit(MAX_PER_SWEEP)
  if (opts.mapId) q = q.eq('map_id', opts.mapId)

  const { data: editions } = await q
  if (!editions || editions.length === 0) return

  const client = createPublicClient({ chain: base, transport: http(BASE_RPC) })
  const nowIso = new Date().toISOString()

  await Promise.all((editions as any[]).map(async (ed) => {
    try {
      const holder = (await client.readContract({
        address: MAPS_NFT_ADDRESS as `0x${string}`,
        abi: OWNER_OF_ABI,
        functionName: 'ownerOf',
        args: [BigInt(ed.token_id)],
      }) as string).toLowerCase()

      const patch: Record<string, any> = { synced_at: nowIso }
      if (holder !== String(ed.owner_wallet).toLowerCase()) {
        // NFT changed hands — access moves with it. Same edition, new owner:
        // rarity stays intact.
        patch.owner_wallet = holder
      }
      await db.from('map_editions').update(patch).eq('id', ed.id)
    } catch (e) {
      // ownerOf reverts if the token was burned; leave the row for manual
      // review rather than guessing. Still bump synced_at to avoid re-hammering.
      console.error('[mapEditionSync] ownerOf failed for token', ed.token_id, e)
      await db.from('map_editions').update({ synced_at: nowIso }).eq('id', ed.id)
    }
  }))
}
