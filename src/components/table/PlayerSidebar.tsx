
'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { CharacterSheetData } from '@/components/character-sheet/types'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

type PlayerCharacter = {
  id: string
  name?: string | null
}

type PlayerSidebarProps = {
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
  // keep any other flags (like sneak_used_turn) untouched
  [key: string]: any
}

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

  // ✅ initiative turn lock (from InitiativeTracker)
  const [activeWalletLower, setActiveWalletLower] = useState<string | null>(null)
  const [activeName, setActiveName] = useState<string | null>(null)

  // ✅ action economy state (from characters.action_state)
  const [actionState, setActionState] = useState<ActionState>({})

  // ✅ lightweight sheet preview (fast + avoids iframe)
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


  function rollD20VsAC(label: string, bonus: number) {
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus

    let outcome: string | null = null
    if (targetAC != null) {
      if (d20 === 1) outcome = `MISS (nat 1) vs AC ${targetAC}`
      else if (d20 === 20) outcome = `HIT (nat 20) vs AC ${targetAC}`
      else outcome = total >= targetAC ? `HIT vs AC ${targetAC}` : `MISS vs AC ${targetAC}`
    }

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
    rollD20VsAC('Weapon Attack', mod + pb)
  }

  function doSpellAttack() {
    if (!sheet) return
    const bonus = Number(sheet.spell_attack_bonus ?? 0)
    rollD20VsAC('Spell Attack', Number.isFinite(bonus) ? bonus : 0)
  }

  // 🎲 flip card for quick rolls vs recent rolls
  const [rollFlip, setRollFlip] = useState(false)


  // 🎯 Target selection (click a token on the map)
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

  // Listen for active initiative changes
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

  // Load + subscribe to selected character action_state
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

      if (error) {
        console.error('PlayerSidebar action_state load error', error)
        return
      }

      const st = ((data as any)?.action_state ?? {}) as ActionState
      setActionState(st)
    }

    loadActionState()

    const channel = supabase
      .channel(`player-actions-${selectedCharacterId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters', filter: `id=eq.${selectedCharacterId}` },
        () => loadActionState()
      )
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

    // optimistic
    setSheet({ ...sheet, hit_points_current: next })
    setHpSaving(true)

    const { error } = await supabase
      .from('characters')
      .update({ hit_points_current: next })
      .eq('id', selectedCharacterId)

    setHpSaving(false)

    if (error) {
      console.error('PlayerSidebar HP update error', error)
      // subscription will re-sync; surface a tiny message
      setSheetError('Could not update HP.')
    }
  }

  // Load + subscribe to lightweight sheet fields
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
        .select(
          [
            'id',
            'name',
            'level',
            'main_job',
            'subclass',
            'race',
            'background',
            'abilities',
            'hit_points_current',
            'hit_points_max',
            'armor_class',
            'speed_ft',
            'spell_save_dc',
            'spell_attack_bonus',
          ].join(',')
        )
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters', filter: `id=eq.${selectedCharacterId}` },
        () => loadSheet()
      )
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

    if (error) {
      console.error('PlayerSidebar update action_state error', error)
    }
  }

  const actionUsed = Boolean(actionState.action_used_turn)
  const bonusUsed = Boolean(actionState.bonus_used_turn)
  const reactionUsed = Boolean(actionState.reaction_used_round)

  return (
    <aside className="hidden w-80 flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 md:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">
          {selectedCharacter ? 'Character Sheet' : 'Choose Your Character'}
        </h2>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
          Player
        </span>
      </div>

      {charsError && <p className="text-xs text-red-400">{charsError}</p>}

      {!address && (
        <p className="text-xs text-amber-400">
          Connect your wallet to pick a character for this session.
        </p>
      )}

      {/* Character Selection View */}
      {address && !selectedCharacter && (
        <>
          <p className="text-[11px] text-slate-400">
            Select which of your DND721 characters you&apos;re playing in this
            session.
          </p>

          {charsLoading && (
            <p className="text-xs text-slate-400">Loading your characters…</p>
          )}

          {!charsLoading && characters.length === 0 && (
            <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/60 p-2">
              <p className="text-xs text-slate-300">
                You don&apos;t have any characters yet.
              </p>
              <Link
                href="/characters/new"
                className="inline-flex rounded-md bg-sky-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-500"
              >
                Create a Character
              </Link>
            </div>
          )}

          {!charsLoading && characters.length > 0 && (
            <div className="mt-1 space-y-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
              <p className="text-[11px] font-semibold text-slate-200">
                Your Characters
              </p>
              <div className="flex flex-col gap-1.5">
                {characters.map((char) => {
                  const isSelected = selectedCharacterId === char.id
                  const name =
                    (char.name &&
                      String(char.name).trim().length > 0 &&
                      String(char.name)) ||
                    'Unnamed Character'

                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => onSelectCharacter(char.id)}
                      className={`w-full rounded-md border px-2 py-1.5 text-left text-xs ${
                        isSelected
                          ? 'border-sky-500 bg-sky-900/40 text-sky-50'
                          : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-500'
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

      {/* Character Sheet View */}
      {address && selectedCharacter && selectedCharacterId && (
        <div className="mt-1 space-y-3">
          {/* Header & Change Button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-200">
                Using Character
              </p>
              <p className="text-xs text-slate-100">
                {selectedCharacter.name || 'Unnamed Character'}
              </p>
            </div>
            <button
              type="button"
              // Passing empty string tells parent to clear selection
              onClick={() => onSelectCharacter('')}
              className="rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500"
            >
              Change
            </button>
          </div>

          {/* ✅ Lightweight Character Sheet Preview (no iframe) */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {(sheet?.name && String(sheet.name).trim()) || selectedCharacter.name || 'Unnamed Character'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {(() => {
                    const lvl = Number(sheet?.level ?? 1)
                    const safeLvl = Number.isFinite(lvl) && lvl > 0 ? Math.floor(lvl) : 1
                    const cls = sheet?.main_job ? String(sheet.main_job) : 'Class'
                    const sub = sheet?.subclass ? String(sheet.subclass) : ''
                    const race = sheet?.race ? String(sheet.race) : ''
                    const bg = sheet?.background ? String(sheet.background) : ''
                    const parts = [
                      `Lv ${safeLvl} ${cls}${sub ? ` (${sub})` : ''}`,
                      race ? race : null,
                      bg ? bg : null,
                    ].filter(Boolean)
                    return parts.join(' • ')
                  })()}
                </p>
              </div>

              <Link
                href={`/characters/${selectedCharacterId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500"
              >
                Open full sheet
              </Link>
            </div>

            {sheetError && <p className="mt-2 text-[11px] text-red-400">{sheetError}</p>}

            {sheetLoading && (
              <p className="mt-2 text-[11px] text-slate-400">Loading preview…</p>
            )}

            {!sheetLoading && !sheetError && (
              <>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2">
                    <p className="text-[10px] text-slate-400">AC</p>
                    <p className="text-lg font-semibold text-slate-100">
                      {Number.isFinite(Number(sheet?.armor_class)) ? Number(sheet?.armor_class) : 10}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2">
                    <p className="text-[10px] text-slate-400">HP</p>
                    <p className="text-lg font-semibold text-slate-100">
                      {Number.isFinite(Number(sheet?.hit_points_current))
                        ? Number(sheet?.hit_points_current)
                        : 0}
                      <span className="text-sm text-slate-400">
                        /{Number.isFinite(Number(sheet?.hit_points_max)) ? Number(sheet?.hit_points_max) : 0}
                      </span>
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        disabled={hpSaving}
                        onClick={() => updateHP(-5)}
                        className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-200 hover:border-sky-500 disabled:opacity-40"
                        aria-label="HP minus 5"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        disabled={hpSaving}
                        onClick={() => updateHP(-1)}
                        className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-200 hover:border-sky-500 disabled:opacity-40"
                        aria-label="HP minus 1"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        disabled={hpSaving}
                        onClick={() => updateHP(+1)}
                        className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-200 hover:border-sky-500 disabled:opacity-40"
                        aria-label="HP plus 1"
                      >
                        +1
                      </button>
                      <button
                        type="button"
                        disabled={hpSaving}
                        onClick={() => updateHP(+5)}
                        className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] text-slate-200 hover:border-sky-500 disabled:opacity-40"
                        aria-label="HP plus 5"
                      >
                        +5
                      </button>

                      {hpSaving && (
                        <span className="ml-1 text-[10px] text-slate-500">Saving…</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2">
                    <p className="text-[10px] text-slate-400">Speed</p>
                    <p className="text-lg font-semibold text-slate-100">{effectiveSpeedFeet} ft</p>
                  </div>
                </div>

                {(sheet?.spell_save_dc != null || sheet?.spell_attack_bonus != null) && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2">
                      <p className="text-[10px] text-slate-400">Spell DC</p>
                      <p className="text-sm font-semibold text-slate-100">
                        {sheet?.spell_save_dc != null ? Number(sheet.spell_save_dc) : '—'}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-800 bg-slate-900/40 p-2">
                      <p className="text-[10px] text-slate-400">Spell ATK</p>
                      <p className="text-sm font-semibold text-slate-100">
                        {sheet?.spell_attack_bonus != null
                          ? fmtMod(Number(sheet.spell_attack_bonus))
                          : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {sheet?.abilities && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {([
                      ['str', 'STR', sheet.abilities.str],
                      ['dex', 'DEX', sheet.abilities.dex],
                      ['con', 'CON', sheet.abilities.con],
                      ['int', 'INT', sheet.abilities.int],
                      ['wis', 'WIS', sheet.abilities.wis],
                      ['cha', 'CHA', sheet.abilities.cha],
                    ] as Array<[AbilityKey, string, number]>).map(([key, label, score]) => (
                      <div
                        key={label}
                        role="button"
                        tabIndex={0}
                        onClick={() => onAbilityCheck(key, `${label} Check`)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return
                          onAbilityCheck(key, `${label} Check`)
                        }}
                        className="cursor-pointer rounded-md border border-slate-800 bg-slate-900/20 p-1.5 hover:border-sky-500 hover:bg-slate-900/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-300">{label}</span>
                          <span className="text-[10px] font-mono text-slate-400">{score}</span>
                        </div>
                        <div className="text-center text-sm font-semibold text-slate-100">
                          {fmtMod(abilityMod(score))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ✅ Turn + Actions + Movement */}
          <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/50 p-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-200">Turn</p>
              {activeWalletLower ? (
                isMyTurn ? (
                  <span className="rounded bg-emerald-700/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-100">
                    Your turn
                  </span>
                ) : (
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200">
                    Waiting: {activeName ?? '—'}
                  </span>
                )
              ) : (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Not started</span>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Movement</span>
                <span className="font-mono text-slate-200">
                  {remainingMoveFt}/{effectiveSpeedFeet} ft
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
                <div
                  className="h-full bg-sky-600"
                  style={{
                    width: `${Math.max(0, Math.min(100, (remainingMoveFt / Math.max(1, effectiveSpeedFeet)) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Drag your token on the map — movement will auto-spend on your turn.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={!isMyTurn || !activeWalletLower || actionUsed}
                onClick={() => updateActionState({ action_used_turn: true })}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 hover:border-sky-500 disabled:opacity-40"
              >
                {actionUsed ? 'Action ✓' : 'Action'}
              </button>
              <button
                type="button"
                disabled={!isMyTurn || !activeWalletLower || bonusUsed}
                onClick={() => updateActionState({ bonus_used_turn: true })}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 hover:border-sky-500 disabled:opacity-40"
              >
                {bonusUsed ? 'Bonus ✓' : 'Bonus'}
              </button>
              <button
                type="button"
                disabled={!activeWalletLower || reactionUsed}
                onClick={() => updateActionState({ reaction_used_round: true })}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 hover:border-sky-500 disabled:opacity-40"
              >
                {reactionUsed ? 'React ✓' : 'React'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={!activeWalletLower || !isMyTurn}
                onClick={() => updateActionState({ move_used_ft: 0, action_used_turn: false, bonus_used_turn: false, reaction_used_round: false })}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500 disabled:opacity-40"
              >
                Reset turn
              </button>
              <span className="text-[10px] text-slate-500">Auto-resets on turn start</span>
            </div>
          </div>

          {/* Quick Rolls */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-slate-200">Rolls</p>
              <button
                type="button"
                onClick={() => setRollFlip((v) => !v)}
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 hover:border-sky-500"
                title="Flip"
              >
                Flip
              </button>
            </div>

            <div className="relative h-[120px]">
              <div
                className="absolute inset-0 [perspective:1000px]"
              >
                <div
                  className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                    rollFlip ? '[transform:rotateY(180deg)]' : ''
                  }`}
                >
                  {/* FRONT */}
                  <div className="absolute inset-0 rounded-xl border border-slate-800 bg-slate-950/60 p-2 [backface-visibility:hidden]">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Quick rolls</span>
                      <span className="text-[10px] text-slate-500">🎲</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAbilityCheck('str', 'STR Check')}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-sky-500"
                      >
                        STR
                      </button>
                      <button
                        type="button"
                        onClick={() => onAbilityCheck('dex', 'DEX Check')}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-sky-500"
                      >
                        DEX
                      </button>
                      <button
                        type="button"
                        onClick={() => onAbilityCheck('con', 'CON Check')}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-sky-500"
                      >
                        CON
                      </button>
                      <button
                        type="button"
                        onClick={onInitiative}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-sky-500"
                      >
                        Initiative
                      </button>

                {/* Target + attack buttons */}
                <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-300">
                      <span className="font-semibold text-slate-100">Target:</span>{' '}
                      <span className="text-slate-200">{(target as any)?.label ?? 'None'}</span>
                      {targetAC != null ? <span className="text-slate-500"> · AC {targetAC}</span> : null}
                    </div>
                    {!isMyTurn ? <span className="text-[10px] text-slate-500">Not your turn</span> : null}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={doWeaponAttack}
                      disabled={!sheet || !target || targetAC == null}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      title={targetAC == null ? 'Select a target token with AC' : 'Roll attack vs target AC'}
                    >
                      Weapon Attack
                    </button>
                    <button
                      type="button"
                      onClick={doSpellAttack}
                      disabled={!sheet || !target || targetAC == null}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                      title={targetAC == null ? 'Select a target token with AC' : 'Roll spell attack vs target AC'}
                    >
                      Spell Attack
                    </button>
                  </div>
                </div>

                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">Logged to Dice Log.</p>
                  </div>

                  {/* BACK */}
                  <div className="absolute inset-0 rounded-xl border border-slate-800 bg-slate-950/60 p-2 [transform:rotateY(180deg)] [backface-visibility:hidden]">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Recent rolls</span>
                      <button
                        type="button"
                        onClick={onOpenDiceLog}
                        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-200 hover:border-sky-500 disabled:opacity-40"
                        disabled={!onOpenDiceLog}
                      >
                        Open log
                      </button>
                    </div>
                    <div className="space-y-1">
                      {(diceLog || []).slice(0, 3).map((r) => (
                        <div key={r.id} className="flex items-center justify-between rounded-md bg-slate-900/60 px-2 py-1">
                          <div className="min-w-0">
                            <div className="truncate text-[10px] text-slate-200">{r.label}</div>
                            <div className="truncate text-[10px] text-slate-500">{r.formula}</div>
                          </div>
                          <div className="ml-2 rounded-md bg-slate-950 px-2 py-0.5 text-[11px] font-bold text-sky-300">
                            {r.result}
                          </div>
                        </div>
                      ))}
                      {(diceLog || []).length === 0 && (
                        <div className="rounded-md bg-slate-900/60 px-2 py-2 text-[11px] text-slate-500">No rolls yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
