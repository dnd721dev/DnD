'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'
import { RoomAudioRenderer } from '@livekit/components-react'
import '@livekit/components-styles'
import { supabase } from '@/lib/supabase'
import { ANON_NAME } from '@/lib/displayName'
import { createVoiceFxChain, VOICE_FX_PRESETS, type VoiceFxPreset, type VoiceFxChain } from '@/lib/voiceFx'

// ── Types ─────────────────────────────────────────────────────────────────────

interface VoiceChatProps {
  roomName:  string
  identity?: string
  /** Pass true when the local user is the GM — shows per-participant mute buttons */
  isGm?:     boolean
  /** Session UUID — used to verify GM identity server-side before muting */
  sessionId?: string
}

type ParticipantInfo = {
  identity:    string
  displayName: string
  isMuted:     boolean
  isSpeaking:  boolean
}

// Keep cached token fresh: re-fetch if older than 7 h (token TTL = 8 h)
const TOKEN_REFRESH_MS = 7 * 60 * 60 * 1000

// ── Helpers ───────────────────────────────────────────────────────────────────

// Never render a wallet — when no profile/character name is cached for a voice
// participant, fall back to the generic name.
function shortenWallet(_w: string): string {
  return ANON_NAME
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceChat({ roomName, identity, isGm, sessionId }: VoiceChatProps) {
  const [room, setRoom]           = useState<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [participants, setParticipants] = useState<ParticipantInfo[]>([])
  const [localMuted, setLocalMuted]     = useState(false)
  const [showPanel, setShowPanel]       = useState(false)
  const [mutingId, setMutingId]         = useState<string | null>(null)
  // Bug 2: reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false)
  // Bug 3: per-participant volume (0-100, default 100)
  const [volumes, setVolumes] = useState<Record<string, number>>({})
  // DM voice changer — active preset + live Web Audio chain
  const [fxPreset, setFxPreset] = useState<VoiceFxPreset>('none')
  const [fxBusy, setFxBusy] = useState(false)
  const fxChainRef = useRef<VoiceFxChain | null>(null)
  const fxTrackRef = useRef<MediaStreamTrack | null>(null)

  const url      = process.env.NEXT_PUBLIC_LIVEKIT_URL || ''
  const stableId = useRef(identity || `guest-${Math.random().toString(36).slice(2, 8)}`)

  // Cached token: { value, fetchedAt }
  const tokenRef = useRef<{ value: string; fetchedAt: number } | null>(null)

  // Display-name cache: wallet → display name (populated lazily)
  const nameCacheRef = useRef<Record<string, string>>({})

  // ── Token pre-fetch ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!url || !roomName) return
    const sid = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''
    fetch(`/api/livekit-token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(stableId.current)}${sid}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (d.token) tokenRef.current = { value: d.token, fetchedAt: Date.now() }
      })
      .catch(() => {}) // silent — handleConnect fetches fresh if this fails
  }, [url, roomName, sessionId])

  // ── Cleanup on unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      fxChainRef.current?.cleanup()
      fxChainRef.current = null
      room?.disconnect()
    }
  }, [room])

  // ── Bug 6 fix: beforeunload disconnect — prevents ghost participants ─────────

  useEffect(() => {
    const handler = () => room?.disconnect()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [room])

  // ── Display name resolution ──────────────────────────────────────────────────

  const resolveNames = useCallback(async (identities: string[]): Promise<void> => {
    const unknown = identities.filter((id) => !nameCacheRef.current[id])
    if (!unknown.length) return
    const { data } = await supabase
      .from('profiles')
      .select('wallet_address, display_name')
      .in('wallet_address', unknown)
    for (const row of data ?? []) {
      if (row.wallet_address) {
        nameCacheRef.current[row.wallet_address] = row.display_name?.trim() || shortenWallet(row.wallet_address)
      }
    }
  }, [])

  // ── Participant state rebuild ────────────────────────────────────────────────

  const rebuildParticipants = useCallback(async (lkRoom: Room, speakerSet?: Set<string>) => {
    // Spectators (listen-only guests) are hidden from the player roster —
    // they can't speak, so listing them would only add noise.
    const all = [...lkRoom.remoteParticipants.values()]
      .filter((p) => !p.identity.startsWith('spectator-'))
    const identities = all.map((p) => p.identity)

    await resolveNames(identities)

    const activeSpeakers = speakerSet ?? new Set(lkRoom.activeSpeakers.map((p) => p.identity))

    setParticipants(
      all.map((p) => ({
        identity:    p.identity,
        displayName: nameCacheRef.current[p.identity] ?? shortenWallet(p.identity),
        isMuted:     !p.isMicrophoneEnabled,
        isSpeaking:  activeSpeakers.has(p.identity),
      }))
    )
  }, [resolveNames])

  // ── Connect ──────────────────────────────────────────────────────────────────

  const handleConnect = async () => {
    if (!url) {
      setError('Missing LiveKit URL. Check NEXT_PUBLIC_LIVEKIT_URL.')
      return
    }
    if (!roomName) {
      setError('No room name provided.')
      return
    }

    // Pre-clean: if a stale disconnected Room is still in state (e.g. the
    // RoomEvent.Disconnected handler fired but left a zombie object), remove all
    // its listeners and clear it before creating the new Room.  Without this the
    // old Room's handlers (setConnected, setParticipants, etc.) remain attached
    // and can silently reset the new Room's UI state if the old Room fires any
    // late lifecycle events.
    if (room) {
      room.removeAllListeners()
      room.disconnect()
      setRoom(null)
    }

    try {
      setError(null)
      setIsConnecting(true)

      // Bug 12 fix: discard cached token if it's older than 7 hours
      const cache = tokenRef.current
      let token: string | null = (cache && Date.now() - cache.fetchedAt < TOKEN_REFRESH_MS)
        ? cache.value
        : null

      if (!token) {
        const sid = sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''
        const res = await fetch(
          `/api/livekit-token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(stableId.current)}${sid}`
        )
        if (!res.ok) {
          const { error: msg } = await res.json().catch(() => ({ error: 'Token fetch failed' }))
          setError(msg ?? 'Token fetch failed')
          return
        }
        const data = await res.json()
        token = data.token as string
        tokenRef.current = { value: token, fetchedAt: Date.now() }
      }

      const newRoom = new Room({
        // Adapt bitrate to network conditions — prevents drops on congested WiFi
        adaptiveStream: true,
        // Only publish tracks at resolutions subscribers actually need
        dynacast: true,
        // Keep retrying longer than the default so brief network hiccups
        // (mobile switching WiFi→cell, VPN reconnect, etc.) self-heal without
        // showing the player a full disconnect.
        // ReconnectPolicy is a strategy interface: return null to stop retrying.
        reconnectPolicy: {
          nextRetryDelayInMs(ctx: { retryCount: number }) {
            if (ctx.retryCount >= 10) return null // give up after 10 attempts
            return 1_000                          // 1 s between each retry
          },
        },
        audioCaptureDefaults: {
          echoCancellation:  true,
          noiseSuppression:  true,
          autoGainControl:   true,
        },
      })

      const onParticipantsChanged = () => void rebuildParticipants(newRoom)

      newRoom
        .on(RoomEvent.Connected, async () => {
          setConnected(true)
          await rebuildParticipants(newRoom)
        })
        .on(RoomEvent.Disconnected, () => {
          setConnected(false)
          setIsReconnecting(false)
          setParticipants([])
          setLocalMuted(false)
          // Clear room from state so the cleanup effect on [room] fires correctly
          // and the stale Room's event listeners are no longer reachable via state.
          setRoom(null)
        })
        // Bug 2: surface reconnection state so the UI doesn't look frozen
        .on(RoomEvent.Reconnecting, () => {
          setIsReconnecting(true)
        })
        .on(RoomEvent.Reconnected, () => {
          setIsReconnecting(false)
          setConnected(true)
          void rebuildParticipants(newRoom)
        })
        .on(RoomEvent.ParticipantConnected, onParticipantsChanged)
        .on(RoomEvent.ParticipantDisconnected, onParticipantsChanged)
        .on(RoomEvent.TrackMuted, onParticipantsChanged)
        .on(RoomEvent.TrackUnmuted, onParticipantsChanged)
        .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const set = new Set(speakers.map((p) => p.identity))
          void rebuildParticipants(newRoom, set)
        })

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out after 10s')), 10_000)
      )
      await Promise.race([newRoom.connect(url, token), timeout])

      // Bug 1 fix: enable microphone after connecting — without this call
      // the local participant joins silently and no audio is published.
      await newRoom.localParticipant.setMicrophoneEnabled(true)
      setLocalMuted(false)

      setRoom(newRoom)
    } catch (e: any) {
      console.error('[VoiceChat] connect error', e)
      setError(e?.message || 'Failed to connect')
      setConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }

  // ── Disconnect ───────────────────────────────────────────────────────────────

  const handleLeave = () => {
    fxChainRef.current?.cleanup()
    fxChainRef.current = null
    fxTrackRef.current = null
    setFxPreset('none')
    room?.disconnect()
    setConnected(false)
    setIsReconnecting(false)
    setParticipants([])
    setLocalMuted(false)
    setRoom(null)
  }

  // ── DM voice changer ─────────────────────────────────────────────────────────
  // Swaps the published mic for a Web Audio–processed track. Selecting
  // "Natural voice" restores the plain microphone.
  const applyVoiceFx = async (preset: VoiceFxPreset) => {
    if (!room || fxBusy) return
    setFxBusy(true)
    try {
      // Tear down any existing processed chain + its published track.
      if (fxTrackRef.current) {
        await room.localParticipant.unpublishTrack(fxTrackRef.current).catch(() => {})
        fxTrackRef.current = null
      }
      fxChainRef.current?.cleanup()
      fxChainRef.current = null
      await room.localParticipant.setMicrophoneEnabled(false)

      if (preset === 'none') {
        await room.localParticipant.setMicrophoneEnabled(true)
        setFxPreset('none')
        setLocalMuted(false)
        return
      }

      const chain = await createVoiceFxChain(preset)
      fxChainRef.current = chain
      fxTrackRef.current = chain.track
      await room.localParticipant.publishTrack(chain.track, {
        source: Track.Source.Microphone,
        name: `voice-fx-${preset}`,
      })
      setFxPreset(preset)
      setLocalMuted(false)
    } catch (e: any) {
      console.error('[VoiceChat] voice FX error', e)
      // Fall back to the plain mic so the DM is never left silent.
      await room.localParticipant.setMicrophoneEnabled(true).catch(() => {})
      setFxPreset('none')
    } finally {
      setFxBusy(false)
    }
  }

  // Bug 3: per-participant volume — LiveKit accepts 0-1
  function handleVolume(participantIdentity: string, value: number) {
    setVolumes((prev) => ({ ...prev, [participantIdentity]: value }))
    room?.remoteParticipants.get(participantIdentity)?.setVolume(value / 100)
  }

  // ── Local mute toggle ────────────────────────────────────────────────────────

  const toggleMute = async () => {
    if (!room) return
    // When a voice-FX track is live, mute by disabling the processed track —
    // setMicrophoneEnabled would republish the raw mic alongside it.
    if (fxTrackRef.current) {
      const next = !fxTrackRef.current.enabled
      fxTrackRef.current.enabled = next
      setLocalMuted(!next)
      return
    }
    const nowEnabled = room.localParticipant.isMicrophoneEnabled
    await room.localParticipant.setMicrophoneEnabled(!nowEnabled)
    setLocalMuted(nowEnabled) // was enabled → now muted
  }

  // ── DM remote mute (Bug 3 / roomAdmin) ──────────────────────────────────────

  const muteParticipant = async (participantIdentity: string) => {
    if (!isGm || !sessionId || !identity) return
    setMutingId(participantIdentity)
    try {
      await fetch('/api/livekit-mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantIdentity,
          muted:        true,
          callerWallet: identity,
          sessionId,
        }),
      })
      // Optimistic UI update — the TrackMuted event will confirm
      setParticipants((prev) =>
        prev.map((p) => p.identity === participantIdentity ? { ...p, isMuted: true } : p)
      )
    } finally {
      setMutingId(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex items-center gap-2">
      {!connected ? (
        /* ── Not connected ── */
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50"
        >
          {isConnecting ? (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
              Connecting…
            </span>
          ) : (
            '🎙 Voice'
          )}
        </button>
      ) : (
        /* ── Connected ── */
        <div className="flex items-center gap-1">
          {/* Panel toggle — shows participant count (amber when reconnecting) */}
          <button
            onClick={() => setShowPanel((v) => !v)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
              isReconnecting
                ? 'bg-amber-900/60 text-amber-300 hover:bg-amber-900/80'
                : 'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-900/80'
            }`}
            title="Voice participants"
          >
            <span className={`h-2 w-2 rounded-full animate-pulse ${isReconnecting ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {isReconnecting ? 'Reconnecting…' : `Voice (${participants.length + 1})`}
          </button>

          {/* DM voice changer — GM only */}
          {isGm && (
            <select
              value={fxPreset}
              disabled={fxBusy}
              onChange={(e) => void applyVoiceFx(e.target.value as VoiceFxPreset)}
              title="Voice changer — pick a character voice for NPC dialogue"
              className={`rounded-md px-1.5 py-1 text-[11px] transition border ${
                fxPreset !== 'none'
                  ? 'border-purple-500/60 bg-purple-950/60 text-purple-200'
                  : 'border-slate-700 bg-slate-800 text-slate-300'
              } ${fxBusy ? 'opacity-50' : ''}`}
            >
              {[...new Set(VOICE_FX_PRESETS.map((p) => p.group))].map((group) => (
                <optgroup key={group} label={group}>
                  {VOICE_FX_PRESETS.filter((p) => p.group === group).map((p) => (
                    <option key={p.key} value={p.key}>{p.emoji} {p.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          {/* Local mute toggle */}
          <button
            onClick={toggleMute}
            title={localMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`rounded-md px-2 py-1 text-[11px] transition ${
              localMuted
                ? 'bg-red-900/60 text-red-300 hover:bg-red-900/80'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {localMuted ? '🔇' : '🎙'}
          </button>

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-400 hover:bg-red-900/50 hover:text-red-300 transition"
            title="Leave voice channel"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <span className="text-[10px] text-red-400" title={error}>⚠</span>
      )}

      {/* ── Participant panel (Bug 2 fix) ── */}
      {connected && showPanel && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[240px] rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Voice Channel
          </p>

          {/* Local participant row */}
          <div className="mb-1 flex items-center justify-between gap-2 rounded-md px-1 py-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`h-2 w-2 shrink-0 rounded-full ${localMuted ? 'bg-slate-600' : 'bg-emerald-400'}`} />
              <span className="truncate text-[11px] text-slate-200">
                You{localMuted && <span className="ml-1 text-slate-500">(muted)</span>}
              </span>
            </div>
            <button
              onClick={toggleMute}
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] transition ${
                localMuted
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {localMuted ? 'Unmute' : 'Mute'}
            </button>
          </div>

          {/* Remote participants */}
          {participants.map((p) => (
            <div
              key={p.identity}
              className="flex items-center gap-2 rounded-md px-1 py-0.5"
            >
              {/* Speaking indicator */}
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {p.isSpeaking ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40 animate-pulse" />
                ) : (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.isMuted ? 'bg-slate-600' : 'bg-slate-400'}`} />
                )}
                <span className="truncate text-[11px] text-slate-300">
                  {p.displayName}
                  {p.isMuted && <span className="ml-1 text-[10px] text-slate-500">🔇</span>}
                </span>
              </div>

              {/* Bug 3: per-user volume slider */}
              <input
                type="range"
                min={0}
                max={100}
                value={volumes[p.identity] ?? 100}
                onChange={(e) => handleVolume(p.identity, Number(e.target.value))}
                className="w-14 shrink-0 accent-emerald-500"
                title={`Volume: ${volumes[p.identity] ?? 100}%`}
              />

              {/* DM-only mute button */}
              {isGm && (
                <button
                  onClick={() => void muteParticipant(p.identity)}
                  disabled={mutingId === p.identity || p.isMuted}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-500 hover:bg-red-900/50 hover:text-red-300 transition disabled:opacity-40"
                  title={p.isMuted ? 'Already muted' : `Mute ${p.displayName}`}
                >
                  {mutingId === p.identity ? '…' : 'Mute'}
                </button>
              )}
            </div>
          ))}

          {participants.length === 0 && (
            <p className="text-[10px] text-slate-600 px-1">No other participants yet.</p>
          )}
        </div>
      )}

      {room && <RoomAudioRenderer room={room} />}
    </div>
  )
}
