// src/lib/marketNft.ts  — SERVER ONLY
// ERC-721 helpers for marketplace NFT listings: ownership checks at list
// time and transfer verification at settlement time.

import { createPublicClient, http, decodeEventLog } from 'viem'
import { base } from 'viem/chains'

export const DND721_NFT_CONTRACT =
  (process.env.DND721_CONTRACT_ADDRESS ?? '0xcc734d328ae06a7014eeebe5f214d421aa633eed').toLowerCase()

const OWNER_OF_ABI = [{
  name: 'ownerOf',
  type: 'function' as const,
  stateMutability: 'view' as const,
  inputs: [{ name: 'tokenId', type: 'uint256' as const }],
  outputs: [{ type: 'address' as const }],
}]

const ERC721_TRANSFER_ABI = [{
  name: 'Transfer',
  type: 'event' as const,
  inputs: [
    { name: 'from',    type: 'address' as const, indexed: true },
    { name: 'to',      type: 'address' as const, indexed: true },
    { name: 'tokenId', type: 'uint256' as const, indexed: true },
  ],
}]

function client(rpcUrl: string) {
  return createPublicClient({ chain: base, transport: http(rpcUrl) })
}

/** True when `wallet` currently owns tokenId on the ERC-721 contract. */
export async function verifyNftOwnership(
  contract: string, tokenId: string, wallet: string, rpcUrl: string,
): Promise<boolean> {
  try {
    const owner = await client(rpcUrl).readContract({
      address: contract as `0x${string}`,
      abi: OWNER_OF_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    }) as string
    return owner.toLowerCase() === wallet.toLowerCase()
  } catch (e) {
    console.error('[marketNft] ownerOf failed', e)
    return false
  }
}

export type NftTransferResult = { ok: true } | { ok: false; reason: string }

/** Verify a tx contains the ERC-721 Transfer of tokenId from seller → buyer. */
export async function verifyNftTransfer(
  txHash: string, contract: string, tokenId: string,
  from: string, to: string, rpcUrl: string,
): Promise<NftTransferResult> {
  try {
    const c = client(rpcUrl)
    const receipt = await c.getTransactionReceipt({ hash: txHash as `0x${string}` })
    if (receipt.status !== 'success') return { ok: false, reason: 'Transaction failed on-chain' }

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contract.toLowerCase()) continue
      try {
        const decoded = decodeEventLog({ abi: ERC721_TRANSFER_ABI, data: log.data, topics: log.topics })
        const args = decoded.args as { from: string; to: string; tokenId: bigint }
        if (
          args.from.toLowerCase() === from.toLowerCase() &&
          args.to.toLowerCase() === to.toLowerCase() &&
          args.tokenId === BigInt(tokenId)
        ) return { ok: true }
      } catch { /* not a matching Transfer */ }
    }
    return { ok: false, reason: 'No matching NFT transfer found in this transaction' }
  } catch (e) {
    console.error('[marketNft] transfer verify failed', e)
    return { ok: false, reason: 'Could not verify transaction on Base' }
  }
}
