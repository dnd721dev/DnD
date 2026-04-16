'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type RecordingRow = {
  id: string
  status: 'recording' | 'stopped' | 'completed' | 'failed'
  started_at: string
  stopped_at: string | null
  file_url: string | null
  duration_sec: number | null
  master_script_status: string | null
  composite_transcript_status: string | null
  published: boolean
  episode_title: string | null
  episode_number: number | null
}

type Marker = {
  id: string
  label: string
  offset_sec: number
}

interface Props {
  sessionId: string
  roomName: string
}

export function RecordingButton({ sessionId, roomName }: Props) {
  const [recordings, setRecordings]   = useState<RecordingRow[]>([])
  const [recording, setRecording]     = useState<RecordingRow | null>(null)
  const [loading, setLoading]         = useState(false)
  const [elapsed, setElapsed]         = useState(0)
  const [markers, setMarkers]         = useState<Marker[]>([])
  const [markerLabel, setMarkerLabel] = useState('')
  const [addingMarker, setAddingMarker] = useState(false)
  const [showMarkers, setShowMarkers] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/recording/${sessionId}`)
    if (!res.ok) return
    const { recordings: rows } = await res.json() as { recordings: RecordingRow[] }
    setRecordings(rows ?? [])
    const active = rows.find((r) => r.status === 'recording') ?? null
    setRecording(active ?? rows[0] ?? null)
  }, [sessionId])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  useEffect(() => {
    if (!recording || recording.status !== 'recording') { setElapsed(0); return }
    const start = new Date(recording.started_at).getTime()
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [recording])

  async function startRecording(audioOnly = false) {
    setLoading(true)
    const res = await fetch(`/api/recording/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, audioOnly }),
    })
    if (res.ok) {
      const { recording: row } = await res.json()
      setRecording(row)
      setRecordings((prev) => [row, ...prev])
    } else {
      const { error } = await res.json().catch(() => ({ error: 'Failed to start recording' }))
      alert(error)
    }
    setLoading(false)
  }

  async function stopRecording() {
    if (!recording) return
    setLoading(true)
    const res = await fetch(`/api/recording/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingId: recording.id }),
    })
    if (res.ok) {
      const { recording: row } = await res.json()
      setRecording(row)
      setRecordings((prev) => prev.map((r) => (r.id === row.id ? row : r)))
    }
    setLoading(false)
  }

  async function addMarker() {
    if (!recording || !markerLabel.trim()) return
    setAddingMarker(true)
    const res = await fetch('/api/recording-markers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordingId: recording.id,
        sessionId,
        label: markerLabel.trim(),
        offsetSec: elapsed,
      }),
    })
    if (res.ok) {
      const { marker } = await res.json()
      setMarkers((prev) => [...prev, marker])
      setMarkerLabel('')
    }
    setAddingMarker(false)
  }

  function fmt(s: number) {
    const h   = Math.floor(s / 3600)
    const m   = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  function statusBadge(r: RecordingRow) {
    if (r.status === 'recording') return <span className="text-red-400">● REC</span>
    if (r.status === 'completed') return <span className="text-emerald-400">✓ Done</span>
    if (r.status === 'stopped')   return <span className="text-yellow-400">◼ Stopped</span>
    return <span className="text-slate-500">✗ Failed</span>
  }

  function transcriptBadge(r: RecordingRow) {
    const status = r.master_script_status ?? r.composite_transcript_status ?? 'none'
    if (status === 'done')    return <span className="rounded bg-emerald-900/50 px-1 text-[10px] text-emerald-300">📝 Script ready</span>
    if (status === 'pending') return <span className="rounded bg-yellow-900/40 px-1 text-[10px] text-yellow-300 animate-pulse">⏳ Transcribing…</span>
    if (status === 'failed')  return <span className="rounded bg-red-900/40 px-1 text-[10px] text-red-400">⚠ Transcription failed</span>
    return null
  }

  const isRecording    = recording?.status === 'recording'
  const pastRecordings = recordings.filter((r) => r.status !== 'recording')

  return (
    <div className="flex flex-col gap-1.5">
      {/* ── Active recording controls ── */}
      {isRecording ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md bg-red-900/60 px-2.5 py-1 text-[11px] font-semibold text-red-300">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              REC {fmt(elapsed)}
            </span>
            <button
              onClick={stopRecording}
              disabled={loading}
              className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              Stop
            </button>
            <button
              onClick={() => setShowMarkers((v) => !v)}
              className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400 hover:bg-slate-700"
              title="Chapter markers"
            >
              🔖 {markers.length > 0 ? markers.length : ''}
            </button>
          </div>

          {showMarkers && (
            <div className="rounded-md border border-slate-700 bg-slate-900 p-2 space-y-1.5 text-[11px]">
              <div className="flex gap-1">
                <input
                  placeholder="Marker label (e.g. Boss fight start)"
                  value={markerLabel}
                  onChange={(e) => setMarkerLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addMarker()}
                  maxLength={100}
                  className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  onClick={addMarker}
                  disabled={addingMarker || !markerLabel.trim()}
                  className="rounded bg-amber-700/70 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-700 disabled:opacity-50"
                >
                  + Mark
                </button>
              </div>
              {markers.length > 0 && (
                <ul className="space-y-0.5">
                  {markers.map((m) => (
                    <li key={m.id} className="flex items-center gap-1.5 text-slate-400">
                      <span className="font-mono text-slate-500">{fmt(m.offset_sec)}</span>
                      <span className="text-slate-300">{m.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ── Start buttons ── */
        <div className="flex items-center gap-1">
          <button
            onClick={() => startRecording(false)}
            disabled={loading}
            title="Record video+audio"
            className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-red-900/60 hover:text-red-300 disabled:opacity-50 transition-colors"
          >
            ⏺ Record
          </button>
          <button
            onClick={() => startRecording(true)}
            disabled={loading}
            title="Record audio only (podcast)"
            className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400 hover:bg-slate-700 disabled:opacity-50"
          >
            🎙
          </button>
          {pastRecordings.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400 hover:bg-slate-700"
              title="Recording history"
            >
              🗂 {pastRecordings.length}
            </button>
          )}
        </div>
      )}

      {/* ── Recording history panel ── */}
      {showHistory && pastRecordings.length > 0 && (
        <div className="rounded-md border border-slate-700 bg-slate-900/80 p-2 space-y-2 min-w-[280px]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Past Recordings</p>
          {pastRecordings.map((r) => (
            <div key={r.id} className="flex flex-col gap-1 border-b border-slate-800 pb-2 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px]">
                  {statusBadge(r)}
                  {r.duration_sec ? (
                    <span className="text-slate-400">{fmt(r.duration_sec)}</span>
                  ) : null}
                  {r.published && (
                    <span className="rounded bg-emerald-900/50 px-1 text-[10px] text-emerald-300">🎙 Live</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {r.file_url && (
                    <a
                      href={r.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                      title="Download"
                    >
                      ↓
                    </a>
                  )}
                  <Link
                    href={`/sessions/${sessionId}/recording/${r.id}`}
                    className="rounded bg-amber-900/60 px-2 py-0.5 text-[10px] font-semibold text-amber-200 hover:bg-amber-800"
                  >
                    Open Editor
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {transcriptBadge(r)}
                <span className="text-[10px] text-slate-600">
                  {new Date(r.started_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
