'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PartyCard, type PartyCardData } from './PartyCard'
import { XpAwardPanel } from './XpAwardPanel'
import { GmNotesPanel } from './GmNotesPanel'
import { PrivateRollsPanel, type PrivateRollPlayer } from './PrivateRollsPanel'
import { RecordingsPanel } from './RecordingsPanel'
import type { ConditionKey } from '@/lib/conditions'

// ──────────────────────────────────────────────────────────────────────────────
// DM Dashboard — full-screen tab opened from TableTopBar (GM-only).
// Mirrors the spell-dashboard pattern:
//   • Header strip (session title + Live indicator + back-to-table link)
//   • Left sidebar — Party cards (auto-refresh via 3 realtime channels)
//   • Center — tab switcher (Wave 2 brings XP + Notes; Wave 4 brings Private Rolls)
//
// Wave 1 ships the party cards. Center panel is a placeholder until Wave 2.
// ──────────────────────────────────────────────────────────────────────────────

type SessionRow = {
  title: string | null
  gm_wallet: string | null
  status: string | null
  session_type: 'set_level' | 'caya' | null
  xp_awarded: number | null
}

type SessionPlayerRow = {
  wallet_address: string
  character_id: string | null
  characters: {
    id: string
    name: string | null
    avatar_url: string | null
    level: number | null
    main_job: string | null
    secondary_class: string | null
    secondary_level: number | null
    hit_points_max: number | null
    hit_points_current: number | null
    temp_hp: number | null
    ac: number | null
    action_state: Record<string, any> | null
  } | null
}

type TokenRow = {
  character_id: string | null
  current_hp: number | null
  hp: number | null
  ac: number | null
}

type DashboardTab = 'notes' | 'xp' | 'private-rolls' | 'recordings'

function formatClassLabel(
  mainJob: string | null,
  level: number,
  secondaryClass: string | null,
  secondaryLevel: number | null,
) {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  const main = mainJob ? `${cap(mainJob)} ${level}` : '—'
  if (secondaryClass && secondaryLevel && secondaryLevel > 0) {
    return `${main} / ${cap(secondaryClass)} ${secondaryLevel}`
  }
  return main
}

