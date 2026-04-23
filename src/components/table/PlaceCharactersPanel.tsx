'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CharRow = {
  id: string
  name: string
  main_job: string | null
  level: number | null
  hit_points_max: number | null
  hp: number | null
  ac: number | null
  speed: number | null
  avatar_url: string | null
}

type SessionPlayerRow = {
  wallet_address: string
  character_id: string | null
  characters: CharRow | null
}

type PlacedToken = {
  id: string
  owner_wallet: string | null
  character_id: string | null
}

export function PlaceCharactersPanel({
  sessionId,
  encounterId,
}: {
  sessionId: string
  encounterId: string
}) {
  const [players, setPlayers]           = useState<SessionPlayerRow[]>([])
  const [placedTokens, setPlacedTokens] = useState<PlacedToken[]>([])
  const [loading, setLoading]           = useState(true)

  // Load session players + their characters
  // Re-used both for initial load and realtime updates.
  const loadPlayers = () =>
    supabase
      .from('session_players')
      .select('wallet_address, character_id, characters(id, name, main_job, level, hit_points_max, hp, ac, speed, avatar_url)')
      .eq('session_id', sessionId)
      .eq('role', 'player')
      .then(({ data, error }) => {
        if (error) {
          console.error('PlaceCharactersPanel: failed to load session_players:', error)
        }
        setPlayers((data ?? []) as any)
        setLoading(false)
      })

  useEffect(() => {
    loadPlayers()

    // Realtime: update the player list whenever session_players changes
    // (player joins, selects character, or leaves).
    const ch = supabase
      .channel(`place-chars-players-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_players', filter: `session_id=eq.${sessionId}` },
        () => { void loadPlayers() }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // Load existing PC tokens + subscribe to changes
  useEffect(() => {
    const loadTokens = () =>
      supabase
        .from('tokens')
        .select('id, owner_wallet, character_id')
        .eq('encounter_id', encounterId)
        .eq('type', 'pc')
        .then(({ data, error }) => {
          if (error) {
            console.error('PlaceCharactersPanel: failed to load tokens:', error)
          }
          setPlacedTokens((data ?? []) as any)
        })

    loadTokens()

    const ch = supabase
      .channel(`place-chars-tokens-${encounterId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens', filter: `encounter_id=eq.${encounterId}` },
        () => { void loadTokens() }
      )
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [encounterId])

  function handlePlace(player: SessionPlayerRow) {
    const char = player.characters
    if (!char) return

    window.dispatchEvent(
      new CustomEvent('dnd721-place-token', {
        detail: {
          label:             char.name,
          hp:                char.hit_points_max ?? char.hp ?? null,
          ac:                char.ac             ?? null,
          ownerWallet:       player.wallet_address,
          initiativeEntryId: '',
          characterId:       char.id,
          tokenImageUrl:     char.avatar_url     ?? null,
        },
      })
    )
  }

  async function handleRemove(wallet: string) {
    const tok = placedTokens.find(
      (t) => t.owner_wallet?.toLowerCase() === wallet.toLowerCase()
    )
    if (!tok) return
    const { error } = await supabase.from('tokens').delete().eq('id', tok.id)
    if (error) console.error('PlaceCharactersPanel: failed to remove token:', error)
  }

  if (loading) {
    return <div className="py-2 text-center text-[10px] text-slate-500">Loading players…</div>
  }

  if (players.length === 0) {
    return (
      <div className="rounded-md bg-slate-900/60 px-2 py-3 text-center text-[10px] text-slate-500">
        No players have joined this session yet.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {players.map((p) => {
        const char = p.characters
        const isPlaced = placedTokens.some(
          (t) => t.owner_wallet?.toLowerCase() === p.wallet_address.toLowerCase()
        )

        return (
          <div
            key={p.wallet_address}
            className={`rounded-lg border p-2 ${
              isPlaced
                ? 'border-emerald-800/50 bg-emerald-950/20'
                : 'border-slate-800/50 bg-slate-900/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                {char?.avatar_url ? (
                  <img
                    src={char.avatar_url}
                    alt={char.name}
                    className="h-7 w-7 shrink-0 rounded-full object-cover border border-slate-700"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[11px] text-slate-400">
                    {char?.name?.slice(0, 1).toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="min-w-0">
                  {char ? (
                    <>
                      <div className="text-[11px] font-semibold text-slate-100 truncate">{char.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Lv.{char.level ?? '?'} {char.main_job ?? '—'} · HP {char.hit_points_max ?? char.hp ?? '?'} · AC {char.ac ?? '?'}
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-slate-500">No character selected</div>
                  )}
                  <div className="text-[9px] text-slate-600">
                    {p.wallet_address.slice(0, 6)}…{p.wallet_address.slice(-4)}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {isPlaced ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded bg-emerald-900/40 border border-emerald-800/50 px-2 py-0.5 text-[10px] text-emerald-300">
                      ✓ Placed
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(p.wallet_address)}
                      className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!char}
                    onClick={() => handlePlace(p)}
                    className="rounded-md border border-sky-700/50 bg-sky-700/20 px-2.5 py-1 text-[10px] font-semibold text-sky-300 hover:bg-sky-700/40 disabled:opacity-40"
                  >
                    📍 Place
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
