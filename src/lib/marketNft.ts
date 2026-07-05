// src/lib/marketNft.ts  — SERVER ONLY
// ERC-721 helpers for marketplace NFT listings: ownership checks at list
// time and transfer verification at settlement time.

import { createPublicClient, createWalletClient, http, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'

export const DND721_NFT_CONTRACT =
  (process.env.DND721_CONTRACT_ADDRESS ?? '0xcc734d328ae06a7014eeebe5f214d421aa633eed').toLowerCase()

/** MarketEscrow.sol contract address — sellers approve() THIS CONTRACT (not
 *  a personal wallet) at list time; the backend relayer can only ever move a
 *  seller's token via the contract's single `executeSale`, and only after
 *  independently verifying the buyer's on-chain payment first. Wallets treat
 *  approving a verified, source-published, single-purpose contract very
 *  differently from approving a raw EOA — that's the point of this contract. */
export const MARKET_ESCROW_ADDRESS =
  (process.env.NEXT_PUBLIC_MARKET_ESCROW_ADDRESS ?? '').toLowerCase()
/** The relayer wallet registered as `relayer` on the deployed MarketEscrow. */
const MARKET_ESCROW_PRIVATE_KEY = process.env.MARKET_ESCROW_PRIVATE_KEY ?? ''

const MARKET_ESCROW_ABI = [
  {
    name: 'executeSale',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'seller', type: 'address' as const },
      { name: 'nft', type: 'address' as const },
      { name: 'tokenId', type: 'uint256' as const },
      { name: 'buyer', type: 'address' as const },
    ],
    outputs: [],
  },
]

export function escrowConfigured(): boolean {
  return /^0x[0-9a-f]{40}$/.test(MARKET_ESCROW_ADDRESS) && /^0x[0-9a-fA-F]{64}$/.test(MARKET_ESCROW_PRIVATE_KEY)
}

const OWNER_OF_ABI = [{
  name: 'ownerOf',
  type: 'function' as const,
  stateMutability: 'view' as const,
  inputs: [{ name: 'tokenId', type: 'uint256' as const }],
  outputs: [{ type: 'address' as const }],
}]

const APPROVAL_ABI = [
  {
    name: 'getApproved',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [{ name: 'tokenId', type: 'uint256' as const }],
    outputs: [{ type: 'address' as const }],
  },
  {
    name: 'isApprovedForAll',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [
      { name: 'owner', type: 'address' as const },
      { name: 'operator', type: 'address' as const },
    ],
    outputs: [{ type: 'bool' as const }],
  },
]

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

/** True when the escrow contract is approved to move this token (per-token
 *  approve() or collection-wide setApprovalForAll from the owner). Checked
 *  at list time so a sale can never later fail for lack of approval. */
export async function verifyEscrowApproval(
  contract: string, tokenId: string, owner: string, rpcUrl: string,
): Promise<boolean> {
  if (!MARKET_ESCROW_ADDRESS) return false
  try {
    const c = client(rpcUrl)
    const [approved, forAll] = await Promise.all([
      c.readContract({
        address: contract as `0x${string}`, abi: APPROVAL_ABI,
        functionName: 'getApproved', args: [BigInt(tokenId)],
      }).catch(() => '0x0') as Promise<string>,
      c.readContract({
        address: contract as `0x${string}`, abi: APPROVAL_ABI,
        functionName: 'isApprovedForAll', args: [owner as `0x${string}`, MARKET_ESCROW_ADDRESS as `0x${string}`],
      }).catch(() => false) as Promise<boolean>,
    ])
    return String(approved).toLowerCase() === MARKET_ESCROW_ADDRESS || forAll === true
  } catch {
    return false
  }
}

export type EscrowTransferResult = { ok: true; txHash: string } | { ok: false; reason: string }

/** Auto-deliver: the relayer calls MarketEscrow.executeSale(), which reverts
 *  unless the seller themselves pre-authorized this exact buyer on-chain. */
export async function escrowTransferNft(
  contract: string, tokenId: string, from: string, to: string, rpcUrl: string,
): Promise<EscrowTransferResult> {
  if (!escrowConfigured()) return { ok: false, reason: 'Escrow not configured' }
  try {
    const account = privateKeyToAccount(MARKET_ESCROW_PRIVATE_KEY as `0x${string}`)
    const walletClient = createWalletClient({ account, chain: base, transport: http(rpcUrl) })
    const publicClient = client(rpcUrl)
    const txHash = await walletClient.writeContract({
      address: MARKET_ESCROW_ADDRESS as `0x${string}`,
      abi: MARKET_ESCROW_ABI,
      functionName: 'executeSale',
      args: [from as `0x${string}`, contract as `0x${string}`, BigInt(tokenId), to as `0x${string}`],
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    if (receipt.status !== 'success') return { ok: false, reason: 'Escrow transfer reverted' }
    return { ok: true, txHash }
  } catch (e: any) {
    console.error('[marketNft] escrow transfer failed', e)
    return { ok: false, reason: e?.shortMessage ?? 'Escrow transfer failed' }
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
