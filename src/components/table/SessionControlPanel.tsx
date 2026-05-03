'use client'

// SessionControlPanel — DM lifecycle controls shown in the Admin tab.
// Renders different UI per session state:
//   setup     → pre-session checklist + "Open Lobby" button
//   lobby     → lobby open banner + "Start Session" / "Cancel Session" buttons
//   active    → live timer + pause / end session controls
//   paused    → paused banner + resume / end session controls
//   completed → session-ended summary

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionStatus } from '@/lib/sessionGates'

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemPreview = {
  character_id: string
  item_id:      string
  item_name:    string
  item_tier:    string
  item_type:    string
  auto_remove:  boolean
}

type Props = {
  sessionId:     string
  sessionStatus: SessionStatus | null
  gmWallet:      string | null
  startedAt?:    string | null   // sessions.started_at ISO string
  completedAt?:  string | null
  onStatusChange?: (newStatus: SessionStatus) => void
}

// ─── Checklist items ──────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  { key: 'map',        label: 'Map is loaded' },
  { key: 'triggers',   label: 'Map triggers are set' },
  { key: 'monsters',   label: 'Monster tokens placed' },
  { key: 'characters', label: 'Character tokens placed' },
  { key: 'players',    label: 'Players have been invited' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${String(s).padStart(2, '0')}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SessionControlPanel({
  sessionId,
  sessionStatus,
  gmWallet,
  startedAt,
  completedAt,
  onStatusChange,
}: Props) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // Live timer
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (sessionStatus !== 'active' || !startedAt) { setElapsed(0); return }
    const start = new Date(startedAt).getTime()
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [sessionStatus, startedAt])

  // ── End Session modal state ─────────────────────────────────────────────────
  const [showEndModal, setShowEndModal]   = useState(false)
  const [itemPreview, setItemPreview]     = useState<{ toRemove: ItemPreview[]; toKeep: ItemPreview[] } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const openEndModal = useCallback(async () => {
    setShowEndModal(true)
    setPreviewLoading(true)
    setItemPreview(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/items`, {
        headers: gmWallet ? { 'x-wallet-address': gmWallet } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setItemPreview(data)
      }
    } catch {
      // Non-fatal — modal still shows without item preview
    }
    setPreviewLoading(false)
  }, [sessionId, gmWallet])

  // ── Lifecycle action ────────────────────────────────────────────────────────
  const doAction = useCallback(async (action: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/status`, {
        method:  'POST',
        headers: {
          'Content-Type':    'application/json',
          ...(gmWallet ? { 'x-wallet-address': gmWallet } : {}),
        },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to update session')
      } else {
        onStatusChange?.(data.status as SessionStatus)
        setShowEndModal(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    }
    setLoading(false)
  }, [sessionId, gmWallet, onStatusChange])

  // ── Checklist toggle ────────────────────────────────────────────────────────
  const toggleCheck = (key: string) =>
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))

  const allChecked = CHECKLIST_ITEMS.every((i) => checklist[i.key])

  // ── Render ──────────────────────────────────────────────────────────────────

  const btnBase = 'rounded-md px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50'

  return (
    <div className="space-y-3">
      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-red-700 bg-red-900/40 px-3 py-2 text-[11px] text-red-300">
          ⚠ {error}
        </div>
      )}

      {/* ── SETUP ─────────────────────────────────────────────── */}
      {sessionStatus === 'setup' && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-yellow-300/70">
            Pre-Session Checklist
          </p>
          <ul className="space-y-1.5">
            {CHECKLIST_ITEMS.map((item) => (
              <li key={item.key}>
                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-200 select-none">
                  <input
                    type="checkbox"
                    checked={!!checklist[item.key]}
                    onChange={() => toggleCheck(item.key)}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 accent-yellow-500"
                  />
                  <span className={checklist[item.key] ? 'line-through text-slate-500' : ''}>
                    {item.label}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button
            onClick={() => doAction('open_lobby')}
            disabled={loading || !allChecked}
            className={`${btnBase} w-full bg-blue-700 text-white hover:bg-blue-600 disabled:cursor-not-allowed`}
            title={!allChecked ? 'Complete the checklist first' : undefined}
          >
            {loading ? 'Opening…' : '🟡 Open Lobby'}
          </button>
          {!allChecked && (
            <p className="text-center text-[10px] text-slate-500">
              Check all items above to enable
            </p>
          )}
        </div>
      )}

      {/* ── LOBBY ─────────────────────────────────────────────── */}
      {sessionStatus === 'lobby' && (
        <div className="space-y-3">
          <div className="rounded-md border border-blue-700/60 bg-blue-900/30 px-3 py-2.5">
            <p className="text-[12px] font-semibold text-blue-300">🟡 Lobby is open</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Voice chat is enabled. Players can join and purchase items.
              Start the session when everyone is ready.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => doAction('start_session')}
              disabled={loading}
              className={`${btnBase} flex-1 bg-emerald-700 text-white hover:bg-emerald-600`}
            >
              {loading ? 'Starting…' : '⚔️ Start Session'}
            </button>
            <button
              onClick={openEndModal}
              disabled={loading}
              className={`${btnBase} bg-slate-700 text-slate-300 hover:bg-red-900/60 hover:text-red-300`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── ACTIVE ────────────────────────────────────────────── */}
      {sessionStatus === 'active' && (
        <div className="space-y-3">
          {/* Live timer */}
          <div className="rounded-md border border-emerald-700/50 bg-emerald-900/20 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-emerald-300">⚔️ Session Live</p>
              <span className="font-mono text-[13px] font-bold text-emerald-200">
                {fmtDuration(elapsed)}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] text-slate-500">All features unlocked</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => doAction('pause')}
              disabled={loading}
              className={`${btnBase} flex-1 bg-yellow-700/80 text-yellow-100 hover:bg-yellow-700`}
            >
              {loading ? 'Pausing…' : '⏸ Pause Session'}
            </button>
            <button
              onClick={openEndModal}
              disabled={loading}
              className={`${btnBase} bg-red-900/70 text-red-300 hover:bg-red-800`}
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {/* ── PAUSED ────────────────────────────────────────────── */}
      {sessionStatus === 'paused' && (
        <div className="space-y-3">
          <div className="rounded-md border border-yellow-700/60 bg-yellow-900/20 px-3 py-2.5">
            <p className="text-[12px] font-semibold text-yellow-300">⏸ Session Paused</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Players see a pause overlay. Resume when ready.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => doAction('resume')}
              disabled={loading}
              className={`${btnBase} flex-1 bg-emerald-700 text-white hover:bg-emerald-600`}
            >
              {loading ? 'Resuming…' : '▶ Resume Session'}
            </button>
            <button
              onClick={openEndModal}
              disabled={loading}
              className={`${btnBase} bg-red-900/70 text-red-300 hover:bg-red-800`}
            >
              End Session
            </button>
          </div>
        </div>
      )}

      {/* ── COMPLETED ─────────────────────────────────────────── */}
      {sessionStatus === 'completed' && (
        <div className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-3 space-y-1.5">
          <p className="text-[12px] font-semibold text-slate-300">✓ Session Ended</p>
          {completedAt && (
            <p className="text-[10px] text-slate-500">
              Completed {new Date(completedAt).toLocaleString()}
            </p>
          )}
          <p className="text-[11px] text-slate-400">
            Recordings, XP, and inventory changes have been processed.
            Players can view their summary from the campaign page.
          </p>
        </div>
      )}

      {/* ── End Session Confirmation Modal ────────────────────── */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-red-800/60 bg-slate-950 p-5 shadow-2xl mx-4">
            <h2 className="text-[14px] font-bold text-red-300 mb-3">End Session?</h2>

            {/* Item preview */}
            {previewLoading ? (
              <p className="text-[11px] text-slate-400 mb-3">Loading item summary…</p>
            ) : itemPreview ? (
              <div className="mb-3 space-y-2">
                {itemPreview.toRemove.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-red-400 mb-1">
                      🗑 Items that will be removed ({itemPreview.toRemove.length})
                    </p>
                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                      {itemPreview.toRemove.map((it, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="text-red-400">✕</span>
                          <span>{it.item_name}</span>
                          <span className="text-slate-600">(Tier {it.item_tier})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {itemPreview.toKeep.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400 mb-1">
                      ✓ Items players keep ({itemPreview.toKeep.length})
                    </p>
                    <ul className="space-y-0.5 max-h-20 overflow-y-auto">
                      {itemPreview.toKeep.map((it, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="text-emerald-400">✓</span>
                          <span>{it.item_name}</span>
                          <span className="text-slate-600">(Tier {it.item_tier})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {itemPreview.toRemove.length === 0 && itemPreview.toKeep.length === 0 && (
                  <p className="text-[11px] text-slate-500">No shop items were claimed this session.</p>
                )}
              </div>
            ) : null}

            <p className="text-[11px] text-slate-400 mb-4">
              This will mark the session as completed, stop any active recording,
              and remove session-only items from player inventories.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowEndModal(false)}
                disabled={loading}
                className={`${btnBase} bg-slate-800 text-slate-300 hover:bg-slate-700`}
              >
                Cancel
              </button>
              <button
                onClick={() => doAction('end_session')}
                disabled={loading}
                className={`${btnBase} bg-red-700 text-white hover:bg-red-600`}
              >
                {loading ? 'Ending…' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
