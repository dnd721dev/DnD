'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────────────────────────────────────────
// Recording Wave 3 — diagnostics panel for the DM Dashboard.
//
// Surfaces the data that previously required reading raw DB rows + Vercel logs
// to figure out why a recording "isn't saving":
//   • Last 10 recordings for the session
//   • Status badge, egress_id (copy-on-click), file_url link when present
//   • Per-track summary (X/Y tracks ready)
//   • The `error` column when non-null — populated by webhook + start route
//     under Recording Wave 1 / 4B
//   • "Recover" button for rows stuck in 'stopped' (POST /api/recording/[id]/recover)
//   • Realtime subscriptions on session_recordings + recording_tracks (both
//     are in the supabase_realtime publication per migration 016).
//
// Mirrors the realtime + supabase patterns already in DmDashboard.tsx.
// ──────────────────────────────────────────────────────────────────────────────

type RecordingRow = {
  id: string
  session_id: string
  room_name: string | null
  egress_id: string | null
  status: string | null
  file_key: string | null
  file_url: string | null
  started_at: string | null
  stopped_at: string | null
  completed_at: string | null
  duration_sec: number | null
  error: string | null
  created_at: string | null
}

type TrackRow = {
  id: string
  recording_id: string
  participant_identity: string | null
  egress_id: string | null
  file_url: string | null
  file_status: string | null  // 'recording' | 'ready' | 'failed'
  error: string | null
}

