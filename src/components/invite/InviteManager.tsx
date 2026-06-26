'use client'

// GM-only panel to create, copy, and revoke invite links for a campaign or a
// specific session. Used on the campaign page (no sessionId) and the session
// page (with sessionId).

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getStoredJwt } from '@/lib/walletJwtAuth'

interface InviteRow {
  id: string
  token: string
  session_id: string | null
  max_uses: number | null
  uses: number
  expires_at: string | null
  revoked: boolean
  created_at: string
}

interface Props {
  campaignId: string
  /** When set, the panel manages session-scoped invites. */
  sessionId?: string
}

function inviteUrl(token: string): string {
  // Use the host the GM is actually browsing (the public domain in production),
  // not NEXT_PUBLIC_APP_URL — that env var is the wallet deep-link host (often a
  // LAN IP in dev) and isn't shareable.
  const base = (typeof window !== 'undefined' ? window.location.origin : '') || process.env.NEXT_PUBLIC_APP_URL || ''
  return `${base}/join/${token}`
}

export function InviteManager({ campaignId, sessionId }: Props) {
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Optional limits
  const [expiresInHours, setExpiresInHours] = useState('')
  const [maxUses, setMaxUses] = useState('')
  // Post a recruitment announcement to the Telegram group on create (default on).
  const [announce, setAnnounce] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('invites')
      .select('id, token, session_id, max_uses, uses, expires_at, revoked, created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
    q = sessionId ? q.eq('session_id', sessionId) : q.is('session_id', null)
    const { data } = await q
    setInvites((data ?? []) as InviteRow[])
    setLoading(false)
  }, [campaignId, sessionId])

  useEffect(() => { void load() }, [load])

  async function createInvite() {
    setCreating(true)
    setError(null)
    try {
      const jwt = getStoredJwt()
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
        body: JSON.stringify({
          campaignId,
          sessionId: sessionId ?? undefined,
          maxUses: maxUses ? Number(maxUses) : undefined,
          expiresInHours: expiresInHours ? Number(expiresInHours) : undefined,
          announce,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed to create invite'); return }
      setExpiresInHours(''); setMaxUses('')
      await load()
      // Copy the fresh link immediately.
      void copy(json.token)
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(inviteUrl(token))
      setCopied(token)
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000)
    } catch { /* clipboard blocked */ }
  }

  async function revoke(id: string) {
    await supabase.from('invites').update({ revoked: true }).eq('id', id)
    await load()
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-slate-100">
      <h3 className="text-sm font-semibold text-yellow-100">
        {sessionId ? 'Invite players to this session' : 'Invite players to the campaign'}
      </h3>

      {/* Create */}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-[11px] text-slate-400">
          Expires (hours)
          <input
            type="number" min={1} value={expiresInHours} onChange={(e) => setExpiresInHours(e.target.value)}
            placeholder="∞"
            className="mt-0.5 w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
        </label>
        <label className="flex flex-col text-[11px] text-slate-400">
          Max uses
          <input
            type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)}
            placeholder="∞"
            className="mt-0.5 w-24 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
        </label>
        <button
          type="button"
          onClick={() => void createInvite()}
          disabled={creating}
          className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {creating ? 'Creating…' : '+ Create invite link'}
        </button>
      </div>

      {/* Telegram announcement toggle */}
      <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-300">
        <input
          type="checkbox"
          checked={announce}
          onChange={(e) => setAnnounce(e.target.checked)}
          className="h-3.5 w-3.5 accent-sky-500"
        />
        📣 Announce to the Telegram community when I create this link
      </label>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {/* List */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-xs text-slate-500">Loading invites…</p>
        ) : invites.length === 0 ? (
          <p className="text-xs text-slate-500">No invite links yet.</p>
        ) : (
          invites.map((inv) => {
            const expired = inv.expires_at != null && new Date(inv.expires_at).getTime() <= Date.now()
            const maxed = inv.max_uses != null && inv.uses >= inv.max_uses
            const dead = inv.revoked || expired || maxed
            return (
              <div key={inv.id} className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2">
                <code className={`flex-1 truncate text-[11px] ${dead ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                  {inviteUrl(inv.token)}
                </code>
                <span className="shrink-0 text-[10px] text-slate-500">
                  {inv.uses}{inv.max_uses != null ? `/${inv.max_uses}` : ''} used
                  {inv.revoked ? ' · revoked' : expired ? ' · expired' : maxed ? ' · full' : ''}
                </span>
                {!dead && (
                  <button
                    type="button"
                    onClick={() => void copy(inv.token)}
                    className="shrink-0 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-700"
                  >
                    {copied === inv.token ? 'Copied!' : 'Copy'}
                  </button>
                )}
                {!inv.revoked && (
                  <button
                    type="button"
                    onClick={() => void revoke(inv.id)}
                    className="shrink-0 rounded bg-slate-800 px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-900/40"
                  >
                    Revoke
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