export function DmDashboard({ sessionId }: { sessionId: string }) {
  const wallet = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('dnd721_wallet')?.toLowerCase() ?? null
  }, [])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGm, setIsGm] = useState(false)
  const [sessionTitle, setSessionTitle] = useState('Session')
  const [sessionStatus, setSessionStatus] = useState<string | null>(null)
  const [sessionType, setSessionType] = useState<'set_level' | 'caya' | null>(null)
  const [xpAwardedAlready, setXpAwardedAlready] = useState<number | null>(null)
  const [encounterId, setEncounterId] = useState<string | null>(null)
  const [players, setPlayers] = useState<SessionPlayerRow[]>([])
  const [tokensByChar, setTokensByChar] = useState<Record<string, TokenRow>>({})
  const [activeTab, setActiveTab] = useState<DashboardTab>('notes')
  const [liveDot, setLiveDot] = useState(false)

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wallet) { setLoading(false); setError('Connect your wallet to use the DM dashboard.'); return }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, wallet])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Session + GM gate
      const { data: session, error: sessErr } = await supabase
        .from('sessions')
        .select('title, gm_wallet, status, session_type, xp_awarded')
        .eq('id', sessionId)
        .maybeSingle<SessionRow>()
      if (sessErr) throw sessErr
      if (!session) { setError('Session not found.'); setLoading(false); return }
      setSessionTitle(session.title ?? 'Session')
      setSessionStatus(session.status ?? null)
      setSessionType(session.session_type ?? null)
      setXpAwardedAlready(session.xp_awarded ?? null)
      const gm = (session.gm_wallet ?? '').toLowerCase() === wallet
      setIsGm(gm)
      if (!gm) { setLoading(false); return }

      // Active encounter (tokens live here during combat)
      const { data: enc } = await supabase
        .from('encounters')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1)
        .maybeSingle()
      const eid = (enc as any)?.id ?? null
      setEncounterId(eid)

      // Player roster
      await reloadPlayers()

      // Live tokens by character (if there's an encounter)
      if (eid) await reloadTokens(eid)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load DM dashboard')
    } finally {
      setLoading(false)
    }
  }, [sessionId, wallet])

  const reloadPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('session_players')
      .select(`
        wallet_address,
        character_id,
        characters (
          id, name, avatar_url, level, main_job, secondary_class, secondary_level,
          hit_points_max, hit_points_current, temp_hp, ac, action_state
        )
      `)
      .eq('session_id', sessionId)
      .eq('role', 'player')
    setPlayers((data ?? []) as unknown as SessionPlayerRow[])
  }, [sessionId])

  const reloadTokens = useCallback(async (eid: string) => {
    const { data } = await supabase
      .from('tokens')
      .select('character_id, current_hp, hp, ac')
      .eq('encounter_id', eid)
      .eq('type', 'pc')
    const next: Record<string, TokenRow> = {}
    for (const t of (data ?? []) as TokenRow[]) {
      if (t.character_id) next[t.character_id] = t
    }
    setTokensByChar(next)
  }, [])

  // ── Realtime: session_players (join/leave) ──────────────────────────────────
  useEffect(() => {
    if (!isGm) return
    const ch = supabase
      .channel(`dm-dash-players-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_players', filter: `session_id=eq.${sessionId}` },
        () => { void reloadPlayers() },
      )
      .subscribe((status) => { if (status === 'SUBSCRIBED') setLiveDot(true) })
    return () => { supabase.removeChannel(ch); setLiveDot(false) }
  }, [isGm, sessionId, reloadPlayers])

  // ── Realtime: tokens (live combat HP) ───────────────────────────────────────
  useEffect(() => {
    if (!isGm || !encounterId) return
    const ch = supabase
      .channel(`dm-dash-tokens-${encounterId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tokens', filter: `encounter_id=eq.${encounterId}` },
        (payload: any) => {
          const row = payload.new as TokenRow & { type?: string }
          if (row?.type && row.type !== 'pc') return
          if (!row?.character_id) return
          setTokensByChar((prev) => ({ ...prev, [row.character_id!]: row }))
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [isGm, encounterId])

  // ── Realtime: characters (conditions, out-of-combat HP) ────────────────────
  // Supabase only allows one filter clause; we listen broadly and filter
  // client-side to the IDs we know about.
  const characterIds = useMemo(() => {
    return players.map((p) => p.characters?.id).filter(Boolean) as string[]
  }, [players])

  useEffect(() => {
    if (!isGm || characterIds.length === 0) return
    const idSet = new Set(characterIds)
    const ch = supabase
      .channel(`dm-dash-chars-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'characters' },
        (payload: any) => {
          const r = payload.new
          if (!idSet.has(r?.id)) return
          setPlayers((prev) => prev.map((p) => {
            const ch = p.characters
            if (!ch || ch.id !== r.id) return p
            const nextCharacters: SessionPlayerRow['characters'] = {
              ...ch,
              hit_points_max: r.hit_points_max ?? ch.hit_points_max,
              hit_points_current: r.hit_points_current ?? ch.hit_points_current,
              temp_hp: r.temp_hp ?? ch.temp_hp,
              ac: r.ac ?? ch.ac,
              action_state: r.action_state ?? ch.action_state,
              name: r.name ?? ch.name,
              avatar_url: r.avatar_url ?? ch.avatar_url,
            }
            return { ...p, characters: nextCharacters }
          }))
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
    // Audit Wave 3D: depend on the stable joined key, not the array
    // reference. characterIds is a fresh array on every `players` update
    // (it's a new useMemo result), which would tear down and rebuild the
    // channel even when the membership is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGm, sessionId, characterIds.join(',')])

  // ── Card data builder + write handlers ─────────────────────────────────────
  const cards: PartyCardData[] = useMemo(() => {
    return players
      .filter((p) => !!p.characters)
      .map((p) => {
        const c = p.characters!
        const tok = tokensByChar[c.id]
        const liveHp = tok?.current_hp ?? c.hit_points_current ?? c.hit_points_max ?? 0
        const liveMax = tok?.hp ?? c.hit_points_max ?? 0
        const liveAc = tok?.ac ?? c.ac ?? 10
        const actions = (c.action_state ?? {}) as Record<string, any>
        const conds = Array.isArray(actions.active_conditions) ? (actions.active_conditions as string[]) : []
        return {
          characterId: c.id,
          name: c.name ?? 'Unnamed',
          avatarUrl: c.avatar_url ?? null,
          className: formatClassLabel(c.main_job, c.level ?? 1, c.secondary_class, c.secondary_level),
          level: (c.level ?? 1) + (c.secondary_level ?? 0),
          hpCurrent: Math.max(0, liveHp),
          hpMax: Math.max(0, liveMax),
          tempHp: Number(c.temp_hp ?? 0),
          ac: liveAc,
          conditions: conds,
          concentratingOn: typeof actions.concentrating_on === 'string' ? actions.concentrating_on : null,
          hasLiveToken: !!tok,
        }
      })
  }, [players, tokensByChar])

  // Dual-write HP: tokens.current_hp + characters.hit_points_current (mirrors
  // the MapBoard TokenHUD pattern so the table view stays in sync).
  const writeHp = useCallback(async (characterId: string, nextHpRaw: number) => {
    const card = cards.find((c) => c.characterId === characterId)
    if (!card) return
    const nextHp = Math.max(0, Math.min(card.hpMax || nextHpRaw, nextHpRaw))
    // Optimistic local update
    setPlayers((prev) => prev.map((p) => {
      const ch = p.characters
      if (!ch || ch.id !== characterId) return p
      return { ...p, characters: { ...ch, hit_points_current: nextHp } }
    }))
    if (card.hasLiveToken && encounterId) {
      setTokensByChar((prev) => ({
        ...prev,
        [characterId]: { ...(prev[characterId] ?? { character_id: characterId, hp: card.hpMax, ac: card.ac }), current_hp: nextHp },
      }))
      await supabase.from('tokens').update({ current_hp: nextHp })
        .eq('character_id', characterId)
        .eq('encounter_id', encounterId)
    }
    await supabase.from('characters').update({ hit_points_current: nextHp }).eq('id', characterId)
  }, [cards, encounterId])

  const adjustHp = useCallback((characterId: string, delta: number) => {
    const card = cards.find((c) => c.characterId === characterId)
    if (!card) return Promise.resolve()
    return writeHp(characterId, card.hpCurrent + delta)
  }, [cards, writeHp])

  const setHp = useCallback((characterId: string, next: number) => writeHp(characterId, next), [writeHp])

  // Conditions: read-modify-write on characters.action_state JSONB.
  const mutateConditions = useCallback(async (characterId: string, mutator: (set: Set<string>) => void) => {
    const player = players.find((p) => p.characters?.id === characterId)
    if (!player?.characters) return
    const current = Array.isArray(player.characters.action_state?.active_conditions)
      ? (player.characters.action_state!.active_conditions as string[])
      : []
    const set = new Set(current.map((c) => String(c).toLowerCase()))
    mutator(set)
    const nextArr = Array.from(set)
    const nextActionState = { ...(player.characters.action_state ?? {}), active_conditions: nextArr }
    // Optimistic
    setPlayers((prev) => prev.map((p) => {
      const ch = p.characters
      if (!ch || ch.id !== characterId) return p
      return { ...p, characters: { ...ch, action_state: nextActionState } }
    }))
    await supabase.from('characters').update({ action_state: nextActionState }).eq('id', characterId)
  }, [players])

  const addCondition    = useCallback((characterId: string, k: ConditionKey) => mutateConditions(characterId, (s) => s.add(k)),    [mutateConditions])
  const removeCondition = useCallback((characterId: string, k: string)       => mutateConditions(characterId, (s) => s.delete(k.toLowerCase())), [mutateConditions])

  // ── Render ──────────────────────────────────────────────────────────────────
  if (!wallet) {
    return <div className="min-h-screen p-6 text-amber-300">Connect your wallet to use the DM dashboard.</div>
  }
  if (loading) {
    return <div className="min-h-screen p-6 text-slate-300">Loading DM dashboard…</div>
  }
  if (error) {
    return <div className="min-h-screen p-6 text-red-300">{error}</div>
  }
  if (!isGm) {
    return (
      <div className="min-h-screen p-6">
        <div className="mx-auto max-w-md rounded-xl border border-red-900/60 bg-red-950/40 p-6 text-red-200">
          <h1 className="text-lg font-bold">DM Dashboard — restricted</h1>
          <p className="mt-2 text-sm">Only the session GM can open this dashboard.</p>
          <a
            href={`/sessions/${sessionId}/table`}
            className="mt-4 inline-block rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
          >
            ← Back to table
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">🎲 DM Dashboard</h1>
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">{sessionTitle}</span>
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${liveDot ? 'bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-700/40' : 'bg-slate-800 text-slate-400'}`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${liveDot ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {liveDot ? 'Live' : 'Offline'}
          </span>
        </div>
        <a
          href={`/sessions/${sessionId}/table`}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
        >
          ← Back to table
        </a>
      </header>

      {/* Body */}
      <div className="grid gap-4 p-4 lg:grid-cols-[320px,1fr]">
        {/* Left sidebar — party cards */}
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">Party</h2>
            <span className="text-[10px] text-slate-500">{cards.length} player{cards.length === 1 ? '' : 's'}</span>
          </div>
          {cards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">
              No players have joined this session yet.
            </div>
          ) : (
            cards.map((card) => (
              <PartyCard
                key={card.characterId}
                data={card}
                onAdjustHp={(delta) => adjustHp(card.characterId, delta)}
                onSetHp={(next) => setHp(card.characterId, next)}
                onAddCondition={(k) => addCondition(card.characterId, k)}
                onRemoveCondition={(k) => removeCondition(card.characterId, k)}
              />
            ))
          )}
        </aside>

        {/* Center panel — tab switcher (Waves 2 + 4) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <nav className="mb-3 flex gap-2">
            {(['notes', 'xp', 'private-rolls', 'recordings'] as DashboardTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === t
                    ? 'bg-indigo-600/30 text-indigo-100 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-900'
                }`}
              >
                {t === 'notes'
                  ? '📝 Notes'
                  : t === 'xp'
                    ? '✨ XP Award'
                    : t === 'private-rolls'
                      ? '🎲 Private Rolls'
                      : '🎙️ Recordings'}
              </button>
            ))}
          </nav>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-6">
            {activeTab === 'notes' && (
              <GmNotesPanel sessionId={sessionId} />
            )}
            {activeTab === 'xp' && (
              <XpAwardPanel
                sessionId={sessionId}
                gmWallet={wallet}
                sessionStatus={sessionStatus}
                sessionType={sessionType}
                xpAwardedAlready={xpAwardedAlready}
              />
            )}
            {activeTab === 'private-rolls' && (
              <PrivateRollsPanel
                players={cards.map<PrivateRollPlayer>((c) => ({
                  characterId: c.characterId,
                  name: c.name,
                  level: c.level,
                }))}
              />
            )}
            {activeTab === 'recordings' && (
              <RecordingsPanel sessionId={sessionId} />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
