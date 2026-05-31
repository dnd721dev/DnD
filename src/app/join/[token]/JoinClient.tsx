'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { supabase } from '@/lib/supabase'
import { getStoredJwt } from '@/lib/walletJwtAuth'

type Preview = {
  status: 'valid' | 'expired' | 'revoked' | 'maxed' | 'not_found'
  role?: string
  campaign?: { id: string; title: string | null } | null
  session?: { id: string; title: string | null; scheduled_start: string | null; status: string } | null
}

type AcceptResult = {
  campaignId: string
  sessionId: string | null
  role: string
  needsCharacter: boolean
}

type CharRow = { id: string; name: string; main_job?: string | null; level?: number | null }

const STATUS_MSG: Record<string, string> = {
  expired:   'This invite link has expired.',
  revoked:   'This invite link has been revoked.',
  maxed:     'This invite link has reached its maximum number of uses.',
  not_found: 'This invite link is invalid.',
}

export function JoinClient({ token }: { token: string }) {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { open } = useAppKit()
  const wallet = address?.toLowerCase() ?? null

  const [preview, setPreview]     = useState<Preview | null>(null)
  const [phase, setPhase]         = useState<'loading' | 'connect' | 'joining' | 'character' | 'error'>('loading')
  const [error, setError]         = useState<string | null>(null)
  const [accepted, setAccepted]   = useState<AcceptResult | null>(null)
  const [characters, setCharacters] = useState<CharRow[]>([])
  const acceptedOnce = useRef(false)
  const openedOnce   = useRef(false)

  // 1. Load the invite preview.
  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((p: Preview) => {
        setPreview(p)
        setPhase(p.status === 'valid' ? 'connect' : 'error')
      })
      .catch(() => { setPreview({ status: 'not_found' }); setPhase('error') })
  }, [token])

  // 2. Auto-open the wallet connect modal once when valid + not connected.
  useEffect(() => {
    if (preview?.status === 'valid' && !isConnected && !openedOnce.current) {
      openedOnce.current = true
      void open()
    }
  }, [preview?.status, isConnected, open])

  const route = useCallback((res: AcceptResult) => {
    if (res.sessionId) router.push(`/sessions/${res.sessionId}`)
    else router.push(`/campaigns/${res.campaignId}`)
  }, [router])

  // 3. Once connected + JWT minted, accept the invite (polls for the JWT).
  useEffect(() => {
    if (preview?.status !== 'valid' || !isConnected || acceptedOnce.current) return
    let cancelled = false
    const tryAccept = async () => {
      const jwt = getStoredJwt()
      if (!jwt) return false // wait for WalletJwtGate to mint after signature
      acceptedOnce.current = true
      setPhase('joining')
      try {
        const res = await fetch(`/api/invite/${token}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error ?? 'Failed to join'); setPhase('error'); return true }
        if (cancelled) return true
        const result = json as AcceptResult
        setAccepted(result)
        if (result.needsCharacter) { setPhase('character'); void loadCharacters() }
        else route(result)
      } catch {
        setError('Network error'); setPhase('error')
      }
      return true
    }
    // Poll briefly for the JWT (signature can take a moment).
    void tryAccept().then((done) => {
      if (done) return
      const id = setInterval(async () => {
        if (await tryAccept()) clearInterval(id)
      }, 800)
      // stop polling after ~40s
      setTimeout(() => clearInterval(id), 40_000)
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.status, isConnected])

  const loadCharacters = useCallback(async () => {
    if (!wallet) return
    const { data } = await supabase
      .from('characters')
      .select('id, name, main_job, level')
      .eq('wallet_address', wallet)
      .order('updated_at', { ascending: false })
    setCharacters((data ?? []) as CharRow[])
  }, [wallet])

  async function chooseCharacter(characterId: string) {
    if (!accepted || !wallet) return
    setPhase('joining')
    // Bind the character to the campaign (idempotent), and to the session if any.
    const { error: ccsErr } = await supabase
      .from('campaign_character_selections')
      .upsert(
        { campaign_id: accepted.campaignId, wallet_address: wallet, character_id: characterId },
        { onConflict: 'campaign_id,wallet_address' },
      )
    if (ccsErr) { setError(ccsErr.message); setPhase('error'); return }
    if (accepted.sessionId) {
      await supabase
        .from('session_players')
        .update({ character_id: characterId })
        .eq('session_id', accepted.sessionId)
        .eq('wallet_address', wallet)
    }
    route(accepted)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const campaignTitle = preview?.campaign?.title || 'this campaign'
  const sessionTitle  = preview?.session?.title

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-yellow-800/40 bg-slate-900/80 p-6 shadow-2xl">
        <p className="text-[11px] uppercase tracking-widest text-amber-400/80 font-semibold">You're invited</p>
        <h1 className="mt-1 text-xl font-bold text-yellow-100">
          {sessionTitle ? `${sessionTitle}` : campaignTitle}
        </h1>
        {sessionTitle && (
          <p className="text-sm text-slate-400">in {campaignTitle}</p>
        )}

        <div className="mt-5">
          {phase === 'loading' && <p className="text-sm text-slate-400">Loading invite…</p>}

          {phase === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-red-300">
                {error ?? STATUS_MSG[preview?.status ?? 'not_found'] ?? 'This invite is not available.'}
              </p>
              <Link href="/" className="text-xs text-amber-400 hover:underline">← Go home</Link>
            </div>
          )}

          {phase === 'connect' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Connect your wallet to join {sessionTitle ? 'this session' : 'this campaign'}.
              </p>
              <button
                type="button"
                onClick={() => void open()}
                className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Connect Wallet to Join
              </button>
              {isConnected && (
                <p className="text-xs text-slate-500">Confirm the signature in your wallet to continue…</p>
              )}
            </div>
          )}

          {phase === 'joining' && <p className="text-sm text-yellow-300">⏳ Joining…</p>}

          {phase === 'character' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">Choose your character for this campaign:</p>
              {characters.length === 0 ? (
                <p className="text-xs text-slate-500">No characters yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {characters.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => void chooseCharacter(c.id)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-left text-sm text-slate-100 hover:border-emerald-600 hover:bg-slate-900"
                      >
                        {c.name}
                        <span className="text-slate-500">
                          {c.main_job ? ` · ${c.main_job}` : ''}{c.level ? ` Lv.${c.level}` : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between">
                <Link href="/characters/new" className="text-xs text-amber-400 hover:underline">
                  + Create a new character
                </Link>
                <button type="button" onClick={() => void loadCharacters()} className="text-xs text-slate-400 hover:text-slate-200">
                  ↻ Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
