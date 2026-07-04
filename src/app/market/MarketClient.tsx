'use client'

// DND721 Marketplace — P2P sales (DND721 or ETH) + character rentals + map NFTs.
//   • Items: tier-E (and any inventory) items sold wallet-to-wallet.
//   • Character rentals: owner sets tokens/day + max days; renter pays up front.
//     At term end the renter can bid to RE-RENT (new rate/length) or BUY.
//   • Maps: privating a map lists it with an owner-chosen rarity (edition size,
//     1:1 … 1:N). Each sale allocates a numbered edition; owning one grants
//     campaign use of the map.
// Payments go DIRECTLY to the seller on Base; the server verifies the tx.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useWriteContract, useSendTransaction, usePublicClient } from 'wagmi'
import { parseEther } from 'viem'
import { supabase } from '@/lib/supabase'
import { DND721_TOKEN_ADDRESS, DND721_TOKEN_ABI } from '@/lib/dnd721Token'
import { getShopItem } from '@/lib/shopData'

type Tab = 'items' | 'rentals' | 'maps' | 'mine'

type Listing = {
  id: string
  kind: 'item' | 'character_rent' | 'map'
  seller_wallet: string
  item_key: string | null
  item_name: string | null
  character_id: string | null
  rent_per_day: number | null
  rent_max_days: number | null
  map_id: string | null
  map_rarity: number | null
  editions_sold: number
  currency: 'dnd721' | 'eth'
  price_tokens: number | null
  price_eth: number | null
  status: string
}

type CharRow = { id: string; name: string; level: number | null; main_job: string | null; avatar_url: string | null; wallet_address: string; rented_to_wallet: string | null; rental_ends_at: string | null }
type MapRow = { id: string; name: string | null; image_url: string | null; visibility: string; owner_wallet: string | null }
type RentalRow = { id: string; listing_id: string; character_id: string; renter_wallet: string; owner_wallet: string; ends_at: string; per_day: number; days: number; status: string }
type BidRow = { id: string; listing_id: string; bidder_wallet: string; kind: 're_rent' | 'buy'; amount: number; days: number | null; message: string | null; status: string }

/** Whole (possibly fractional) DND721 tokens → wei. */
function tokensToWei(tokens: number): bigint {
  return BigInt(Math.round(tokens * 1e6)) * 10n ** 12n
}

function short(w: string | null | undefined): string {
  if (!w) return '—'
  return `${w.slice(0, 6)}…${w.slice(-4)}`
}

