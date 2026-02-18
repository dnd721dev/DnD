'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import type { Abilities } from '../../../types/character'
import type { CharacterSheetData, RollEntry } from '@/components/character-sheet/types'

import { CharacterHeader } from '@/components/character-sheet/CharacterHeader'
import { AbilitiesPanel } from '@/components/character-sheet/AbilitiesPanel'
import { SavingThrowsPanel } from '@/components/character-sheet/SavingThrowsPanel'
import { SkillsPanel } from '@/components/character-sheet/SkillsPanel'
import { TraitsFeaturesPanel } from '@/components/character-sheet/TraitsFeaturesPanel'
import { SpellsPanel } from '@/components/character-sheet/SpellsPanel'
import { RollLogPanel } from '@/components/character-sheet/RollLogPanel'
import { PersonalityNotesPanel } from '@/components/character-sheet/PersonalityNotesPanel'
import { ResourcesPanel } from '@/components/character-sheet/ResourcesPanel'
import { CombatStatsPanel } from '@/components/character-sheet/CombatStatsPanel'
import { EquipmentPanel } from '@/components/character-sheet/EquipmentPanel'
import { InventoryPanel } from '@/components/character-sheet/InventoryPanel'
import { ActionsPanel } from '@/components/character-sheet/ActionsPanel'

import { abilityMod } from '@/components/character-sheet/utils'
import { deriveStats } from '@/components/character-sheet/calc'
import { roll, rollD20WithCrit, rollDamageWithCrit } from '@/lib/dice'

import { canUseAction, type SheetAction } from '@/lib/actions'
import { ALL_ACTIONS } from '@/lib/actions/registry'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function normKey(v: any) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

// ✅ FIX: supports both `subclass` (new) and `subclass_key` (old/legacy)
function getSubclassKey(c: any) {
  return normKey(c?.subclass ?? c?.subclass_key)
}

function sneakDiceCount(level: number) {
  // 1d6 at 1, +1d6 every 2 levels
  return Math.floor((level + 1) / 2)
}

/**
 * ✅ Clears any "perRestFlag" locks (Action Surge, Second Wind, etc)
 * - Short rest clears only short-rest flags
 * - Long rest clears both short + long flags
 */
function clearPerRestFlags(prev: Record<string, any>, rest: 'short' | 'long') {
  const next: Record<string, any> = { ...(prev ?? {}) }

  for (const a of ALL_ACTIONS) {
    const cost: any = (a as any).cost
    if (!cost || cost.type !== 'perRestFlag') continue

    const flag = String(cost.flag ?? '').trim()
    const flagRest = cost.rest as 'short' | 'long' | undefined

    if (!flag || !flagRest) continue

    if (rest === 'short' && flagRest === 'short') {
      delete next[flag]
    }

    if (rest === 'long' && (flagRest === 'short' || flagRest === 'long')) {
      delete next[flag]
    }
  }

  return next
}

