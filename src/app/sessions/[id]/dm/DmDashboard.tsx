'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setConditions } from '@/lib/conditionsSync'
import { PartyCard, type PartyCardData } from './PartyCard'
import { XpAwardPanel } from './XpAwardPanel'
import { GmNotesPanel } from './GmNotesPanel'
import { PrivateRollsPanel, type PrivateRollPlayer } from './PrivateRollsPanel'
import { RecordingsPanel } from './RecordingsPanel'
import { PartySlotsPanel } from '@/components/spells/PartySlotsPanel'
import InitiativeTracker from '@/components/table/InitiativeTracker'
import { BattleConsole } from './BattleConsole'
import { useSessionRolls } from '@/components/table/tableclient/hooks/useSessionRolls'
import type { SessionStatus } from '@/lib/sessionGates'
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
  // Column is `xp_award` (no trailing -ed) per the schema; matched against
  // src/app/api/sessions/award-xp/route.ts. Earlier typo caused
  // "column sessions.xp_awarded does not exist" and 500'd the whole dashboard.
  xp_award: number | null
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
  id?: string | null
  character_id: string | null
  current_hp: number | null
  hp: number | null
  ac: number | null
}

type DashboardTab = 'battle' | 'notes' | 'xp' | 'private-rolls' | 'recordings' | 'party-slots'

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

  // Dice log (Battle tab) — realtime feed of session_rolls.
  const { diceLog } = useSessionRolls({ sessionId, hasMounted: true })

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
        .select('title, gm_wallet, status, session_type, xp_award')
        .eq('id', sessionId)
        .maybeSingle<SessionRow>()
      if (sessErr) throw sessErr
      if (!session) { setError('Session not found.'); setLoading(false); return }
      setSessionTitle(session.title ?? 'Session')
      setSessionStatus(session.status ?? null)
      setSessionType(session.session_type ?? null)
      setXpAwardedAlready(session.xp_award ?? null)
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
      .select('id, character_id, current_hp, hp, ac')
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
              // Level-up fields — without these the class/level label on the
              // party card stays stale after a player levels up.
              level: r.level ?? ch.level,
              main_job: r.main_job ?? ch.main_job,
              secondary_class: r.secondary_class ?? ch.secondary_class,
              secondary_level: r.secondary_level ?? ch.secondary_level,
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
        const ds = actions.death_saves
        const deathSaves = ds && typeof ds === 'object'
          ? { s: Number(ds.s ?? 0), f: Number(ds.f ?? 0) }
          : null
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
          deathSaves,
          hasLiveToken: !!tok,
        }
      })
  }, [players, tokensByChar])

  // Write HP. When the PC has a live combat token we go through the canonical
  // apply_combat_damage RPC (keeps tokens + characters.hit_points_current +
  // the initiative entry in sync). Out of combat (no token) we write the
  // character row directly.
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
    const tok = tokensByChar[characterId]
    if (card.hasLiveToken && tok?.id) {
      setTokensByChar((prev) => ({
        ...prev,
        [characterId]: { ...(prev[characterId] ?? { id: tok.id, character_id: characterId, hp: card.hpMax, ac: card.ac }), current_hp: nextHp },
      }))
      // p_amount is damage (positive); a heal is a negative amount.
      const delta = nextHp - card.hpCurrent
      const { error } = await supabase.rpc('apply_combat_damage', { p_token_id: tok.id, p_amount: -delta })
      if (!error) return
      console.error('[DmDashboard] apply_combat_damage failed, falling back', error)
    }
    await supabase.from('characters').update({ hit_points_current: nextHp }).eq('id', characterId)
  }, [cards, tokensByChar])

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
    // Persist via the SECURITY DEFINER RPC: a direct characters.update is
    // blocked by owner-only RLS (the GM isn't the PC's owner), and it also
    // mirrors to the token so map rings/pips stay in sync.
    await setConditions(supabase, { characterId, conditions: nextArr })
  }, [players])

  const addCondition    = useCallback((characterId: string, k: ConditionKey) => mutateConditions(characterId, (s) => s.add(k)),    [mutateConditions])
  const removeCondition = useCallback((characterId: string, k: string)       => mutateConditions(characterId, (s) => s.delete(k.toLowerCase())), [mutateConditions])

  // Death saves: read-modify-write characters.action_state.death_saves {s,f}
  // (the same store the player's own character sheet uses), clamped 0–3.
  const adjustDeathSave = useCallback(async (characterId: string, kind: 's' | 'f', delta: number) => {
    const player = players.find((p) => p.characters?.id === characterId)
    if (!player?.characters) return
    const actionState = (player.characters.action_state ?? {}) as Record<string, any>
    const cur = (actionState.death_saves ?? { s: 0, f: 0 }) as { s: number; f: number }
    const next = {
      s: kind === 's' ? Math.max(0, Math.min(3, (cur.s ?? 0) + delta)) : (cur.s ?? 0),
      f: kind === 'f' ? Math.max(0, Math.min(3, (cur.f ?? 0) + delta)) : (cur.f ?? 0),
    }
    const nextActionState = { ...actionState, death_saves: next }
    setPlayers((prev) => prev.map((p) => {
      const ch = p.characters
      if (!ch || ch.id !== characterId) return p
      return { ...p, characters: { ...ch, action_state: nextActionState } }
    }))
    await supabase.from('characters').update({ action_state: nextActionState }).eq('id', characterId)
  }, [players])

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
                onAdjustDeathSave={(kind, delta) => adjustDeathSave(card.characterId, kind, delta)}
              />
            ))
          )}
        </aside>

        {/* Center panel — tab switcher (Waves 2 + 4) */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <nav className="mb-3 flex flex-wrap gap-2">
            {(['battle', 'notes', 'xp', 'private-rolls', 'recordings', 'party-slots'] as DashboardTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === t
                    ? 'bg-indigo-600/30 text-indigo-100 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-900'
                }`}
              >
                {t === 'battle'
                  ? '⚔ Battle'
                  : t === 'notes'
                    ? '📝 Notes'
                    : t === 'xp'
                      ? '✨ XP Award'
                      : t === 'private-rolls'
                        ? '🎲 Private Rolls'
                        : t === 'recordings'
                          ? '🎙️ Recordings'
                          : '✦ Party Slots'}
              </button>
            ))}
          </nav>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-6">
            {activeTab === 'battle' && (
              <div className="grid gap-3 lg:grid-cols-3">
                {/* Combat order */}
                <div className="min-w-0 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                  <InitiativeTracker
                    encounterId={encounterId}
                    sessionId={sessionId}
                    currentMapId={null}
                    sessionStatus={(sessionStatus ?? null) as SessionStatus | null}
                  />
                </div>
                {/* Active monster's turn */}
                <div className="min-w-0 overflow-y-auto">
                  <BattleConsole sessionId={sessionId} encounterId={encounterId} gmWallet={wallet} />
                </div>
                {/* Dice log */}
                <div className="min-w-0 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/50 p-2">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">🎲 Dice Log</p>
                  {diceLog.length === 0 ? (
                    <p className="px-1 py-3 text-center text-[11px] text-slate-500">No rolls yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {diceLog.map((d) => (
                        <li key={d.id} className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-1 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-slate-200">{d.label || d.formula}</span>
                            <span className="shrink-0 font-bold text-amber-300">{d.result}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                            <span className="truncate">{d.roller}{d.formula ? ` · ${d.formula}` : ''}</span>
                            {d.outcome && <span className="shrink-0 text-slate-400">{d.outcome}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
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
            {activeTab === 'party-slots' && (
              <PartySlotsPanel sessionId={sessionId} />
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
