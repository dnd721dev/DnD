'use client'

// Community rewards — earn points for engaging with DND721.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { REWARD_POINTS, REWARD_LABELS, type RewardAction } from '@/lib/rewards'

type Totals = { wallet: string; total_points: number; awards: number }
type HistoryRow = { action: RewardAction; points: number; note: string | null; created_at: string }
type SocialLink = { platform: string; handle: string | null; verified: boolean; last_scan: string | null }

const LINKABLE = ['x', 'reddit', 'instagram', 'tiktok', 'youtube', 'telegram'] as const

const EARN_ACTIONS: Array<{ action: RewardAction; how: string }> = [
  { action: 'podcast_listen',         how: 'Listen on the platform, or connect Spotify below to verify listens there. (Apple Podcasts & iHeartRadio have no listener APIs — those plays can\'t be auto-verified.)' },
  { action: 'social_share',           how: 'Link your socials below — your DND721 posts are detected automatically. Manual claim available for platforms without APIs.' },
  { action: 'play_oneshot',           how: 'Play in a one-shot that runs to completion.' },
  { action: 'dm_oneshot',             how: 'DM a one-shot that runs to completion.' },
  { action: 'nft_rented_out',         how: 'Rent one of your NFTs to a community member.' },
  { action: 'telegram_weekly_winner', how: 'Win the weekly Telegram DND bot contest.' },
]

const SHARE_PLATFORMS = ['x', 'facebook', 'instagram', 'tiktok', 'youtube', 'reddit', 'discord', 'telegram'] as const

function short(w: string) { return `${w.slice(0, 6)}…${w.slice(-4)}` }

