// src/lib/marketNft.ts  — SERVER ONLY
// ERC-721 helpers for marketplace NFT listings.
//
// Sales settle through contracts/DND721Market.sol — a trustless atomic-swap
// contract with NO privileged roles (rebuilt after Blockaid review of the
// earlier relayer design). The seller lists on-chain at a fixed price; the
// buyer's own transaction pays the seller and receives the NFT atomically.
// The server never moves tokens — it only READS chain state to keep the DB
// in sync (verify listings exist, verify Sold events).

import { createPublicClient, http, decodeEventLog } from 'viem'
import { base } from 'viem/chains'

export const DND721_NFT_CONTRACT =
  (process.env.DND721_CONTRACT_ADDRESS ?? '0xcc734d328ae06a7014eeebe5f214d421aa633eed').toLowerCase()

/** Deployed DND721Market.sol address. (Falls back to the legacy escrow env
 *  var name so existing deployments don't break before the var is renamed.) */
export const MARKET_CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS ??
  process.env.NEXT_PUBLIC_MARKET_ESCROW_ADDRESS ??
  ''
).toLowerCase()

export function marketContractConfigured(): boolean {
  return /^0x[0-9a-f]{40}$/.test(MARKET_CONTRACT_ADDRESS)
}

const MARKET_ABI = [
  {
    name: 'listings',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [
      { name: 'nft', type: 'address' as const },
      { name: 'tokenId', type: 'uint256' as const },
    ],
    outputs: [
      { name: 'seller', type: 'address' as const },
      { name: 'currency', type: 'address' as const },
      { name: 'price', type: 'uint256' as const },
      { name: 'reservedBuyer', type: 'address' as const },
    ],
  },
  {
    name: 'Sold',
    type: 'event' as const,
    inputs: [
      { name: 'nft', type: 'address' as const, indexed: true },
      { name: 'tokenId', type: 'uint256' as const, indexed: true },
      { name: 'seller', type: 'address' as const, indexed: false },
      { name: 'buyer', type: 'address' as const, indexed: true },
      { name: 'currency', type: 'address' as const, indexed: false },
      { name: 'price', type: 'uint256' as const, indexed: false },
    ],
  },
]

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

/** True when the seller has an active on-chain listing for this token on the
 *  DND721Market contract. Checked when a sale listing is created in the DB so
 *  the "Buy" button always maps to a real, buyable on-chain listing. */
export async function verifyOnchainListing(
  nftContract: string, tokenId: string, seller: string, rpcUrl: string,
): Promise<boolean> {
  if (!marketContractConfigured()) return false
  try {
    const res = await client(rpcUrl).readContract({
      address: MARKET_CONTRACT_ADDRESS as `0x${string}`,
      abi: MARKET_ABI,
      functionName: 'listings',
      args: [nftContract as `0x${string}`, BigInt(tokenId)],
    }) as [string, string, bigint, string]
    return res[0].toLowerCase() === seller.toLowerCase()
  } catch (e) {
    console.error('[marketNft] listings read failed', e)
    return false
  }
}

export type MarketSaleResult = { ok: true } | { ok: false; reason: string }

/** Verify a tx contains the DND721Market `Sold` event for this exact
 *  (nft, tokenId, seller, buyer). This is the settlement proof: payment to
 *  the seller and NFT delivery happened atomically in this transaction. */
export async function verifyMarketSale(
  txHash: string, nftContract: string, tokenId: string,
  seller: string, buyer: string, rpcUrl: string,
): Promise<MarketSaleResult> {
  if (!marketContractConfigured()) return { ok: false, reason: 'Market contract not configured' }
  try {
    const receipt = await client(rpcUrl).getTransactionReceipt({ hash: txHash as `0x${string}` })
    if (receipt.status !== 'success') return { ok: false, reason: 'Transaction failed on-chain' }

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== MARKET_CONTRACT_ADDRESS) continue
      try {
        const decoded = decodeEventLog({ abi: MARKET_ABI, data: log.data, topics: log.topics })
        if (decoded.eventName !== 'Sold') continue
        const args = decoded.args as any
        if (
          String(args.nft).toLowerCase() === nftContract.toLowerCase() &&
          BigInt(args.tokenId) === BigInt(tokenId) &&
          String(args.seller).toLowerCase() === seller.toLowerCase() &&
          String(args.buyer).toLowerCase() === buyer.toLowerCase()
        ) return { ok: true }
      } catch { /* not a Sold event */ }
    }
    return { ok: false, reason: 'No matching sale found in this transaction' }
  } catch (e) {
    console.error('[marketNft] sale verify failed', e)
    return { ok: false, reason: 'Could not verify transaction on Base' }
  }
}

export type NftTransferResult = { ok: true } | { ok: false; reason: string }

/** Legacy: verify a plain ERC-721 Transfer of tokenId from seller → buyer.
 *  Kept for settling old 'awaiting_transfer' listings created before the
 *  atomic-swap contract. */
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