function StatusBadge({ status }: { status: string | null }) {
  const s = String(status ?? 'unknown').toLowerCase()
  const color =
    s === 'completed' ? 'bg-emerald-900/40 text-emerald-300 ring-emerald-700/40' :
    s === 'recording' ? 'bg-sky-900/40 text-sky-300 ring-sky-700/40 animate-pulse' :
    s === 'stopped'   ? 'bg-amber-900/40 text-amber-300 ring-amber-700/40' :
    s === 'failed'    ? 'bg-red-900/40 text-red-300 ring-red-700/40' :
                        'bg-slate-800 text-slate-300 ring-slate-700'
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${color}`}>
      {s}
    </span>
  )
}

function formatDuration(sec: number | null): string {
  if (!sec || !Number.isFinite(sec)) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function formatRelTime(iso: string | null): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const diff = Date.now() - t
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(iso).toLocaleDateString()
}

export function RecordingsPanel({ sessionId }: { sessionId: string }) {
  const [recordings, setRecordings] = useState<RecordingRow[]>([])
  const [tracksByRec, setTracksByRec] = useState<Record<string, TrackRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [recoverBusy, setRecoverBusy] = useState<string | null>(null)
  const [recoverErrors, setRecoverErrors] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    const { data: recs } = await supabase
      .from('session_recordings')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(10)
    setRecordings((recs ?? []) as RecordingRow[])

    const recIds = (recs ?? []).map((r: any) => r.id)
    if (recIds.length > 0) {
      const { data: trks } = await supabase
        .from('recording_tracks')
        .select('id, recording_id, participant_identity, egress_id, file_url, file_status, error')
        .in('recording_id', recIds)
      const grouped: Record<string, TrackRow[]> = {}
      for (const t of (trks ?? []) as TrackRow[]) {
        const k = t.recording_id
        if (!grouped[k]) grouped[k] = []
        grouped[k].push(t)
      }
      setTracksByRec(grouped)
    } else {
      setTracksByRec({})
    }
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // Realtime on session_recordings for this session
  useEffect(() => {
    const ch = supabase
      .channel(`dm-dash-recordings-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_recordings', filter: `session_id=eq.${sessionId}` },
        () => { void loadAll() },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [sessionId, loadAll])

  // Realtime on recording_tracks — track membership churns as egress events
  // arrive; we filter client-side because Supabase realtime only allows one
  // filter clause and recording_id varies per row.
  const recordingIdSet = useMemo(() => new Set(recordings.map((r) => r.id)), [recordings])
  useEffect(() => {
    if (recordingIdSet.size === 0) return
    const ch = supabase
      .channel(`dm-dash-rec-tracks-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recording_tracks' },
        (payload: any) => {
          const row = payload.new ?? payload.old
          if (!row?.recording_id || !recordingIdSet.has(row.recording_id)) return
          void loadAll()
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, Array.from(recordingIdSet).sort().join(',')])

  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500)
    } catch { /* clipboard blocked — silent */ }
  }

  async function recover(recordingId: string) {
    setRecoverBusy(recordingId)
    setRecoverErrors((prev) => {
      const next = { ...prev }
      delete next[recordingId]
      return next
    })
    try {
      const res = await fetch(`/api/recording/${sessionId}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      })
      const body = await res.json().catch(() => ({} as any))
      if (!res.ok) {
        // Recovery Wave 2: surface the actual error to the UI so the user
        // sees e.g. "listEgress failed — unauthorized" instead of a silent
        // no-op.
        const msg = body?.error ?? `Recover failed (${res.status})`
        setRecoverErrors((prev) => ({ ...prev, [recordingId]: String(msg) }))
        console.error('recover failed', body)
      } else if (body?.recovered === false && body?.reason) {
        // Surface the "nothing to do" reasons too so the user can act on them
        // (e.g. egress_still_active_or_unknown means LiveKit doesn't have a
        // terminal status yet).
        setRecoverErrors((prev) => ({
          ...prev,
          [recordingId]: `No update applied — reason: ${body.reason}`,
        }))
      }
      await loadAll()
    } catch (e: any) {
      setRecoverErrors((prev) => ({ ...prev, [recordingId]: String(e?.message ?? 'Network error') }))
    } finally {
      setRecoverBusy(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading recordings…</p>
  }

  if (recordings.length === 0) {
    return (
      <div className="text-sm text-slate-400 space-y-2">
        <p>No recordings yet for this session.</p>
        <p className="text-xs text-slate-500">
          When the GM hits Record on the table view, rows appear here in realtime.
          If a row stays stuck at <code className="rounded bg-slate-800 px-1">recording</code> or
          {' '}<code className="rounded bg-slate-800 px-1">stopped</code>, check the <code className="rounded bg-slate-800 px-1">error</code> column
          and Vercel logs for <code className="rounded bg-slate-800 px-1">[livekit-webhook]</code> entries.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-indigo-200">Recordings</h3>
        <span className="text-[11px] text-slate-500">{recordings.length} most recent</span>
      </header>

      <ul className="space-y-3">
        {recordings.map((r) => {
          const tracks = tracksByRec[r.id] ?? []
          const ready = tracks.filter((t) => t.file_status === 'ready').length
          const failed = tracks.filter((t) => t.file_status === 'failed').length
          const total = tracks.length
          // Recovery Wave 2: also show Recover on `failed` rows so the user
          // can re-query LiveKit and pick up newer error detail.
          const isRecoverable =
            (r.status === 'stopped' && !r.file_url) ||
            r.status === 'failed' ||
            r.status === 'recording'
          const recoverErr = recoverErrors[r.id]
          return (
            <li key={r.id} className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <span className="text-slate-300">{r.room_name ?? '—'}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-500">{formatRelTime(r.created_at)}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{formatDuration(r.duration_sec)}</span>
                </div>
                {isRecoverable && (
                  <button
                    onClick={() => recover(r.id)}
                    disabled={recoverBusy === r.id}
                    className="rounded-md bg-amber-900/40 px-2 py-1 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-700/40 hover:bg-amber-800/60 disabled:opacity-40"
                  >
                    {recoverBusy === r.id ? 'Recovering…' : 'Recover'}
                  </button>
                )}
              </div>

              <div className="mt-2 grid gap-1.5 text-[11px] text-slate-400">
                {r.egress_id && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">egress:</span>
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">{r.egress_id}</code>
                    <button
                      onClick={() => copy(r.egress_id!)}
                      className="text-indigo-300 hover:text-indigo-200"
                      title="Copy egress_id"
                    >
                      {copiedId === r.egress_id ? '✓' : '📋'}
                    </button>
                  </div>
                )}

                {r.file_url ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">file:</span>
                    <a
                      href={r.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-indigo-300 hover:text-indigo-200"
                    >
                      {r.file_url}
                    </a>
                  </div>
                ) : (
                  <div className="text-slate-500 italic">no file_url yet</div>
                )}

                <div className="flex items-center gap-3">
                  <span>
                    <span className="text-slate-500">tracks:</span>{' '}
                    <span className="text-slate-300">{ready}/{total} ready</span>
                    {failed > 0 && <span className="ml-1 text-red-400">({failed} failed)</span>}
                  </span>
                </div>

                {r.error && (
                  <div className="mt-1 rounded-md border border-red-900/60 bg-red-950/30 px-2 py-1 text-red-300">
                    <span className="font-semibold">error:</span> {r.error}
                  </div>
                )}

                {recoverErr && (
                  <div className="mt-1 rounded-md border border-amber-900/60 bg-amber-950/30 px-2 py-1 text-amber-300">
                    <span className="font-semibold">recover:</span> {recoverErr}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <p className="text-[10px] text-slate-600">
        Auto-updates via realtime on <code>session_recordings</code> +{' '}
        <code>recording_tracks</code>. If a row never appears, check Vercel
        function logs for <code>[livekit-webhook]</code> entries.
      </p>
    </div>
  )
}
