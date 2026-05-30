'use client'

// /shop/gifts — Gift inbox. Accessible outside a campaign.
// Shows pending gifts for the connected wallet; lets recipient accept or decline.

import { useCallback, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

type GiftRow = {
  id:             string
  item_id:        string
  item_name:      string
  tier:           'C' | 'D' | 'E'
  price_usd:      number | null
  gifter_wallet:  string
  created_at:     string
  expires_at:     string
}

type CharRow = { id: string; name: string; main_job?: string | null; level?: number | null }

type AcceptState = 'idle' | 'loading' | 'success' | 'error'

const TIER_COLOR: Record<string, string> = {
  C: 'bg-amber-800/60 text-amber-200',
  D: 'bg-orange-800/60 text-orange-200',
  E: 'bg-purple-800/60 text-purple-200',
}

function shortWallet(w: string) {
  return `${w.slice(0, 6)}…${w.slice(-4)}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function GiftCard({
  gift,
  characters,
  onAccepted,
  onDeclined,
  wallet,
}: {
  gift:       GiftRow
  characters: CharRow[]
  onAccepted: (id: string, itemName: string, permanent: boolean) => void
  onDeclined: (id: string) => void
  wallet:     string
}) {
  const [selectedChar, setSelectedChar] = useState(characters[0]?.id ?? '')
  const [acceptState,  setAcceptState]  = useState<AcceptState>('idle')
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null)

  const isPermanent = gift.tier === 'E'

  async function handleAccept() {
    if (!selectedChar) { setErrorMsg('Select a character first'); return }
    setAcceptState('loading')
    setErrorMsg(null)
    try {
      const res  = await fetch(`/api/shop/gifts/${gift.id}/accept`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': wallet },
        body:    JSON.stringify({ characterId: selectedChar }),
      })
      const json = await res.json() as { ok?: boolean; error?: string; permanent?: boolean }
      if (json.ok) {
        setAcceptState('success')
        onAccepted(gift.id, gift.item_name, json.permanent ?? false)
      } else {
        setAcceptState('error')
        setErrorMsg(json.error ?? 'Failed to accept gift')
      }
    } catch (err: unknown) {
      setAcceptState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
    }
  }

  async function handleDecline() {
    try {
      await fetch(`/api/shop/gifts/${gift.id}/decline`, {
        method:  'POST',
        headers: { 'x-wallet-address': wallet },
      })
      onDeclined(gift.id)
    } catch {
      // best-effort
    }
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-100 text-sm">{gift.item_name}</span>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${TIER_COLOR[gift.tier] ?? ''}`}>
              Tier {gift.tier}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
              isPermanent
                ? 'bg-purple-900/40 text-purple-300'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {isPermanent ? '🏆 Permanent' : '⚡ Session Use'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            From <span className="font-mono text-slate-400">{shortWallet(gift.gifter_wallet)}</span>
            {' · '}{timeAgo(gift.created_at)}
          </p>
          {gift.price_usd && (
            <p className="text-xs text-slate-500">${gift.price_usd.toFixed(2)} value</p>
          )}
        </div>
      </div>

      {acceptState === 'success' ? (
        <p className="text-xs font-semibold text-emerald-400">✓ Added to your inventory!</p>
      ) : (
        <>
          {/* Character selector */}
          {characters.length > 0 ? (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Receive as
              </label>
              <select
                value={selectedChar}
                onChange={(e) => setSelectedChar(e.target.value)}
                disabled={acceptState === 'loading'}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600 disabled:opacity-50"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.main_job ? ` · ${c.main_job}` : ''}{c.level ? ` Lv.${c.level}` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No characters found — create one to accept gifts.</p>
          )}

          {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => void handleAccept()}
              disabled={acceptState === 'loading' || characters.length === 0}
              className="flex-1 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {acceptState === 'loading' ? '⏳ Accepting…' : 'Accept Gift'}
            </button>
            <button
              onClick={() => void handleDecline()}
              disabled={acceptState === 'loading'}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-400 hover:bg-slate-900 disabled:opacity-40"
            >
              Decline
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function GiftsPage() {
  const { address, isConnected } = useAccount()
  const wallet = address?.toLowerCase() ?? null

  const [gifts,      setGifts]      = useState<GiftRow[]>([])
  const [characters, setCharacters] = useState<CharRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [toasts,     setToasts]     = useState<{ id: string; msg: string }[]>([])

  const loadGifts = useCallback(async () => {
    if (!wallet) { setGifts([]); setLoading(false); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/shop/gifts/pending', { headers: { 'x-wallet-address': wallet } })
      const json = await res.json() as { gifts?: GiftRow[] }
      setGifts(json.gifts ?? [])
    } catch {
      setGifts([])
    } finally {
      setLoading(false)
    }
  }, [wallet])

  useEffect(() => { void loadGifts() }, [loadGifts])

  // Load characters
  useEffect(() => {
    if (!wallet) { setCharacters([]); return }
    supabase
      .from('characters')
      .select('id, name, main_job, level')
      .eq('wallet_address', wallet)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setCharacters((data ?? []) as CharRow[]))
  }, [wallet])

  // Realtime: refresh when gifts table changes for this wallet
  useEffect(() => {
    if (!wallet) return
    const channel = supabase
      .channel(`shop-gifts-inbox-${wallet}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'shop_gifts',
        filter: `recipient_wallet=eq.${wallet}`,
      }, () => { void loadGifts() })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [wallet, loadGifts])

  function addToast(msg: string) {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, msg }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }

  function handleAccepted(giftId: string, itemName: string, permanent: boolean) {
    setGifts((prev) => prev.filter((g) => g.id !== giftId))
    addToast(`✓ ${itemName} added to your inventory!${permanent ? '' : ' (Session use — expires at session end)'}`)
  }

  function handleDeclined(giftId: string) {
    setGifts((prev) => prev.filter((g) => g.id !== giftId))
  }

  return (
    <div className="mx-auto max-w-2xl min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <a href="/shop" className="text-xs text-slate-500 hover:text-slate-300 mb-2 inline-block">
          ← Back to shop
        </a>
        <h1 className="text-2xl font-bold text-yellow-100">🎁 Gift Inbox</h1>
        <p className="text-sm text-slate-400 mt-1">
          Items gifted to you by other players. Accept to add them to your inventory.
        </p>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-lg bg-emerald-800 px-4 py-2 text-xs text-white shadow-lg">
            {t.msg}
          </div>
        ))}
      </div>

      {/* Content */}
      {!isConnected ? (
        <div className="rounded-md border border-slate-700 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-400">
          Connect your wallet to see your gifts.
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">Loading gifts…</div>
      ) : gifts.length === 0 ? (
        <div className="rounded-md border border-slate-700/40 bg-slate-900/30 px-4 py-10 text-center">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-slate-400">No pending gifts.</p>
          <p className="text-xs text-slate-600 mt-1">Check back later — gifts from community members appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {gifts.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              characters={characters}
              wallet={wallet!}
              onAccepted={handleAccepted}
              onDeclined={handleDeclined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
