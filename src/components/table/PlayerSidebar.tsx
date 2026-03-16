
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { CharacterSheetData } from '@/components/character-sheet/types'
import { HandoutsPanel } from '@/components/table/HandoutsPanel'
import TableChat from '@/components/table/TableChat'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

type PlayerCharacter = {
  id: string
  name?: string | null
}

type PlayerSidebarProps = {
  sessionId?: string | null
  address: string | null
  characters: PlayerCharacter[]
  selectedCharacter: PlayerCharacter | null
  selectedCharacterId: string | null
  speedFeet?: number
  charsError: string | null
  charsLoading: boolean
  onSelectCharacter: (id: string) => void
  onAbilityCheck: (abilityKey: AbilityKey, label: string) => void
  onInitiative: () => void
  onRoll?: (roll: { label: string; formula: string; result: number; outcome?: string | null }) => void
  diceLog?: { id: string; roller: string; label: string; formula: string; result: number; timestamp: string }[]
  onOpenDiceLog?: () => void
}

type ActionState = {
  move_used_ft?: number
  action_used_turn?: boolean
  bonus_used_turn?: boolean
  reaction_used_round?: boolean
  [key: string]: any
}

type PlayerTabKey = 'character' | 'rolls' | 'session'

function abilityMod(score: number) {
  const s = Number(score)
  if (!Number.isFinite(s)) return 0
  return Math.floor((s - 10) / 2)
}

function fmtMod(n: number) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '+0'
  return v >= 0 ? `+${v}` : `${v}`
}

function clampSpeedFeet(raw: any) {
  const s = Number(raw)
  const safe = Number.isFinite(s) && s > 0 ? Math.max(5, Math.min(120, Math.floor(s))) : 30
  return safe
}

function proficiencyBonus(level: any) {
  const lv = Number(level)
  const l = Number.isFinite(lv) ? Math.max(1, Math.min(20, Math.floor(lv))) : 1
  if (l >= 17) return 6
  if (l >= 13) return 5
  if (l >= 9) return 4
  if (l >= 5) return 3
  return 2
}

type SheetPreview = Pick<
  CharacterSheetData,
  | 'id'
  | 'name'
  | 'level'
  | 'main_job'
  | 'subclass'
  | 'race'
  | 'background'
  | 'abilities'
  | 'hit_points_current'
  | 'hit_points_max'
  | 'armor_class'
  | 'speed_ft'
  | 'spell_save_dc'
  | 'spell_attack_bonus'
>

