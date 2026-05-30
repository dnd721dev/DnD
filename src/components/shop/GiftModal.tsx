'use client'

// GiftModal — lets a connected player gift a C/D/E item to another wallet.
// Handles the full on-chain signing flow then POSTs to /api/shop/gift.

import { useState } from 'react'
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { DND721_TOKEN_ADDRESS, DND721_TOKEN_ABI } from '@/lib/dnd721Token'
import { usdToDnd721Wei, formatTokens, usdToDnd721Tokens } from '@/lib/shopPricing'
import type { ShopItem } from '@/lib/shopData'

const TREASURY      = (process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '') as `0x${string}`
const BASE_CHAIN_ID = 8453

type Stage =
  | 'idle'
  | 'signing'
  | 'submitted'
  | 'confirming'
  | 'verifying'
  | 'success'
  | 'error'

interface Props {
  item:         ShopItem
  tokenPrice:   number | null
  onClose:      () => void
  onGiftSent?:  (recipientWallet: string, itemName: string) => void
}

export function GiftModal({ item, tokenPrice, onClose, onGiftSent }: Props) {
  const { address, isConnected } = useAccount()
  const chainId                   = useChainId()
  const { switchChain }           = useSwitchChain()
  const wallet                    = address?.toLowerCase() ?? null

  const [recipient, setRecipient] = useState('')
  const [stage,     setStage]     = useState<Stage>('idle')
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null)

  const { writeContractAsync }                      = useWriteContract()
  const [pendingTx, setPendingTx]                   = useState<`0x${string}` | undefined>()
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } =
    useWaitForTransactionReceipt({ hash: pendingTx })

  const recipientLower   = recipient.trim().toLowerCase()
  const recipientValid   = /^0x[0-9a-f]{40}$/.test(recipientLower)
  const isSelf           = wallet && recipientLower === wallet
  const tokens           = tokenPrice && item.price_usd
    ? usdToDnd721Tokens(item.price_usd, tokenPrice) : null

  // When tx confirms, POST to /api/shop/gift
  if (isTxConfirmed && pendingTx && stage === 'confirming') {
    setStage('verifying')
    fetch('/api/shop/gift', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(wallet ? { 'x-wallet-address': wallet } : {}) },
      body:    JSON.stringify({
        txHash:          pendingTx,
        itemId:          item.id,
        tier:            item.tier,
        recipientWallet: recipientLower,
        expectedUsd:     item.price_usd,
        tokenPriceUsd:   tokenPrice,
      }),
    })
      .then((r) => r.json() as Promise<{ ok?: boolean; error?: string }>)
      .then((json) => {
        if (json.ok) {
          setStage('success')
          onGiftSent?.(recipientLower, item.name)
        } else {
          setStage('error')
          setErrorMsg(json.error ?? 'Gift failed')
        }
      })
      .catch((err: unknown) => {
        setStage('error')
        setErrorMsg(err instanceof Error ? err.message : 'Network error')
      })
  }

  if (isTxConfirming && stage === 'submitted') {
    setStage('confirming')
  }

  async function handleSendGift() {
    if (!isConnected || !wallet || !item.price_usd || !tokenPrice) return
    if (!recipientValid) return
    if (!TREASURY) { setErrorMsg('Treasury wallet not configured'); return }

    setStage('signing')
    setErrorMsg(null)

    try {
      const wei  = usdToDnd721Wei(item.price_usd, tokenPrice)
      const hash = await writeContractAsync({
        address:      DND721_TOKEN_ADDRESS,
        abi:          DND721_TOKEN_ABI,
        functionName: 'transfer',
        args:         [TREASURY, wei],
        chainId:      BASE_CHAIN_ID,
      })
      setPendingTx(hash)
      setStage('submitted')
    } catch (err: unknown) {
      const msg = (err as any)?.shortMessage ?? (err instanceof Error ? err.message : 'Transaction rejected')
      setStage('error')
      setErrorMsg(msg)
    }
  }

  function stageLabel(): string {
    switch (stage) {
      case 'signing':    return '⏳ Waiting for wallet…'
      case 'submitted':  return '⏳ Submitted to Base…'
      case 'confirming': return '⏳ Confirming on-chain…'
      case 'verifying':  return '⏳ Recording gift…'
      case 'success':    return '🎁 Gift sent!'
      default:           return ''
    }
  }

  const busy = stage !== 'idle' && stage !== 'error'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl text-slate-100">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-semibold mb-0.5">Gift Item</p>
            <h3 className="text-base font-bold text-yellow-100">{item.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {item.price_usd ? `$${item.price_usd.toFixed(2)}` : ''}
              {tokens !== null ? <span className="ml-1 text-slate-500">(≈{formatTokens(tokens)})</span> : null}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Tier note */}
        <div className="mb-4 rounded-md bg-slate-900/60 border border-slate-800 px-3 py-2 text-xs text-slate-400">
          {item.tier === 'E'
            ? '🏆 Tier E gift — recipient keeps this permanently.'
            : '⚡ Tier C/D gift — valid for one session only. Expires at session end.'}
        </div>

        {stage === 'success' ? (
          <div className="text-center py-4">
            <p className="text-2xl mb-2">🎁</p>
            <p className="text-sm font-semibold text-emerald-300">Gift sent successfully!</p>
            <p className="text-xs text-slate-400 mt-1">
              The recipient can accept it at <span className="font-mono text-slate-300">/shop/gifts</span>
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-md bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Wrong network */}
            {isConnected && chainId !== BASE_CHAIN_ID && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-yellow-800/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-300">
                <span>Switch to Base to send gift</span>
                <button
                  onClick={() => switchChain({ chainId: BASE_CHAIN_ID })}
                  className="rounded bg-yellow-700/60 px-2 py-0.5 font-semibold hover:bg-yellow-700"
                >
                  Switch
                </button>
              </div>
            )}

            {/* Recipient input */}
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Recipient Wallet Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={busy}
              placeholder="0x…"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-50 mb-1"
            />
            {recipient && !recipientValid && (
              <p className="text-[11px] text-red-400 mb-2">Must be a valid 0x Ethereum address</p>
            )}
            {isSelf && (
              <p className="text-[11px] text-red-400 mb-2">Cannot gift to yourself</p>
            )}

            {/* Stage label or error */}
            {stage !== 'idle' && (
              <p className={`text-xs mb-3 ${stage === 'error' ? 'text-red-400' : 'text-yellow-300'}`}>
                {stage === 'error' ? errorMsg : stageLabel()}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-900 disabled:opacity-40"
              >
                Cancel
              </button>
              {stage === 'error' ? (
                <button
                  onClick={() => { setStage('idle'); setErrorMsg(null) }}
                  className="flex-1 rounded-md bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-600"
                >
                  Retry
                </button>
              ) : (
                <button
                  onClick={() => void handleSendGift()}
                  disabled={busy || !recipientValid || !!isSelf || !tokenPrice || chainId !== BASE_CHAIN_ID}
                  className="flex-1 rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  Send Gift
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
