'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Recording = {
  id: string
  session_id: string
  status: string
  file_url: string | null
  duration_sec: number | null
  started_at: string
  stopped_at: string | null
  master_script: string | null
  master_script_status: string
  composite_transcript: string | null
  composite_transcript_status: string
  published: boolean
  episode_number: number | null
  episode_title: string | null
  recording_tracks: TrackRow[]
}

type TrackRow = {
  id: string
  participant_identity: string
  file_url: string | null
  file_status: string
  transcript: string | null
  transcript_status: string
}

type MarkerRow = {
  id: string
  label: string
  offset_sec: number
}

type Tab = 'player' | 'script' | 'chapters' | 'tracks'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number) {
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function download(filename: string, content: string, mimeType = 'text/plain') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: mimeType }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecordingEditorPage() {
  const params      = useParams()
  const sessionId   = params.id as string
  const recordingId = params.recordingId as string

  const [recording, setRecording]   = useState<Recording | null>(null)
  const [markers, setMarkers]       = useState<MarkerRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<Tab>('player')

  // Bug 14: display name mapping (wallet → name)
  const [nameMap, setNameMap]       = useState<Record<string, string>>({})

  // Script editor
  const [script, setScript]         = useState('')
  const [scriptSaving, setScriptSaving] = useState(false)
  const [scriptSaved, setScriptSaved]   = useState(false)

  // Publish
  const [showPublish, setShowPublish]   = useState(false)
  const [epTitle, setEpTitle]           = useState('')
  const [epNumber, setEpNumber]         = useState('')
  const [publishing, setPublishing]     = useState(false)

  // Transcription
  const [transcribing, setTranscribing] = useState(false)

  // Chapters
  const [editingMarker, setEditingMarker]   = useState<string | null>(null)
  const [markerEdits, setMarkerEdits]       = useState<Record<string, { label: string; offset_sec: number }>>({})
  const [newLabel, setNewLabel]             = useState('')
  const [newOffset, setNewOffset]           = useState('')

  // Tracks
  const [trackEdits, setTrackEdits]   = useState<Record<string, string>>({})
  const [trackSaving, setTrackSaving] = useState<Record<string, boolean>>({})

  // Bug 8: master audio player ref
  const masterAudioRef = useRef<HTMLAudioElement | null>(null)

  // ── Fetch data ─────────────────────────────────────────────────────────────

  const fetchRecording = useCallback(async () => {
    const [recRes, markRes] = await Promise.all([
      fetch(`/api/recording/${sessionId}`),
      fetch(`/api/recording-markers?recordingId=${recordingId}`),
    ])
    if (!recRes.ok) return

    const { recordings } = await recRes.json() as { recordings: Recording[] }
    const rec = recordings.find((r) => r.id === recordingId)
    if (!rec) return

    setRecording(rec)
    setScript(rec.master_script ?? rec.composite_transcript ?? '')
    setEpTitle(rec.episode_title ?? '')
    setEpNumber(rec.episode_number ? String(rec.episode_number) : '')

    if (markRes.ok) {
      const { markers: rows } = await markRes.json() as { markers: MarkerRow[] }
      setMarkers(rows ?? [])
    }

    // Bug 14 fix: resolve participant wallet addresses to display names
    const wallets = (rec.recording_tracks ?? []).map((t) => t.participant_identity).filter(Boolean)
    if (wallets.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('wallet_address, display_name')
        .in('wallet_address', wallets)
      const map: Record<string, string> = {}
      for (const p of profiles ?? []) {
        if (p.wallet_address) {
          map[p.wallet_address] = p.display_name?.trim() || shortenWallet(p.wallet_address)
        }
      }
      setNameMap(map)
    }

    setLoading(false)
  }, [sessionId, recordingId])

  useEffect(() => { void fetchRecording() }, [fetchRecording])

  // Bug 9 fix: realtime subscription on session_recordings
  useEffect(() => {
    if (!recordingId) return
    const channel = supabase
      .channel(`recording-page-${recordingId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'session_recordings',
          filter: `id=eq.${recordingId}`,
        },
        (payload) => {
          setRecording((prev) => prev ? { ...prev, ...(payload.new as Partial<Recording>) } : prev)
        }
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'recording_tracks',
          filter: `recording_id=eq.${recordingId}`,
        },
        () => {
          // Re-fetch recording when a track status changes
          void fetchRecording()
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [recordingId, fetchRecording])

  // ── Script actions ─────────────────────────────────────────────────────────

  async function saveScript() {
    if (!recording) return
    setScriptSaving(true)
    await fetch(`/api/recording/${sessionId}/script`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingId, masterScript: script }),
    })
    setScriptSaving(false)
    setScriptSaved(true)
    setTimeout(() => setScriptSaved(false), 2000)
  }

  async function regenerateScript() {
    if (!recording) return
    setTranscribing(true)
    await fetch(`/api/recording/${sessionId}/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingId }),
    })
    setTranscribing(false)
    void fetchRecording()
  }

  // ── Publish actions ────────────────────────────────────────────────────────

  async function publishEpisode() {
    if (!recording) return
    setPublishing(true)
    await fetch(`/api/recording/${sessionId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordingId,
        published:     true,
        episodeTitle:  epTitle  || undefined,
        episodeNumber: epNumber ? parseInt(epNumber) : undefined,
      }),
    })
    setPublishing(false)
    setShowPublish(false)
    void fetchRecording()
  }

  async function unpublishEpisode() {
    if (!recording) return
    await fetch(`/api/recording/${sessionId}/publish`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingId, published: false }),
    })
    void fetchRecording()
  }

  // ── Chapter actions ────────────────────────────────────────────────────────

  async function saveMarker(id: string) {
    const edits = markerEdits[id]
    if (!edits) return
    await fetch('/api/recording-markers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...edits }),
    })
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, ...edits } : m)))
    setEditingMarker(null)
  }

  async function deleteMarker(id: string) {
    await fetch(`/api/recording-markers?id=${id}`, { method: 'DELETE' })
    setMarkers((prev) => prev.filter((m) => m.id !== id))
  }

  async function addMarker() {
    const offsetNum = parseInt(newOffset) || 0
    const res = await fetch('/api/recording-markers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordingId, sessionId, label: newLabel.trim(), offsetSec: offsetNum }),
    })
    if (res.ok) {
      const { marker } = await res.json()
      setMarkers((prev) => [...prev, marker].sort((a, b) => a.offset_sec - b.offset_sec))
      setNewLabel('')
      setNewOffset('')
    }
  }

  // Bug 8: seek master audio to a marker offset
  function seekToMarker(offsetSec: number) {
    if (masterAudioRef.current) {
      masterAudioRef.current.currentTime = offsetSec
      masterAudioRef.current.play().catch(() => {})
    }
  }

  function exportChaptersJson() {
    const data = {
      version: '1.2.0',
      chapters: markers
        .sort((a, b) => a.offset_sec - b.offset_sec)
        .map((m) => ({ startTime: m.offset_sec, title: m.label })),
    }
    download('chapters.json', JSON.stringify(data, null, 2), 'application/json')
  }

  // ── Track actions ──────────────────────────────────────────────────────────

  async function saveTrackTranscript(trackId: string) {
    setTrackSaving((prev) => ({ ...prev, [trackId]: true }))
    await fetch(`/api/recording-tracks/${trackId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: trackEdits[trackId] }),
    })
    setTrackSaving((prev) => ({ ...prev, [trackId]: false }))
    setRecording((prev) =>
      prev ? {
        ...prev,
        recording_tracks: prev.recording_tracks.map((t) =>
          t.id === trackId ? { ...t, transcript: trackEdits[trackId] } : t
        ),
      } : prev
    )
  }

  async function retranscribeTrack(trackId: string) {
    setTrackSaving((prev) => ({ ...prev, [trackId]: true }))
    await fetch(`/api/recording-tracks/${trackId}/transcribe`, { method: 'POST' })
    setTrackSaving((prev) => ({ ...prev, [trackId]: false }))
    void fetchRecording()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading…
      </div>
    )
  }

  if (!recording) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Recording not found.{' '}
        <Link href={`/sessions/${sessionId}`} className="ml-2 text-amber-400 hover:underline">
          Back to session
        </Link>
      </div>
    )
  }

  const isProcessing = recording.status === 'recording' || recording.status === 'stopped'
  const isReady      = recording.status === 'completed'

  const TABS: { id: Tab; label: string }[] = [
    { id: 'player',   label: '▶ Player'    },
    { id: 'script',   label: '📝 Script'   },
    { id: 'chapters', label: '🔖 Chapters' },
    { id: 'tracks',   label: `🎙 Tracks (${recording.recording_tracks?.length ?? 0})` },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8">

      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/sessions/${sessionId}`} className="text-xs text-slate-500 hover:text-slate-300">
            ← Back to session
          </Link>
          <h1 className="mt-1 text-xl font-bold text-yellow-200">
            Recording Editor
          </h1>
          <p className="text-xs text-slate-400">
            {recording.started_at ? new Date(recording.started_at).toLocaleString() : '—'}
            {recording.duration_sec ? ` · ${fmt(recording.duration_sec)}` : ''}
            {' · '}
            <span className={isReady ? 'text-emerald-400' : 'text-yellow-400'}>
              {recording.status}
            </span>
          </p>
        </div>

        {/* Publish controls */}
        <div className="flex items-center gap-2">
          {isReady && recording.file_url && (
            <a
              href={recording.file_url}
              download="session-master"
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700"
            >
              ⬇ Download master
            </a>
          )}
          {recording.published ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-900/50 px-3 py-1 text-xs font-semibold text-emerald-300">
                🎙 Live{recording.episode_number ? ` · Ep. ${recording.episode_number}` : ''}
              </span>
              <button
                onClick={unpublishEpisode}
                className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-red-900/50 hover:text-red-300"
              >
                Unpublish
              </button>
            </div>
          ) : isReady ? (
            <button
              onClick={() => setShowPublish(true)}
              className="rounded-md bg-amber-700/70 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-700"
            >
              Publish Episode
            </button>
          ) : null}
        </div>
      </div>

      {/* Bug 9: processing notice with auto-refresh hint */}
      {isProcessing && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-yellow-800/40 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
          <span className="animate-spin">⏳</span>
          Recording is being processed… This page updates automatically when it&apos;s ready.
        </div>
      )}

      {/* ── Publish modal ── */}
      {showPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-amber-800/60 bg-slate-900 p-6 space-y-4">
            <h2 className="text-base font-bold text-amber-200">Publish Episode</h2>
            <p className="text-xs text-slate-400">
              Once published, this episode will appear in the podcast RSS feed at{' '}
              <code className="text-slate-300">/api/podcast/rss</code>.
            </p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Episode title (optional)</label>
                <input
                  value={epTitle}
                  onChange={(e) => setEpTitle(e.target.value)}
                  placeholder="e.g. The Dragon's Lair"
                  maxLength={200}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Episode number (optional)</label>
                <input
                  type="number"
                  value={epNumber}
                  onChange={(e) => setEpNumber(e.target.value)}
                  placeholder="e.g. 12"
                  min={1}
                  className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPublish(false)}
                className="rounded-md bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={publishEpisode}
                disabled={publishing}
                className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-600 disabled:opacity-50"
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="mb-4 flex gap-1 border-b border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              tab === t.id
                ? 'bg-slate-800 text-yellow-200 border-b-2 border-yellow-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Player Tab (Bug 8 fix) ── */}
      {tab === 'player' && (
        <div className="space-y-6">

          {/* Master recording */}
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-yellow-200">Master Recording</h2>
              {isReady && recording.file_url && (
                <a
                  href={recording.file_url}
                  download="session-master"
                  className="rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
                >
                  ⬇ Download Master Mix
                </a>
              )}
            </div>

            {isReady && recording.file_url ? (
              <audio
                ref={masterAudioRef}
                src={recording.file_url}
                controls
                className="w-full rounded-md"
                style={{ colorScheme: 'dark' }}
              />
            ) : (
              <div className="rounded-md border border-slate-700 bg-slate-900 px-4 py-6 text-center text-sm text-slate-500">
                {isProcessing
                  ? '⏳ Audio is being processed…'
                  : 'No master recording available.'}
              </div>
            )}
          </div>

          {/* Individual tracks */}
          {(recording.recording_tracks ?? []).length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-300">Individual Tracks</h2>
              {recording.recording_tracks.map((track) => {
                const label = nameMap[track.participant_identity] ?? shortenWallet(track.participant_identity)
                return (
                  <div key={track.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-200">🎙 {label}</span>
                      {track.file_status === 'ready' && track.file_url && (
                        <a
                          href={track.file_url}
                          download={`${label}.ogg`}
                          className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
                        >
                          ⬇ Download
                        </a>
                      )}
                    </div>
                    {track.file_status === 'ready' && track.file_url ? (
                      <audio
                        src={track.file_url}
                        controls
                        className="w-full rounded-md"
                        style={{ colorScheme: 'dark' }}
                      />
                    ) : (
                      <div className="rounded border border-slate-800 bg-slate-900 px-3 py-3 text-xs text-slate-500 text-center">
                        {track.file_status === 'recording' ? '⏳ Track still recording…' : 'Track not available.'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Chapter markers with seek (Bug 8 fix) */}
          {markers.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-300">Chapter Markers</h2>
              <ul className="space-y-1">
                {markers.sort((a, b) => a.offset_sec - b.offset_sec).map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => seekToMarker(m.offset_sec)}
                      disabled={!isReady || !recording.file_url}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-left text-sm hover:bg-slate-800 disabled:cursor-default disabled:opacity-60 transition-colors"
                      title={isReady ? `Seek to ${fmt(m.offset_sec)}` : 'Not available yet'}
                    >
                      <span className="w-14 shrink-0 font-mono text-xs text-amber-400">{fmt(m.offset_sec)}</span>
                      <span className="text-slate-200">{m.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Script Tab ── */}
      {tab === 'script' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Status:{' '}
              <span className={
                recording.master_script_status === 'done'    ? 'text-emerald-400' :
                recording.master_script_status === 'pending' ? 'text-yellow-400 animate-pulse' :
                recording.master_script_status === 'failed'  ? 'text-red-400' :
                'text-slate-500'
              }>
                {recording.master_script_status}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={regenerateScript}
                disabled={transcribing}
                className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-50"
              >
                {transcribing ? '⏳ Transcribing…' : '↺ Regenerate'}
              </button>
              <button
                onClick={() => download('script.md', script, 'text/markdown')}
                className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
              >
                ↓ .md
              </button>
              <button
                onClick={() => download('script.txt', script, 'text/plain')}
                className="rounded-md bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
              >
                ↓ .txt
              </button>
              <button
                onClick={saveScript}
                disabled={scriptSaving}
                className="rounded-md bg-emerald-800/70 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-700 disabled:opacity-50"
              >
                {scriptSaved ? '✓ Saved' : scriptSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {recording.master_script_status === 'none' && !script && (
            <div className="rounded-md border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
              No script yet. Click <strong>↺ Regenerate</strong> to start transcription, or the script
              will appear automatically once the recording finishes processing.
            </div>
          )}

          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={30}
            spellCheck
            className="w-full rounded-md border border-slate-700 bg-slate-900 p-4 font-mono text-sm text-slate-100 focus:border-yellow-700 focus:outline-none resize-y"
            placeholder="Script will appear here after transcription..."
          />
        </div>
      )}

      {/* ── Chapters Tab ── */}
      {tab === 'chapters' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={exportChaptersJson}
              disabled={markers.length === 0}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >
              ↓ Export chapters.json
            </button>
          </div>

          {markers.length === 0 ? (
            <p className="text-sm text-slate-500">No chapter markers. Add them below or during recording.</p>
          ) : (
            <ul className="space-y-2">
              {markers.sort((a, b) => a.offset_sec - b.offset_sec).map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
                  {editingMarker === m.id ? (
                    <>
                      <input
                        type="text"
                        value={markerEdits[m.id]?.label ?? m.label}
                        onChange={(e) => setMarkerEdits((prev) => ({
                          ...prev,
                          [m.id]: { ...prev[m.id] ?? { label: m.label, offset_sec: m.offset_sec }, label: e.target.value },
                        }))}
                        maxLength={100}
                        className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={markerEdits[m.id]?.offset_sec ?? m.offset_sec}
                        onChange={(e) => setMarkerEdits((prev) => ({
                          ...prev,
                          [m.id]: { ...prev[m.id] ?? { label: m.label, offset_sec: m.offset_sec }, offset_sec: parseInt(e.target.value) || 0 },
                        }))}
                        min={0}
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100 focus:outline-none"
                      />
                      <span className="text-xs text-slate-500">sec</span>
                      <button onClick={() => void saveMarker(m.id)} className="rounded bg-emerald-800/70 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-700">Save</button>
                      <button onClick={() => setEditingMarker(null)} className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-400 hover:bg-slate-700">Cancel</button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => seekToMarker(m.offset_sec)}
                        disabled={!isReady || !recording.file_url}
                        className="font-mono text-xs text-amber-400 w-14 shrink-0 hover:text-amber-300 disabled:cursor-default disabled:opacity-60"
                        title="Seek to this marker"
                      >
                        {fmt(m.offset_sec)}
                      </button>
                      <span className="flex-1 text-sm text-slate-200">{m.label}</span>
                      <button
                        onClick={() => {
                          setEditingMarker(m.id)
                          setMarkerEdits((prev) => ({ ...prev, [m.id]: { label: m.label, offset_sec: m.offset_sec } }))
                        }}
                        className="text-xs text-slate-500 hover:text-slate-200"
                      >
                        Edit
                      </button>
                      <button onClick={() => void deleteMarker(m.id)} className="text-xs text-red-600 hover:text-red-400">✕</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add new marker */}
          <div className="flex gap-2 items-center border-t border-slate-800 pt-3">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label"
              maxLength={100}
              className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:outline-none"
            />
            <input
              type="number"
              value={newOffset}
              onChange={(e) => setNewOffset(e.target.value)}
              placeholder="Offset (sec)"
              min={0}
              className="w-28 rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 focus:outline-none"
            />
            <button
              onClick={void addMarker}
              disabled={!newLabel.trim()}
              className="rounded-md bg-amber-800/70 px-3 py-1.5 text-sm font-semibold text-amber-200 hover:bg-amber-700 disabled:opacity-50"
            >
              + Add
            </button>
          </div>
        </div>
      )}

      {/* ── Tracks Tab ── */}
      {tab === 'tracks' && (
        <div className="space-y-4">
          {/* Composite track */}
          <div className="rounded-md border border-slate-700 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-yellow-200">Composite (mixed)</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${
                  recording.composite_transcript_status === 'done'    ? 'text-emerald-400' :
                  recording.composite_transcript_status === 'pending' ? 'text-yellow-400 animate-pulse' :
                  'text-slate-500'
                }`}>
                  {recording.composite_transcript_status}
                </span>
                {isReady && recording.file_url && (
                  <a
                    href={recording.file_url}
                    download="session-master"
                    className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    ↓ Download
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Per-participant tracks */}
          {(recording.recording_tracks ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No individual tracks recorded.</p>
          ) : (
            (recording.recording_tracks ?? []).map((track) => {
              const label         = nameMap[track.participant_identity] ?? shortenWallet(track.participant_identity)
              const rawTranscript = track.transcript
              let displayTranscript = rawTranscript ?? ''
              if (rawTranscript) {
                try {
                  const parsed = JSON.parse(rawTranscript)
                  displayTranscript = parsed.text ?? rawTranscript
                } catch { /* plain text */ }
              }
              const editedText = trackEdits[track.id] ?? displayTranscript

              return (
                <div key={track.id} className="rounded-md border border-slate-700 bg-slate-900/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Bug 14 fix: show display name instead of wallet */}
                      <span className="text-sm font-semibold text-slate-200">🎙 {label}</span>
                      <span className={`text-xs ${
                        track.transcript_status === 'done'    ? 'text-emerald-400' :
                        track.transcript_status === 'pending' ? 'text-yellow-400 animate-pulse' :
                        track.transcript_status === 'failed'  ? 'text-red-400' :
                        'text-slate-500'
                      }`}>
                        {track.transcript_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Bug 11 fix: gate download on file_status = 'ready' */}
                      {track.file_status === 'ready' && track.file_url && (
                        <a
                          href={track.file_url}
                          download={`${label}.ogg`}
                          className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
                        >
                          ↓ Audio
                        </a>
                      )}
                      <button
                        onClick={() => void retranscribeTrack(track.id)}
                        disabled={trackSaving[track.id] || track.file_status !== 'ready'}
                        className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-50"
                        title={track.file_status !== 'ready' ? 'Audio not yet available' : 'Re-transcribe'}
                      >
                        ↺ Re-transcribe
                      </button>
                      {trackEdits[track.id] !== undefined && (
                        <button
                          onClick={() => void saveTrackTranscript(track.id)}
                          disabled={trackSaving[track.id]}
                          className="rounded bg-emerald-800/70 px-2 py-0.5 text-xs text-emerald-200 hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {trackSaving[track.id] ? 'Saving…' : 'Save'}
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={editedText}
                    onChange={(e) => setTrackEdits((prev) => ({ ...prev, [track.id]: e.target.value }))}
                    rows={5}
                    className="w-full rounded border border-slate-700 bg-slate-800/60 p-2 text-xs text-slate-300 font-mono focus:border-yellow-700 focus:outline-none resize-y"
                    placeholder={
                      track.file_status !== 'ready'
                        ? 'Audio still uploading — transcript available once file is ready.'
                        : track.transcript_status === 'none'
                        ? 'No transcript yet. Click ↺ Re-transcribe to start.'
                        : 'Transcript…'
                    }
                  />
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function shortenWallet(w: string): string {
  if (!w || w.length < 10) return w
  return `${w.slice(0, 6)}…${w.slice(-4)}`
}
