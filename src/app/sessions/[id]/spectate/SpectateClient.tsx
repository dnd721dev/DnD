'use client'

// Spectator mode — anyone (no character, no wallet needed) can open the
// spectate link, LISTEN to the table's voice room live, and follow the dice
// log. Spectators join LiveKit with a listen-only token (canPublish=false),
// so they can never speak, unmute, or touch the game.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, RemoteTrack, RemoteParticipant } from 'livekit-client'
import { supabase } from '@/lib/supabase'
import { useSessionRolls } from '@/components/table/tableclient/hooks/useSessionRolls'

type SessionInfo = {
  id: string
  title: string | null
  status: string | null
  campaign_id: string | null
}

export function SpectateClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [roomName, setRoomName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [listening, setListening] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speakers, setSpeakers] = useState<string[]>([])
  const [participantCount, setParticipantCount] = useState(0)
  const [muted, setMuted] = useState(false)

  const roomRef = useRef<Room | null>(null)
  const audioElsRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const identityRef = useRef(`spectator-${Math.random().toString(36).slice(2, 10)}`)

  const { diceLog } = useSessionRolls({ sessionId, hasMounted: true })

  // ── Session info + voice room name ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: s } = await supabase
        .from('sessions')
        .select('id, title, status, campaign_id')
        .eq('id', sessionId)
        .maybeSingle()
      if (!mounted) return
      if (!s) { setError('Session not found.'); setLoading(false); return }
      setSession(s as SessionInfo)

      let room = `session-${sessionId}`
      if ((s as any).campaign_id) {
        const { data: c } = await supabase
          .from('campaigns')
          .select('livekit_room_name')
          .eq('id', (s as any).campaign_id)
          .maybeSingle()
        if ((c as any)?.livekit_room_name) room = (c as any).livekit_room_name
      }
      if (!mounted) return
      setRoomName(room)
      setLoading(false)
    }
    void load()
    return () => { mounted = false }
  }, [sessionId])

  // ── Listen-only voice connection ───────────────────────────────────────────
  const connect = useCallback(async () => {
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || ''
    if (!url || !roomName) { setError('Voice is not configured for this session.'); return }
    setConnecting(true); setError(null)
    try {
      const res = await fetch(
        `/api/livekit-token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identityRef.current)}&role=spectator`,
      )
      const { token, error: tokenErr } = await res.json()
      if (!token) throw new Error(tokenErr ?? 'Could not get a listen token')

      const room = new Room()
      roomRef.current = room

      const attach = (track: RemoteTrack, participant: RemoteParticipant) => {
        if (track.kind !== 'audio') return
        const el = track.attach() as HTMLAudioElement
        el.muted = muted
        document.body.appendChild(el)
        audioElsRef.current.set(`${participant.identity}:${track.sid}`, el)
      }

      room
        .on(RoomEvent.TrackSubscribed, (track, _pub, participant) => attach(track, participant))
        .on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
          const key = `${participant.identity}:${track.sid}`
          const el = audioElsRef.current.get(key)
          if (el) { track.detach(el); el.remove(); audioElsRef.current.delete(key) }
        })
        .on(RoomEvent.ActiveSpeakersChanged, (list) => {
          setSpeakers(list.map((p) => p.identity).filter((i) => !i.startsWith('spectator-')))
        })
        .on(RoomEvent.ParticipantConnected, () => setParticipantCount(countPlayers(room)))
        .on(RoomEvent.ParticipantDisconnected, () => setParticipantCount(countPlayers(room)))
        .on(RoomEvent.Disconnected, () => {
          setListening(false)
          for (const el of audioElsRef.current.values()) el.remove()
          audioElsRef.current.clear()
        })

      await room.connect(url, token)
      setParticipantCount(countPlayers(room))
      setListening(true)
    } catch (e: any) {
      setError(e?.message ?? 'Could not connect')
      roomRef.current = null
    } finally {
      setConnecting(false)
    }
  }, [roomName, muted])

  function countPlayers(room: Room): number {
    let n = 0
    room.remoteParticipants.forEach((p) => { if (!p.identity.startsWith('spectator-')) n++ })
    return n
  }

  function disconnect() {
    roomRef.current?.disconnect()
    roomRef.current = null
    setListening(false)
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    for (const el of audioElsRef.current.values()) el.muted = next
  }

  useEffect(() => () => { roomRef.current?.disconnect() }, [])

  return (
    <div className="mx-auto max-w-2xl min-h-screen px-4 py-8 text-slate-100">
      <p className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-semibold">Spectator Mode</p>
      <h1 className="text-2xl font-bold text-yellow-100">
        {loading ? 'Loading…' : (session?.title ?? 'DND721 Session')}
      </h1>
      <p className="mt-1 text-xs text-slate-400">
        You&apos;re watching as a guest — listen to the table live and follow the rolls. Spectators can&apos;t speak or affect the game.
        {session?.status && <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase text-slate-300">{session.status}</span>}
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-rose-800/50 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">{error}</div>
      )}

      {/* Listen controls */}
      <div className="mt-6 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-100">🎧 Table audio</p>
            <p className="text-[11px] text-slate-500">
              {listening
                ? `Live — ${participantCount} at the table${speakers.length ? ` · speaking: ${speakers.join(', ')}` : ''}`
                : 'Join the room to hear the session live.'}
            </p>
          </div>
          <div className="flex gap-2">
            {listening && (
              <button onClick={toggleMute}
                      className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
                {muted ? '🔇 Unmute' : '🔊 Mute'}
              </button>
            )}
            {listening ? (
              <button onClick={disconnect}
                      className="rounded-md bg-rose-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">
                Leave
              </button>
            ) : (
              <button onClick={() => void connect()} disabled={connecting || loading || !roomName}
                      className="rounded-md bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                {connecting ? '⏳ Connecting…' : '▶ Listen in'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dice log */}
      <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
        <p className="mb-2 text-sm font-semibold text-slate-100">🎲 Live dice log</p>
        {diceLog.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No rolls yet — they&apos;ll appear here in real time.</p>
        ) : (
          <ul className="space-y-1.5 max-h-96 overflow-y-auto">
            {diceLog.map((d) => (
              <li key={d.id} className="rounded-md border border-slate-800 bg-slate-950/60 px-2.5 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-slate-300">
                    <span className="font-semibold text-slate-100">{d.roller}</span>
                    {d.label ? ` · ${d.label}` : ''}
                  </span>
                  <span className="shrink-0 font-mono font-bold text-amber-300">{d.result}</span>
                </div>
                {d.outcome && <p className="mt-0.5 text-[10px] text-emerald-300/90">{d.outcome}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-center text-[10px] text-slate-600">
        Powered by DND721 · ask the GM for an invite if you want to play
      </p>
    </div>
  )
}
