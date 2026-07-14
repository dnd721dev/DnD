'use client'

// DND721 Marketplace — trade the NFTs themselves.
//   • NFTs: sell an owned DND721 NFT for DND721 tokens or ETH. Settlement is
//     two-step: the buyer pays the seller (verified on-chain), then the seller
//     sends the ERC-721 to the buyer — also verified — closing the sale.
//   • NFT Rentals: rent an NFT out at tokens/day for up to N days. The renter
//     can BUILD A CHARACTER with the rented NFT (it appears in their character
//     creation picker) until the rent is up; at expiry the character's NFT
//     link is released. Near/after term end the renter can bid to RE-RENT or
//     BUY; the owner accepts or declines.
//   • Maps: privating a map lists it with an owner-chosen rarity (edition
//     size, 1:1 … 1:N). Owning any numbered edition grants campaign use.
// Payments settle wallet-to-wallet on Base; the server verifies every tx.

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAccount, useWriteContract, useSendTransaction, usePublicClient } from 'wagmi'
import { parseEther } from 'viem'
import { supabase } from '@/lib/supabase'
import { DND721_TOKEN_ADDRESS, DND721_TOKEN_ABI } from '@/lib/dnd721Token'
import { TiltCard } from '@/components/market/TiltCard'
import type { VaultFeatured } from '@/components/market/VaultScene'

// The 3D vault is heavy (three.js) — load it lazily, client-only, with a
// skeleton while the chunk streams in.
const VaultScene = dynamic(() => import('@/components/market/VaultScene'), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" />,
})

type Tab = 'nfts' | 'rentals' | 'maps' | 'mine'

type Listing = {
  id: string
  kind: 'nft' | 'nft_rent' | 'map' | 'item' | 'character_rent'
  seller_wallet: string
  buyer_wallet: string | null
  nft_contract: string | null
  nft_token_id: string | null
  nft_name: string | null
  nft_image: string | null
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

type MapRow = { id: string; name: string | null; image_url: string | null; visibility: string; owner_wallet: string | null; mint_status?: string | null; mint_token_id?: string | null }
type RentalRow = { id: string; listing_id: string; renter_wallet: string; owner_wallet: string; ends_at: string; per_day: number; days: number; status: string }
type BidRow = { id: string; listing_id: string; bidder_wallet: string; kind: 're_rent' | 'buy'; amount: number; days: number | null; message: string | null; status: string }
type WalletNft = { contract: string; tokenId: string; metadata: { name?: string; image?: string | null } | null; rented?: boolean }

const ERC721_TRANSFER_ABI = [{
  name: 'safeTransferFrom',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
  ],
  outputs: [],
}] as const

const ERC721_APPROVE_ABI = [{
  name: 'approve',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
  ],
  outputs: [],
}] as const

const ERC20_APPROVE_ABI = [{
  name: 'approve',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
  ],
  outputs: [{ type: 'bool' }],
}] as const

/** DND721Market.sol — trustless atomic swap. list/cancel by the owner only;
 *  buy() pays the seller and delivers the NFT in one transaction. No admin,
 *  no relayer, no custody. */
