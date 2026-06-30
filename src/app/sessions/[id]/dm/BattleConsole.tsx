'use client'

// src/app/sessions/[id]/dm/BattleConsole.tsx
// Monster-turn panel for the DM Dashboard's Battle tab. Watches the encounter's
// active initiative entry over realtime; when the active combatant is a monster,
// resolves its token + stat block and renders the MonsterStatPanel (which has its
// own target picker + Roll Attack/Damage that auto-applies via apply_combat_damage).
// Entirely realtime/DB-driven, so it works in the separate dashboard window.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MonsterStatPanel } from '@/components/table/MonsterStatPanel'
import { resolveMonsterStatblock, tokenIsMonster } from '@/lib/monsterStatblock'
import { setConditions } from '@/lib/conditionsSync'

export function BattleConsole({
  sessionId,
  encounterId,
  gmWallet,
}: {
  sessionId: string
  encounterId: string | null
  gmWallet?: string | null
}) {
  const [token, setToken] = useState<any | null>(null)
  const [monster, setMonster] = useState<any | null>(null)
  const [conditions, setConds] = useState<string[]>([])
  const [activeName, setActiveName] = useState<string | null>(null)
  const [isPcTurn, setIsPcTurn] = useState(false)

  useEffect(() => {
    if (!encounterId) return
    let mounted = true

    async function resolve(activeEntryId: string | null) {
      const clear = (name: string | null, pcTurn: boolean) => {
        if (!mounted) return
        setToken(null); setMonster(null); setConds([]); setActiveName(name); setIsPcTurn(pcTurn)
      }
      if (!activeEntryId) { clear(null, false); return }

      const { data: entry } = await supabase
        .from('initiative_entries')
        .select('name, token_id, is_pc')
        .eq('id', activeEntryId)
        .maybeSingle()
      if (!mounted) return
      const name = (entry as any)?.name ?? null
      const tokenId = (entry as any)?.token_id ?? null
      if (!tokenId) { clear(name, Boolean((entry as any)?.is_pc)); return }

      const { data: tok } = await supabase.from('tokens').select('*').eq('id', tokenId).maybeSingle()
      if (!mounted) return
      if (!tokenIsMonster(tok)) { clear(name, true); return }

      setToken(tok)
      setConds(Array.isArray((tok as any).conditions) ? (tok as any).conditions : [])
      setActiveName(name)
      setIsPcTurn(false)
      const sb = await resolveMonsterStatblock(tok as any)
      if (mounted) setMonster(sb)
    }

    async function seed() {
      const { data } = await supabase
        .from('encounters')
        .select('active_entry_id')
        .eq('id', encounterId!)
        .maybeSingle()
      await resolve((data as any)?.active_entry_id ?? null)
    }
    void seed()

    const channel = supabase
      .channel(`battle-console-${encounterId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'encounters', filter: `id=eq.${encounterId}` },
        (payload) => { void resolve((payload as any).new?.active_entry_id ?? null) },
      )
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [encounterId])

  const onToggleCondition = useCallback(async (cond: string) => {
    if (!token?.id) return
    const next = conditions.includes(cond) ? conditions.filter((c) => c !== cond) : [...conditions, cond]
    setConds(next)
    const { ok } = await setConditions(supabase, { tokenId: token.id, conditions: next })
    if (!ok) setConds(conditions) // roll back
  }, [token?.id, conditions])

  // Log monster rolls to session_rolls so the dice log + table update via realtime.
  const onRoll = useCallback((r: { label: string; formula: string; result: number; outcome?: string | null }) => {
    void supabase.from('session_rolls').insert({
      session_id: sessionId,
      roll_type: 'custom',
      label: r.label,
      formula: r.formula,
      result_total: r.result,
      roller_name: activeName ?? 'Monster',
      roller_wallet: gmWallet ?? null,
      outcome: r.outcome ?? null,
    })
  }, [sessionId, activeName, gmWallet])

  if (!encounterId) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-center text-xs text-slate-500">
        No encounter yet.
      </div>
    )
  }

  if (monster && token) {
    return (
      <MonsterStatPanel
        token={token}
        monster={monster}
        conditions={conditions}
        onToggleCondition={onToggleCondition}
        onClose={() => { setToken(null); setMonster(null) }}
        onRoll={onRoll as any}
      />
    )
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
      {isPcTurn && activeName ? (
        <>It’s <span className="font-semibold text-slate-300">{activeName}</span>’s turn (player character).</>
      ) : activeName ? (
        <>Active: <span className="font-semibold text-slate-300">{activeName}</span> — no monster stat block linked.</>
      ) : (
        'Start combat in the order to the left. On a monster’s turn, its stat block and actions appear here.'
      )}
    </div>
  )
}