export function PlayerSidebar({
  sessionId,
  address,
  characters,
  selectedCharacter,
  selectedCharacterId,
  speedFeet = 30,
  charsError,
  charsLoading,
  onSelectCharacter,
  onAbilityCheck,
  onInitiative,
  onRoll,
  diceLog = [],
  onOpenDiceLog,
}: PlayerSidebarProps) {
  const addressLower = useMemo(() => (address ? address.toLowerCase() : null), [address])

  const [activeTab, setActiveTab] = useState<PlayerTabKey>('character')
  const [collapsed, setCollapsed] = useState(false)

  const [activeWalletLower, setActiveWalletLower] = useState<string | null>(null)
  const [activeName, setActiveName] = useState<string | null>(null)

  const [actionState, setActionState] = useState<ActionState>({})

  const [sheet, setSheet] = useState<SheetPreview | null>(null)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [hpSaving, setHpSaving] = useState(false)

  const moveUsedFt = useMemo(() => {
    const n = Number(actionState.move_used_ft ?? 0)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [actionState.move_used_ft])

  const effectiveSpeedFeet = useMemo(() => {
    if (sheet?.speed_ft != null) return clampSpeedFeet(sheet.speed_ft)
    return clampSpeedFeet(speedFeet)
  }, [sheet?.speed_ft, speedFeet])

  const remainingMoveFt = useMemo(() => {
    return Math.max(0, effectiveSpeedFeet - moveUsedFt)
  }, [effectiveSpeedFeet, moveUsedFt])

  const isMyTurn = useMemo(() => {
    if (!addressLower) return false
    if (!activeWalletLower) return false
    return addressLower === activeWalletLower
  }, [addressLower, activeWalletLower])

  const [lastAttackHit, setLastAttackHit] = useState<boolean | null>(null)

  function rollD20VsACWithResult(label: string, bonus: number) {
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus

    let outcome: string | null = null
    let hit = false
    if (targetAC != null) {
      if (d20 === 1) { outcome = `MISS (nat 1) vs AC ${targetAC}`; hit = false }
      else if (d20 === 20) { outcome = `HIT (nat 20) vs AC ${targetAC}`; hit = true }
      else { hit = total >= targetAC; outcome = `${hit ? 'HIT' : 'MISS'} vs AC ${targetAC}` }
    }
    setLastAttackHit(hit)

    const sign = bonus >= 0 ? '+' : ''
    onRoll?.({
      label: `${label}${(target as any)?.label ? ` → ${(target as any).label}` : ''}`,
      formula: `1d20${sign}${bonus}`,
      result: total,
      outcome,
    })
  }

  function doWeaponAttack() {
    if (!sheet) return
    const str = Number(sheet.abilities?.str ?? 10)
    const dex = Number(sheet.abilities?.dex ?? 10)
    const mod = Math.max(abilityMod(str), abilityMod(dex))
    const pb = proficiencyBonus(sheet.level)
    rollD20VsACWithResult('Weapon Attack', mod + pb)
  }

  function doSpellAttack() {
    if (!sheet) return
    const bonus = Number(sheet.spell_attack_bonus ?? 0)
    rollD20VsACWithResult('Spell Attack', Number.isFinite(bonus) ? bonus : 0)
  }

  function doWeaponDamage() {
    if (!sheet) return
    const str = Number(sheet.abilities?.str ?? 10)
    const dex = Number(sheet.abilities?.dex ?? 10)
    const mod = Math.max(abilityMod(str), abilityMod(dex))
    const roll = Math.floor(Math.random() * 8) + 1
    const total = roll + mod
    const sign = mod >= 0 ? '+' : ''
    onRoll?.({
      label: `Weapon Damage${(target as any)?.label ? ` → ${(target as any).label}` : ''}`,
      formula: `1d8${sign}${mod}`,
      result: Math.max(1, total),
      outcome: null,
    })
    setLastAttackHit(null)
  }

  const [rollFlip, setRollFlip] = useState(false)

  const [target, setTarget] = useState<any | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (ev: any) => {
      const t = (ev?.detail ?? {})?.token ?? null
      setTarget(t)
    }
    window.addEventListener('dnd721-target-selected', handler)
    return () => window.removeEventListener('dnd721-target-selected', handler)
  }, [])

  const targetAC = useMemo(() => {
    const n = Number((target as any)?.ac)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [target])

  const [triggerPrompt, setTriggerPrompt] = useState<{
    name: string
    saveType: string
    dc: number
    description: string | null
  } | null>(null)
  const [saveRolling, setSaveRolling] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (ev: any) => {
      const t = ev?.detail?.trigger
      if (!t) return
      setTriggerPrompt({ name: t.name, saveType: t.save_type, dc: t.dc, description: t.description ?? null })
    }
    window.addEventListener('dnd721-trigger-tripped', handler)
    return () => window.removeEventListener('dnd721-trigger-tripped', handler)
  }, [])

  function rollSave() {
    if (!triggerPrompt || !sheet) return
    setSaveRolling(true)
    const abilityMap: Record<string, string> = {
      DEX: 'dex', STR: 'str', CON: 'con', INT: 'int', WIS: 'wis', CHA: 'cha',
    }
    const abilKey = abilityMap[triggerPrompt.saveType] ?? 'dex'
    const score = Number((sheet.abilities as any)?.[abilKey] ?? 10)
    const mod = abilityMod(score)
    const pb = proficiencyBonus(sheet.level)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + mod + pb
    const success = total >= triggerPrompt.dc
    onRoll?.({
      label: `${triggerPrompt.saveType} Save (${triggerPrompt.name})`,
      formula: `1d20${fmtMod(mod + pb)}`,
      result: total,
      outcome: success ? `SUCCESS vs DC ${triggerPrompt.dc}` : `FAIL vs DC ${triggerPrompt.dc}`,
    })
    setSaveRolling(false)
    setTriggerPrompt(null)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (ev: any) => {
      const detail = (ev?.detail ?? {}) as { name?: string | null; wallet?: string | null }
      setActiveName(detail.name ?? null)
      setActiveWalletLower(detail.wallet ? String(detail.wallet).toLowerCase() : null)
    }
    window.addEventListener('dnd721-active-initiative', handler as any)
    return () => window.removeEventListener('dnd721-active-initiative', handler as any)
  }, [])

  useEffect(() => {
    if (!selectedCharacterId) {
      setActionState({})
      return
    }

    let mounted = true

    async function loadActionState() {
      const { data, error } = await supabase
        .from('characters')
        .select('action_state')
        .eq('id', selectedCharacterId)
        .maybeSingle()

      if (!mounted) return
      if (error) { console.error('PlayerSidebar action_state load error', error); return }
      const st = ((data as any)?.action_state ?? {}) as ActionState
      setActionState(st)
    }

    loadActionState()

    const channel = supabase
      .channel(`player-actions-${selectedCharacterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters', filter: `id=eq.${selectedCharacterId}` }, () => loadActionState())
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [selectedCharacterId])

  async function updateHP(delta: number) {
    if (!selectedCharacterId) return
    if (!sheet) return

    const cur = Number(sheet.hit_points_current ?? 0)
    const max = Number(sheet.hit_points_max ?? 0)
    const safeCur = Number.isFinite(cur) ? cur : 0
    const safeMax = Number.isFinite(max) ? max : 0

    const upper = safeMax > 0 ? safeMax : Math.max(1, safeCur + Math.abs(delta) + 9999)
    const next = Math.max(0, Math.min(upper, safeCur + delta))

    setSheet({ ...sheet, hit_points_current: next })
    setHpSaving(true)

    const { error } = await supabase
      .from('characters')
      .update({ hit_points_current: next })
      .eq('id', selectedCharacterId)

    setHpSaving(false)
    if (error) {
      console.error('PlayerSidebar HP update error', error)
      setSheetError('Could not update HP.')
    }
  }

  useEffect(() => {
    if (!selectedCharacterId) {
      setSheet(null)
      setSheetError(null)
      setSheetLoading(false)
      return
    }

    let mounted = true

    async function loadSheet() {
      setSheetLoading(true)
      setSheetError(null)

      const { data, error } = await supabase
        .from('characters')
        .select(['id', 'name', 'level', 'main_job', 'subclass', 'race', 'background', 'abilities', 'hit_points_current', 'hit_points_max', 'armor_class', 'speed_ft', 'spell_save_dc', 'spell_attack_bonus'].join(','))
        .eq('id', selectedCharacterId)
        .maybeSingle()

      if (!mounted) return
      setSheetLoading(false)
      if (error) {
        console.error('PlayerSidebar sheet preview load error', error)
        setSheetError('Could not load character preview.')
        return
      }
      setSheet((data as any) ?? null)
    }

    loadSheet()

    const channel = supabase
      .channel(`player-sheet-preview-${selectedCharacterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters', filter: `id=eq.${selectedCharacterId}` }, () => loadSheet())
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [selectedCharacterId])

  async function updateActionState(patch: Partial<ActionState>) {
    if (!selectedCharacterId) return
    const next: ActionState = { ...(actionState ?? {}), ...patch }
    setActionState(next)
    const { error } = await supabase
      .from('characters')
      .update({ action_state: next })
      .eq('id', selectedCharacterId)
    if (error) console.error('PlayerSidebar update action_state error', error)
  }

  const actionUsed = Boolean(actionState.action_used_turn)
  const bonusUsed = Boolean(actionState.bonus_used_turn)
  const reactionUsed = Boolean(actionState.reaction_used_round)

  const playerTabs: { key: PlayerTabKey; label: string }[] = [
    { key: 'character', label: '🛡 Character' },
    { key: 'rolls', label: '🎲 Rolls' },
    { key: 'session', label: '💬 Session' },
  ]

  return (
    <>
    {/* Environmental trigger save prompt modal */}
    {triggerPrompt && (
      <div className="pointer-events-auto fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="mx-4 w-full max-w-sm rounded-2xl border border-orange-700/60 bg-slate-950/95 p-5 shadow-2xl">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-lg">⚠</span>
            <h3 className="text-base font-bold text-orange-300">{triggerPrompt.name}</h3>
          </div>
          {triggerPrompt.description && (
            <p className="mb-3 text-sm italic text-slate-300">{triggerPrompt.description}</p>
          )}
          <p className="mb-4 text-sm text-slate-200">
            Make a{' '}
            <span className="font-bold text-orange-200">{triggerPrompt.saveType} saving throw</span>{' '}
            against DC <span className="font-bold text-orange-200">{triggerPrompt.dc}</span>!
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={rollSave}
              disabled={saveRolling || !sheet}
              className="flex-1 rounded-xl bg-orange-600/25 border border-orange-600/60 py-2.5 text-sm font-bold text-orange-200 hover:bg-orange-600/40 disabled:opacity-50"
            >
              🎲 Roll {triggerPrompt.saveType} Save
            </button>
            <button
              type="button"
              onClick={() => setTriggerPrompt(null)}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-400 hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    )}

    <aside className="pointer-events-auto flex flex-col rounded-t-xl border border-b-0 border-yellow-800/40 bg-slate-950/90 backdrop-blur-md text-xs">

      {/* Single-row header: badge + tabs + DND721 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-yellow-800/50 bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 px-3 py-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-yellow-600/70 bg-slate-950/80 text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-300">
          P
        </div>
        <div className="flex flex-1 gap-1 rounded-lg bg-slate-900/80 p-0.5">
          {playerTabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-b from-yellow-500/80 to-amber-600/90 text-slate-950 shadow-[0_0_6px_rgba(250,204,21,0.7)]'
                    : 'bg-slate-950/40 text-slate-300 hover:bg-slate-800/80 hover:text-yellow-200'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 rounded-md border border-yellow-800/60 bg-slate-950/80 px-2 py-0.5 text-[11px] text-yellow-300/80 hover:border-yellow-500/60"
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
        <div className="shrink-0 rounded-md border border-yellow-800/60 bg-slate-950/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-yellow-300">
          DND721
        </div>
      </div>

      {/* Tab content area */}
      {!collapsed && <div className="h-44 overflow-hidden p-2">

      {/* ─── CHARACTER TAB ─── */}
      {activeTab === 'character' && (
        <>
          {charsError && <p className="mb-1 text-xs text-red-400">{charsError}</p>}

          {!address && (
            <p className="text-xs text-amber-400">Connect your wallet to pick a character for this session.</p>
          )}

          {/* Character Selection */}
          {address && !selectedCharacter && (
            <>
              <p className="text-[11px] text-slate-400">
                Select which of your DND721 characters you&apos;re playing in this session.
              </p>
              {charsLoading && <p className="text-xs text-slate-400">Loading your characters…</p>}
              {!charsLoading && characters.length === 0 && (
                <div className="space-y-2 rounded-md border border-yellow-900/30 bg-slate-900/60 p-2">
                  <p className="text-xs text-slate-300">You don&apos;t have any characters yet.</p>
                  <Link href="/characters/new" className="inline-flex rounded-md bg-sky-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-500">
                    Create a Character
                  </Link>
                </div>
              )}
              {!charsLoading && characters.length > 0 && (
                <div className="mt-1 space-y-2 rounded-lg border border-yellow-900/30 bg-slate-900/60 p-2">
                  <p className="text-[11px] font-semibold text-yellow-300/70">Your Characters</p>
                  <div className="flex flex-col gap-1.5">
                    {characters.map((char) => {
                      const isSelected = selectedCharacterId === char.id
                      const name = (char.name && String(char.name).trim().length > 0 && String(char.name)) || 'Unnamed Character'
                      return (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => onSelectCharacter(char.id)}
                          className={`w-full rounded-md border px-2 py-1.5 text-left text-xs ${
                            isSelected
                              ? 'border-yellow-500/60 bg-yellow-900/20 text-yellow-50'
                              : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-yellow-600/40'
                          }`}
                        >
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Character Sheet View — 2-column grid */}
          {address && selectedCharacter && selectedCharacterId && (
            <div className="grid h-full grid-cols-2 gap-2">

              {/* LEFT: Stats + abilities */}
              <div className="flex flex-col gap-2 overflow-y-auto">
                {/* Character name row */}
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {(sheet?.name && String(sheet.name).trim()) || selectedCharacter.name || 'Unnamed Character'}
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {(() => {
                        const lvl = Number(sheet?.level ?? 1)
                        const safeLvl = Number.isFinite(lvl) && lvl > 0 ? Math.floor(lvl) : 1
                        const cls = sheet?.main_job ? String(sheet.main_job) : 'Class'
                        const sub = sheet?.subclass ? String(sheet.subclass) : ''
                        const race = sheet?.race ? String(sheet.race) : ''
                        return `Lv ${safeLvl} ${cls}${sub ? ` (${sub})` : ''}${race ? ` • ${race}` : ''}`
                      })()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link href={`/characters/${selectedCharacterId}`} target="_blank" rel="noopener noreferrer" className="rounded-md border border-yellow-800/50 bg-slate-900 px-1.5 py-0.5 text-[10px] text-yellow-300/70 hover:border-yellow-500/60">Sheet</Link>
                    <button type="button" onClick={() => onSelectCharacter('')} className="rounded-md border border-yellow-800/50 bg-slate-900 px-1.5 py-0.5 text-[10px] text-yellow-300/70 hover:border-yellow-500/60">Change</button>
                  </div>
                </div>

                {sheetError && <p className="text-[11px] text-red-400">{sheetError}</p>}
                {sheetLoading && <p className="text-[11px] text-slate-400">Loading…</p>}

                {!sheetLoading && !sheetError && (
                  <>
                    {/* HP / AC / Speed */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="flex flex-col items-center justify-center rounded-md border border-yellow-900/30 bg-slate-900/40 p-1.5">
                        <p className="mb-0.5 text-[9px] text-yellow-300/60">AC</p>
                        <div className="relative flex h-8 w-7 items-center justify-center">
                          <svg viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 h-full w-full">
                            <path d="M20 2L4 8v14c0 10 7 18.5 16 22 9-3.5 16-12 16-22V8L20 2z" fill="rgba(30,41,59,0.9)" stroke="rgba(250,204,21,0.5)" strokeWidth="2"/>
                          </svg>
                          <span className="relative z-10 text-xs font-black leading-none text-yellow-200">{(sheet?.armor_class && sheet.armor_class > 0) ? sheet.armor_class : 10}</span>
                        </div>
                      </div>
                      <div className="rounded-md border border-yellow-900/30 bg-slate-900/40 p-1.5">
                        <p className="text-[9px] text-yellow-300/60">HP</p>
                        <p className="text-base font-semibold text-slate-100 leading-tight">
                          {Number.isFinite(Number(sheet?.hit_points_current)) ? Number(sheet?.hit_points_current) : 0}
                          <span className="text-[10px] text-slate-400">/{Number.isFinite(Number(sheet?.hit_points_max)) ? Number(sheet?.hit_points_max) : 0}</span>
                        </p>
                        <div className="mt-1 flex gap-0.5">
                          <button type="button" disabled={hpSaving} onClick={() => updateHP(-5)} className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-200 hover:border-yellow-500/60 disabled:opacity-40">-5</button>
                          <button type="button" disabled={hpSaving} onClick={() => updateHP(-1)} className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-200 hover:border-yellow-500/60 disabled:opacity-40">-1</button>
                          <button type="button" disabled={hpSaving} onClick={() => updateHP(+1)} className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-200 hover:border-yellow-500/60 disabled:opacity-40">+1</button>
                          <button type="button" disabled={hpSaving} onClick={() => updateHP(+5)} className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-200 hover:border-yellow-500/60 disabled:opacity-40">+5</button>
                        </div>
                      </div>
                      <div className="rounded-md border border-yellow-900/30 bg-slate-900/40 p-1.5">
                        <p className="text-[9px] text-yellow-300/60">Speed</p>
                        <p className="text-base font-semibold text-slate-100 leading-tight">{effectiveSpeedFeet}<span className="text-[10px] text-slate-400"> ft</span></p>
                        {(sheet?.spell_save_dc != null || sheet?.spell_attack_bonus != null) && (
                          <div className="mt-1 space-y-0.5">
                            {sheet?.spell_save_dc != null && <p className="text-[9px] text-slate-400">DC {Number(sheet.spell_save_dc)}</p>}
                            {sheet?.spell_attack_bonus != null && <p className="text-[9px] text-slate-400">ATK {fmtMod(Number(sheet.spell_attack_bonus))}</p>}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ability scores */}
                    {sheet?.abilities && (
                      <div className="grid grid-cols-3 gap-1">
                        {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((key) => {
                          const label = key.toUpperCase()
                          const score = Number((sheet.abilities as any)?.[key] ?? 10)
                          return (
                            <div
                              key={key}
                              role="button"
                              tabIndex={0}
                              onClick={() => onAbilityCheck(key, `${label} Check`)}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onAbilityCheck(key, `${label} Check`) }}
                              className="cursor-pointer rounded-md border border-yellow-900/30 bg-slate-900/20 p-1 hover:border-yellow-500/50 hover:bg-slate-900/30"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-semibold text-slate-300">{label}</span>
                                <span className="font-mono text-[9px] text-slate-400">{score}</span>
                              </div>
                              <div className="text-center text-xs font-semibold text-slate-100">{fmtMod(abilityMod(score))}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* RIGHT: Turn + action economy + movement */}
              <div className="flex flex-col gap-2 overflow-y-auto">
                <div className="rounded-lg border border-yellow-900/30 bg-slate-900/50 p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-yellow-300/70">Turn</p>
                    {activeWalletLower ? (
                      isMyTurn ? (
                        <span className="rounded bg-emerald-700/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">Your turn</span>
                      ) : (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">Waiting: {activeName ?? '—'}</span>
                      )
                    ) : (
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Not started</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">Movement</span>
                      <span className="font-mono text-slate-200">{remainingMoveFt}/{effectiveSpeedFeet} ft</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
                      <div className="h-full bg-amber-600/70" style={{ width: `${Math.max(0, Math.min(100, (remainingMoveFt / Math.max(1, effectiveSpeedFeet)) * 100))}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <button type="button" disabled={!isMyTurn || !activeWalletLower || actionUsed} onClick={() => updateActionState({ action_used_turn: true })} className="rounded-md border border-yellow-900/30 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-100 hover:border-yellow-500/50 disabled:opacity-40">{actionUsed ? 'Action ✓' : 'Action'}</button>
                    <button type="button" disabled={!isMyTurn || !activeWalletLower || bonusUsed} onClick={() => updateActionState({ bonus_used_turn: true })} className="rounded-md border border-yellow-900/30 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-100 hover:border-yellow-500/50 disabled:opacity-40">{bonusUsed ? 'Bonus ✓' : 'Bonus'}</button>
                    <button type="button" disabled={!activeWalletLower || reactionUsed} onClick={() => updateActionState({ reaction_used_round: true })} className="rounded-md border border-yellow-900/30 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-100 hover:border-yellow-500/50 disabled:opacity-40">{reactionUsed ? 'React ✓' : 'React'}</button>
                  </div>

                  <button type="button" disabled={!activeWalletLower || !isMyTurn} onClick={() => updateActionState({ move_used_ft: 0, action_used_turn: false, bonus_used_turn: false, reaction_used_round: false })} className="w-full rounded-md border border-yellow-900/30 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 hover:border-yellow-500/50 disabled:opacity-40">Reset turn</button>
                </div>
              </div>

            </div>
          )}
        </>
      )}

      {/* ─── ROLLS TAB ─── */}
      {activeTab === 'rolls' && (
        <>
          {!selectedCharacterId ? (
            <p className="text-[11px] text-slate-400">Select a character on the Character tab to roll.</p>
          ) : (
            <div className="grid h-full grid-cols-2 gap-2">

              {/* LEFT: Ability checks + Initiative + dice log */}
              <div className="flex flex-col gap-2 overflow-y-auto">
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Ability Checks</p>
                  <div className="grid grid-cols-2 gap-1">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((key) => (
                      <button key={key} type="button" onClick={() => onAbilityCheck(key, `${key.toUpperCase()} Check`)} className="rounded-md border border-yellow-900/30 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 hover:border-yellow-500/50 hover:text-yellow-100">
                        {key.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={onInitiative} className="mt-1.5 w-full rounded-md border border-yellow-900/30 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 hover:border-yellow-500/50 hover:text-yellow-100">
                    Initiative
                  </button>
                </div>

                {/* Recent rolls */}
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Recent Rolls</span>
                    <button type="button" onClick={onOpenDiceLog} disabled={!onOpenDiceLog} className="rounded border border-yellow-800/50 bg-slate-900 px-1.5 py-0.5 text-[9px] text-yellow-300/70 hover:border-yellow-500/60 disabled:opacity-40">
                      Full log
                    </button>
                  </div>
                  <div className="space-y-1">
                    {(diceLog || []).slice(0, 6).map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md bg-slate-900/60 px-2 py-1">
                        <div className="min-w-0">
                          <div className="truncate text-[10px] text-slate-200">{r.label}</div>
                          <div className="truncate text-[9px] text-slate-500">{r.formula}</div>
                        </div>
                        <div className="ml-1.5 shrink-0 rounded bg-slate-950 px-1.5 py-0.5 text-[11px] font-bold text-yellow-300">{r.result}</div>
                      </div>
                    ))}
                    {(diceLog || []).length === 0 && (
                      <div className="py-2 text-center text-[10px] text-slate-500">No rolls yet.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: Target + attack/spell buttons */}
              <div className="flex flex-col gap-2 overflow-y-auto">
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Target</span>
                    </div>
                    {target && (
                      <button type="button" onClick={() => { setTarget(null); setLastAttackHit(null) }} className="text-[10px] text-slate-500 hover:text-slate-300">
                        ✕ Clear
                      </button>
                    )}
                  </div>

                  {target ? (
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2 rounded-md bg-slate-900/60 px-2 py-1.5">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-100">{(target as any)?.label ?? 'Unknown'}</div>
                          {(target as any)?.current_hp != null && (target as any)?.hp != null && (
                            <div className="mt-1">
                              <div className="mb-0.5 flex items-center justify-between text-[9px] text-slate-400">
                                <span>HP</span>
                                <span className="tabular-nums">{(target as any).current_hp}/{(target as any).hp}</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-slate-700/60">
                                <div className="h-1.5 rounded-full bg-red-500 transition-all" style={{ width: `${Math.max(0, Math.min(100, ((target as any).current_hp / (target as any).hp) * 100))}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                        {targetAC != null && (
                          <div className="relative flex h-9 w-7 shrink-0 items-center justify-center">
                            <svg viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 h-full w-full">
                              <path d="M20 2L4 8v14c0 10 7 18.5 16 22 9-3.5 16-12 16-22V8L20 2z" fill="rgba(127,29,29,0.4)" stroke="rgba(248,113,113,0.6)" strokeWidth="2"/>
                            </svg>
                            <span className="relative z-10 mt-1 text-xs font-black leading-none text-red-200">{targetAC}</span>
                          </div>
                        )}
                      </div>

                      {lastAttackHit === true ? (
                        <div className="space-y-1.5">
                          <div className="text-center text-[10px] font-semibold text-emerald-400">Hit! Roll damage:</div>
                          <button type="button" onClick={doWeaponDamage} className="w-full rounded-lg border border-emerald-700/50 bg-emerald-600/25 px-2 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-600/40">Roll Damage (1d8)</button>
                          <button type="button" onClick={() => setLastAttackHit(null)} className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-[10px] text-slate-400 hover:bg-slate-800">Back</button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <button type="button" onClick={doWeaponAttack} disabled={!sheet || targetAC == null} className="w-full rounded-lg border border-emerald-800/60 bg-emerald-900/20 px-2 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-40">⚔ Weapon Attack</button>
                          <button type="button" onClick={doSpellAttack} disabled={!sheet || targetAC == null || !sheet.spell_attack_bonus} className="w-full rounded-lg border border-blue-800/60 bg-blue-900/20 px-2 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-900/40 disabled:cursor-not-allowed disabled:opacity-40">✦ Spell Attack</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-4 text-center text-[11px] text-slate-500">Click an enemy token on the map to target it</div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">All rolls logged to Dice Log.</p>
              </div>

            </div>
          )}
        </>
      )}

      {/* ─── SESSION TAB ─── */}
      {activeTab === 'session' && (
        <div className="grid h-full grid-cols-2 gap-2">
          {sessionId ? (
            <>
              <div className="overflow-y-auto rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
                <HandoutsPanel sessionId={sessionId} isGm={false} gmWallet={null} />
              </div>
              <div className="overflow-y-auto rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
                <TableChat sessionId={sessionId} senderWallet={address} senderName={selectedCharacter?.name ?? undefined} />
              </div>
            </>
          ) : (
            <p className="text-[11px] text-slate-400">Session not loaded.</p>
          )}
        </div>
      )}

      </div>}{/* end tab content */}

    </aside>
    </>
  )
}
