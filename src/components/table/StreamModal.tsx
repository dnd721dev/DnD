'use client'

// Go Live — stream the session's voice room to X / Twitch / YouTube (or any
// RTMP endpoint) via LiveKit egress. Any session participant can start a
// stream; the streamer or the GM can stop it. The stream key goes straight
// to the server → LiveKit and is never stored.

import { useCallback, useEffect, useState } from 'react'

type Platform = 'twitch' | 'youtube' | 'x' | 'custom'

const PLATFORMS: Array<{ key: Platform; label: string; ingest: string; hint: string }> = [
  { key: 'twitch',  label: 'Twitch',  ingest: 'rtmps://live.twitch.tv/app',        hint: 'Creator Dashboard → Settings → Stream' },
  { key: 'youtube', label: 'YouTube', ingest: 'rtmps://a.rtmps.youtube.com/live2', hint: 'YouTube Studio → Go Live → Stream settings' },
  { key: 'x',       label: 'X (Twitter)', ingest: 'rtmps://va.pscp.tv:443/x',      hint: 'X Media Studio → Producer → Create broadcast' },
  { key: 'custom',  label: 'Custom RTMP', ingest: '', hint: 'Any rtmp:// or rtmps:// ingest URL' },
]

type ActiveStream = { id: string; platform: string; started_by: string; started_at: string }

export function StreamModal({
  sessionId, roomName, wallet, onClose,
}: {
  sessionId: string
  roomName: string
  wallet: string
  onClose: () => void
}) {
  const [active, setActive] = useState<ActiveStream | null>(null)
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<Platform>('twitch')
  const [ingest, setIngest] = useState(PLATFORMS[0]!.ingest)
  const [streamKey, setStreamKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/stream/${sessionId}`)
      const json = await res.json()
      setActive(json.stream ?? null)
    } finally { setLoading(false) }
  }, [sessionId])

  useEffect(() => { void refresh() }, [refresh])

  function pickPlatform(p: Platform) {
    setPlatform(p)
    const meta = PLATFORMS.find((x) => x.key === p)!
    setIngest(meta.ingest)
  }

  async function start() {
    setBusy(true); setErr(null)
    try {
      const res = await fetch(`/api/stream/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, roomName, rtmpUrl: ingest, streamKey, platform }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Failed to start stream')
      setStreamKey('')
      await refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to start')
    } finally { setBusy(false) }
  }

  async function stop() {
    setBusy(true); setErr(null)
    try {
      const res = await fetch(`/api/stream/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error ?? 'Failed to stop stream')
      await refresh()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to stop')
    } finally { setBusy(false) }
  }

  const meta = PLATFORMS.find((x) => x.key === platform)!
  const inputCls = 'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-red-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-yellow-100">📡 Go Live</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-xs text-slate-500">Checking stream status…</p>
        ) : active ? (
          <div className="space-y-3">
            <div className="rounded-md border border-red-800/60 bg-red-950/40 px-3 py-2.5">
              <p className="text-sm font-semibold text-red-200">
                <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
                LIVE on {active.platform}
              </p>
              <p className="mt-0.5 text-[11px] text-red-300/80">
                Started {new Date(active.started_at).toLocaleTimeString()} · by {active.started_by.slice(0, 6)}…{active.started_by.slice(-4)}
              </p>
            </div>
            <button onClick={() => void stop()} disabled={busy}
                    className="w-full rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? '⏳ Stopping…' : '⏹ End Stream'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              {PLATFORMS.map((p) => (
                <button key={p.key} onClick={() => pickPlatform(p.key)}
                        className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold ${platform === p.key ? 'bg-red-800 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Ingest URL</label>
              <input value={ingest} onChange={(e) => setIngest(e.target.value)} className={inputCls}
                     placeholder="rtmps://…" readOnly={platform !== 'custom'} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">Stream key</label>
              <input value={streamKey} onChange={(e) => setStreamKey(e.target.value)} className={inputCls}
                     type="password" placeholder="Paste your stream key" />
              <p className="mt-1 text-[10px] text-slate-500">Find it in: {meta.hint}. Sent directly to the streaming server — never stored.</p>
            </div>

            {err && <p className="rounded-md border border-rose-800/50 bg-rose-950/40 px-3 py-1.5 text-[11px] text-rose-200">{err}</p>}

            <button onClick={() => void start()} disabled={busy || !streamKey.trim() || !ingest.trim()}
                    className="w-full rounded-md bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {busy ? '⏳ Starting…' : '🔴 Start Streaming'}
            </button>
            <p className="text-[10px] text-slate-500">
              Streams the table&apos;s live audio (participant grid video) to your channel. Anyone at the table can go live; you or the GM can end it.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
