'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { supabase } from '@/lib/supabase'
import { DND721_TOKEN_ADDRESS, DND721_TOKEN_ABI } from '@/lib/dnd721Token'
import { usdToDnd721Tokens, usdToDnd721Wei, formatTokens, formatCountdown, secondsUntilMidnightUTC } from '@/lib/shopPricing'
import type { ShopItem, ShopTier } from '@/lib/shopData'

const TREASURY = (process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '') as `0x${string}`
const BASE_CHAIN_ID = 8453

// ─── Types ────────────────────────────────────────────────────────────────────

type InventoryRow = {
  id:        string
  expires_at: string
  list_a:    ShopItem[]
  list_b:    ShopItem[]
  list_c:    ShopItem[]
  list_d:    ShopItem[]
  list_e:    ShopItem[]
}

type CharRow = { id: string; name: string; main_job?: string | null; level?: number | null }

type PurchaseStage =
  | 'idle'
  | 'claiming'
  | 'signing'
  | 'submitted'
  | 'confirming'
  | 'verifying'
  | 'success'
  | 'error'

type ActivePurchase = {
  itemId:   string
  stage:    PurchaseStage
  errorMsg: string | null
}

const TIER_LABEL: Record<ShopTier, string> = { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' }
const TIER_COLOR: Record<ShopTier, string> = {
  A: 'bg-emerald-800/60 text-emerald-200',
  B: 'bg-blue-800/60    text-blue-200',
  C: 'bg-amber-800/60   text-amber-200',
  D: 'bg-orange-800/60  text-orange-200',
  E: 'bg-purple-800/60  text-purple-200',
}
const TIER_HEADING: Record<ShopTier, string> = {
  A: 'Tier A — Free once per session',
  B: 'Tier B — Free once per day',
  C: 'Tier C — Consumables',
  D: 'Tier D — Uncommon',
  E: 'Tier E — Rare',
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ShopModalProps {
  /** When false: renders inline (standalone page). When true: modal overlay. */
  isModal?:    boolean
  /** Active session context — used for Tier A free claim tracking. */
  sessionId?:  string | null
  onClose?:    () => void
  /** Fired when any purchase completes (for table toast). */
  onPurchase?: (itemName: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ShopModal({ isModal = false, sessionId, onClose, onPurchase }: ShopModalProps) {
  const { address, isConnected } = useAccount()
  const chainId                  = useChainId()
  const { switchChain }          = useSwitchChain()
  const wallet                   = address?.toLowerCase() ?? null

  const [inventory,      setInventory]      = useState<InventoryRow | null>(null)
  const [tokenPrice,     setTokenPrice]     = useState<number | null>(null)
  const [purchasedToday, setPurchasedToday] = useState<Set<string>>(new Set())
  const [activeSession,  setActiveSession]  = useState<{ id: string; title: string | null } | null>(null)
  const [characters,     setCharacters]     = useState<CharRow[]>([])
  const [selectedCharId, setSelectedCharId] = useState<string>('')
  const [loading,        setLoading]        = useState(true)
  const [countdown,      setCountdown]      = useState(secondsUntilMidnightUTC())

  const [active, setActive] = useState<ActivePurchase | null>(null)

  // wagmi transaction hooks
  const { writeContractAsync }                       = useWriteContract()
  const [pendingTx, setPendingTx]                    = useState<`0x${string}` | undefined>()
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } =
    useWaitForTransactionReceipt({ hash: pendingTx })

  // Keep a ref to active for use inside effects without stale closure
  const activeRef = useRef(active)
  useEffect(() => { activeRef.current = active }, [active])

  // ── Load inventory + price ─────────────────────────────────────────────────

  const loadInventory = useCallback(async () => {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (wallet) headers['x-wallet-address'] = wallet

      const [invRes, priceRes] = await Promise.all([
        fetch('/api/shop/inventory', { headers }),
        fetch('/api/shop/price'),
      ])

      if (invRes.ok) {
        const json = await invRes.json() as {
          inventory:      InventoryRow | null
          purchasedToday: string[]
          activeSession:  { id: string; title: string | null } | null
        }
        setInventory(json.inventory)
        setPurchasedToday(new Set(json.purchasedToday))
        // Only override sessionId from API if none was passed as prop
        if (!sessionId && json.activeSession) setActiveSession(json.activeSession)
        else if (sessionId) setActiveSession(null)  // will be overridden by prop
      }

      // Parse price regardless of HTTP status — route always returns JSON now
      try {
        const { priceUsd } = await priceRes.json() as { priceUsd: number | null }
        if (priceUsd && Number.isFinite(priceUsd) && priceUsd > 0) setTokenPrice(priceUsd)
      } catch { /* price unavailable — amounts will show as "–" */ }
    } finally {
      setLoading(false)
    }
  }, [wallet, sessionId])

  useEffect(() => { void loadInventory() }, [loadInventory])

  // ── Load characters ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!wallet) { setCharacters([]); setSelectedCharId(''); return }
    supabase
      .from('characters')
      .select('id, name, main_job, level')
      .eq('wallet_address', wallet)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as CharRow[]
        setCharacters(rows)
        if (rows.length > 0 && !selectedCharId) setSelectedCharId(rows[0]!.id)
      })
  }, [wallet])  // intentionally omit selectedCharId — only seed on wallet change

  // ── Countdown timer ────────────────────────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = secondsUntilMidnightUTC()
      setCountdown(remaining)
      if (remaining <= 0) void loadInventory()
    }, 1000)
    return () => clearInterval(id)
  }, [loadInventory])

  // ── Wait for tx confirmation then verify server-side ──────────────────────

  useEffect(() => {
    if (!isTxConfirmed || !pendingTx || !activeRef.current) return
    const cur = activeRef.current
    if (cur.stage !== 'confirming') return

    setActive((prev) => prev ? { ...prev, stage: 'verifying' } : prev)

    const itemId = cur.itemId
    const item   = allItems.find((i) => i.id === itemId)
    if (!item || !item.price_usd || !tokenPrice) {
      setActive({ itemId, stage: 'error', errorMsg: 'Item price data missing' })
      return
    }

    fetch('/api/shop/verify-purchase', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(wallet ? { 'x-wallet-address': wallet } : {}) },
      body:    JSON.stringify({
        txHash:        pendingTx,
        itemId,
        tier:          item.tier,
        characterId:   selectedCharId,
        sessionId:     sessionId ?? activeSession?.id ?? undefined,
        expectedUsd:   item.price_usd,
        tokenPriceUsd: tokenPrice,
      }),
    })
      .then((r) => r.json() as Promise<{ ok?: boolean; itemName?: string; error?: string }>)
      .then((json) => {
        if (json.ok) {
          setActive({ itemId, stage: 'success', errorMsg: null })
          setPurchasedToday((prev) => new Set([...prev, itemId]))
          onPurchase?.(item.name)
          setTimeout(() => { setActive(null); setPendingTx(undefined) }, 3000)
        } else {
          setActive({ itemId, stage: 'error', errorMsg: json.error ?? 'Verification failed' })
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Network error'
        setActive({ itemId, stage: 'error', errorMsg: msg })
      })
  }, [isTxConfirmed])  // only fire when confirmation status changes

  // Update stage when tx starts confirming
  useEffect(() => {
    if (isTxConfirming && activeRef.current?.stage === 'submitted') {
      setActive((prev) => prev ? { ...prev, stage: 'confirming' } : prev)
    }
  }, [isTxConfirming])

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleClaim(item: ShopItem) {
    if (!isConnected || !wallet) return
    if (!selectedCharId) { alert('Select a character first.'); return }

    setActive({ itemId: item.id, stage: 'claiming', errorMsg: null })

    try {
      const res = await fetch('/api/shop/claim', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': wallet },
        body:    JSON.stringify({
          itemId:      item.id,
          tier:        item.tier,
          characterId: selectedCharId,
          sessionId:   sessionId ?? activeSession?.id ?? undefined,
        }),
      })
      const json = await res.json() as { ok?: boolean; itemName?: string; error?: string }

      if (json.ok) {
        setActive({ itemId: item.id, stage: 'success', errorMsg: null })
        setPurchasedToday((prev) => new Set([...prev, item.id]))
        onPurchase?.(item.name)
        setTimeout(() => setActive(null), 2500)
      } else {
        setActive({ itemId: item.id, stage: 'error', errorMsg: json.error ?? 'Claim failed' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error'
      setActive({ itemId: item.id, stage: 'error', errorMsg: msg })
    }
  }

  async function handleBuy(item: ShopItem) {
    if (!isConnected || !wallet) return
    if (!selectedCharId) { alert('Select a character first.'); return }
    if (!item.price_usd || !tokenPrice) return
    if (!TREASURY) { alert('Treasury wallet not configured.'); return }

    setActive({ itemId: item.id, stage: 'signing', errorMsg: null })

    try {
      const wei = usdToDnd721Wei(item.price_usd, tokenPrice)

      const hash = await writeContractAsync({
        address:      DND721_TOKEN_ADDRESS,
        abi:          DND721_TOKEN_ABI,
        functionName: 'transfer',
        args:         [TREASURY, wei],
        chainId:      BASE_CHAIN_ID,
      })

      setPendingTx(hash)
      setActive({ itemId: item.id, stage: 'submitted', errorMsg: null })
    } catch (err: unknown) {
      const msg = (err as any)?.shortMessage ?? (err instanceof Error ? err.message : 'Transaction rejected')
      setActive({ itemId: item.id, stage: 'error', errorMsg: msg })
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const allItems: ShopItem[] = inventory
    ? [
        ...(inventory.list_a ?? []),
        ...(inventory.list_b ?? []),
        ...(inventory.list_c ?? []),
        ...(inventory.list_d ?? []),
        ...(inventory.list_e ?? []),
      ]
    : []

  const effectiveSession = sessionId
    ? { id: sessionId, title: null }
    : activeSession

  // ── Render helpers ─────────────────────────────────────────────────────────

  function stageLabel(stage: PurchaseStage): string {
    switch (stage) {
      case 'claiming':    return '⏳ Claiming…'
      case 'signing':     return '⏳ Waiting for wallet…'
      case 'submitted':   return '⏳ Submitted to Base…'
      case 'confirming':  return '⏳ Confirming…'
      case 'verifying':   return '⏳ Adding to inventory…'
      case 'success':     return '✓ Added to inventory!'
      default:            return ''
    }
  }

  function ItemCard({ item }: { item: ShopItem }) {
    const isFree     = item.tier === 'A' || item.tier === 'B'
    const alreadyHad = purchasedToday.has(item.id)
    const cur        = active?.itemId === item.id ? active : null
    const busy       = active !== null && active.itemId !== item.id
    const tokens     = !isFree && tokenPrice && item.price_usd
      ? usdToDnd721Tokens(item.price_usd, tokenPrice)
      : null

    return (
      <div className="flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {item.always && (
              <span className="shrink-0 text-amber-400 text-xs" title="Always available">⚡</span>
            )}
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-100 text-sm hover:text-amber-300 hover:underline truncate"
              >
                {item.name}
              </a>
            ) : (
              <span className="font-semibold text-slate-100 text-sm truncate">{item.name}</span>
            )}
          </div>
          <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${TIER_COLOR[item.tier]}`}>
            {TIER_LABEL[item.tier]}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>

        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          {/* Price */}
          <div className="text-xs">
            {isFree ? (
              <span className="text-emerald-400 font-semibold">Free</span>
            ) : (
              <div>
                <span className="text-slate-200 font-semibold">${item.price_usd?.toFixed(2)}</span>
                <span className="ml-1 text-slate-500">
                  {tokens !== null ? `(≈${formatTokens(tokens)})` : '(≈… DND721)'}
                </span>
              </div>
            )}
          </div>

          {/* Action button */}
          {!isConnected ? (
            <span className="text-xs text-slate-500">Connect wallet</span>
          ) : alreadyHad ? (
            <span className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-500 min-h-[36px] flex items-center">
              Claimed ✓
            </span>
          ) : cur?.stage === 'success' ? (
            <span className="text-xs font-semibold text-emerald-400 min-h-[36px] flex items-center">
              ✓ Added!
            </span>
          ) : cur?.stage === 'error' ? (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] text-red-400 max-w-[140px] text-right">{cur.errorMsg}</span>
              <button
                onClick={() => setActive(null)}
                className="text-[10px] text-slate-500 underline"
              >
                Retry
              </button>
            </div>
          ) : cur ? (
            <span className="text-xs text-yellow-300 min-h-[36px] flex items-center">
              {stageLabel(cur.stage)}
            </span>
          ) : (
            <button
              onClick={() => isFree ? void handleClaim(item) : void handleBuy(item)}
              disabled={busy || (!isFree && !tokenPrice)}
              className="rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 min-h-[36px] w-full sm:w-auto"
            >
              {isFree ? 'Claim Free' : `Buy · $${item.price_usd?.toFixed(2)}`}
            </button>
          )}
        </div>
      </div>
    )
  }

  function TierSection({ tier, items }: { tier: ShopTier; items: ShopItem[] }) {
    if (items.length === 0) return null
    return (
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {TIER_HEADING[tier]}
        </h3>
        <div className={`grid gap-3 ${tier === 'A' || tier === 'B' ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
          {items.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      </div>
    )
  }

  // ── Full UI ────────────────────────────────────────────────────────────────

  const inner = (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header — Bishop portrait background */}
      <div
        className="relative flex items-end justify-between gap-3 px-4 pt-0 pb-3 border-b border-slate-800 overflow-hidden"
        style={{ minHeight: '110px' }}
      >
        {/* Portrait fills the header area */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/bishop.jpg)' }}
        />
        {/* Dark gradient so text stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

        {/* Content over the portrait */}
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-semibold">
            Purveyor of Fine Curiosities
          </p>
          <h2 className="text-xl font-bold text-yellow-100 drop-shadow">Bishop&apos;s Shop</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Refreshes in:{' '}
            <span className="font-mono text-slate-200">{formatCountdown(countdown)}</span>
          </p>
        </div>
        {isModal && onClose && (
          <button
            onClick={onClose}
            className="relative z-10 rounded-md bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800 shrink-0 self-start mt-3"
          >
            ✕
          </button>
        )}
      </div>

      {/* Wrong network warning */}
      {isConnected && chainId !== BASE_CHAIN_ID && (
        <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-md border border-yellow-800/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-300">
          <span>Switch to Base network to make purchases</span>
          <button
            onClick={() => switchChain({ chainId: BASE_CHAIN_ID })}
            className="rounded bg-yellow-700/60 px-2.5 py-1 font-semibold hover:bg-yellow-700"
          >
            Switch to Base
          </button>
        </div>
      )}

      {/* Session indicator */}
      {effectiveSession && (
        <div className="mx-4 mt-3 rounded-md border border-emerald-800/40 bg-emerald-900/15 px-3 py-1.5 text-xs text-emerald-300">
          🎲 You are in:{' '}
          <span className="font-semibold">{effectiveSession.title ?? 'Active Session'}</span>
          {' — '}Free items available
        </div>
      )}

      {/* Character selector */}
      {isConnected && characters.length > 0 && (
        <div className="mx-4 mt-3">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Deliver items to
          </label>
          <select
            value={selectedCharId}
            onChange={(e) => setSelectedCharId(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.main_job ? ` · ${c.main_job}` : ''}{c.level ? ` Lv.${c.level}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {isConnected && characters.length === 0 && !loading && (
        <div className="mx-4 mt-3 rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-500">
          No characters found. Create a character to receive shop items.
        </div>
      )}

      {/* Scrollable item content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
            Loading Bishop&apos;s Shop…
          </div>
        ) : !inventory ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Shop unavailable. Try again in a moment.
          </div>
        ) : (
          <>
            <TierSection tier="A" items={inventory.list_a ?? []} />
            <TierSection tier="B" items={inventory.list_b ?? []} />
            <TierSection tier="C" items={inventory.list_c ?? []} />
            <TierSection tier="D" items={inventory.list_d ?? []} />
            <TierSection tier="E" items={inventory.list_e ?? []} />
          </>
        )}

        {!isConnected && (
          <div className="rounded-md border border-slate-700 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-400">
            Connect your wallet to claim free items and make purchases.
          </div>
        )}
      </div>
    </div>
  )

  // Standalone page: render without modal chrome
  if (!isModal) {
    return (
      <div className="mx-auto max-w-3xl min-h-screen bg-slate-950 text-slate-100">
        {inner}
      </div>
    )
  }

  // Modal overlay
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70">
      <div className="w-full sm:w-auto sm:min-w-[480px] sm:max-w-2xl h-[90vh] sm:h-[80vh] rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 flex flex-col overflow-hidden shadow-2xl">
        {inner}
      </div>
    </div>
  )
}
