// src/lib/marketVerify.ts  — SERVER ONLY
// On-chain verification for marketplace payments. Unlike the shop (which pays
// the treasury), marketplace payments settle wallet-to-wallet: the buyer pays
// the SELLER directly in DND721 (ERC-20 transfer) or native ETH, and the
// server verifies the tx before applying DB-side effects.

import { createPublicClient, http, decodeEventLog, parseEther } from 'viem'
import { base } from 'viem/chains'
import { DND721_TOKEN_ADDRESS } from './dnd721Token'

const MAX_TX_AGE_MS = 15 * 60 * 1000  // 15 minutes
const TOLERANCE = 0.95                // accept ≥95% of expected (gas-estimation slack)

const TRANSFER_ABI = [{
  name: 'Transfer',
  type: 'event' as const,
  inputs: [
    { name: 'from',  type: 'address' as const, indexed: true  },
    { name: 'to',    type: 'address' as const, indexed: true  },
    { name: 'value', type: 'uint256' as const, indexed: false },
  ],
}]

export type MarketVerifyResult =
  | { ok: true }
  | { ok: false; reason: string; status: 400 | 503 }

function client(rpcUrl: string) {
  return createPublicClient({ chain: base, transport: http(rpcUrl) })
}

async function checkReceipt(c: ReturnType<typeof client>, txHash: string) {
  const receipt = await c.getTransactionReceipt({ hash: txHash as `0x${string}` })
  if (receipt.status !== 'success') return { err: 'Transaction failed on-chain', receipt: null }
  const block = await c.getBlock({ blockNumber: receipt.blockNumber })
  if (Date.now() - Number(block.timestamp) * 1000 > MAX_TX_AGE_MS) {
    return { err: 'Transaction is too old (max 15 minutes)', receipt: null }
  }
  return { err: null, receipt }
}

/** Verify a DND721 (ERC-20) transfer of at least `expectedTokens` whole tokens
 *  from `buyer` to `seller`. */
export async function verifyDnd721ToSeller(
  txHash: string, expectedTokens: number, buyer: string, seller: string, rpcUrl: string,
): Promise<MarketVerifyResult> {
  try {
    const c = client(rpcUrl)
    const { err, receipt } = await checkReceipt(c, txHash)
    if (err || !receipt) return { ok: false, reason: err ?? 'No receipt', status: 400 }

    const contractAddr = DND721_TOKEN_ADDRESS.toLowerCase()
    const need = BigInt(Math.floor(expectedTokens * TOLERANCE * 1e6)) * 10n ** 12n // tokens→wei with 6dp precision

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddr) continue
      try {
        const decoded = decodeEventLog({ abi: TRANSFER_ABI, data: log.data, topics: log.topics })
        const args = decoded.args as { from: string; to: string; value: bigint }
        if (
          args.to.toLowerCase() === seller.toLowerCase() &&
          args.from.toLowerCase() === buyer.toLowerCase() &&
          args.value >= need
        ) return { ok: true }
      } catch { /* not a Transfer event */ }
    }
    return { ok: false, reason: 'No matching DND721 transfer to the seller found in this transaction', status: 400 }
  } catch (e) {
    console.error('[marketVerify] dnd721 error', e)
    return { ok: false, reason: 'Could not verify transaction on Base', status: 503 }
  }
}

/** Verify a native ETH payment of at least `expectedEth` from `buyer` to `seller`. */
export async function verifyEthToSeller(
  txHash: string, expectedEth: number, buyer: string, seller: string, rpcUrl: string,
): Promise<MarketVerifyResult> {
  try {
    const c = client(rpcUrl)
    const { err, receipt } = await checkReceipt(c, txHash)
    if (err || !receipt) return { ok: false, reason: err ?? 'No receipt', status: 400 }

    const tx = await c.getTransaction({ hash: txHash as `0x${string}` })
    const need = parseEther(String(expectedEth * TOLERANCE))
    if (
      (tx.to ?? '').toLowerCase() === seller.toLowerCase() &&
      tx.from.toLowerCase() === buyer.toLowerCase() &&
      tx.value >= need
    ) return { ok: true }
    return { ok: false, reason: 'ETH payment to the seller not found in this transaction', status: 400 }
  } catch (e) {
    console.error('[marketVerify] eth error', e)
    return { ok: false, reason: 'Could not verify transaction on Base', status: 503 }
  }
}
