// src/lib/shopVerify.ts  — SERVER ONLY
// Shared on-chain DND721 transfer verification used by both
// verify-purchase and gift routes.

import { createPublicClient, http, decodeEventLog } from 'viem'
import { base } from 'viem/chains'
import { usdToDnd721Wei } from './shopPricing'
import { DND721_TOKEN_ADDRESS } from './dnd721Token'

const MAX_TX_AGE_MS = 15 * 60 * 1000  // 15 minutes

const TRANSFER_ABI = [{
  name: 'Transfer',
  type: 'event' as const,
  inputs: [
    { name: 'from',  type: 'address' as const, indexed: true  },
    { name: 'to',    type: 'address' as const, indexed: true  },
    { name: 'value', type: 'uint256' as const, indexed: false },
  ],
}]

export type VerifyResult =
  | { ok: true;  transferValue: bigint; tokensTransferred: number }
  | { ok: false; reason: string; status: 400 | 503 }

/**
 * Verify that a transaction on Base chain contains a valid DND721 transfer
 * to the treasury wallet for at least the expected amount (within 5% tolerance).
 *
 * @param txHash        - The 0x-prefixed transaction hash
 * @param expectedUsd   - Expected USD price of the item
 * @param tokenPriceUsd - DND721/USD price at the time of purchase
 * @param treasury      - Treasury wallet address (lowercase)
 * @param rpcUrl        - Base chain RPC URL
 */
export async function verifyDnd721Transfer(
  txHash:        string,
  expectedUsd:   number,
  tokenPriceUsd: number,
  treasury:      string,
  rpcUrl:        string,
): Promise<VerifyResult> {
  if (!treasury) {
    return { ok: false, reason: 'Treasury wallet not configured', status: 503 }
  }

  const client  = createPublicClient({ chain: base, transport: http(rpcUrl) })
  const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })

  if (receipt.status !== 'success') {
    return { ok: false, reason: 'Transaction failed on-chain', status: 400 }
  }

  // Check transaction age
  const block   = await client.getBlock({ blockNumber: receipt.blockNumber })
  const txTimeMs = Number(block.timestamp) * 1000
  if (Date.now() - txTimeMs > MAX_TX_AGE_MS) {
    return { ok: false, reason: 'Transaction is too old (max 15 minutes)', status: 400 }
  }

  // Find Transfer event from DND721 contract to treasury
  const contractAddr = DND721_TOKEN_ADDRESS.toLowerCase()
  let transferValue: bigint | null = null

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddr) continue
    try {
      const decoded = decodeEventLog({ abi: TRANSFER_ABI, data: log.data, topics: log.topics })
      const args = decoded.args as { from: string; to: string; value: bigint }
      if (args.to.toLowerCase() === treasury.toLowerCase()) {
        transferValue = args.value
        break
      }
    } catch {
      // Not a Transfer event — skip
    }
  }

  if (transferValue === null) {
    return {
      ok: false,
      reason: 'No DND721 transfer to treasury found in this transaction',
      status: 400,
    }
  }

  // Verify amount — allow up to 5% under-pay for price fluctuation
  const expectedWei = usdToDnd721Wei(expectedUsd, tokenPriceUsd)
  const minRequired = (expectedWei * 95n) / 100n

  if (transferValue < minRequired) {
    return {
      ok: false,
      reason: `Insufficient payment. Expected ~${expectedWei} wei, got ${transferValue} wei`,
      status: 400,
    }
  }

  return { ok: true, transferValue, tokensTransferred: Number(transferValue) / 1e18 }
}
