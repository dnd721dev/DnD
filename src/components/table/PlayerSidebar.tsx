
'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { CharacterSheetData } from '@/components/character-sheet/types'
import { HandoutsPanel } from '@/components/table/HandoutsPanel'
import TableChat from '@/components/table/TableChat'
import { CLASS_ACTIONS, SUBCLASS_ACTIONS, DND721_ACTIONS } from '@/lib/actions/registry'
import { canUseAction } from '@/lib/actions/canUseAction'
import { getClassResources, CLASS_HIT_DIE } from '@/lib/classResources'
import type { ClassKey } from '@/lib/subclasses'
import type { ActionType, SheetAction } from '@/lib/actions/types'
import { roll as rollDice } from '@/lib/dice'
import { SKILLS, DIE_TYPES, type DieSides, DIE_CONFIG } from '@/lib/dnd5e'
import { getActiveConditionMechanics, CONDITIONS as CONDITION_DEFS, type ConditionKey } from '@/lib/conditions'
import { DiceShape } from '@/components/dice/DiceShape'

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
  | 'resource_state'
  | 'saving_throw_profs'
  | 'skill_proficiencies'
  | 'spell_slots'
  | 'temp_hp'
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

  // Resizable panel
  const [panelHeight, setPanelHeight] = useState(176)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(0)

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const delta = dragStartY.current - clientY
    const next = Math.max(80, Math.min(window.innerHeight * 0.75, dragStartHeight.current + delta))
    setPanelHeight(next)
  }, [])

  const handleDragEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleDragMove)
    document.removeEventListener('mouseup', handleDragEnd)
    document.removeEventListener('touchmove', handleDragMove)
    document.removeEventListener('touchend', handleDragEnd)
  }, [handleDragMove])

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStartY.current = clientY
    dragStartHeight.current = panelHeight
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
    document.addEventListener('touchmove', handleDragMove)
    document.addEventListener('touchend', handleDragEnd)
  }, [panelHeight, handleDragMove, handleDragEnd])

  useEffect(() => () => handleDragEnd(), [handleDragEnd])

  const [activeWalletLower, setActiveWalletLower] = useState<string | null>(null)
  const [activeName, setActiveName] = useState<string | null>(null)

  const [actionState, setActionState] = useState<ActionState>({})

  const [sheet, setSheet] = useState<SheetPreview | null>(null)
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetError, setSheetError] = useState<string | null>(null)
  const [hpSaving, setHpSaving] = useState(false)

  // Short rest hit dice modal
  const [shortRestModal, setShortRestModal] = useState(false)
  const [hitDieRollResult, setHitDieRollResult] = useState<number | null>(null)

  const moveUsedFt = useMemo(() => {
    const n = Number(actionState.move_used_ft ?? 0)
    return Number.isFinite(n) && n >= 0 ? n : 0
  }, [actionState.move_used_ft])

  const activeConditions = useMemo<string[]>(() => {
    const c = (actionState as any)?.active_conditions
    return Array.isArray(c) ? c : []
  }, [actionState])

  const condMechanics = useMemo(() => getActiveConditionMechanics(activeConditions), [activeConditions])

  const effectiveSpeedFeet = useMemo(() => {
    const base = sheet?.speed_ft != null ? clampSpeedFeet(sheet.speed_ft) : clampSpeedFeet(speedFeet)
    if (condMechanics.zeroMovement) return 0
    if (condMechanics.halfMovement) return Math.floor(base / 10) * 5
    return base
  }, [sheet?.speed_ft, speedFeet, condMechanics])

  const remainingMoveFt = useMemo(() => {
    return Math.max(0, effectiveSpeedFeet - moveUsedFt)
  }, [effectiveSpeedFeet, moveUsedFt])

  const isMyTurn = useMemo(() => {
    if (!addressLower) return false
    if (!activeWalletLower) return false
    return addressLower === activeWalletLower
  }, [addressLower, activeWalletLower])

  const [lastAttackHit, setLastAttackHit] = useState<boolean | null>(null)

  // Custom roll picker state
  const [customSides, setCustomSides] = useState<DieSides>(20)
  const [customCount, setCustomCount] = useState(1)
  const [customMod, setCustomMod] = useState(0)

  // Advantage / disadvantage toggle
  const [rollMode, setRollMode] = useState<'normal' | 'adv' | 'dis'>('normal')

  function rollD20VsACWithResult(label: string, bonus: number, mode: 'normal' | 'adv' | 'dis' = 'normal') {
    let d20: number
    let modeNote = ''
    let formulaPrefix = '1d20'
    if (mode === 'adv') {
      const r1 = Math.floor(Math.random() * 20) + 1
      const r2 = Math.floor(Math.random() * 20) + 1
      d20 = Math.max(r1, r2)
      modeNote = ' (Adv)'
      formulaPrefix = '2d20kh1'
    } else if (mode === 'dis') {
      const r1 = Math.floor(Math.random() * 20) + 1
      const r2 = Math.floor(Math.random() * 20) + 1
      d20 = Math.min(r1, r2)
      modeNote = ' (Dis)'
      formulaPrefix = '2d20kl1'
    } else {
      d20 = Math.floor(Math.random() * 20) + 1
    }
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
      label: `${label}${modeNote}${(target as any)?.label ? ` → ${(target as any).label}` : ''}`,
      formula: `${formulaPrefix}${sign}${bonus}`,
      result: total,
      outcome,
    })
  }

  function getAttackRollMode(): 'normal' | 'adv' | 'dis' {
    const hasDis = !!condMechanics.attackDisadvantage || rollMode === 'dis'
    const hasAdv = rollMode === 'adv' || !!actionState.has_inspiration
    // disadvantage always wins
    if (hasDis) return 'dis'
    if (hasAdv) return 'adv'
    return 'normal'
  }

  function rollD20WithMode(mod: number, label: string) {
    const r1 = Math.floor(Math.random() * 20) + 1
    const r2 = Math.floor(Math.random() * 20) + 1
    let d20: number
    let formulaPrefix = '1d20'
    let modeNote = ''
    if (rollMode === 'adv') { d20 = Math.max(r1, r2); formulaPrefix = '2d20kh1'; modeNote = ' (Adv)' }
    else if (rollMode === 'dis') { d20 = Math.min(r1, r2); formulaPrefix = '2d20kl1'; modeNote = ' (Dis)' }
    else { d20 = r1 }
    const total = d20 + mod
    const sign = mod >= 0 ? '+' : ''
    onRoll?.({ label: `${label}${modeNote}`, formula: `${formulaPrefix}${sign}${mod}`, result: total, outcome: null })
  }

  function doWeaponAttack() {
    if (!sheet) return
    const str = Number(sheet.abilities?.str ?? 10)
    const dex = Number(sheet.abilities?.dex ?? 10)
    const mod = Math.max(abilityMod(str), abilityMod(dex))
    const pb = proficiencyBonus(sheet.level)
    const mode = getAttackRollMode()
    rollD20VsACWithResult('Weapon Attack', mod + pb, mode)
    // Inspiration is a one-time benefit — consume it after use
    if (actionState.has_inspiration && mode === 'adv') {
      updateActionState({ has_inspiration: false })
    }
  }

  function doSpellAttack() {
    if (!sheet) return
    const bonus = Number(sheet.spell_attack_bonus ?? 0)
    const mode = getAttackRollMode()
    rollD20VsACWithResult('Spell Attack', Number.isFinite(bonus) ? bonus : 0, mode)
    if (actionState.has_inspiration && mode === 'adv') {
      updateActionState({ has_inspiration: false })
    }
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

  function executeEffects(action: SheetAction) {
    if (!action.effects?.length) return
    for (const fx of action.effects) {
      if (fx.type === 'rollFormula') {
        const r = rollDice(fx.formula)
        onRoll?.({ label: fx.label, formula: fx.formula, result: r.total, outcome: null })
      } else if (fx.type === 'rollAttack') {
        doWeaponAttack()
      } else if (fx.type === 'rollDamage') {
        doWeaponDamage()
      }
    }
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

  // Reset reaction at the start of each new round
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => updateActionState({ reaction_used_round: false })
    window.addEventListener('dnd721-new-round', handler)
    return () => window.removeEventListener('dnd721-new-round', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCharacterId, actionState])

  // GM can grant inspiration via window event (same-device)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = () => updateActionState({ has_inspiration: true })
    window.addEventListener('dnd721-grant-inspiration', handler)
    return () => window.removeEventListener('dnd721-grant-inspiration', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCharacterId, actionState])

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

  async function updateTempHP(value: number) {
    if (!selectedCharacterId || !sheet) return
    const next = Math.max(0, value)
    setSheet({ ...sheet, temp_hp: next })
    await supabase.from('characters').update({ temp_hp: next }).eq('id', selectedCharacterId)
  }

  async function updateHP(delta: number) {
    if (!selectedCharacterId) return
    if (!sheet) return

    const cur = Number(sheet.hit_points_current ?? 0)
    const max = Number(sheet.hit_points_max ?? 0)
    const safeCur = Number.isFinite(cur) ? cur : 0
    const safeMax = Number.isFinite(max) ? max : 0

    // Absorb damage into temp HP first
    let effectiveDelta = delta
    let nextTempHP = Number(sheet.temp_hp ?? 0)
    if (delta < 0 && nextTempHP > 0) {
      const absorbed = Math.min(nextTempHP, Math.abs(delta))
      nextTempHP -= absorbed
      effectiveDelta = delta + absorbed
    }

    const upper = safeMax > 0 ? safeMax : Math.max(1, safeCur + Math.abs(delta) + 9999)
    const next = Math.max(0, Math.min(upper, safeCur + effectiveDelta))

    // Concentration check: taking damage while concentrating
    if (delta < 0 && condMechanics.concentrationRisk) {
      const damageTaken = Math.abs(delta)
      const dc = Math.max(10, Math.floor(damageTaken / 2))
      const con = Number((sheet as any).abilities?.con ?? 10)
      const baseMod = abilityMod(con)
      const pb = proficiencyBonus(sheet.level)
      const hasConProf = Array.isArray(sheet.saving_throw_profs) && sheet.saving_throw_profs.includes('con')
      const totalMod = baseMod + (hasConProf ? pb : 0)
      const d20 = Math.floor(Math.random() * 20) + 1
      const total = d20 + totalMod
      const sign = totalMod >= 0 ? '+' : ''
      const maintained = total >= dc
      onRoll?.({
        label: `Concentration Save (DC ${dc})`,
        formula: `1d20${sign}${totalMod}`,
        result: total,
        outcome: maintained ? `MAINTAINED (vs DC ${dc})` : `BROKEN (vs DC ${dc})`,
      })
      if (!maintained) {
        // Remove concentration condition from player's own state
        const nextConditions = activeConditions.filter((c) => c !== 'concentration')
        updateActionState({ active_conditions: nextConditions })
        // Notify InitiativeTracker to clear the visual condition ring
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dnd721-concentration-broken', { detail: { wallet: addressLower } }))
        }
      }
    }

    setSheet({ ...sheet, hit_points_current: next, temp_hp: nextTempHP })
    setHpSaving(true)

    const updatePayload: Record<string, number> = { hit_points_current: next }
    if (nextTempHP !== Number(sheet.temp_hp ?? 0)) updatePayload.temp_hp = nextTempHP

    const { error } = await supabase
      .from('characters')
      .update(updatePayload)
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
        .select(['id', 'name', 'level', 'main_job', 'subclass', 'race', 'background', 'abilities', 'hit_points_current', 'hit_points_max', 'armor_class', 'speed_ft', 'spell_save_dc', 'spell_attack_bonus', 'resource_state', 'saving_throw_profs', 'skill_proficiencies', 'spell_slots', 'temp_hp'].join(','))
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
    // Broadcast reaction-used so InitiativeTracker can badge the row
    if (patch.reaction_used_round === true && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dnd721-reaction-used', { detail: { wallet: address?.toLowerCase() ?? null } }))
    }
  }

  async function updateResourceState(patch: Record<string, number>) {
    if (!selectedCharacterId || !sheet) return
    const next = { ...(sheet.resource_state ?? {}), ...patch }
    setSheet({ ...sheet, resource_state: next })
    const { error } = await supabase
      .from('characters')
      .update({ resource_state: next })
      .eq('id', selectedCharacterId)
    if (error) console.error('PlayerSidebar update resource_state error', error)
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

    {/* Short Rest — hit dice modal */}
    {shortRestModal && sheet && (() => {
      const classKey = (sheet.main_job ?? '').toLowerCase() as any
      const hitDie = (CLASS_HIT_DIE as Record<string, string>)[classKey] ?? 'd8'
      const dieSides = Number(hitDie.replace('d', ''))
      const con = Number(sheet.abilities?.con ?? 10)
      const conMod = Math.floor((con - 10) / 2)
      const conModStr = conMod >= 0 ? `+${conMod}` : `${conMod}`
      const resources = getClassResources(classKey, Number(sheet.level ?? 1))
      const hitDieRes = resources.find((r) => r.key === 'hit_die')
      const hitDieCurrent = hitDieRes ? Number(sheet.resource_state?.['hit_die'] ?? hitDieRes.max) : 0
      return (
        <div className="pointer-events-auto fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-xs rounded-2xl border border-emerald-700/60 bg-slate-950/95 p-5 shadow-2xl">
            <h3 className="mb-1 text-base font-bold text-emerald-300">Short Rest</h3>
            <p className="mb-3 text-[11px] text-slate-400">Spend hit dice to recover HP. You have <span className="text-slate-200 font-semibold">{hitDieCurrent}</span> {hitDie} remaining.</p>
            {hitDieRollResult != null && (
              <p className="mb-2 text-center text-sm font-bold text-emerald-200">Healed +{hitDieRollResult} HP</p>
            )}
            <button
              type="button"
              disabled={hitDieCurrent <= 0 || hpSaving}
              onClick={() => {
                const roll = Math.floor(Math.random() * dieSides) + 1
                const heal = Math.max(1, roll + conMod)
                setHitDieRollResult(heal)
                updateHP(+heal)
                updateResourceState({ hit_die: Math.max(0, hitDieCurrent - 1) })
                onRoll?.({ label: `Hit Die (${hitDie}${conModStr})`, formula: `1${hitDie}${conModStr}`, result: heal, outcome: null })
              }}
              className="mb-2 w-full rounded-xl border border-emerald-700/60 bg-emerald-600/20 py-2.5 text-sm font-bold text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-40"
            >
              Roll 1{hitDie}{conModStr}
            </button>
            <button
              type="button"
              onClick={() => {
                // Reset short-rest class resources
                if (sheet.main_job) {
                  const res = getClassResources(sheet.main_job as any, Number(sheet.level ?? 1))
                  const patch: Record<string, number> = {}
                  res.filter((r) => r.recharge === 'short_rest' && r.key !== 'hit_die').forEach((r) => { patch[r.key] = r.max })
                  if (Object.keys(patch).length > 0) updateResourceState(patch)
                }
                setHitDieRollResult(null)
                setShortRestModal(false)
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Done resting
            </button>
          </div>
        </div>
      )
    })()}

    <aside className="pointer-events-auto flex flex-col rounded-t-xl border border-b-0 border-yellow-800/40 bg-slate-950/90 backdrop-blur-md text-xs">

      {/* Drag handle */}
      <div
        className="flex h-4 shrink-0 cursor-ns-resize items-center justify-center"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="h-1.5 w-12 rounded-full bg-slate-600 hover:bg-yellow-500/60 transition-colors" />
      </div>

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
      {!collapsed && <div className="overflow-hidden p-2" style={{ height: panelHeight }}>

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
                        {(sheet?.temp_hp ?? 0) > 0 && (
                          <p className="text-[9px] font-semibold text-teal-400 leading-tight">+{sheet!.temp_hp} tmp</p>
                        )}
                        <div className="mt-1 flex gap-0.5">
                          <button type="button" disabled={hpSaving} onClick={() => updateHP(-5)} className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-200 hover:border-yellow-500/60 disabled:opacity-40">-5</button>
                          <button type="button" disabled={hpSaving} onClick={() => updateHP(-1)} className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-200 hover:border-yellow-500/60 disabled:opacity-40">-1</button>
                          <button type="button" disabled={hpSaving} onClick={() => updateHP(+1)} className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-200 hover:border-yellow-500/60 disabled:opacity-40">+1</button>
                          <button type="button" disabled={hpSaving} onClick={() => updateHP(+5)} className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-200 hover:border-yellow-500/60 disabled:opacity-40">+5</button>
                        </div>
                        <div className="mt-0.5 flex items-center gap-0.5">
                          <span className="text-[8px] text-teal-400/70">TMP</span>
                          <button type="button" disabled={hpSaving} onClick={() => updateTempHP((sheet?.temp_hp ?? 0) - 1)} className="rounded border border-teal-900/50 bg-slate-950 px-1 py-0 text-[9px] text-teal-300 hover:border-teal-500/50 disabled:opacity-40">-</button>
                          <span className="w-4 text-center text-[9px] font-mono text-teal-300">{sheet?.temp_hp ?? 0}</span>
                          <button type="button" disabled={hpSaving} onClick={() => updateTempHP((sheet?.temp_hp ?? 0) + 1)} className="rounded border border-teal-900/50 bg-slate-950 px-1 py-0 text-[9px] text-teal-300 hover:border-teal-500/50 disabled:opacity-40">+</button>
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
                          const saveAutoFail =
                            (key === 'str' && condMechanics.autoFailStr) ||
                            (key === 'dex' && condMechanics.autoFailDex)
                          return (
                            <div
                              key={key}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                if (saveAutoFail) {
                                  onRoll?.({ label: `${label} Save — AUTO FAIL`, formula: '0', result: 0, outcome: 'AUTO FAIL' })
                                } else {
                                  onAbilityCheck(key, `${label} Check`)
                                }
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onAbilityCheck(key, `${label} Check`) }}
                              className={`cursor-pointer rounded-md border p-1 ${saveAutoFail ? 'border-red-700/60 bg-red-950/30 hover:bg-red-900/30' : 'border-yellow-900/30 bg-slate-900/20 hover:border-yellow-500/50 hover:bg-slate-900/30'}`}
                              title={saveAutoFail ? 'Auto-fail (condition)' : undefined}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-semibold ${saveAutoFail ? 'text-red-300' : 'text-slate-300'}`}>{label}</span>
                                <span className="font-mono text-[9px] text-slate-400">{score}</span>
                              </div>
                              <div className={`text-center text-xs font-semibold ${saveAutoFail ? 'text-red-400' : 'text-slate-100'}`}>
                                {saveAutoFail ? '✗' : fmtMod(abilityMod(score))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* RIGHT: Turn + action economy + class resources */}
              <div className="flex flex-col gap-2 overflow-y-auto">

                {/* Active condition banner */}
                {activeConditions.length > 0 && (
                  <div className="rounded-lg border border-red-800/50 bg-red-950/30 p-2 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-red-300/90">Conditions</p>
                    {activeConditions.map(key => {
                      const cond = CONDITION_DEFS[key as ConditionKey]
                      if (!cond) return null
                      return (
                        <div key={key} className="text-[10px]">
                          <span className="font-semibold text-red-200">{cond.name}</span>
                          {cond.bullets?.[0] && (
                            <span className="text-slate-400"> — {cond.bullets[0]}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Turn indicator + movement */}
                <div className="rounded-lg border border-yellow-900/30 bg-slate-900/50 p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-yellow-300/70">Turn</p>
                    <div className="flex items-center gap-1">
                      {/* Inspiration toggle */}
                      <button
                        type="button"
                        title={actionState.has_inspiration ? 'Inspiration active — click to use/clear' : 'No inspiration'}
                        onClick={() => updateActionState({ has_inspiration: !actionState.has_inspiration })}
                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition ${actionState.has_inspiration ? 'bg-amber-500/80 text-amber-950 shadow-[0_0_6px_rgba(245,158,11,0.7)]' : 'border border-slate-700 bg-slate-950 text-slate-500 hover:text-amber-400'}`}
                      >
                        {actionState.has_inspiration ? '★ Inspired' : '☆'}
                      </button>
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
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Move</span>
                      <span className="font-mono text-slate-200">{remainingMoveFt}/{effectiveSpeedFeet} ft</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded bg-slate-800">
                      <div className="h-full bg-amber-600/70 transition-all" style={{ width: `${Math.max(0, Math.min(100, (remainingMoveFt / Math.max(1, effectiveSpeedFeet)) * 100))}%` }} />
                    </div>
                  </div>
                </div>

                {/* Class resources (Ki, Rage, etc.) */}
                {sheet?.main_job && (() => {
                  const resources = getClassResources(sheet.main_job as ClassKey, Number(sheet.level ?? 1))
                  if (resources.length === 0) return null
                  return (
                    <div className="rounded-lg border border-yellow-900/30 bg-slate-900/50 p-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-yellow-300/70">Resources</p>
                      <div className="space-y-1">
                        {resources.map((res) => {
                          const current = Number(sheet.resource_state?.[res.key] ?? res.max)
                          return (
                            <div key={res.key} className="flex items-center justify-between gap-1">
                              <span className="min-w-0 truncate text-[10px] text-slate-300">{res.name}</span>
                              <div className="flex shrink-0 items-center gap-1">
                                <button type="button" onClick={() => updateResourceState({ [res.key]: Math.max(0, current - 1) })} disabled={current <= 0} className="flex h-5 w-5 items-center justify-center rounded border border-slate-700 bg-slate-950 text-[10px] text-slate-200 hover:border-yellow-500/50 disabled:opacity-30">−</button>
                                <span className="w-10 text-center font-mono text-[10px] text-slate-100">{current}/{res.max}</span>
                                <button type="button" onClick={() => updateResourceState({ [res.key]: Math.min(res.max, current + 1) })} disabled={current >= res.max} className="flex h-5 w-5 items-center justify-center rounded border border-slate-700 bg-slate-950 text-[10px] text-slate-200 hover:border-yellow-500/50 disabled:opacity-30">+</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Spell Slots (Warlock uses Pact Magic; others use level slots) */}
                {(() => {
                  const isWarlock = (sheet?.main_job ?? '').toLowerCase() === 'warlock'
                  if (isWarlock) {
                    // Pact Magic: single slot pool that recharges on short rest
                    const resources = getClassResources('warlock', Number(sheet?.level ?? 1))
                    const pactRes = resources.find((r) => r.key === 'warlock.pact_magic')
                    if (!pactRes) return null
                    const maxSlots = pactRes.max
                    const curSlots = Number(sheet?.resource_state?.['warlock.pact_magic'] ?? maxSlots)
                    const pactLevel = Number(sheet?.level ?? 1) >= 9 ? 5 : Number(sheet?.level ?? 1) >= 7 ? 4 : Number(sheet?.level ?? 1) >= 5 ? 3 : Number(sheet?.level ?? 1) >= 3 ? 2 : 1
                    return (
                      <div className="rounded-lg border border-violet-900/30 bg-slate-900/50 p-2">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/70">Pact Magic</p>
                          <span className="text-[9px] text-slate-500">Lv {pactLevel} slots · Short Rest</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {Array.from({ length: maxSlots }).map((_, i) => (
                              <div key={i} className={`h-2.5 w-2.5 rounded-full border ${i < curSlots ? 'border-violet-500/60 bg-violet-600/50' : 'border-slate-700 bg-slate-900'}`} />
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={curSlots <= 0}
                            onClick={() => updateResourceState({ 'warlock.pact_magic': Math.max(0, curSlots - 1) })}
                            className="ml-auto shrink-0 rounded border border-violet-800/50 bg-violet-950/40 px-1.5 py-0.5 text-[9px] text-violet-300 hover:border-violet-500/60 disabled:opacity-30"
                          >
                            Cast
                          </button>
                        </div>
                      </div>
                    )
                  }
                  if (!sheet?.spell_slots || Object.keys(sheet.spell_slots).length === 0) return null
                  return (
                    <div className="rounded-lg border border-violet-900/30 bg-slate-900/50 p-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-violet-300/70">Spell Slots</p>
                      <div className="space-y-0.5">
                        {Object.entries(sheet.spell_slots).map(([lvl, maxCount]) => {
                          const usedKey = `spell_slot_${lvl}`
                          const used = Math.min(Number(sheet.resource_state?.[usedKey] ?? 0), Number(maxCount))
                          const remaining = Number(maxCount) - used
                          return (
                            <div key={lvl} className="flex items-center gap-1.5">
                              <span className="w-10 shrink-0 text-[9px] text-slate-400">Lv {lvl}</span>
                              <div className="flex gap-0.5">
                                {Array.from({ length: Number(maxCount) }).map((_, i) => (
                                  <div key={i} className={`h-2.5 w-2.5 rounded-full border ${i < remaining ? 'border-violet-500/60 bg-violet-600/50' : 'border-slate-700 bg-slate-900'}`} />
                                ))}
                              </div>
                              <button
                                type="button"
                                disabled={remaining <= 0}
                                onClick={() => updateResourceState({ [usedKey]: used + 1 })}
                                className="ml-auto shrink-0 rounded border border-violet-800/50 bg-violet-950/40 px-1.5 py-0.5 text-[9px] text-violet-300 hover:border-violet-500/60 disabled:opacity-30"
                              >
                                Cast
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {/* Weapon attack quick roll */}
                {sheet?.abilities && (
                  <div className="rounded-lg border border-yellow-900/30 bg-slate-900/50 p-1.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-yellow-300/70">Attack</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={doWeaponAttack}
                        className="flex-1 rounded-md border border-emerald-800/50 bg-emerald-900/20 px-1 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-900/40"
                        title="Weapon attack roll"
                      >
                        ⚔ Attack {fmtMod(Math.max(abilityMod(Number(sheet.abilities.str ?? 10)), abilityMod(Number(sheet.abilities.dex ?? 10))) + proficiencyBonus(sheet.level))}
                      </button>
                      <button
                        type="button"
                        onClick={doWeaponDamage}
                        className="flex-1 rounded-md border border-orange-800/50 bg-orange-900/20 px-1 py-1 text-[10px] font-semibold text-orange-200 hover:bg-orange-900/40"
                        title="Weapon damage roll"
                      >
                        💥 Damage
                      </button>
                    </div>
                  </div>
                )}

                {/* Action economy — grouped by slot type */}
                {(() => {
                  const classKey = (sheet?.main_job ?? '').toLowerCase()
                  const subKey = (sheet?.subclass ?? '').toLowerCase()
                  const resState = sheet?.resource_state ?? {}
                  const allClassActions = [...CLASS_ACTIONS, ...SUBCLASS_ACTIONS, ...DND721_ACTIONS]
                  // Show only actions whose gate passes for this character's class/subclass
                  const available = allClassActions.filter((a) => {
                    const g = a.gates
                    if (g.kind === 'class') return g.classKey.toLowerCase() === classKey
                    if (g.kind === 'subclass') return g.subclassKey.toLowerCase() === subKey
                    return false
                  })

                  type SlotGroup = { label: string; emoji: string; slotUsed: boolean; onMarkSlot: () => void; actionType: ActionType }
                  const groups: SlotGroup[] = [
                    { label: 'Action', emoji: '⚔', slotUsed: actionUsed, onMarkSlot: () => updateActionState({ action_used_turn: true }), actionType: 'action' },
                    { label: 'Bonus Action', emoji: '↩', slotUsed: bonusUsed, onMarkSlot: () => updateActionState({ bonus_used_turn: true }), actionType: 'bonus_action' },
                    { label: 'Reaction', emoji: '⚡', slotUsed: reactionUsed, onMarkSlot: () => updateActionState({ reaction_used_round: true }), actionType: 'reaction' },
                  ]

                  return (
                    <div className="space-y-1.5">
                      {groups.map((grp) => {
                        const grpActions = available.filter((a) => a.actionType === grp.actionType)
                        const freeActions = available.filter((a) => a.actionType === 'free' && grp.actionType === 'action')
                        const condBlocked =
                          (grp.actionType === 'action' || grp.actionType === 'bonus_action') && !!condMechanics.blockActions ||
                          grp.actionType === 'reaction' && !!condMechanics.blockReactions
                        const condBlockLabel = activeConditions
                          .map(k => CONDITION_DEFS[k as ConditionKey]?.name)
                          .filter(Boolean)
                          .join(', ')
                        return (
                          <div key={grp.label} className={`rounded-lg border p-1.5 ${condBlocked ? 'border-red-800/50 bg-red-950/20' : 'border-yellow-900/30 bg-slate-900/50'}`}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className={`text-[10px] font-semibold ${condBlocked ? 'text-red-400/80' : 'text-yellow-300/70'}`}>{grp.emoji} {grp.label}</span>
                              <button
                                type="button"
                                onClick={grp.onMarkSlot}
                                disabled={grp.slotUsed || condBlocked}
                                title={condBlocked ? `Blocked by condition (${condBlockLabel})` : undefined}
                                className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition ${
                                  condBlocked ? 'bg-red-900/60 text-red-300 cursor-not-allowed' :
                                  grp.slotUsed ? 'bg-slate-800 text-slate-500' :
                                  'bg-slate-800 text-slate-300 hover:border-yellow-500/50'
                                }`}
                              >
                                {condBlocked ? `Blocked` : grp.slotUsed ? 'Used ✓' : 'Free'}
                              </button>
                            </div>
                            {(grpActions.length > 0 || freeActions.length > 0) && (
                              <div className="flex flex-wrap gap-1">
                                {grpActions.map((a) => {
                                  const usable = canUseAction({ action: a, classKey, subclassKey: subKey, actionState, resourceState: resState })
                                  const isSlotBlocked = grp.slotUsed && grp.actionType !== 'reaction' // reaction can be used anytime
                                  return (
                                    <button
                                      key={a.id}
                                      type="button"
                                      disabled={!usable.ok || isSlotBlocked}
                                      title={a.description ?? a.name}
                                      onClick={() => {
                                        // Mark the slot
                                        if (grp.actionType === 'action') updateActionState({ action_used_turn: true })
                                        else if (grp.actionType === 'bonus_action') updateActionState({ bonus_used_turn: true })
                                        else if (grp.actionType === 'reaction') updateActionState({ reaction_used_round: true })
                                        // Spend resource or set flag
                                        if (a.cost.type === 'resource') {
                                          const cur = Number(resState[a.cost.key] ?? 0)
                                          updateResourceState({ [a.cost.key]: Math.max(0, cur - a.cost.amount) })
                                        } else if (a.cost.type === 'perTurnFlag' || a.cost.type === 'perRestFlag') {
                                          updateActionState({ [a.cost.flag]: true })
                                        }
                                        // Execute any roll effects
                                        executeEffects(a)
                                      }}
                                      className="rounded-md border border-yellow-900/30 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 hover:border-yellow-500/50 disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                      {a.name}
                                    </button>
                                  )
                                })}
                                {freeActions.map((a) => {
                                  const usable = canUseAction({ action: a, classKey, subclassKey: subKey, actionState, resourceState: resState })
                                  return (
                                    <button
                                      key={a.id}
                                      type="button"
                                      disabled={!usable.ok}
                                      title={`${a.description ?? a.name} (Free)`}
                                      onClick={() => {
                                        if (a.cost.type === 'resource') {
                                          const cur = Number(resState[a.cost.key] ?? 0)
                                          updateResourceState({ [a.cost.key]: Math.max(0, cur - a.cost.amount) })
                                        } else if (a.cost.type === 'perTurnFlag' || a.cost.type === 'perRestFlag') {
                                          updateActionState({ [a.cost.flag]: true })
                                        }
                                      }}
                                      className="rounded-md border border-slate-700/50 bg-slate-950 px-2 py-1 text-[10px] text-slate-400 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-35"
                                    >
                                      {a.name} <span className="text-[9px] text-slate-500">(free)</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}

                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!activeWalletLower || !isMyTurn}
                    onClick={() => updateActionState({ move_used_ft: 0, action_used_turn: false, bonus_used_turn: false, reaction_used_round: false })}
                    className="flex-1 rounded-md border border-yellow-900/30 bg-slate-950 px-2 py-1 text-[10px] text-slate-200 hover:border-yellow-500/50 disabled:opacity-40"
                  >
                    Reset turn
                  </button>
                  <button
                    type="button"
                    onClick={() => { setHitDieRollResult(null); setShortRestModal(true) }}
                    className="shrink-0 rounded-md border border-emerald-900/50 bg-slate-950 px-2 py-1 text-[10px] text-emerald-300/70 hover:border-emerald-500/60"
                    title="Short Rest — spend hit dice to heal"
                  >
                    Short Rest
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Reset ALL resources (short + long rest) and all spell slots
                      if (sheet?.main_job) {
                        const res = getClassResources(sheet.main_job as any, Number(sheet.level ?? 1))
                        const patch: Record<string, number> = {}
                        res.forEach((r) => { patch[r.key] = r.max })
                        if (sheet.spell_slots) Object.keys(sheet.spell_slots).forEach((lvl) => { patch[`spell_slot_${lvl}`] = 0 })
                        updateResourceState(patch)
                      }
                    }}
                    className="shrink-0 rounded-md border border-indigo-900/50 bg-slate-950 px-2 py-1 text-[10px] text-indigo-300/70 hover:border-indigo-500/60"
                    title="Long Rest — restore all resources and spell slots"
                  >
                    Long Rest
                  </button>
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

              {/* LEFT: Ability checks + Saving Throws + Skills + Initiative + Recent Rolls */}
              <div className="flex flex-col gap-2 overflow-y-auto pr-0.5">

                {/* Ability Checks */}
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Ability Checks</p>
                  <div className="grid grid-cols-3 gap-1">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((key) => {
                      const score = Number(sheet?.abilities?.[key] ?? 10)
                      const mod = abilityMod(score)
                      return (
                        <button key={key} type="button" onClick={() => rollD20WithMode(mod, `${key.toUpperCase()} Check`)}
                          className="rounded-md border border-yellow-900/30 bg-slate-900 px-1 py-1.5 text-center hover:border-yellow-500/50 hover:bg-slate-900/80">
                          <div className="text-[10px] font-semibold text-slate-200">{key.toUpperCase()}</div>
                          <div className="text-[9px] font-mono text-slate-400">{fmtMod(mod)}</div>
                        </button>
                      )
                    })}
                  </div>
                  <button type="button" onClick={onInitiative}
                    className="mt-1.5 w-full rounded-md border border-yellow-900/30 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 hover:border-yellow-500/50 hover:text-yellow-100">
                    ⚡ Initiative {sheet?.abilities ? fmtMod(abilityMod(Number(sheet.abilities.dex ?? 10))) : ''}
                  </button>
                </div>

                {/* Saving Throws */}
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Saving Throws</p>
                  <div className="grid grid-cols-3 gap-1">
                    {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((key) => {
                      const score = Number(sheet?.abilities?.[key] ?? 10)
                      const base = abilityMod(score)
                      const pb = proficiencyBonus(sheet?.level)
                      const hasSaveProf = Array.isArray(sheet?.saving_throw_profs) && sheet.saving_throw_profs.includes(key)
                      const saveMod = base + (hasSaveProf ? pb : 0)
                      return (
                        <button key={key} type="button"
                          onClick={() => rollD20WithMode(saveMod, `${key.toUpperCase()} Save`)}
                          className="rounded-md border border-blue-900/30 bg-slate-900 px-1 py-1.5 text-center hover:border-blue-500/50 hover:bg-slate-900/80">
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="text-[10px] font-semibold text-blue-200">{key.toUpperCase()}</span>
                            {hasSaveProf && <span className="text-[8px] text-blue-400 leading-none">●</span>}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">{fmtMod(saveMod)}</div>
                        </button>
                      )
                    })}
                  </div>
                  {/* Death Save */}
                  <button type="button"
                    onClick={() => {
                      const d20 = Math.floor(Math.random() * 20) + 1
                      const outcome = d20 === 20 ? 'NAT 20 — Regain 1 HP!'
                        : d20 === 1 ? 'NAT 1 — Two failures!'
                        : d20 >= 10 ? 'SUCCESS'
                        : 'FAIL'
                      onRoll?.({ label: 'Death Save', formula: '1d20', result: d20, outcome })
                    }}
                    className="mt-1.5 w-full rounded-md border border-red-900/40 bg-red-950/20 px-2 py-1.5 text-[11px] font-semibold text-red-300 hover:border-red-600/50 hover:bg-red-950/30">
                    ☠ Death Save
                  </button>
                </div>

                {/* Skill Checks */}
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Skill Checks</p>
                  <div className="grid grid-cols-2 gap-1">
                    {SKILLS.map((skill) => {
                      const score = Number(sheet?.abilities?.[skill.ability] ?? 10)
                      const base = abilityMod(score)
                      const pb = proficiencyBonus(sheet?.level)
                      const profState = (sheet?.skill_proficiencies as any)?.[skill.key] ?? 'none'
                      const skillMod = profState === 'expertise' ? base + pb * 2 : profState === 'proficient' ? base + pb : base
                      const skillMark = profState === 'expertise' ? '◉' : profState === 'proficient' ? '●' : ''
                      return (
                        <button key={skill.key} type="button"
                          onClick={() => rollD20WithMode(skillMod, skill.name)}
                          className="rounded-md border border-yellow-900/30 bg-slate-900 px-1.5 py-1.5 text-left hover:border-yellow-500/50 hover:bg-slate-900/80">
                          <div className="flex items-center justify-between gap-0.5">
                            <span className="truncate text-[10px] text-slate-200">{skill.name}</span>
                            {skillMark && <span className="shrink-0 text-[8px] text-yellow-400 leading-none">{skillMark}</span>}
                          </div>
                          <div className="text-[9px] font-mono text-slate-500">{skill.ability.toUpperCase()} {fmtMod(skillMod)}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Recent Rolls */}
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Recent Rolls</span>
                    <button type="button" onClick={onOpenDiceLog} disabled={!onOpenDiceLog}
                      className="rounded border border-yellow-800/50 bg-slate-900 px-1.5 py-0.5 text-[9px] text-yellow-300/70 hover:border-yellow-500/60 disabled:opacity-40">
                      Full log
                    </button>
                  </div>
                  <div className="space-y-1">
                    {(diceLog || []).slice(0, 4).map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded-md bg-slate-900/60 px-2 py-1">
                        <div className="min-w-0">
                          <div className="truncate text-[10px] text-slate-200">{r.label}</div>
                          <div className="truncate text-[9px] text-slate-500 font-mono">{r.formula}</div>
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

              {/* RIGHT: Target + Quick Dice + Custom Roll */}
              <div className="flex flex-col gap-2 overflow-y-auto pr-0.5">

                {/* Target + attack */}
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
                    <div className="py-2 text-center text-[11px] text-slate-500">Click an enemy token on the map to target it</div>
                  )}
                </div>

                {/* Roll Mode toggle */}
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Roll Mode</p>
                  <div className="flex gap-0.5 rounded-lg bg-slate-900/80 p-0.5">
                    {(['adv', 'normal', 'dis'] as const).map((mode) => {
                      const labels = { adv: 'Adv', normal: 'Normal', dis: 'Dis' }
                      const isActive = rollMode === mode
                      const cls = {
                        adv: isActive ? 'bg-emerald-700/80 text-emerald-100 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'text-slate-400 hover:text-emerald-300',
                        normal: isActive ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200',
                        dis: isActive ? 'bg-red-800/80 text-red-100 shadow-[0_0_6px_rgba(220,38,38,0.5)]' : 'text-slate-400 hover:text-red-300',
                      }
                      return (
                        <button key={mode} type="button" onClick={() => setRollMode(mode)}
                          className={`flex-1 rounded-md px-1 py-1 text-[10px] font-semibold transition ${cls[mode]}`}>
                          {labels[mode]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Quick Dice */}
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Quick Dice</p>
                  <div className="flex flex-wrap gap-1.5">
                    {([4, 6, 8, 10, 12, 20] as DieSides[]).map((s) => {
                      const dcfg = DIE_CONFIG[s]
                      return (
                        <button key={s} type="button"
                          onClick={() => {
                            const result = Math.floor(Math.random() * s) + 1
                            onRoll?.({ label: `d${s}`, formula: `1d${s}`, result, outcome: null })
                          }}
                          className="flex flex-col items-center gap-0.5 rounded-md border bg-slate-900/80 p-1 transition hover:scale-105 active:scale-95"
                          style={{ borderColor: dcfg.highlight + '55' }}
                        >
                          <DiceShape sides={s} size={22} theme="icon" />
                          <span className="text-[8px] font-semibold" style={{ color: dcfg.highlight }}>d{s}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom Roll */}
                <div className="rounded-lg border border-yellow-900/30 bg-slate-950/60 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-yellow-300/60">Custom Roll</p>

                  {/* Die type picker */}
                  <div className="mb-2 flex flex-wrap gap-1">
                    {(DIE_TYPES as unknown as DieSides[]).map((s) => {
                      const dcfg = DIE_CONFIG[s]
                      const isSelected = customSides === s
                      return (
                        <button key={s} type="button" onClick={() => setCustomSides(s)}
                          className="flex flex-col items-center rounded-md border p-1 transition"
                          style={{
                            borderColor: isSelected ? dcfg.highlight : dcfg.highlight + '33',
                            background: isSelected ? dcfg.color + '55' : 'transparent',
                            boxShadow: isSelected ? `0 0 8px ${dcfg.glow}` : 'none',
                          }}
                        >
                          <DiceShape sides={s} size={20} theme="icon" />
                          <span className="text-[8px]" style={{ color: isSelected ? dcfg.highlight : '#64748b' }}>d{s}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Count + Modifier */}
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400">Qty</span>
                      <button type="button" onClick={() => setCustomCount(c => Math.max(1, c - 1))}
                        className="h-5 w-5 rounded border border-slate-700 bg-slate-900 text-[11px] text-slate-200 hover:border-yellow-500/50 leading-none">−</button>
                      <span className="w-5 text-center text-[11px] font-bold text-slate-100">{customCount}</span>
                      <button type="button" onClick={() => setCustomCount(c => Math.min(10, c + 1))}
                        className="h-5 w-5 rounded border border-slate-700 bg-slate-900 text-[11px] text-slate-200 hover:border-yellow-500/50 leading-none">+</button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400">Mod</span>
                      <button type="button" onClick={() => setCustomMod(m => m - 1)}
                        className="h-5 w-5 rounded border border-slate-700 bg-slate-900 text-[11px] text-slate-200 hover:border-yellow-500/50 leading-none">−</button>
                      <span className="w-8 text-center text-[11px] font-mono font-bold text-slate-100">{fmtMod(customMod)}</span>
                      <button type="button" onClick={() => setCustomMod(m => m + 1)}
                        className="h-5 w-5 rounded border border-slate-700 bg-slate-900 text-[11px] text-slate-200 hover:border-yellow-500/50 leading-none">+</button>
                    </div>
                  </div>

                  {/* Roll button */}
                  {(() => {
                    const dcfg = DIE_CONFIG[customSides]
                    const modStr = customMod !== 0 ? fmtMod(customMod) : ''
                    const formula = `${customCount}d${customSides}${modStr}`
                    return (
                      <button type="button"
                        onClick={() => {
                          const r = rollDice(formula)
                          onRoll?.({ label: formula, formula, result: r.total, outcome: null })
                        }}
                        className="w-full rounded-lg border py-1.5 text-[11px] font-bold transition hover:opacity-90 active:scale-95"
                        style={{
                          borderColor: dcfg.highlight + '88',
                          background: dcfg.color + '40',
                          color: dcfg.highlight,
                          boxShadow: `0 0 10px ${dcfg.glow.replace('0.8', '0.3')}`,
                        }}
                      >
                        Roll {formula}
                      </button>
                    )
                  })()}
                </div>

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