const MARKET_ABI = [
  {
    name: 'list',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nft', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'currency', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'reservedBuyer', type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'cancel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nft', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'buy',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'nft', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

/** Deployed DND721Market contract (legacy env var name accepted). */
const MARKET_ADDRESS = ((process.env.NEXT_PUBLIC_MARKET_CONTRACT_ADDRESS
  ?? process.env.NEXT_PUBLIC_MARKET_ESCROW_ADDRESS) ?? '') as `0x${string}` | ''

/** DND721Maps.sol — the map NFT collection. mint(uri) mints to the caller. */
const MAPS_NFT_ADDRESS = (process.env.NEXT_PUBLIC_MAPS_NFT_ADDRESS ?? '') as `0x${string}` | ''

const MAPS_NFT_ABI = [{
  name: 'mint',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [{ name: 'uri', type: 'string' }],
  outputs: [{ name: 'tokenId', type: 'uint256' }],
}] as const

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

  const [tab, setTab] = useState<Tab>('nfts')
  const [listings, setListings] = useState<Listing[]>([])
  const [maps, setMaps] = useState<MapRow[]>([])
  const [rentals, setRentals] = useState<RentalRow[]>([])
  const [bids, setBids] = useState<BidRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

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
        setMaps(json.maps ?? [])
        setRentals(json.rentals ?? [])
        setBids(json.bids ?? [])
      }
    } finally { setLoading(false) }
  }, [headers, tab])

  useEffect(() => { void load() }, [load])

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

  /** Buy through the trustless DND721Market contract: payment to the seller
   *  and NFT delivery happen atomically in the buyer's own transaction. */
  async function buyNftViaContract(l: Listing, bidAmountTokens?: number): Promise<string> {
    if (!MARKET_ADDRESS || !l.nft_contract || !l.nft_token_id) throw new Error('Market contract not configured')
    const isEth = l.currency === 'eth' && bidAmountTokens == null
    if (!isEth) {
      // ERC-20 path: approve the market to pull the price, then buy.
      const tokens = bidAmountTokens ?? Number(l.price_tokens)
      const approveHash = await writeContractAsync({
        address: DND721_TOKEN_ADDRESS,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [MARKET_ADDRESS, tokensToWei(tokens)],
        chainId: 8453,
      })
      await publicClient?.waitForTransactionReceipt({ hash: approveHash })
    }
    const buyHash = await writeContractAsync({
      address: MARKET_ADDRESS,
      abi: MARKET_ABI,
      functionName: 'buy',
      args: [l.nft_contract as `0x${string}`, BigInt(l.nft_token_id)],
      chainId: 8453,
      ...(isEth ? { value: parseEther(String(l.price_eth)) } : {}),
    })
    await publicClient?.waitForTransactionReceipt({ hash: buyHash })
    return buyHash
  }

  /** Mint a map NFT on the DND721Maps contract (edition 0 = creator's copy),
   *  then record the token in the DB. Returns the minted token id. */
  async function mintMapNft(mapId: string, edition: number): Promise<string | null> {
    if (!MAPS_NFT_ADDRESS) return null
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const uri = `${origin}/api/maps/nft/${mapId}${edition > 0 ? `?edition=${edition}` : ''}`
    const hash = await writeContractAsync({
      address: MAPS_NFT_ADDRESS,
      abi: MAPS_NFT_ABI,
      functionName: 'mint',
      args: [uri],
      chainId: 8453,
    })
    await publicClient?.waitForTransactionReceipt({ hash })
    const res = await fetch('/api/maps/mint-record', {
      method: 'POST', headers,
      body: JSON.stringify({ mapId, txHash: hash, edition }),
    })
    const json = await res.json()
    return json.ok ? String(json.tokenId) : null
  }

  async function buyListing(l: Listing) {
    if (!wallet) return
    setBusy(l.id); setNotice(null)
    try {
      // NFT sales settle atomically through the market contract; map editions
      // (and legacy flows) pay the seller directly.
      const txHash = l.kind === 'nft' && MARKET_ADDRESS
        ? await buyNftViaContract(l)
        : l.currency === 'eth'
        ? await payEth(l.seller_wallet, Number(l.price_eth))
        : await payDnd721(l.seller_wallet, Number(l.price_tokens))
      const res = await fetch('/api/market/buy', {
        method: 'POST', headers,
        body: JSON.stringify({ listingId: l.id, txHash }),
      })
      const json = await res.json()
      if (json.ok && json.kind === 'map' && json.editionNo && MAPS_NFT_ADDRESS && l.map_id) {
        // Edition purchased — mint the numbered edition NFT to the buyer.
        setNotice(`✓ Edition ${json.edition} purchased — minting your NFT…`)
        try {
          const tokenId = await mintMapNft(l.map_id, Number(json.editionNo))
          setNotice(tokenId
            ? `✓ Edition ${json.edition} purchased and minted — token #${tokenId} is in your wallet!`
            : `✓ Edition ${json.edition} purchased! (NFT mint skipped — you can mint later from this card.)`)
        } catch {
          setNotice(`✓ Edition ${json.edition} purchased! (NFT mint cancelled — the map is still unlocked for you.)`)
        }
      } else {
        setNotice(json.ok
          ? json.delivered
            ? '✓ Purchased — the NFT is in your wallet!'
            : json.status === 'awaiting_transfer'
            ? '✓ Payment sent! The seller will now transfer the NFT to your wallet.'
            : `✓ Purchased${json.edition ? ` — edition ${json.edition}` : ''}!`
          : `Purchase failed: ${json.error}`)
      }
      void load()
    } catch (e: any) {
      setNotice(e?.shortMessage ?? e?.message ?? 'Transaction cancelled')
    } finally { setBusy(null) }
  }

  /** Seller: send the ERC-721 to the recorded buyer, then confirm on-chain. */
  async function sendNft(l: Listing) {
    if (!wallet || !address || !l.buyer_wallet || !l.nft_contract || !l.nft_token_id) return
    setBusy(l.id); setNotice(null)
    try {
      const hash = await writeContractAsync({
        address: l.nft_contract as `0x${string}`,
        abi: ERC721_TRANSFER_ABI,
        functionName: 'safeTransferFrom',
        args: [address, l.buyer_wallet as `0x${string}`, BigInt(l.nft_token_id)],
        chainId: 8453,
      })
      await publicClient?.waitForTransactionReceipt({ hash })
      const res = await fetch('/api/market/confirm-transfer', {
        method: 'POST', headers,
        body: JSON.stringify({ listingId: l.id, txHash: hash }),
      })
      const json = await res.json()
      setNotice(json.ok ? '✓ NFT delivered — sale complete!' : `Transfer confirm failed: ${json.error}`)
      void load()
    } catch (e: any) {
      setNotice(e?.shortMessage ?? e?.message ?? 'Transaction cancelled')
    } finally { setBusy(null) }
  }

  async function rentListing(l: Listing, acceptedBid?: BidRow) {
    if (!wallet) return
    const perDay = acceptedBid ? Number(acceptedBid.amount) : Number(l.rent_per_day)
    const maxDays = acceptedBid?.days ?? Number(l.rent_max_days ?? 30)
    const pick = window.prompt(`Rent for how many days? (1–${maxDays}) · ${perDay} DND721/day\nYou can build a character with this NFT until the rent is up.`, String(maxDays))
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
      setNotice(json.ok
        ? `✓ Rented for ${days} day${days > 1 ? 's' : ''} — the NFT is now available in your character builder!`
        : `Rental failed: ${json.error}`)
      void load()
    } catch (e: any) {
      setNotice(e?.shortMessage ?? e?.message ?? 'Transaction cancelled')
    } finally { setBusy(null) }
  }

  async function completeBuyout(l: Listing, acceptedBid: BidRow) {
    if (!wallet) return
    setBusy(l.id); setNotice(null)
    try {
      // With the market contract, the owner accepted by listing the NFT
      // reserved for you at the bid price — one atomic buy() completes it.
      const txHash = l.kind === 'nft_rent' && MARKET_ADDRESS && l.nft_contract
        ? await buyNftViaContract(l, Number(acceptedBid.amount))
        : await payDnd721(l.seller_wallet, Number(acceptedBid.amount))
      const res = await fetch('/api/market/buy', {
        method: 'POST', headers,
        body: JSON.stringify({ listingId: l.id, txHash, bidId: acceptedBid.id }),
      })
      const json = await res.json()
      setNotice(json.ok
        ? json.delivered ? '✓ Buyout complete — the NFT is in your wallet!' : '✓ Buyout paid! The owner will now transfer the NFT to you.'
        : `Buyout failed: ${json.error}`)
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

  async function respondBid(l: Listing, bid: BidRow, accept: boolean) {
    try {
      // Accepting a BUY bid on an NFT rental: the owner lists the NFT on the
      // trustless market contract, reserved for the bidder at the bid price.
      // The bidder's buy() then pays the owner + delivers the NFT atomically.
      if (accept && bid.kind === 'buy' && l.kind === 'nft_rent' && MARKET_ADDRESS && l.nft_contract && l.nft_token_id) {
        const approveHash = await writeContractAsync({
          address: l.nft_contract as `0x${string}`,
          abi: ERC721_APPROVE_ABI,
          functionName: 'approve',
          args: [MARKET_ADDRESS, BigInt(l.nft_token_id)],
          chainId: 8453,
        })
        await publicClient?.waitForTransactionReceipt({ hash: approveHash })
        const listHash = await writeContractAsync({
          address: MARKET_ADDRESS,
          abi: MARKET_ABI,
          functionName: 'list',
          args: [
            l.nft_contract as `0x${string}`,
            BigInt(l.nft_token_id),
            DND721_TOKEN_ADDRESS,                       // buyouts settle in DND721
            tokensToWei(Number(bid.amount)),
            bid.bidder_wallet as `0x${string}`,          // reserved for the bidder
          ],
          chainId: 8453,
        })
        await publicClient?.waitForTransactionReceipt({ hash: listHash })
      }
      const res = await fetch('/api/market/bid', {
        method: 'PATCH', headers,
        body: JSON.stringify({ bidId: bid.id, accept }),
      })
      const json = await res.json()
      setNotice(json.ok ? `Bid ${accept ? 'accepted — the bidder can now complete the purchase' : 'declined'}.` : `Failed: ${json.error}`)
      void load()
    } catch (e: any) {
      setNotice(e?.shortMessage ?? e?.message ?? 'Transaction cancelled')
    }
  }

  async function cancelListing(l: Listing) {
    try {
      // NFT sale listings also live on-chain — cancel there too so the
      // approval can't be spent through a stale listing.
      if (l.kind === 'nft' && MARKET_ADDRESS && l.nft_contract && l.nft_token_id) {
        const hash = await writeContractAsync({
          address: MARKET_ADDRESS,
          abi: MARKET_ABI,
          functionName: 'cancel',
          args: [l.nft_contract as `0x${string}`, BigInt(l.nft_token_id)],
          chainId: 8453,
        })
        await publicClient?.waitForTransactionReceipt({ hash })
      }
    } catch (e: any) {
      // On-chain cancel declined/failed — still cancel the DB listing so it
      // stops showing; the seller can revoke approval from their wallet.
      console.warn('[market] on-chain cancel skipped:', e?.shortMessage ?? e?.message)
    }
    await fetch(`/api/market/listings?id=${l.id}`, { method: 'DELETE', headers })
    void load()
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  function Price({ l }: { l: Listing }) {
    if (l.kind === 'nft_rent' || l.kind === 'character_rent') {
      return <span className="font-semibold text-amber-300">{l.rent_per_day} DND721<span className="text-slate-400 font-normal">/day · max {l.rent_max_days}d</span></span>
    }
    return l.currency === 'eth'
      ? <span className="font-semibold text-sky-300">{l.price_eth} ETH</span>
      : <span className="font-semibold text-amber-300">{l.price_tokens} DND721</span>
  }

  function ListingCard({ l }: { l: Listing }) {
    const isMine = wallet === l.seller_wallet.toLowerCase()
    const mp = l.map_id ? mapById[l.map_id] : null
    const isRentKind = l.kind === 'nft_rent' || l.kind === 'character_rent'
    const activeRental = rentals.find((r) => r.listing_id === l.id && r.status === 'active')
    const iAmRenter = activeRental?.renter_wallet?.toLowerCase() === wallet
    const rentalEndsSoon = activeRental && (new Date(activeRental.ends_at).getTime() - Date.now()) < 48 * 3600 * 1000
    const myAcceptedRe = bids.find((b) => b.listing_id === l.id && b.status === 'accepted' && b.kind === 're_rent' && b.bidder_wallet.toLowerCase() === wallet)
    const myAcceptedBuy = bids.find((b) => b.listing_id === l.id && b.status === 'accepted' && b.kind === 'buy' && b.bidder_wallet.toLowerCase() === wallet)
    const pendingOnMine = isMine ? bids.filter((b) => b.listing_id === l.id && b.status === 'pending') : []
    const awaiting = l.status === 'awaiting_transfer'
    const iAmBuyer = awaiting && l.buyer_wallet?.toLowerCase() === wallet

    return (
      <TiltCard className="flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 hover:border-[color:var(--gold)]">
        {l.nft_image && (
          <img src={l.nft_image} alt={l.nft_name ?? 'NFT'} loading="lazy"
               className="w-full aspect-square rounded-lg border border-purple-700/40 object-cover" />
        )}
        {mp?.image_url && (
          <img src={mp.image_url} alt={mp.name ?? 'Map'} loading="lazy"
               className="w-full aspect-video rounded-lg border border-emerald-700/40 object-cover" />
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-slate-100 text-sm truncate">
              {l.kind === 'map' ? (mp?.name ?? 'Map') : (l.nft_name ?? `DND721 #${l.nft_token_id}`)}
            </p>
            <p className="text-[11px] text-slate-500">
              {l.kind === 'nft' && `NFT · token #${l.nft_token_id}`}
              {l.kind === 'nft_rent' && `NFT rental · token #${l.nft_token_id} · build a character with it`}
              {l.kind === 'map' && `Map NFT · rarity 1:${l.map_rarity} · ${l.editions_sold}/${l.map_rarity} sold`}
              {' · '}seller {short(l.seller_wallet)}
            </p>
          </div>
          {l.kind === 'map'
            ? <span className="shrink-0 rounded bg-emerald-900/70 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200 ring-1 ring-emerald-600/50">MAP NFT</span>
            : <span className="shrink-0 rounded bg-purple-900/70 px-1.5 py-0.5 text-[9px] font-bold text-purple-200 ring-1 ring-purple-600/50">{l.kind === 'nft_rent' ? 'RENT' : 'NFT'}</span>}
        </div>

        {activeRental && (
          <p className="text-[11px] text-amber-300/90">
            ⏳ Rented{iAmRenter ? ' by you' : ''} until {new Date(activeRental.ends_at).toLocaleString()}
          </p>
        )}
        {awaiting && (
          <p className="text-[11px] text-sky-300/90">
            {iAmBuyer ? '💸 Paid — awaiting the seller\'s NFT transfer to your wallet.'
              : isMine ? '⚠ Buyer has paid — send the NFT to complete the sale.'
              : '🔒 Sale pending transfer.'}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="text-xs"><Price l={l} /></div>
          {!isConnected ? (
            <span className="text-xs text-slate-500">Connect wallet</span>
          ) : awaiting && isMine ? (
            <button disabled={busy === l.id} onClick={() => void sendNft(l)}
                    className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600 disabled:opacity-50">
              {busy === l.id ? '⏳ Sending…' : '📤 Send NFT to buyer'}
            </button>
          ) : awaiting ? (
            <span className="text-xs text-slate-500">Pending transfer</span>
          ) : isMine ? (
            <div className="flex flex-wrap justify-end gap-1.5">
              {/* Creator's own map NFT — mint their copy on the DND721Maps contract */}
              {l.kind === 'map' && MAPS_NFT_ADDRESS && l.map_id && mp && mp.mint_status !== 'minted' && (
                <button
                  disabled={busy === l.id}
                  onClick={async () => {
                    setBusy(l.id); setNotice(null)
                    try {
                      const tokenId = await mintMapNft(l.map_id!, 0)
                      setNotice(tokenId
                        ? `✓ Creator's copy minted — token #${tokenId} is in your wallet!`
                        : 'Mint recorded failed — try again.')
                      void load()
                    } catch (e: any) {
                      setNotice(e?.shortMessage ?? e?.message ?? 'Mint cancelled')
                    } finally { setBusy(null) }
                  }}
                  className="rounded-md bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-600 disabled:opacity-50"
                  title="Mint your own copy of this map as an NFT (tradeable on OpenSea)"
                >
                  {busy === l.id ? '⏳ Minting…' : '🪙 Mint creator NFT'}
                </button>
              )}
              {l.kind === 'map' && mp?.mint_status === 'minted' && (
                <span className="rounded-md bg-purple-950/50 px-2.5 py-1.5 text-[10px] font-semibold text-purple-300 ring-1 ring-purple-700/40">
                  Minted · #{mp.mint_token_id}
                </span>
              )}
              <button onClick={() => void cancelListing(l)} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
                Cancel listing
              </button>
            </div>
          ) : isRentKind ? (
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
                  <button onClick={() => void respondBid(l, b, true)} className="rounded bg-emerald-800 px-2 py-0.5 hover:bg-emerald-700">✓</button>
                  <button onClick={() => void respondBid(l, b, false)} className="rounded bg-rose-900 px-2 py-0.5 hover:bg-rose-800">✕</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </TiltCard>
    )
  }

  const visible = listings.filter((l) =>
    tab === 'mine' ? true
    : tab === 'nfts' ? l.kind === 'nft'
    : tab === 'rentals' ? (l.kind === 'nft_rent' || l.kind === 'character_rent')
    : l.kind === 'map')

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'nfts',    label: '🎴 NFTs' },
    { key: 'rentals', label: '🎭 NFT Rentals' },
    { key: 'maps',    label: '🗺 Map NFTs' },
    { key: 'mine',    label: '📋 My Listings' },
  ]

  // The Vault's featured exhibit — the newest open listing with real artwork.
  // Real listings only; an empty vault shows an arcane gem, never fake wares.
  const featuredListing = listings.find((l) => {
    if (l.status !== 'active') return false
    if (l.nft_image) return true
    return l.kind === 'map' && !!(l.map_id && mapById[l.map_id]?.image_url)
  }) ?? null
  const featured: VaultFeatured | null = featuredListing
    ? {
        image: featuredListing.nft_image
          ?? (featuredListing.map_id ? mapById[featuredListing.map_id]?.image_url ?? null : null),
        name: featuredListing.kind === 'map'
          ? (featuredListing.map_id ? mapById[featuredListing.map_id]?.name ?? 'Map NFT' : 'Map NFT')
          : (featuredListing.nft_name ?? `DND721 #${featuredListing.nft_token_id}`),
        accent: featuredListing.kind === 'map' ? 0x2f9e6e
          : featuredListing.kind === 'nft_rent' ? 0x8a6fd9
          : 0xd4a94f,
      }
    : null

  return (
    <div className="dossier mx-auto max-w-6xl min-h-screen px-4 py-6 text-slate-100">
      {/* ── The Vault — 3D showcase ──────────────────────────────────────────── */}
      <div
        className="relative h-[300px] overflow-hidden rounded-2xl border sm:h-[340px]"
        style={{ borderColor: 'var(--edge-strong)', background: 'var(--bg-abyss)', boxShadow: 'var(--shadow-panel)' }}
      >
        <VaultScene featured={featured} />

        {/* Caption + actions over the scene */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">The Vault</p>
              <h1 className="page-title text-3xl">Marketplace</h1>
              <p className="mt-1 max-w-md text-xs" style={{ color: 'var(--text-mid)' }}>
                Sell your DND721 NFTs for DND721 or ETH · rent NFTs out (renters build characters with them) · map NFT editions.
              </p>
            </div>
            {isConnected && (
              <button onClick={() => setShowCreate(true)} className="btn btn-primary pointer-events-auto">
                + Create Listing
              </button>
            )}
          </div>

          {featuredListing && featured && (
            <div
              className="pointer-events-auto self-start rounded-lg border px-3 py-2 backdrop-blur-sm"
              style={{ borderColor: 'var(--edge)', background: 'rgba(7,10,18,0.55)' }}
            >
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-low)' }}>
                Featured exhibit
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--gold-bright)' }}>
                {featured.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-mid)' }}>
                <Price l={featuredListing} />
              </p>
            </div>
          )}
        </div>
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

      {showCreate && wallet && (
        <CreateListingModal
          wallet={wallet}
          headers={headers}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); setTab('mine'); void load() }}
        />
      )}
    </div>
  )
}

// ─── Create Listing Modal ─────────────────────────────────────────────────────

function CreateListingModal({
  wallet, headers, onClose, onCreated,
}: {
  wallet: string
  headers: Record<string, string>
  onClose: () => void
  onCreated: () => void
}) {
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const [kind, setKind] = useState<'nft' | 'nft_rent' | 'map'>('nft')
  const [nfts, setNfts] = useState<WalletNft[]>([])
  const [nftsLoading, setNftsLoading] = useState(false)
  const [pickedNft, setPickedNft] = useState('')       // `${contract}:${tokenId}`
  const [currency, setCurrency] = useState<'dnd721' | 'eth'>('dnd721')
  const [price, setPrice] = useState('')
  const [perDay, setPerDay] = useState('')
  const [maxDays, setMaxDays] = useState('7')
  const [myMaps, setMyMaps] = useState<MapRow[]>([])
  const [mapId, setMapId] = useState('')
  const [rarity, setRarity] = useState('1')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Wallet NFTs (exclude ones merely rented to us — you can't list those).
  useEffect(() => {
    setNftsLoading(true)
    fetch(`/api/nft?owner=${wallet}`)
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((json: { items?: WalletNft[] }) => setNfts((json.items ?? []).filter((n) => !n.rented)))
      .catch(() => setNfts([]))
      .finally(() => setNftsLoading(false))
  }, [wallet])

  useEffect(() => {
    // Only PRIVATE maps qualify as map NFTs — privating a map in the map
    // library is the deliberate first step; listing here attaches the rarity
    // and unlocks platform use for whoever owns an edition.
    void supabase.from('maps')
      .select('id, name, image_url, visibility, owner_wallet')
      .eq('owner_wallet', wallet)
      .eq('visibility', 'private')
      .then(({ data }) => setMyMaps((data ?? []) as MapRow[]))
  }, [wallet])

  const picked = useMemo(() => {
    const [contract, tokenId] = pickedNft.split(':')
    return nfts.find((n) => n.contract === contract && n.tokenId === tokenId) ?? null
  }, [pickedNft, nfts])

  async function submit() {
    setSaving(true); setErr(null)
    try {
      const body: Record<string, any> = { kind, currency }
      if (kind === 'nft' || kind === 'nft_rent') {
        if (!picked) throw new Error('Pick an NFT')
        body.nftContract = picked.contract
        body.nftTokenId = picked.tokenId
        body.nftName = picked.metadata?.name
        body.nftImage = picked.metadata?.image ?? undefined
        if (kind === 'nft') {
          // List on the trustless DND721Market contract: approve the market
          // for this token, then record the price on-chain. The buyer's own
          // buy() later pays you and delivers the NFT atomically — no third
          // party can ever move the token outside this listing.
          if (MARKET_ADDRESS) {
            setErr(null)
            const approveHash = await writeContractAsync({
              address: picked.contract as `0x${string}`,
              abi: ERC721_APPROVE_ABI,
              functionName: 'approve',
              args: [MARKET_ADDRESS, BigInt(picked.tokenId)],
              chainId: 8453,
            })
            await publicClient?.waitForTransactionReceipt({ hash: approveHash })
            const listHash = await writeContractAsync({
              address: MARKET_ADDRESS,
              abi: MARKET_ABI,
              functionName: 'list',
              args: [
                picked.contract as `0x${string}`,
                BigInt(picked.tokenId),
                currency === 'eth' ? ZERO_ADDRESS : DND721_TOKEN_ADDRESS,
                currency === 'eth' ? parseEther(String(Number(price))) : tokensToWei(Number(price)),
                ZERO_ADDRESS, // open to any buyer
              ],
              chainId: 8453,
            })
            await publicClient?.waitForTransactionReceipt({ hash: listHash })
          }
          if (currency === 'dnd721') body.priceTokens = Number(price); else body.priceEth = Number(price)
        } else {
          body.rentPerDay = Number(perDay); body.rentMaxDays = Number(maxDays)
          body.currency = 'dnd721'
        }
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
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-yellow-100">Create Listing</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>

        <div className="flex gap-1.5">
          {([['nft', 'Sell NFT'], ['nft_rent', 'Rent NFT Out'], ['map', 'Map NFT']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setKind(k)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${kind === k ? 'bg-amber-700 text-white' : 'bg-slate-900 text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {(kind === 'nft' || kind === 'nft_rent') && (
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Your NFT</label>
            {nftsLoading ? (
              <p className="text-xs text-slate-500 py-2">Loading your NFTs…</p>
            ) : nfts.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No DND721 NFTs found in your wallet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto">
                {nfts.map((n) => {
                  const key = `${n.contract}:${n.tokenId}`
                  const sel = key === pickedNft
                  return (
                    <button key={key} onClick={() => setPickedNft(key)}
                            className={`rounded-lg border p-1 text-left ${sel ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-slate-700 hover:border-slate-500'}`}>
                      {n.metadata?.image
                        ? <img src={n.metadata.image} alt="" className="w-full aspect-square rounded object-cover" />
                        : <div className="w-full aspect-square rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">#{n.tokenId}</div>}
                      <p className="mt-1 truncate text-[10px] text-slate-300">{n.metadata?.name ?? `#${n.tokenId}`}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {kind === 'nft_rent' && (
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
              The renter can build a character with this NFT until the rent is up. The NFT never leaves your wallet.
              At term end they can bid to re-rent or buy — you accept or decline.
            </p>
          </div>
        )}

        {kind === 'map' && (
          <>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Your private maps</label>
              {myMaps.length === 0 ? (
                <p className="rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-400">
                  No private maps yet. Only maps set to <span className="font-semibold text-slate-300">private</span> can
                  be minted as map NFTs — mark one private in your map library first, then come back here to
                  choose its rarity and list it.
                </p>
              ) : (
                <select value={mapId} onChange={(e) => setMapId(e.target.value)} className={inputCls}>
                  <option value="">— Select —</option>
                  {myMaps.map((m) => <option key={m.id} value={m.id}>{m.name ?? m.id.slice(0, 8)}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Rarity — edition size</label>
              <select value={rarity} onChange={(e) => setRarity(e.target.value)} className={inputCls}>
                <option value="1">1:1 — unique (or keep it as your personal map NFT)</option>
                <option value="5">1:5</option>
                <option value="10">1:10</option>
                <option value="100">1:100</option>
                <option value="500">1:500</option>
                <option value="1000">1:1000</option>
                <option value="2000">1:2000</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-500">
                Owning an edition unlocks this private map for use on the platform (campaigns &amp; sessions).
                Each buyer receives a numbered edition — sell here, on OpenSea, or list a 1:1 and simply keep it
                as your own created NFT.
              </p>
            </div>
          </>
        )}

        {kind === 'nft' && MARKET_ADDRESS && (
          <p className="text-[10px] text-slate-500">
            You&apos;ll sign two transactions: an approval and the on-chain listing. The NFT stays in
            your wallet until someone buys — payment and delivery then happen in one atomic
            transaction, with no third party able to move the token.
          </p>
        )}

        {kind !== 'nft_rent' && (
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
            || (kind === 'nft' && (!pickedNft || !Number(price)))
            || (kind === 'nft_rent' && (!pickedNft || !Number(perDay) || !Number(maxDays)))
            || (kind === 'map' && (!mapId || !Number(price)))}
          className="w-full rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create Listing'}
        </button>
      </div>
    </div>
  )
}
