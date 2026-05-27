'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SRD_SPELLS, type SrdSpell } from '@/lib/srdspells'
import {
  buildSlotData,
  expendSlot,
  restoreSlot,
  initializeSpellSlots,
  type SpellSlotData,
} from '@/lib/spellSlots'
import {
  categorizeSpell,
  scaleDamageForSlot,
  scaleHealForSlot,
  getHealDice,
  isSpellcaster,
  getSpellcastingAbility,
  profBonus,
  abilityModifier,
} from '@/lib/spellCategories'

// ── Types ──────────────────────────────────────────────────────────────────────

type CharRow = {
  id: string
  name: string
  level: number
  main_job: string | null
  abilities: Record<string, number> | null
  spell_slots: Record<string, number> | null
  resource_state: Record<string, any> | null
  spells_prepared: string[] | null
  spell_save_dc: number | null
  spell_attack_bonus: number | null
  hit_points_current: number | null
  hit_points_max: number | null
  wallet_address: string
}

type Token = {
  id: string
  label: string
  type: string
  hp: number | null
  current_hp: number | null
  ac: number | null
  owner_wallet: string | null
}

type PendingRoll = {
  spellName: string
  result: number
  notation: string
  type: 'damage' | 'heal'
  targetTokenId: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtMod(n: number) {
  return n >= 0 ? `+${n}` : `${n}`
}

function hpPct(token: Token): number {
  const max = token.hp ?? 1
  const cur = token.current_hp ?? max
  return Math.round(Math.max(0, Math.min(100, (cur / max) * 100)))
}

function hpColor(pct: number) {
  if (pct >= 60) return 'bg-emerald-500'
  if (pct >= 30) return 'bg-amber-500'
  return 'bg-red-500'
}

// ── Spell-slot pip row ─────────────────────────────────────────────────────────

function SlotRow({
  level,
  data,
  onSpend,
  onRestore,
}: {
  level: string
  data: { max: number; used: number }
  onSpend: (level: string) => void
  onRestore: (level: string) => void
}) {
  const available = data.max - data.used
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 shrink-0 text-[10px] text-slate-500">L{level}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: data.max }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-full border transition-colors ${
              i < available
                ? 'border-violet-400/60 bg-violet-500/60'
                : 'border-slate-700 bg-slate-900'
            }`}
          />
        ))}
      </div>
      <span className="ml-auto text-[10px] tabular-nums text-slate-400">
        {available}/{data.max}
      </span>
      <button
        type="button"
        onClick={() => onSpend(level)}
        disabled={available === 0}
        className="rounded px-1 py-0.5 text-[9px] text-violet-300 bg-violet-900/30 hover:bg-violet-900/50 disabled:opacity-30 transition"
        title="Use slot"
      >
        Use
      </button>
      <button
        type="button"
        onClick={() => onRestore(level)}
        disabled={data.used === 0}
        className="rounded px-1 py-0.5 text-[9px] text-slate-400 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition"
        title="Restore slot"
      >
        +
      </button>
    </div>
  )
}

// ── Party health panel ─────────────────────────────────────────────────────────

function PartyHealthPanel({ tokens }: { tokens: Token[] }) {
  if (tokens.length === 0) return null
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Party HP
      </div>
      <div className="space-y-1.5">
        {tokens.map(t => {
          const pct = hpPct(t)
          const cur = t.current_hp ?? t.hp ?? 0
          const max = t.hp ?? cur
          return (
            <div key={t.id}>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span className="truncate max-w-[100px]">{t.label}</span>
                <span className="tabular-nums">{cur}/{max}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800">
                <div
                  className={`h-1.5 rounded-full transition-all ${hpColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── DM view: all casters' slots ────────────────────────────────────────────────

function AllCastersSlots({ sessionId }: { sessionId: string }) {
  const [casters, setCasters] = useState<CharRow[]>([])

  useEffect(() => {
    async function load() {
      const { data: links } = await supabase
        .from('session_characters')
        .select('character_id')
        .eq('session_id', sessionId)

      if (!links?.length) return

      const ids = links.map((l: any) => l.character_id).filter(Boolean)
      const { data: chars } = await supabase
        .from('characters')
        .select('id, name, level, main_job, spell_slots, resource_state')
        .in('id', ids)

      const casterList = (chars ?? []).filter(
        (c: any) => isSpellcaster(c.main_job) && c.spell_slots,
      )
      setCasters(casterList as CharRow[])
    }
    load()
  }, [sessionId])

  if (casters.length === 0) return null

  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Party Slots (DM)
      </div>
      {casters.map(char => {
        const slots = buildSlotData(char.spell_slots, char.resource_state)
        return (
          <div key={char.id} className="mb-3">
            <div className="text-[10px] text-slate-400 mb-1 truncate">
              {char.name} · {char.main_job} {char.level}
            </div>
            <div className="space-y-0.5">
              {Object.entries(slots).map(([lvl, data]) => (
                <div key={lvl} className="flex items-center gap-1">
                  <span className="w-4 text-[9px] text-slate-600">L{lvl}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: data.max }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          i < data.max - data.used
                            ? 'bg-violet-500'
                            : 'bg-slate-800 border border-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Combat spell card ──────────────────────────────────────────────────────────

function CombatSpellCard({
  spell,
  slots,
  targets,
  spellAttackBonus,
  spellSaveDC,
  charLevel,
  onRoll,
  pending,
  onApply,
  onClearPending,
}: {
  spell: SrdSpell
  slots: SpellSlotData
  targets: Token[]
  spellAttackBonus: number
  spellSaveDC: number
  charLevel: number
  onRoll: (spell: SrdSpell, slotLevel: number, targetId: string, rollType: 'attack' | 'save' | 'damage') => void
  pending: PendingRoll | null
  onApply: () => void
  onClearPending: () => void
}) {
  const isCantrip = spell.level === 0
  const [selectedTarget, setSelectedTarget] = useState(targets[0]?.id ?? '')
  const [selectedSlot, setSelectedSlot] = useState(spell.level)

  const slotsAtLevel = slots[String(selectedSlot)]
  const hasSlots = isCantrip || (slotsAtLevel ? slotsAtLevel.used < slotsAtLevel.max : false)

  const scaledDmg = isCantrip
    ? (spell.damage ?? '1d6')
    : scaleDamageForSlot(spell, selectedSlot)

  const isConc = spell.duration.toLowerCase().includes('concentration')
  const isBonusAction = spell.castingTime.toLowerCase().includes('bonus')
  const isRitual = spell.castingTime.toLowerCase().includes('ritual')
  const hasSave = !!spell.saveAbility
  const hasAtk = !!spell.attackRoll

  // Update default target when targets list changes
  useEffect(() => {
    if (targets.length > 0 && !targets.find(t => t.id === selectedTarget)) {
      setSelectedTarget(targets[0].id)
    }
  }, [targets, selectedTarget])

  return (
    <div
      className={`rounded-lg border p-3 transition-opacity ${
        !hasSlots && !isCantrip
          ? 'opacity-40 border-slate-800 bg-slate-900/30'
          : 'border-slate-700 bg-slate-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center flex-wrap gap-1 min-w-0">
          <span className="text-sm font-semibold text-slate-100 truncate">{spell.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCantrip ? 'bg-slate-800 text-slate-400' : 'bg-blue-950/60 text-blue-400'}`}>
            {isCantrip ? 'Cantrip' : `L${spell.level}`}
          </span>
          {isBonusAction && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400">BA</span>}
          {isConc && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400">Conc.</span>}
          {isRitual && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Ritual</span>}
        </div>

        {/* Upcast selector */}
        {!isCantrip && Object.keys(slots).some(l => parseInt(l) >= spell.level) && (
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(parseInt(e.target.value))}
            className="shrink-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-blue-400"
          >
            {Object.entries(slots)
              .filter(([l]) => parseInt(l) >= spell.level)
              .map(([l, s]) => (
                <option key={l} value={l} disabled={s.used >= s.max}>
                  L{l} · {scaleDamageForSlot(spell, parseInt(l))}{s.used >= s.max ? ' ✗' : ''}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Dice + save info */}
      <div className="text-[10px] text-slate-500 mb-2.5">
        {hasSave ? `${spell.saveAbility!.toUpperCase()} save DC ${spellSaveDC}` : hasAtk ? `Spell attack ${fmtMod(spellAttackBonus)}` : 'No roll'}
        {scaledDmg && ` · ${scaledDmg}`}
        {spell.range ? ` · ${spell.range}` : ''}
      </div>

      {/* Target + buttons */}
      <div className="flex gap-1.5 items-center">
        <select
          value={selectedTarget}
          onChange={e => setSelectedTarget(e.target.value)}
          className="flex-1 min-w-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300"
        >
          {targets.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}{t.ac != null ? ` (AC ${t.ac})` : ''}
            </option>
          ))}
          {targets.length === 0 && <option value="">No tokens on map</option>}
        </select>

        {hasSave ? (
          <button
            type="button"
            onClick={() => onRoll(spell, selectedSlot, selectedTarget, 'save')}
            disabled={!hasSlots || !selectedTarget}
            className="shrink-0 text-[10px] px-2.5 py-1.5 bg-red-950/60 border border-red-500/30 text-red-400 rounded hover:bg-red-900/60 disabled:opacity-40 whitespace-nowrap"
          >
            DC {spellSaveDC}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRoll(spell, selectedSlot, selectedTarget, 'attack')}
            disabled={!hasSlots || !selectedTarget}
            className="shrink-0 text-[10px] px-2.5 py-1.5 bg-red-950/60 border border-red-500/30 text-red-400 rounded hover:bg-red-900/60 disabled:opacity-40 whitespace-nowrap"
          >
            Atk {fmtMod(spellAttackBonus)}
          </button>
        )}

        <button
          type="button"
          onClick={() => onRoll(spell, selectedSlot, selectedTarget, 'damage')}
          disabled={!selectedTarget}
          className="shrink-0 text-[10px] px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700 whitespace-nowrap"
        >
          {scaledDmg}
        </button>
      </div>

      {/* Pending result */}
      {pending && (
        <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-300">
            {pending.notation} ={' '}
            <span className="text-white font-bold">{pending.result}</span>
            <span className="text-slate-500 ml-1">dmg</span>
          </span>
          <div className="flex gap-1">
            <button
              onClick={onApply}
              className="text-[10px] px-2 py-1 bg-red-800/80 text-red-200 rounded hover:bg-red-700 whitespace-nowrap"
            >
              Apply Dmg
            </button>
            <button
              onClick={onClearPending}
              className="text-[10px] px-1.5 py-1 bg-slate-700 text-slate-400 rounded hover:bg-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Healing spell card ─────────────────────────────────────────────────────────

function HealingSpellCard({
  spell,
  slots,
  targets,
  spellAbilityMod,
  onRoll,
  pending,
  onApply,
  onClearPending,
}: {
  spell: SrdSpell
  slots: SpellSlotData
  targets: Token[]
  spellAbilityMod: number
  onRoll: (spell: SrdSpell, slotLevel: number, targetId: string, rollType: 'heal') => void
  pending: PendingRoll | null
  onApply: () => void
  onClearPending: () => void
}) {
  const isCantrip = spell.level === 0
  // Sort targets lowest HP% first
  const sortedTargets = [...targets].sort((a, b) => hpPct(a) - hpPct(b))

  const [selectedTarget, setSelectedTarget] = useState(sortedTargets[0]?.id ?? '')
  const [selectedSlot, setSelectedSlot] = useState(spell.level)

  const slotsAtLevel = slots[String(selectedSlot)]
  const hasSlots = isCantrip || (slotsAtLevel ? slotsAtLevel.used < slotsAtLevel.max : false)

  const healDice = scaleHealForSlot(spell, selectedSlot)

  const isBonusAction = spell.castingTime.toLowerCase().includes('bonus')

  const targetToken = targets.find(t => t.id === selectedTarget)
  const potentialHeal = pending?.result ?? 0
  const curHP = targetToken?.current_hp ?? targetToken?.hp ?? 0
  const maxHP = targetToken?.hp ?? curHP
  const newHP = Math.min(maxHP, curHP + potentialHeal)
  const actualHeal = newHP - curHP

  useEffect(() => {
    if (sortedTargets.length > 0 && !sortedTargets.find(t => t.id === selectedTarget)) {
      setSelectedTarget(sortedTargets[0].id)
    }
  }, [sortedTargets, selectedTarget])

  return (
    <div
      className={`rounded-lg border p-3 transition-opacity ${
        !hasSlots && !isCantrip
          ? 'opacity-40 border-slate-800 bg-slate-900/30'
          : 'border-slate-700 bg-slate-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center flex-wrap gap-1 min-w-0">
          <span className="text-sm font-semibold text-slate-100 truncate">{spell.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCantrip ? 'bg-slate-800 text-slate-400' : 'bg-green-950/60 text-green-400'}`}>
            {isCantrip ? 'Cantrip' : `L${spell.level}`}
          </span>
          {isBonusAction && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400">BA</span>}
        </div>

        {/* Upcast selector */}
        {!isCantrip && Object.keys(slots).some(l => parseInt(l) >= spell.level) && (
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(parseInt(e.target.value))}
            className="shrink-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-green-400"
          >
            {Object.entries(slots)
              .filter(([l]) => parseInt(l) >= spell.level)
              .map(([l, s]) => (
                <option key={l} value={l} disabled={s.used >= s.max}>
                  L{l} · {scaleHealForSlot(spell, parseInt(l))}{s.used >= s.max ? ' ✗' : ''}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Info row */}
      <div className="text-[10px] text-slate-500 mb-2.5">
        {healDice}{spellAbilityMod !== 0 ? fmtMod(spellAbilityMod) : ''}
        {' '}healing · {spell.range?.toLowerCase().includes('touch') ? 'Touch' : spell.range}
        {isBonusAction ? ' · Bonus action' : ' · Action'}
      </div>

      {/* Target + Roll */}
      <div className="flex gap-1.5 items-center">
        <select
          value={selectedTarget}
          onChange={e => setSelectedTarget(e.target.value)}
          className="flex-1 min-w-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300"
        >
          {sortedTargets.map(t => {
            const pct = hpPct(t)
            return (
              <option key={t.id} value={t.id}>
                {pct < 30 ? '⚠ ' : ''}{t.label} — {t.current_hp ?? t.hp ?? 0}/{t.hp ?? '?'} HP
              </option>
            )
          })}
          {sortedTargets.length === 0 && <option value="">No party tokens</option>}
        </select>

        <button
          type="button"
          onClick={() => onRoll(spell, selectedSlot, selectedTarget, 'heal')}
          disabled={!hasSlots || !selectedTarget}
          className="shrink-0 text-[10px] px-2.5 py-1.5 bg-green-950/60 border border-green-500/30 text-green-400 rounded hover:bg-green-900/60 disabled:opacity-40 whitespace-nowrap"
        >
          {healDice}{spellAbilityMod !== 0 ? fmtMod(spellAbilityMod) : ''}
        </button>
      </div>

      {/* Pending heal */}
      {pending && targetToken && (
        <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-300">
            {pending.notation} ={' '}
            <span className="text-green-400 font-bold">+{actualHeal} HP</span>
            <span className="text-slate-500 ml-1">({curHP} → {newHP})</span>
          </span>
          <div className="flex gap-1">
            <button
              onClick={onApply}
              className="text-[10px] px-2 py-1 bg-green-900/80 text-green-200 rounded hover:bg-green-800 whitespace-nowrap"
            >
              Apply to {targetToken.label}
            </button>
            <button
              onClick={onClearPending}
              className="text-[10px] px-1.5 py-1 bg-slate-700 text-slate-400 rounded hover:bg-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function SpellDashboard({ sessionId }: { sessionId: string }) {
  const [myChar, setMyChar] = useState<CharRow | null>(null)
  const [slots, setSlots] = useState<SpellSlotData>({})
  const [tokens, setTokens] = useState<Token[]>([])
  const [encounterId, setEncounterId] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState('')
  const [isGm, setIsGm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [pending, setPending] = useState<PendingRoll | null>(null)
  const [combatFilter, setCombatFilter] = useState<string>('all')
  const [healFilter, setHealFilter] = useState<string>('all')

  const wallet = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('dnd721_wallet')?.toLowerCase() ?? null
  }, [])

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wallet) { setLoading(false); setError('Connect your wallet to use the spell dashboard.'); return }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, wallet])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Session + GM check
      const { data: session } = await supabase
        .from('sessions')
        .select('title, gm_wallet')
        .eq('id', sessionId)
        .maybeSingle()

      if (!session) { setError('Session not found.'); setLoading(false); return }
      setSessionTitle(session.title ?? 'Session')
      setIsGm((session.gm_wallet ?? '').toLowerCase() === wallet)

      // Encounter (tokens live here)
      const { data: enc } = await supabase
        .from('encounters')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1)
        .maybeSingle()
      const eid = (enc as any)?.id ?? null
      setEncounterId(eid)

      // Tokens
      if (eid) {
        const { data: toks } = await supabase
          .from('tokens')
          .select('id, label, type, hp, current_hp, ac, owner_wallet')
          .eq('encounter_id', eid)
        setTokens((toks ?? []) as Token[])
      }

      // My character via session_characters
      const { data: link } = await supabase
        .from('session_characters')
        .select('character_id')
        .eq('session_id', sessionId)
        .eq('wallet_address', wallet)
        .maybeSingle()

      const charId = (link as any)?.character_id ?? null
      if (!charId) {
        // DM or observer — no character needed
        setLoading(false)
        return
      }

      const { data: char } = await supabase
        .from('characters')
        .select('id, name, level, main_job, abilities, spell_slots, resource_state, spells_prepared, spell_save_dc, spell_attack_bonus, hit_points_current, hit_points_max, wallet_address')
        .eq('id', charId)
        .maybeSingle()

      if (!char) { setLoading(false); return }
      setMyChar(char as CharRow)

      // Build or initialise spell slots
      let spellSlotsMax = (char as any).spell_slots as Record<string, number> | null
      if (!spellSlotsMax || Object.keys(spellSlotsMax).length === 0) {
        spellSlotsMax = initializeSpellSlots(char.main_job ?? '', char.level ?? 1)
        if (Object.keys(spellSlotsMax).length > 0) {
          await supabase
            .from('characters')
            .update({ spell_slots: spellSlotsMax })
            .eq('id', char.id)
        }
      }
      setSlots(buildSlotData(spellSlotsMax, (char as any).resource_state))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  // ── Realtime: slots + tokens ──────────────────────────────────────────────────
  useEffect(() => {
    if (!myChar?.id) return

    const charCh = supabase
      .channel(`spell-dash-char-${myChar.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=eq.${myChar.id}` },
        (payload: any) => {
          const r = payload.new
          setSlots(buildSlotData(r.spell_slots, r.resource_state))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(charCh) }
  }, [myChar?.id])

  useEffect(() => {
    if (!encounterId) return

    const tokCh = supabase
      .channel(`spell-dash-tokens-${encounterId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tokens', filter: `encounter_id=eq.${encounterId}` },
        (payload: any) => {
          setTokens(prev => prev.map(t => t.id === payload.new.id ? (payload.new as Token) : t))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(tokCh) }
  }, [encounterId])

  // ── Derived spell lists ───────────────────────────────────────────────────────
  const preparedNames = useMemo(
    () => new Set(myChar?.spells_prepared ?? []),
    [myChar?.spells_prepared],
  )

  const preparedSpells = useMemo(
    () => SRD_SPELLS.filter(s => preparedNames.has(s.name) || s.level === 0 && preparedNames.has(s.name)),
    [preparedNames],
  )

  const combatSpells = useMemo(
    () => preparedSpells.filter(s => categorizeSpell(s) === 'combat'),
    [preparedSpells],
  )

  const healingSpells = useMemo(
    () => preparedSpells.filter(s => categorizeSpell(s) === 'healing'),
    [preparedSpells],
  )

  const filteredCombat = useMemo(
    () => combatFilter === 'all' ? combatSpells : combatSpells.filter(s => String(s.level) === combatFilter),
    [combatSpells, combatFilter],
  )

  const filteredHeal = useMemo(
    () => healFilter === 'all' ? healingSpells : healingSpells.filter(s => String(s.level) === healFilter),
    [healingSpells, healFilter],
  )

  // ── Derived caster stats ──────────────────────────────────────────────────────
  const { spellAttackBonus, spellSaveDC, spellAbilityMod } = useMemo(() => {
    if (!myChar?.abilities || !myChar.main_job) {
      return { spellAttackBonus: 0, spellSaveDC: 8, spellAbilityMod: 0 }
    }
    const abilKey = getSpellcastingAbility(myChar.main_job)
    const score = Number((myChar.abilities as any)?.[abilKey] ?? 10)
    const mod = abilityModifier(score)
    const pb = profBonus(myChar.level ?? 1)
    // Prefer server-computed values if present
    const atk = myChar.spell_attack_bonus ?? (mod + pb)
    const dc = myChar.spell_save_dc ?? (8 + mod + pb)
    return { spellAttackBonus: atk, spellSaveDC: dc, spellAbilityMod: mod }
  }, [myChar])

  // PC tokens for healing, all tokens for combat
  const pcTokens = useMemo(() => tokens.filter(t => t.type === 'pc'), [tokens])
  const allTargets = useMemo(() => tokens.filter(t => t.id !== /* my own? */ undefined), [tokens])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleRoll = useCallback(async (
    spell: SrdSpell,
    slotLevel: number,
    targetId: string,
    rollType: 'attack' | 'save' | 'damage' | 'heal',
  ) => {
    if (!myChar) return

    let notation: string
    let label: string

    switch (rollType) {
      case 'attack':
        notation = `1d20${spellAttackBonus >= 0 ? '+' : ''}${spellAttackBonus}`
        label = `${spell.name} — Spell Attack`
        break
      case 'save':
        // Save is rolled by the target (DM/player rolls for their creature)
        // We post a note roll for the chat log at the save DC
        notation = '1d20'
        label = `${spell.name} — ${spell.saveAbility?.toUpperCase()} Save DC ${spellSaveDC}`
        break
      case 'damage': {
        const dmg = spell.level === 0
          ? (spell.damage ?? '1d6')
          : scaleDamageForSlot(spell, slotLevel)
        notation = dmg
        label = `${spell.name} — Damage (L${slotLevel})`
        break
      }
      case 'heal': {
        const healDice = scaleHealForSlot(spell, slotLevel)
        const mod = spellAbilityMod
        notation = mod !== 0 ? `${healDice}${mod >= 0 ? '+' : ''}${mod}` : healDice
        label = `${spell.name} — Healing (L${slotLevel})`
        break
      }
    }

    // POST to /api/roll
    const res = await fetch('/api/roll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notation,
        rollType: rollType === 'heal' ? 'custom' : rollType === 'damage' ? 'damage' : rollType,
        label,
        characterId: myChar.id,
        targetTokenId: targetId || undefined,
        sessionId,
        rollerName: myChar.name,
        rollerWallet: wallet ?? undefined,
      }),
    })

    if (!res.ok) {
      console.error('[SpellDashboard] roll API error', await res.text())
      return
    }

    const data = await res.json()

    // Damage or heal → store as pending, wait for Apply
    if (rollType === 'damage' || rollType === 'heal') {
      setPending({
        spellName: spell.name,
        result: data.total ?? 0,
        notation,
        type: rollType === 'heal' ? 'heal' : 'damage',
        targetTokenId: targetId,
      })
    }

    // Expend slot on attack/save/heal rolls (not on free damage-only rolls)
    if ((rollType === 'attack' || rollType === 'save' || rollType === 'heal') && spell.level > 0) {
      const newSlots = await expendSlot(supabase, myChar.id, slotLevel)
      if (newSlots) setSlots(newSlots)
    }
  }, [myChar, spellAttackBonus, spellSaveDC, spellAbilityMod, sessionId, wallet])

  const handleApply = useCallback(async () => {
    if (!pending) return
    const token = tokens.find(t => t.id === pending.targetTokenId)
    if (!token) { setPending(null); return }

    const cur = token.current_hp ?? token.hp ?? 0
    const max = token.hp ?? cur

    const newHp = pending.type === 'heal'
      ? Math.min(max, cur + pending.result)
      : Math.max(0, cur - pending.result)

    await supabase
      .from('tokens')
      .update({ current_hp: newHp })
      .eq('id', token.id)

    // Defeat message
    if (pending.type === 'damage' && newHp === 0) {
      await supabase
        .from('session_rolls')
        .insert({
          session_id: sessionId,
          roll_type: 'custom',
          label: `💀 ${token.label} has been defeated!`,
          formula: '0',
          result_total: 0,
          roller_name: myChar?.name ?? 'System',
          roller_wallet: wallet,
        })
        .then(() => {})
    }

    setPending(null)
  }, [pending, tokens, sessionId, myChar, wallet])

  const handleSpend = useCallback(async (level: string) => {
    if (!myChar) return
    const newSlots = await expendSlot(supabase, myChar.id, parseInt(level))
    if (newSlots) setSlots(newSlots)
  }, [myChar])

  const handleRestore = useCallback(async (level: string) => {
    if (!myChar) return
    const newSlots = await restoreSlot(supabase, myChar.id, parseInt(level))
    if (newSlots) setSlots(newSlots)
  }, [myChar])

  // ── Render: loading / error ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-slate-400 text-sm animate-pulse">Loading spell dashboard…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    )
  }

  const slotLevels = Object.keys(slots).sort()

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-slate-200">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-amber-400">✦ Spell Dashboard</span>
          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            {sessionTitle}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span>Live</span>
          </div>
          {myChar && (
            <span>
              {myChar.name} · {myChar.main_job} {myChar.level}
            </span>
          )}
        </div>
      </header>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: spell slots + party HP + DM view */}
        <aside className="w-52 shrink-0 flex flex-col gap-4 overflow-y-auto border-r border-slate-800 bg-slate-950 p-3">

          {/* Spell slots */}
          {slotLevels.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Spell Slots
              </div>
              <div className="space-y-1.5">
                {slotLevels.map(lvl => (
                  <SlotRow
                    key={lvl}
                    level={lvl}
                    data={slots[lvl]}
                    onSpend={handleSpend}
                    onRestore={handleRestore}
                  />
                ))}
              </div>
            </div>
          )}

          {!myChar && !isGm && (
            <div className="text-[11px] text-slate-500 italic">
              No character linked to this session.
            </div>
          )}

          {/* Party HP */}
          <PartyHealthPanel tokens={pcTokens.length > 0 ? pcTokens : tokens} />

          {/* DM all-casters view */}
          {isGm && <AllCastersSlots sessionId={sessionId} />}

          {/* Spellcasting stats */}
          {myChar && isSpellcaster(myChar.main_job) && (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Spell Stats
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Save DC</span>
                  <span className="font-bold text-violet-300">{spellSaveDC}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Atk Bonus</span>
                  <span className="font-bold text-blue-300">{fmtMod(spellAttackBonus)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ability</span>
                  <span className="text-slate-300 uppercase">{myChar.main_job ? getSpellcastingAbility(myChar.main_job) : '—'}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Center: Combat spells */}
        <main className="flex flex-1 flex-col overflow-y-auto border-r border-slate-800 bg-gray-950 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400/80">
              ⚔ Combat Spells
            </span>
            <select
              value={combatFilter}
              onChange={e => setCombatFilter(e.target.value)}
              className="text-[10px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
            >
              <option value="all">All levels</option>
              <option value="0">Cantrips</option>
              {slotLevels.map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredCombat.map(spell => (
              <CombatSpellCard
                key={spell.name}
                spell={spell}
                slots={slots}
                targets={allTargets}
                spellAttackBonus={spellAttackBonus}
                spellSaveDC={spellSaveDC}
                charLevel={myChar?.level ?? 1}
                onRoll={handleRoll}
                pending={pending?.spellName === spell.name ? pending : null}
                onApply={handleApply}
                onClearPending={() => setPending(null)}
              />
            ))}
            {filteredCombat.length === 0 && (
              <p className="py-8 text-center text-[11px] text-slate-600 italic">
                {preparedNames.size === 0
                  ? 'No spells prepared. Prepare spells on your character sheet.'
                  : 'No combat spells prepared at this level.'}
              </p>
            )}
          </div>
        </main>

        {/* Right: Healing spells */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-gray-950 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-green-400/80">
              ✦ Healing Spells
            </span>
            <select
              value={healFilter}
              onChange={e => setHealFilter(e.target.value)}
              className="text-[10px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
            >
              <option value="all">All levels</option>
              {slotLevels.map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredHeal.map(spell => (
              <HealingSpellCard
                key={spell.name}
                spell={spell}
                slots={slots}
                targets={pcTokens.length > 0 ? pcTokens : tokens}
                spellAbilityMod={spellAbilityMod}
                onRoll={handleRoll}
                pending={pending?.spellName === spell.name ? pending : null}
                onApply={handleApply}
                onClearPending={() => setPending(null)}
              />
            ))}
            {filteredHeal.length === 0 && (
              <p className="py-8 text-center text-[11px] text-slate-600 italic">
                {preparedNames.size === 0
                  ? 'No spells prepared. Prepare spells on your character sheet.'
                  : 'No healing spells prepared at this level.'}
              </p>
            )}
          </div>
        </main>

      </div>
    </div>
  )
}
