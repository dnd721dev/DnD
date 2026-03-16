'use client'

import { useEffect, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { supabase } from '@/lib/supabase'
import { SHOP_ITEMS, type ShopItem } from '@/lib/shopData'
import { DND721_TOKEN_ADDRESS, DND721_TOKEN_ABI, toTokenWei } from '@/lib/dnd721Token'

const TREASURY = (process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '') as `0x${string}`

type InventoryRow = {
  id: string
  item_id: string
  item_name: string
  item_kind: string
  price_tokens: number
  used: boolean
  created_at: string
}

type PurchaseState = 'idle' | 'signing' | 'pending' | 'success' | 'error'

const KIND_LABEL: Record<string, string> = {
  consumable: 'Consumable',
  cosmetic:   'Cosmetic',
}

export default function ShopPage() {
  const { address, isConnected } = useAccount()
  const walletLower = address?.toLowerCase() ?? null

  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [buyingId, setBuyingId]   = useState<string | null>(null)
  const [state, setState]         = useState<PurchaseState>('idle')
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  const [pendingTx, setPendingTx] = useState<`0x${string}` | undefined>()

  const { writeContractAsync } = useWriteContract()
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: pendingTx })

  // Load user inventory
  useEffect(() => {
    if (!walletLower) { setInventory([]); return }
    supabase
      .from('player_inventory')
      .select('id, item_id, item_name, item_kind, price_tokens, used, created_at')
      .eq('wallet_address', walletLower)
      .order('created_at', { ascending: false })
      .then(({ data }) => setInventory((data ?? []) as InventoryRow[]))
  }, [walletLower, state])

  // Record purchase once tx is confirmed on-chain
  useEffect(() => {
    if (!txConfirmed || !pendingTx || !buyingId || !walletLower) return

    const item = SHOP_ITEMS.find((i) => i.id === buyingId)
    if (!item) return

    const record = async () => {
      const { error } = await supabase.from('player_inventory').insert({
        wallet_address:  walletLower,
        item_id:         item.id,
        item_name:       item.name,
        item_kind:       item.kind,
        price_tokens:    item.price,
        payment_tx_hash: pendingTx,
      })
      if (error) { console.error('inventory insert error', error); setState('error'); return }
      setState('success')
      setTimeout(() => { setState('idle'); setBuyingId(null); setPendingTx(undefined) }, 2500)
    }
    void record()
  }, [txConfirmed, pendingTx, buyingId, walletLower])

  async function handleBuy(item: ShopItem) {
    if (!isConnected || !walletLower) { alert('Connect your wallet first.'); return }
    if (!TREASURY) { alert('Treasury wallet not configured. Contact the GM.'); return }

    setBuyingId(item.id)
    setState('signing')
    setErrorMsg(null)

    try {
      const hash = await writeContractAsync({
        address:      DND721_TOKEN_ADDRESS,
        abi:          DND721_TOKEN_ABI,
        functionName: 'transfer',
        args:         [TREASURY, toTokenWei(item.price)],
      })
      setPendingTx(hash)
      setState('pending')
    } catch (err: any) {
      console.error('transfer error', err)
      setErrorMsg(err?.shortMessage ?? err?.message ?? 'Transaction failed.')
      setState('error')
      setTimeout(() => { setState('idle'); setBuyingId(null) }, 3000)
    }
  }

  // Filter out 'monster' kind — those are via /sponsor
  const shopItems = SHOP_ITEMS.filter((i) => i.kind !== 'monster')

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">One-Shot Shop</h1>
        <p className="mt-1 text-sm text-slate-400">
          Buy consumables and cosmetics with DND721 tokens. Items go into your inventory and are usable in any session.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Want to sponsor a monster for an upcoming session?{' '}
          <a href="/sponsor" className="text-emerald-400 underline hover:text-emerald-300">Sponsor page →</a>
        </p>
      </div>

      {/* Items grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shopItems.map((item) => {
          const isBuying   = buyingId === item.id
          const isSuccess  = isBuying && state === 'success'
          const isPending  = isBuying && (state === 'signing' || state === 'pending')
          const isErr      = isBuying && state === 'error'

          return (
            <div
              key={item.id}
              className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 overflow-hidden"
            >
              <img src={item.img} alt={item.name} className="h-36 w-full object-cover" />

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-100 text-sm">{item.name}</span>
                  <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                    {KIND_LABEL[item.kind] ?? item.kind}
                  </span>
                </div>

                <p className="flex-1 text-xs text-slate-400">{item.desc}</p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm font-bold text-emerald-400">{item.price} DND721</span>

                  {!isConnected ? (
                    <span className="text-xs text-slate-500">Connect wallet</span>
                  ) : isSuccess ? (
                    <span className="text-xs font-semibold text-emerald-400">Purchased!</span>
                  ) : isErr ? (
                    <span className="text-xs text-red-400">{errorMsg ?? 'Failed'}</span>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={isPending || (state !== 'idle' && !isBuying)}
                      className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      {isPending
                        ? state === 'signing' ? 'Approve in wallet…' : 'Confirming…'
                        : `Buy · ${item.price} DND721`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Inventory */}
      {walletLower && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-200">Your Inventory</h2>
          {inventory.length === 0 ? (
            <p className="text-sm text-slate-500">No items yet.</p>
          ) : (
            <div className="rounded-xl border border-slate-800 divide-y divide-slate-800">
              {inventory.map((row) => (
                <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-200">{row.item_name}</span>
                    <span className="ml-2 text-xs text-slate-500">{row.item_kind}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{row.price_tokens} DND721</span>
                    {row.used ? (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500">Used</span>
                    ) : (
                      <span className="rounded bg-emerald-900/40 px-2 py-0.5 text-[10px] text-emerald-400">Ready</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
