'use client'

import { useState } from 'react'

// ──────────────────────────────────────────────────────────────────────────────
// XP Award panel — lifted from DMPanel.tsx Tools tab.
// Two flows:
//   1. Mid-session quick-award (any active session) — presets + custom
//   2. End-of-session full award (CAYA sessions in 'completed' status only)
//
// Both POST to existing routes; this component only owns the UI + local state.
// Session-lifecycle endpoints are untouched per the plan's "Do NOT change"
// list (Session lifecycle).
// ──────────────────────────────────────────────────────────────────────────────

type Props = {
  sessionId: string | null
  gmWallet: string | null
  sessionStatus: string | null
  sessionType: 'set_level' | 'caya' | null
  xpAwardedAlready: number | null
}

export function XpAwardPanel({ sessionId, gmWallet, sessionStatus, sessionType, xpAwardedAlready }: Props) {
  // Mid-session XP
  const [midXp, setMidXp] = useState('')
  const [midBusy, setMidBusy] = useState(false)
  const [midError, setMidError] = useState<string | null>(null)
  const [midSuccess, setMidSuccess] = useState<number | null>(null)

  // End-of-session XP
  const [endXp, setEndXp] = useState('')
  const [endBusy, setEndBusy] = useState(false)
  const [endError, setEndError] = useState<string | null>(null)
  const [endSuccess, setEndSuccess] = useState<number | null>(null)

  async function awardMid(presetAmount?: number) {
    const xp = presetAmount ?? parseInt(midXp, 10)
    if (!xp || xp <= 0 || !sessionId || !gmWallet) return
    setMidBusy(true)
    setMidError(null)
    setMidSuccess(null)
    try {
      const res = await fetch('/api/sessions/award-xp-mid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, xp_amount: xp, gm_wallet: gmWallet }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setMidError(json.error ?? 'Failed to award XP')
      else {
        setMidSuccess(xp)
        setMidXp('')
        window.setTimeout(() => setMidSuccess(null), 4000)
      }
    } catch (e: any) {
      setMidError(e?.message ?? 'Network error')
    } finally {
      setMidBusy(false)
    }
  }

  async function awardEnd() {
    const xp = parseInt(endXp, 10)
    if (!xp || xp <= 0 || !sessionId || !gmWallet) return
    setEndBusy(true)
    setEndError(null)
    try {
      const res = await fetch('/api/sessions/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, xp_amount: xp, gm_wallet: gmWallet }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setEndError(json.error ?? 'Failed to award XP')
      else {
        setEndSuccess(xp)
        setEndXp('')
      }
    } catch (e: any) {
      setEndError(e?.message ?? 'Network error')
    } finally {
      setEndBusy(false)
    }
  }

  const showMid = sessionStatus === 'active' && sessionId && gmWallet
  const showEnd = sessionType === 'caya' && sessionStatus === 'completed' && !xpAwardedAlready && !endSuccess
  const showAlready = sessionType === 'caya' && sessionStatus === 'completed' && (xpAwardedAlready ?? endSuccess)

  return (
    <div className="space-y-4">
      {!showMid && !showEnd && !showAlready && (
        <p className="text-sm text-slate-500">
          XP awards are available once the session is active.
        </p>
      )}

      {showMid && (
        <section className="rounded-lg border border-violet-700/50 bg-violet-950/20 p-4">
          <h3 className="mb-1 text-sm font-bold text-violet-200">Mid-Session XP</h3>
          <p className="mb-3 text-xs text-slate-400">
            Grants XP to all CAYA characters seated at this session.
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            {[25, 50, 100, 200, 500].map((amt) => (
              <button
                key={amt}
                type="button"
                disabled={midBusy}
                onClick={() => void awardMid(amt)}
                className="rounded-md border border-violet-700/60 bg-violet-900/30 px-3 py-1.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-800/50 disabled:opacity-40"
              >
                +{amt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              placeholder="Custom XP"
              value={midXp}
              onChange={(e) => setMidXp(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void awardMid() }}
              className="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-violet-500"
            />
            <button
              type="button"
              onClick={() => void awardMid()}
              disabled={midBusy || !midXp}
              className="rounded-lg border border-violet-700/50 bg-violet-900/30 px-4 py-1.5 text-xs font-bold text-violet-200 transition hover:bg-violet-800/50 disabled:opacity-40"
            >
              {midBusy ? 'Awarding…' : 'Award'}
            </button>
          </div>

          {midSuccess != null && (
            <p className="mt-2 text-xs font-semibold text-emerald-300">
              ✓ {midSuccess} XP awarded to all CAYA players.
            </p>
          )}
          {midError && <p className="mt-2 text-xs text-red-400">{midError}</p>}
        </section>
      )}

      {showEnd && (
        <section className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-4">
          <h3 className="mb-1 text-sm font-bold text-amber-200">End-of-Session XP</h3>
          <p className="mb-3 text-xs text-slate-400">
            One-time award split equally across all CAYA participants.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              placeholder="XP amount"
              value={endXp}
              onChange={(e) => setEndXp(e.target.value)}
              className="w-28 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={awardEnd}
              disabled={endBusy || !endXp}
              className="rounded-lg border border-amber-700/50 bg-amber-900/30 px-4 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-900/50 disabled:opacity-50"
            >
              {endBusy ? 'Awarding…' : 'Award XP to All Players'}
            </button>
          </div>
          {endError && <p className="mt-2 text-xs text-red-400">{endError}</p>}
        </section>
      )}

      {showAlready && (
        <section className="rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-4">
          <p className="text-sm font-semibold text-emerald-300">
            ✓ {xpAwardedAlready ?? endSuccess} XP awarded to CAYA participants.
          </p>
        </section>
      )}
    </div>
  )
}