export function MarketClient() {
  const { address, isConnected } = useAccount()
  const wallet = address?.toLowerCase() ?? null
  const { writeContractAsync } = useWriteContract()
  const { sendTransactionAsync } = useSendTransaction()
  const publicClient = usePublicClient()

  const [tab, setTab] = useState<Tab>('items')
  const [listings, setListings] = useState<Listing[]>([])
  const [chars, setChars] = useState<CharRow[]>([])
  const [maps, setMaps] = useState<MapRow[]>([])
  const [rentals, setRentals] = useState<RentalRow[]>([])
  const [bids, setBids] = useState<BidRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)   // listing id in flight
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // My characters (for item delivery + creating listings)
  const [myChars, setMyChars] = useState<Array<{ id: string; name: string; inventory_items: any[] }>>([])
  const [myMaps, setMyMaps] = useState<MapRow[]>([])

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (wallet) h['x-wallet-address'] = wallet
    return h
  }, [wallet])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/market/listings${tab === 'mine' ? '?mine=1' : ''}`, { headers })
      if (res.ok) {
        const json = await res.json()
        setListings(json.listings ?? [])
        setChars(json.characters ?? [])
        setMaps(json.maps ?? [])
        setRentals(json.rentals ?? [])
        setBids(json.bids ?? [])
      }
    } finally { setLoading(false) }
  }, [headers, tab])

  useEffect(() => { void load() }, [load])

  // Load my characters + maps for the create-listing modal
  useEffect(() => {
    if (!wallet) { setMyChars([]); setMyMaps([]); return }
    void supabase.from('characters')
      .select('id, name, inventory_items')
      .eq('wallet_address', wallet)
      .then(({ data }) => setMyChars((data ?? []) as any[]))
    void supabase.from('maps')
      .select('id, name, image_url, visibility, owner_wallet')
      .eq('owner_wallet', wallet)
      .then(({ data }) => setMyMaps((data ?? []) as any[]))
  }, [wallet, showCreate])

  const charById = useMemo(() => Object.fromEntries(chars.map((c) => [c.id, c])), [chars])
  const mapById = useMemo(() => Object.fromEntries(maps.map((m) => [m.id, m])), [maps])

  // ── Payments ────────────────────────────────────────────────────────────────

  async function payDnd721(to: string, tokens: number): Promise<string> {
    const hash = await writeContractAsync({
      address: DND721_TOKEN_ADDRESS,
      abi: DND721_TOKEN_ABI,
      functionName: 'transfer',
      args: [to as `0x${string}`, tokensToWei(tokens)],
      chainId: 8453,
    })
    await publicClient?.waitForTransactionReceipt({ hash })
    return hash
  }

  async function payEth(to: string, eth: number): Promise<string> {
    const hash = await sendTransactionAsync({ to: to as `0x${string}`, value: parseEther(String(eth)), chainId: 8453 })
    await publicClient?.waitForTransactionReceipt({ hash })
    return hash
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function buyListing(l: Listing) {
    if (!wallet) return
    let buyerCharacterId: string | undefined
    if (l.kind === 'item') {
      if (myChars.length === 0) { setNotice('Create a character first — items are delivered to a character.'); return }
      buyerCharacterId = myChars[0]!.id
      if (myChars.length > 1) {
        const names = myChars.map((c, i) => `${i + 1}. ${c.name}`).join('\n')
        const pick = window.prompt(`Deliver to which character?\n${names}\nEnter number:`, '1')
        const idx = Math.max(1, Math.min(myChars.length, parseInt(pick ?? '1', 10) || 1)) - 1
        buyerCharacterId = myChars[idx]!.id
      }
    }
    setBusy(l.id); setNotice(null)
    try {
      const txHash = l.currency === 'eth'
        ? await payEth(l.seller_wallet, Number(l.price_eth))
        : await payDnd721(l.seller_wallet, Number(l.price_tokens))
      const res = await fetch('/api/market/buy', {
        method: 'POST', headers,
        body: JSON.stringify({ listingId: l.id, txHash, buyerCharacterId }),
      })
      const json = await res.json()
      setNotice(json.ok ? `✓ Purchased${json.edition ? ` — edition ${json.edition}` : ''}!` : `Purchase failed: ${json.error}`)
      void load()
    } catch (e: any) {
      setNotice(e?.shortMessage ?? e?.message ?? 'Transaction cancelled')
    } finally { setBusy(null) }
  }

  async function rentListing(l: Listing, acceptedBid?: BidRow) {
    if (!wallet) return
    const perDay = acceptedBid ? Number(acceptedBid.amount) : Number(l.rent_per_day)
    const maxDays = acceptedBid?.days ?? Number(l.rent_max_days ?? 30)
    const pick = window.prompt(`Rent for how many days? (1–${maxDays}) · ${perDay} DND721/day`, String(maxDays))
    const days = Math.max(1, Math.min(maxDays, parseInt(pick ?? '0', 10) || 0))
    if (!days) return
    setBusy(l.id); setNotice(null)
    try {
      const txHash = await payDnd721(l.seller_wallet, perDay * days)
      const res = await fetch('/api/market/rent', {
        method: 'POST', headers,
        body: JSON.stringify({ listingId: l.id, days, txHash, bidId: acceptedBid?.id }),
      })
      const json = await res.json()
      setNotice(json.ok ? `✓ Rented for ${days} day${days > 1 ? 's' : ''}!` : `Rental failed: ${json.error}`)
      void load()
    } catch (e: any) {
      setNotice(e?.shortMessage ?? e?.message ?? 'Transaction cancelled')
    } finally { setBusy(null) }
  }

  async function completeBuyout(l: Listing, acceptedBid: BidRow) {
    if (!wallet) return
    setBusy(l.id); setNotice(null)
    try {
      const txHash = await payDnd721(l.seller_wallet, Number(acceptedBid.amount))
      const res = await fetch('/api/market/buy', {
        method: 'POST', headers,
        body: JSON.stringify({ listingId: l.id, txHash, bidId: acceptedBid.id }),
      })
      const json = await res.json()
      setNotice(json.ok ? '✓ Character is yours!' : `Buyout failed: ${json.error}`)
      void load()
    } catch (e: any) {
      setNotice(e?.shortMessage ?? e?.message ?? 'Transaction cancelled')
    } finally { setBusy(null) }
  }

  async function submitBid(l: Listing, kind: 're_rent' | 'buy') {
    if (!wallet) return
    const amountStr = window.prompt(kind === 're_rent'
      ? 'Offer (DND721 per day):' : 'Total buyout offer (DND721):')
    const amount = Number(amountStr)
    if (!Number.isFinite(amount) || amount <= 0) return
    let days: number | undefined
    if (kind === 're_rent') {
      days = parseInt(window.prompt('For how many days?') ?? '0', 10)
      if (!days || days < 1) return
    }
    const message = window.prompt('Message to the owner (optional):') ?? undefined
    const res = await fetch('/api/market/bid', {
      method: 'POST', headers,
      body: JSON.stringify({ listingId: l.id, kind, amount, days, message }),
    })
    const json = await res.json()
    setNotice(json.ok ? '✓ Bid sent to the owner.' : `Bid failed: ${json.error}`)
    void load()
  }

  async function respondBid(bid: BidRow, accept: boolean) {
    const res = await fetch('/api/market/bid', {
      method: 'PATCH', headers,
      body: JSON.stringify({ bidId: bid.id, accept }),
    })
    const json = await res.json()
    setNotice(json.ok ? `Bid ${accept ? 'accepted — the bidder can now complete payment' : 'declined'}.` : `Failed: ${json.error}`)
    void load()
  }

  async function cancelListing(l: Listing) {
    await fetch(`/api/market/listings?id=${l.id}`, { method: 'DELETE', headers })
    void load()
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  function Price({ l }: { l: Listing }) {
    if (l.kind === 'character_rent') {
      return <span className="font-semibold text-amber-300">{l.rent_per_day} DND721<span className="text-slate-400 font-normal">/day · max {l.rent_max_days}d</span></span>
    }
    return l.currency === 'eth'
      ? <span className="font-semibold text-sky-300">{l.price_eth} ETH</span>
      : <span className="font-semibold text-amber-300">{l.price_tokens} DND721</span>
  }

  function ListingCard({ l }: { l: Listing }) {
    const isMine = wallet === l.seller_wallet.toLowerCase()
    const ch = l.character_id ? charById[l.character_id] : null
    const mp = l.map_id ? mapById[l.map_id] : null
    const shopItem = l.item_key ? getShopItem(l.item_key) : null
    const isNftItem = shopItem?.tier === 'E'
    const activeRental = rentals.find((r) => r.listing_id === l.id && r.status === 'active')
    const iAmRenter = activeRental?.renter_wallet?.toLowerCase() === wallet
    const rentalEndsSoon = activeRental && (new Date(activeRental.ends_at).getTime() - Date.now()) < 48 * 3600 * 1000
    const myAcceptedRe = bids.find((b) => b.listing_id === l.id && b.status === 'accepted' && b.kind === 're_rent' && b.bidder_wallet.toLowerCase() === wallet)
    const myAcceptedBuy = bids.find((b) => b.listing_id === l.id && b.status === 'accepted' && b.kind === 'buy' && b.bidder_wallet.toLowerCase() === wallet)
    const pendingOnMine = isMine ? bids.filter((b) => b.listing_id === l.id && b.status === 'pending') : []

    return (
      <div className="flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
        {/* art / avatar */}
        {isNftItem && (
          <img src={`/api/shop/nft/${l.item_key}/image`} alt={l.item_name ?? ''} loading="lazy"
               className="w-full aspect-square rounded-lg border border-purple-700/40 object-cover" />
        )}
        {mp?.image_url && (
          <img src={mp.image_url} alt={mp.name ?? 'Map'} loading="lazy"
               className="w-full aspect-video rounded-lg border border-emerald-700/40 object-cover" />
        )}
        {ch?.avatar_url && (
          <img src={ch.avatar_url} alt={ch.name} loading="lazy"
               className="w-full aspect-square rounded-lg border border-indigo-700/40 object-cover" />
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-100 text-sm truncate">
              {l.kind === 'item' && (l.item_name ?? l.item_key)}
              {l.kind === 'character_rent' && (ch ? `${ch.name}` : 'Character')}
              {l.kind === 'map' && (mp?.name ?? 'Map')}
            </p>
            <p className="text-[11px] text-slate-500">
              {l.kind === 'item' && (isNftItem ? 'Item NFT · permanent' : 'Item')}
              {l.kind === 'character_rent' && ch && `${ch.main_job ?? ''} Lv.${ch.level ?? 1} · rental`}
              {l.kind === 'map' && `Map NFT · rarity 1:${l.map_rarity} · ${l.editions_sold}/${l.map_rarity} sold`}
              {' · '}seller {short(l.seller_wallet)}
            </p>
          </div>
          {l.kind === 'map' && <span className="shrink-0 rounded bg-emerald-900/70 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200 ring-1 ring-emerald-600/50">MAP NFT</span>}
          {isNftItem && <span className="shrink-0 rounded bg-purple-900/70 px-1.5 py-0.5 text-[9px] font-bold text-purple-200 ring-1 ring-purple-600/50">NFT</span>}
        </div>

        {activeRental && (
          <p className="text-[11px] text-amber-300/90">
            ⏳ Rented{iAmRenter ? ' by you' : ''} until {new Date(activeRental.ends_at).toLocaleDateString()}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="text-xs"><Price l={l} /></div>
          {!isConnected ? (
            <span className="text-xs text-slate-500">Connect wallet</span>
          ) : isMine ? (
            <button onClick={() => void cancelListing(l)} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
              Cancel listing
            </button>
          ) : l.kind === 'character_rent' ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {myAcceptedBuy ? (
                <button disabled={busy === l.id} onClick={() => void completeBuyout(l, myAcceptedBuy)}
                        className="rounded-md bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-600 disabled:opacity-50">
                  {busy === l.id ? '⏳…' : `Complete buyout · ${myAcceptedBuy.amount}`}
                </button>
              ) : myAcceptedRe ? (
                <button disabled={busy === l.id} onClick={() => void rentListing(l, myAcceptedRe)}
                        className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                  {busy === l.id ? '⏳…' : `Re-rent @ ${myAcceptedRe.amount}/day`}
                </button>
              ) : !activeRental ? (
                <button disabled={busy === l.id} onClick={() => void rentListing(l)}
                        className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                  {busy === l.id ? '⏳…' : 'Rent'}
                </button>
              ) : null}
              {iAmRenter && rentalEndsSoon && (
                <>
                  <button onClick={() => void submitBid(l, 're_rent')} className="rounded-md border border-amber-600/60 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-950/40">Bid re-rent</button>
                  <button onClick={() => void submitBid(l, 'buy')} className="rounded-md border border-purple-600/60 px-2.5 py-1.5 text-xs text-purple-300 hover:bg-purple-950/40">Bid to buy</button>
                </>
              )}
            </div>
          ) : (
            <button disabled={busy === l.id || (l.kind === 'map' && l.editions_sold >= (l.map_rarity ?? 1))}
                    onClick={() => void buyListing(l)}
                    className="rounded-md bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
              {busy === l.id ? '⏳…' : 'Buy'}
            </button>
          )}
        </div>

        {/* Owner: pending bids on this listing */}
        {pendingOnMine.length > 0 && (
          <div className="rounded-md border border-amber-800/40 bg-amber-950/20 p-2 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase text-amber-400">Bids</p>
            {pendingOnMine.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 text-[11px] text-amber-100">
                <span className="min-w-0 truncate">
                  {short(b.bidder_wallet)} · {b.kind === 're_rent' ? `${b.amount}/day × ${b.days}d` : `buy ${b.amount} DND721`}
                  {b.message ? ` — “${b.message}”` : ''}
                </span>
                <span className="flex shrink-0 gap-1">
                  <button onClick={() => void respondBid(b, true)} className="rounded bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700">✓</button>
                  <button onClick={() => void respondBid(b, false)} className="rounded bg-rose-900 px-2 py-0.5 hover:bg-rose-800">✕</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const visible = listings.filter((l) =>
    tab === 'mine' ? true
    : tab === 'items' ? l.kind === 'item'
    : tab === 'rentals' ? l.kind === 'character_rent'
    : l.kind === 'map')

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'items',   label: '🗡 Items' },
    { key: 'rentals', label: '🎭 Character Rentals' },
    { key: 'maps',    label: '🗺 Map NFTs' },
    { key: 'mine',    label: '📋 My Listings' },
  ]

  return (
    <div className="mx-auto max-w-6xl min-h-screen px-4 py-6 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-yellow-100">Marketplace</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Trade item &amp; map NFTs for DND721 or ETH · rent out characters · payments settle wallet-to-wallet on Base.
          </p>
        </div>
        {isConnected && (
          <button onClick={() => setShowCreate(true)}
                  className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
            + Create Listing
          </button>
        )}
      </div>

      {notice && (
        <div className="mt-3 rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 flex justify-between gap-2">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${tab === t.key ? 'bg-amber-700 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading marketplace…</p>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">
            {tab === 'mine' ? 'You have no listings yet.' : 'Nothing listed here yet — be the first!'}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((l) => <ListingCard key={l.id} l={l} />)}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateListingModal
          headers={headers}
          myChars={myChars}
          myMaps={myMaps}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setTab('mine'); void load() }}
        />
      )}
    </div>
  )
}

// ─── Create Listing Modal ─────────────────────────────────────────────────────

function CreateListingModal({
  headers, myChars, myMaps, onClose, onCreated,
}: {
  headers: Record<string, string>
  myChars: Array<{ id: string; name: string; inventory_items: any[] }>
  myMaps: MapRow[]
  onClose: () => void
  onCreated: () => void
}) {
  const [kind, setKind] = useState<'item' | 'character_rent' | 'map'>('item')
  const [charId, setCharId] = useState('')
  const [itemKey, setItemKey] = useState('')
  const [currency, setCurrency] = useState<'dnd721' | 'eth'>('dnd721')
  const [price, setPrice] = useState('')
  const [perDay, setPerDay] = useState('')
  const [maxDays, setMaxDays] = useState('7')
  const [mapId, setMapId] = useState('')
  const [rarity, setRarity] = useState('1')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const invItems = useMemo(() => {
    const c = myChars.find((c) => c.id === charId)
    return Array.isArray(c?.inventory_items) ? c!.inventory_items.filter((i: any) => (i.qty ?? 0) > 0) : []
  }, [myChars, charId])

  async function submit() {
    setSaving(true); setErr(null)
    try {
      const body: Record<string, any> = { kind, currency }
      if (kind === 'item') {
        body.characterId = charId; body.itemKey = itemKey
        if (currency === 'dnd721') body.priceTokens = Number(price); else body.priceEth = Number(price)
      } else if (kind === 'character_rent') {
        body.characterId = charId; body.rentPerDay = Number(perDay); body.rentMaxDays = Number(maxDays)
        body.currency = 'dnd721'
      } else {
        body.mapId = mapId; body.rarity = Number(rarity)
        if (currency === 'dnd721') body.priceTokens = Number(price); else body.priceEth = Number(price)
      }
      const res = await fetch('/api/market/listings', { method: 'POST', headers, body: JSON.stringify(body) })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Failed to create listing')
      onCreated()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed')
    } finally { setSaving(false) }
  }

  const inputCls = 'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-yellow-100">Create Listing</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>

        <div className="flex gap-1.5">
          {([['item', 'Sell Item'], ['character_rent', 'Rent Character'], ['map', 'Map NFT']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setKind(k)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${kind === k ? 'bg-amber-700 text-white' : 'bg-slate-900 text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {(kind === 'item' || kind === 'character_rent') && (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Character</label>
            <select value={charId} onChange={(e) => { setCharId(e.target.value); setItemKey('') }} className={inputCls}>
              <option value="">— Select —</option>
              {myChars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {kind === 'item' && charId && (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Item to sell</label>
            <select value={itemKey} onChange={(e) => setItemKey(e.target.value)} className={inputCls}>
              <option value="">— Select —</option>
              {invItems.map((i: any) => <option key={i.key} value={i.key}>{i.name} ×{i.qty}</option>)}
            </select>
          </div>
        )}

        {kind === 'character_rent' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">DND721 / day</label>
              <input type="number" min="0.01" step="0.01" value={perDay} onChange={(e) => setPerDay(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Max days</label>
              <input type="number" min="1" max="365" value={maxDays} onChange={(e) => setMaxDays(e.target.value)} className={inputCls} />
            </div>
            <p className="col-span-2 text-[10px] text-slate-500">
              The renter plays the character until the term ends, then may bid to re-rent or buy. You accept or decline each bid.
            </p>
          </div>
        )}

        {kind === 'map' && (
          <>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Map (will become private)</label>
              <select value={mapId} onChange={(e) => setMapId(e.target.value)} className={inputCls}>
                <option value="">— Select —</option>
                {myMaps.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.id.slice(0, 8)}{m.visibility === 'private' ? ' (private)' : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Rarity — edition size</label>
              <select value={rarity} onChange={(e) => setRarity(e.target.value)} className={inputCls}>
                <option value="1">1:1 — unique</option>
                <option value="5">1:5</option>
                <option value="10">1:10</option>
                <option value="100">1:100</option>
                <option value="500">1:500</option>
                <option value="1000">1:1000</option>
                <option value="2000">1:2000</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-500">
                Each buyer receives a numbered edition. Owning any edition lets them use this map in their campaigns.
              </p>
            </div>
          </>
        )}

        {kind !== 'character_rent' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className={inputCls}>
                <option value="dnd721">DND721</option>
                <option value="eth">ETH</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                Price {kind === 'map' ? '(per edition)' : ''} ({currency === 'eth' ? 'ETH' : 'DND721'})
              </label>
              <input type="number" min="0" step="0.0001" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        {err && <p className="rounded-md border border-rose-800/50 bg-rose-950/40 px-3 py-1.5 text-[11px] text-rose-200">{err}</p>}

        <button
          onClick={() => void submit()}
          disabled={saving
            || (kind === 'item' && (!charId || !itemKey || !Number(price)))
            || (kind === 'character_rent' && (!charId || !Number(perDay) || !Number(maxDays)))
            || (kind === 'map' && (!mapId || !Number(price)))}
          className="w-full rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create Listing'}
        </button>
      </div>
    </div>
  )
}