export default function CharacterSheetPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [c, setC] = useState<CharacterSheetData | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ Attack crit tracking
  const [lastAttackWasCrit, setLastAttackWasCrit] = useState(false)

  // ✅ Persisted state
  const [resourceValues, setResourceValues] = useState<Record<string, number>>({})
  const [actionState, setActionState] = useState<Record<string, any>>({})
  const [sneakArmed, setSneakArmed] = useState(false)

  const saveTimer = useRef<any>(null)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle()

      if (error) console.error(error)
      setC(data as any)

      // hydrate persisted state
      const rs = (data as any)?.resource_state ?? {}
      const as = (data as any)?.action_state ?? {}
      setResourceValues(typeof rs === 'object' && rs ? rs : {})
      setActionState(typeof as === 'object' && as ? as : {})

      setLoading(false)
    })()
  }, [id])

  const abilities: Abilities = useMemo(
    () =>
      c?.abilities ?? {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
      },
    [c],
  )

  const savingThrowSet = useMemo(() => {
    const raw = (c?.saving_throw_profs ?? []) as string[]
    return new Set(raw.map((v) => String(v).toLowerCase()))
  }, [c?.saving_throw_profs])

  const d = useMemo(() => {
    if (!c) return null
    return deriveStats(c, abilities)
  }, [c, abilities])

  // Ensure resourceValues contains keys for derived resources (and clamp)
  useEffect(() => {
    if (!d) return
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        const fallback = r.current ?? r.max
        const v = typeof next[r.key] === 'number' ? next[r.key] : fallback
        next[r.key] = clamp(v, 0, r.max)
      }
      return next
    })
  }, [d])

  // ✅ Debounced Supabase persistence for resource_state + action_state
  useEffect(() => {
    if (!c) return
    if (loading) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from('characters')
          .update({
            resource_state: resourceValues,
            action_state: actionState,
          })
          .eq('id', c.id)
      } catch (e) {
        console.error('Failed to persist sheet state', e)
      }
    }, 500)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [resourceValues, actionState, c, loading])

  const [rollLog, setRollLog] = useState<RollEntry[]>([])

  const [activeTab, setActiveTab] = useState<
    'overview' | 'skills_traits' | 'gear' | 'magic' | 'notes'
  >('overview')

  function showRoll(label: string, formula: string, result: number) {
    setRollLog((prev) => [{ label, formula: formula.trim(), result }, ...prev.slice(0, 14)])
  }

  function rollAbilityCheck(abilityKey: string | number | symbol) {
    if (!c) return
    const k = String(abilityKey).toLowerCase() as keyof Abilities
    if (!(k in abilities)) return
    const mod = abilityMod(abilities[k])
    const r = roll(`1d20+${mod}`)
    showRoll(`${String(k).toUpperCase()} check`, `1d20+${mod}`, r.total)
  }

  function rollSavingThrow(abilityKey: string | number | symbol) {
    if (!c || !d) return
    const k = String(abilityKey).toLowerCase() as keyof Abilities
    if (!(k in abilities)) return
    const base = abilityMod(abilities[k])
    const hasProf = savingThrowSet.has(String(k).toLowerCase())
    const mod = base + (hasProf ? d.profBonus : 0)
    const r = roll(`1d20+${mod}`)
    showRoll(`${String(k).toUpperCase()} save`, `1d20+${mod}`, r.total)
  }

  function rollMainAttack() {
    if (!d) return

    const critRange = (d as any).critRange ?? 20
    const r = rollD20WithCrit(d.attackFormula, critRange)
    setLastAttackWasCrit(Boolean(r.isCrit))

    const label = r.isCrit
      ? `CRIT Attack — ${d.weaponName ?? 'Unarmed'}`
      : `Attack — ${d.weaponName ?? 'Unarmed'}`
    showRoll(label, d.attackFormula, r.total)
  }

  function rollMainDamage() {
    if (!d || !c) return

    // base weapon damage (already handles crit dice doubling)
    const base = rollDamageWithCrit(d.damageFormula, lastAttackWasCrit)
    let total = base.total
    let formula = base.formula

    const classKey = normKey(c.main_job)

    // ✅ Auto-add Sneak Attack if armed and not used this turn
    if (classKey === 'rogue' && sneakArmed && !Boolean(actionState.sneak_used_turn)) {
      const dice = sneakDiceCount(Number(c.level ?? 1))
      const sneakFormula = `${dice}d6`

      const sneak = rollDamageWithCrit(sneakFormula, lastAttackWasCrit)
      total += sneak.total
      formula = `${base.formula} + ${sneak.formula}`

      // mark used + disarm
      setActionState((prev) => ({ ...prev, sneak_used_turn: true }))
      setSneakArmed(false)

      showRoll(lastAttackWasCrit ? 'CRIT Sneak Attack' : 'Sneak Attack', sneak.formula, sneak.total)
    }

    const label = lastAttackWasCrit
      ? `CRIT Damage — ${d.weaponName ?? 'Unarmed'}`
      : `Damage — ${d.weaponName ?? 'Unarmed'}`
    showRoll(label, formula, total)

    // reset crit once spent
    setLastAttackWasCrit(false)
  }

  function onChangeResource(key: string, next: number) {
    if (!d) return
    const r = d.resources.find((x) => x.key === key)
    if (!r) return
    setResourceValues((prev) => ({ ...prev, [key]: clamp(next, 0, r.max) }))
  }

  function onShortRest() {
    if (!d) return

    // refill resources that recharge on short rest
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        if (r.recharge === 'short_rest') next[r.key] = r.max
      }
      return next
    })

    // ✅ clear "once per short rest" locks (Action Surge, Second Wind, etc)
    setActionState((prev) => clearPerRestFlags(prev, 'short'))
  }

  function onLongRest() {
    if (!d) return

    // refill resources that recharge on short or long rest
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        if (r.recharge === 'short_rest' || r.recharge === 'long_rest') next[r.key] = r.max
      }
      return next
    })

    // ✅ clear per-rest locks (short + long) on long rest
    setActionState((prev) => {
      const cleared = clearPerRestFlags(prev, 'long')
      // also reset per-turn action flags on long rest
      delete cleared.sneak_used_turn
      return cleared
    })

    setSneakArmed(false)
  }

  // ✅ FIXED: Use actions from registry (class/subclass/dnd721) — TS-safe narrowing
  async function handleUseAction(action: SheetAction) {
    if (!c?.id) return

    const classKey = normKey(c.main_job)
    const subclassKey = getSubclassKey(c as any)

    const status = canUseAction({
      action,
      classKey,
      subclassKey,
      actionState,
      resourceState: resourceValues,
    })

    if (!status.ok) return

    const cost = action.cost

    switch (cost.type) {
      case 'none': {
        return
      }

      case 'perTurnFlag': {
        setActionState((prev) => ({ ...(prev ?? {}), [cost.flag]: true }))
        return
      }

      case 'perRestFlag': {
        setActionState((prev) => ({ ...(prev ?? {}), [cost.flag]: true }))
        return
      }

      case 'resource': {
        const key = cost.key
        const have = Number(resourceValues?.[key] ?? 0)
        const nextVal = Math.max(0, have - cost.amount)
        setResourceValues((prev) => ({ ...(prev ?? {}), [key]: nextVal }))
        return
      }

      default: {
        return
      }
    }
  }

  if (loading) return <div className="p-4 text-slate-300">Loading character...</div>
  if (!c || !d) return <div className="p-4 text-red-300">Character not found.</div>

  const isMageUser = Boolean(c.spellcasting_ability)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-3 pb-16 md:px-6">
      <CharacterHeader c={c} d={d} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
        {(['overview', 'skills_traits', 'gear', 'notes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === t
                ? 'bg-slate-800 text-slate-100'
                : 'bg-slate-900/40 text-slate-300 hover:bg-slate-900'
            }`}
          >
            {t === 'overview'
              ? 'Overview'
              : t === 'skills_traits'
                ? 'Skills & Traits'
                : t === 'gear'
                  ? 'Gear'
                  : 'Notes'}
          </button>
        ))}

        {isMageUser && (
          <button
            onClick={() => setActiveTab('magic')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'magic'
                ? 'bg-slate-800 text-slate-100'
                : 'bg-slate-900/40 text-slate-300 hover:bg-slate-900'
            }`}
          >
            Spellbook
          </button>
        )}

        {!isMageUser && (
          <div className="ml-auto flex items-center text-[10px] text-slate-500">
            Spellbook hidden (non-mage)
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr,2fr,1.2fr]">
        <div className="space-y-3">
          {activeTab === 'overview' && (
            <>
              <AbilitiesPanel abilities={abilities} onRollAbilityCheck={rollAbilityCheck} />

              {/* ✅ Actions Panel */}
              <ActionsPanel
                classKey={normKey(c.main_job)}
                subclassKey={getSubclassKey(c as any)}
                actionState={actionState}
                resourceState={resourceValues}
                onUseAction={handleUseAction}
              />

              <ResourcesPanel
                resources={d.resources ?? []}
                values={resourceValues}
                onChange={onChangeResource}
                onShortRest={onShortRest}
                onLongRest={onLongRest}
              />

              <CombatStatsPanel d={d} onAttack={rollMainAttack} onDamage={rollMainDamage} />

              <SavingThrowsPanel
                abilities={abilities}
                savingThrowSet={savingThrowSet}
                profBonus={d.profBonus}
                onRollSavingThrow={rollSavingThrow}
              />
            </>
          )}
        </div>

        <div className="space-y-3">
          {activeTab === 'gear' && (
            <>
              <EquipmentPanel
                c={c}
                onSaved={(patch) => setC((prev) => (prev ? ({ ...prev, ...patch } as any) : prev))}
              />
              <InventoryPanel
                c={c}
                onSaved={(patch) => setC((prev) => (prev ? ({ ...prev, ...patch } as any) : prev))}
              />
            </>
          )}

          {activeTab === 'skills_traits' && (
            <>
              <SkillsPanel
                c={c}
                abilities={abilities}
                profBonus={d.profBonus}
                passivePerception={d.passivePerception}
              />
              <TraitsFeaturesPanel c={c} />
            </>
          )}

          {activeTab === 'notes' && <PersonalityNotesPanel c={c} />}
        </div>

        <div className="space-y-3">
          {activeTab === 'magic' && isMageUser && <SpellsPanel c={c} spellSlots={c.spell_slots ?? null} />}
          <RollLogPanel rollLog={rollLog} />
        </div>
      </div>
    </div>
  )
}