export function RewardsClient() {
  const { address, isConnected } = useAccount()
  const wallet = address?.toLowerCase() ?? null

  const [me, setMe] = useState<Totals | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [leaderboard, setLeaderboard] = useState<Totals[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)

  const [sharePlatform, setSharePlatform] = useState<typeof SHARE_PLATFORMS[number]>('x')
  const [shareUrl, setShareUrl] = useState('')
  const [sharing, setSharing] = useState(false)

  // Linked accounts (detection instead of honor-system)
  const [socials, setSocials] = useState<SocialLink[]>([])
  const [linkPlatform, setLinkPlatform] = useState<typeof LINKABLE[number]>('reddit')
  const [linkHandle, setLinkHandle] = useState('')
  const [linking, setLinking] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [checkingSpotify, setCheckingSpotify] = useState(false)

  const headers = useMemo(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (wallet) h['x-wallet-address'] = wallet
    return h
  }, [wallet])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/rewards', { headers })
      const json = await res.json()
      setMe(json.me ?? null)
      setHistory(json.history ?? [])
      setLeaderboard(json.leaderboard ?? [])
    } finally { setLoading(false) }
  }, [headers])

  useEffect(() => { void load() }, [load])

  const loadSocials = useCallback(async () => {
    if (!wallet) { setSocials([]); return }
    const res = await fetch('/api/socials', { headers })
    if (res.ok) {
      const json = await res.json()
      setSocials(json.socials ?? [])
    }
  }, [wallet, headers])

  useEffect(() => { void loadSocials() }, [loadSocials])

  // Surface the Spotify OAuth redirect result (?spotify=connected|error…)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('spotify')
    if (!p) return
    setNotice(p === 'connected' ? '✓ Spotify connected — play a DND721 episode, then hit "Verify listen".'
      : `Spotify connect failed (${p}). Try again.`)
    window.history.replaceState(null, '', '/rewards')
  }, [])

  async function linkSocial() {
    if (!wallet || !linkHandle.trim()) return
    setLinking(true); setNotice(null)
    try {
      const res = await fetch('/api/socials', {
        method: 'POST', headers,
        body: JSON.stringify({ platform: linkPlatform, handle: linkHandle.trim() }),
      })
      const json = await res.json()
      setNotice(json.ok ? `✓ Linked ${linkPlatform} @${linkHandle.trim()}` : json.error)
      if (json.ok) { setLinkHandle(''); void loadSocials() }
    } finally { setLinking(false) }
  }

  async function unlinkSocial(platform: string) {
    await fetch(`/api/socials?platform=${platform}`, { method: 'DELETE', headers })
    void loadSocials()
  }

  async function scanShares() {
    setScanning(true); setNotice(null)
    try {
      const res = await fetch('/api/rewards/scan-shares', { method: 'POST', headers })
      const json = await res.json()
      if (!json.ok) { setNotice(json.error); return }
      const lines = (json.results as Array<{ platform: string; found: number; awarded: number; note?: string }>)
        .map((r) => `${r.platform}: ${r.note ?? `${r.found} post${r.found === 1 ? '' : 's'} found, +${r.awarded} new`}`)
      setNotice(`Scan complete — ${lines.join(' · ')}`)
      void load()
    } finally { setScanning(false) }
  }

  async function checkSpotify() {
    setCheckingSpotify(true); setNotice(null)
    try {
      const res = await fetch('/api/rewards/spotify-check', { method: 'POST', headers })
      const json = await res.json()
      setNotice(json.ok ? json.message : json.error)
      if (json.ok && json.awarded > 0) void load()
    } finally { setCheckingSpotify(false) }
  }

  async function claimShare() {
    if (!wallet || !shareUrl.trim()) return
    setSharing(true); setNotice(null)
    try {
      const res = await fetch('/api/rewards/share', {
        method: 'POST', headers,
        body: JSON.stringify({ platform: sharePlatform, url: shareUrl.trim() }),
      })
      const json = await res.json()
      setNotice(json.ok ? `✓ +${json.points} points for sharing on ${sharePlatform}!` : `${json.error}`)
      if (json.ok) { setShareUrl(''); void load() }
    } catch (e: any) {
      setNotice(e?.message ?? 'Failed to claim')
    } finally { setSharing(false) }
  }

  return (
    <div className="dossier mx-auto max-w-4xl min-h-screen px-4 py-8 text-slate-100">
      <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-semibold">DND721 Community</p>
      <h1 className="text-2xl font-bold text-yellow-100">Reward Points</h1>
      <p className="mt-1 text-xs text-slate-400">Earn points for being part of the community — play, DM, share, listen, rent, and win.</p>

      {/* Your total */}
      <div className="mt-5 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4">
        {!isConnected ? (
          <p className="text-sm text-slate-300">Connect your wallet to track your points.</p>
        ) : (
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-amber-300">{me?.total_points ?? 0}</span>
            <span className="text-sm text-slate-400">points · {me?.awards ?? 0} rewards earned</span>
          </div>
        )}
      </div>

      {notice && (
        <div className="mt-3 rounded-md border border-slate-600 bg-slate-900/70 px-3 py-2 text-xs text-slate-200 flex justify-between gap-2">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Ways to earn */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Ways to earn</h2>
          <ul className="space-y-2">
            {EARN_ACTIONS.map(({ action, how }) => (
              <li key={action} className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-100">{REWARD_LABELS[action]}</span>
                  <span className="shrink-0 rounded bg-amber-900/50 px-2 py-0.5 text-[11px] font-bold text-amber-200">+{REWARD_POINTS[action]}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">{how}</p>
              </li>
            ))}
          </ul>

          {/* Linked accounts — automatic detection */}
          {isConnected && wallet && (
            <div className="mt-4 rounded-lg border border-emerald-800/40 bg-emerald-950/15 p-3">
              <p className="mb-1 text-xs font-semibold text-emerald-200">🔗 Linked accounts (auto-detect)</p>
              <p className="mb-2 text-[10px] text-slate-500">
                Link your accounts and DND721 detects your posts &amp; podcast listens automatically — verified, no pasting links.
              </p>

              {/* Spotify */}
              <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-2">
                <span className="text-[11px] text-slate-300">
                  🎧 Spotify {socials.find((s) => s.platform === 'spotify')
                    ? <span className="text-emerald-400">— connected{socials.find((s) => s.platform === 'spotify')?.handle ? ` as ${socials.find((s) => s.platform === 'spotify')!.handle}` : ''}</span>
                    : <span className="text-slate-500">— verify real podcast listens</span>}
                </span>
                {socials.find((s) => s.platform === 'spotify') ? (
                  <span className="flex gap-1.5">
                    <button onClick={() => void checkSpotify()} disabled={checkingSpotify}
                            className="rounded-md bg-emerald-800 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                      {checkingSpotify ? '…' : 'Verify listen'}
                    </button>
                    <button onClick={() => void unlinkSocial('spotify')} className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200">✕</button>
                  </span>
                ) : (
                  <a href={`/api/socials/spotify/connect?wallet=${wallet}`}
                     className="rounded-md bg-emerald-800 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700">
                    Connect
                  </a>
                )}
              </div>

              {/* Handle-based socials */}
              {socials.filter((s) => s.platform !== 'spotify').map((s) => (
                <div key={s.platform} className="mb-1.5 flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-1.5">
                  <span className="text-[11px] text-slate-300">
                    {s.platform} <span className="text-slate-400">@{s.handle}</span>
                    {(s.platform === 'reddit' || s.platform === 'x') && <span className="ml-1 text-emerald-400/80 text-[9px]">scannable</span>}
                  </span>
                  <button onClick={() => void unlinkSocial(s.platform)} className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200">✕</button>
                </div>
              ))}
              <div className="mt-1.5 flex gap-1.5">
                <select value={linkPlatform} onChange={(e) => setLinkPlatform(e.target.value as any)}
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100">
                  {LINKABLE.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={linkHandle} onChange={(e) => setLinkHandle(e.target.value)} placeholder="your handle"
                       className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500" />
                <button onClick={() => void linkSocial()} disabled={linking || !linkHandle.trim()}
                        className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50">
                  {linking ? '…' : 'Link'}
                </button>
              </div>
              {socials.some((s) => s.platform !== 'spotify') && (
                <button onClick={() => void scanShares()} disabled={scanning}
                        className="mt-2 w-full rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {scanning ? '⏳ Scanning your posts…' : '🔍 Scan my posts for DND721 mentions'}
                </button>
              )}
            </div>
          )}

          {/* Manual claim — fallback for platforms without public APIs */}
          {isConnected && (
            <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-900/60 p-3">
              <p className="mb-2 text-xs font-semibold text-slate-200">Manual claim (Instagram, TikTok &amp; friends)</p>
              <div className="flex gap-2">
                <select value={sharePlatform} onChange={(e) => setSharePlatform(e.target.value as any)}
                        className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100">
                  {SHARE_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                <input value={shareUrl} onChange={(e) => setShareUrl(e.target.value)} placeholder="Paste your post's link"
                       className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500" />
                <button onClick={() => void claimShare()} disabled={sharing || !shareUrl.trim()}
                        className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  {sharing ? '…' : 'Claim'}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">One claim per platform per day. Link must point at your post on that platform.</p>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-200">🏆 Leaderboard</h2>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-2">
            {loading ? (
              <p className="py-6 text-center text-xs text-slate-500">Loading…</p>
            ) : leaderboard.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No points earned yet — be the first!</p>
            ) : (
              <ol className="space-y-1">
                {leaderboard.map((row, i) => (
                  <li key={row.wallet}
                      className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${row.wallet === wallet ? 'bg-amber-950/40 ring-1 ring-amber-700/40' : ''}`}>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-5 text-slate-500">{i + 1}.</span>
                      <span className="truncate text-slate-200">{short(row.wallet)}{row.wallet === wallet ? ' (you)' : ''}</span>
                    </span>
                    <span className="shrink-0 font-mono font-bold text-amber-300">{row.total_points}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Your recent history */}
          {isConnected && history.length > 0 && (
            <>
              <h2 className="mb-2 mt-5 text-sm font-semibold text-slate-200">Your recent points</h2>
              <ul className="space-y-1">
                {history.slice(0, 12).map((h, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-1.5 text-[11px]">
                    <span className="min-w-0 truncate text-slate-300">{REWARD_LABELS[h.action]}</span>
                    <span className="shrink-0 font-mono font-bold text-amber-300">+{h.points}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
