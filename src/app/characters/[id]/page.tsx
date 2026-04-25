'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import type { Abilities } from '../../../types/character'
import type { CharacterSheetData } from '@/components/character-sheet/types'

import { CharacterHeader } from '@/components/character-sheet/CharacterHeader'
import { AbilitiesPanel } from '@/components/character-sheet/AbilitiesPanel'
import { SavingThrowsPanel } from '@/components/character-sheet/SavingThrowsPanel'
import { SkillsPanel } from '@/components/character-sheet/SkillsPanel'
import { TraitsFeaturesPanel } from '@/components/character-sheet/TraitsFeaturesPanel'
import { SpellsPanel } from '@/components/character-sheet/SpellsPanel'
import { PersonalityNotesPanel } from '@/components/character-sheet/PersonalityNotesPanel'
import { ResourcesPanel } from '@/components/character-sheet/ResourcesPanel'
import { CombatStatsPanel } from '@/components/character-sheet/CombatStatsPanel'
import { EquipmentPanel } from '@/components/character-sheet/EquipmentPanel'
import { ActionsPanel } from '@/components/character-sheet/ActionsPanel'
import { ConditionsPanel } from '@/components/character-sheet/ConditionsPanel'

import { abilityMod } from '@/components/character-sheet/utils'
import { deriveStats } from '@/components/character-sheet/calc'
import { rollD20WithCrit, rollDamageWithCrit } from '@/lib/dice'
import { useCharacterRoll } from '@/hooks/useCharacterRoll'
import { levelForXp, xpForLevel } from '@/lib/rules'

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

  const { roll: charRoll } = useCharacterRoll({
    characterId: c?.id ?? null,
    rollerName: c?.name ?? 'Adventurer',
  })

  const [activeTab, setActiveTab] = useState<
    'overview' | 'skills_traits' | 'gear' | 'magic' | 'notes'
  >('overview')

  // ✅ Local temp HP (mirrors DB; update written immediately)
  const [tempHp, setTempHpLocal] = useState<number>(0)
  useEffect(() => {
    if (c) setTempHpLocal(Number(c.temp_hp ?? 0))
  }, [c])

  async function onSetTempHp(val: number) {
    const next = Math.max(0, val)
    setTempHpLocal(next)
    if (!c?.id) return
    await supabase.from('characters').update({ temp_hp: next }).eq('id', c.id)
    setC((prev) => prev ? { ...prev, temp_hp: next } : prev)
  }

  async function onAdjustHp(delta: number) {
    if (!c?.id || !d) return
    let effectiveDelta = delta
    let nextTempHp = tempHp
    // Absorb damage into temp HP first
    if (delta < 0 && nextTempHp > 0) {
      const absorbed = Math.min(nextTempHp, -delta)
      nextTempHp -= absorbed
      effectiveDelta += absorbed
      setTempHpLocal(nextTempHp)
      await supabase.from('characters').update({ temp_hp: nextTempHp }).eq('id', c.id)
    }
    const current = Number(c.hit_points_current ?? d.hpMax)
    const next = clamp(current + effectiveDelta, 0, d.hpMax)
    setC((prev) => prev ? { ...prev, hit_points_current: next, temp_hp: nextTempHp } : prev)
    await supabase.from('characters').update({ hit_points_current: next }).eq('id', c.id)
  }

  function rollAbilityCheck(abilityKey: string | number | symbol) {
    if (!c) return
    const k = String(abilityKey).toLowerCase() as keyof Abilities
    if (!(k in abilities)) return
    const mod = abilityMod(abilities[k])
    charRoll({ label: `${String(k).toUpperCase()} check`, formula: `1d20+${mod}`, rollType: 'ability_check' })
  }

  function rollSavingThrow(abilityKey: string | number | symbol) {
    if (!c || !d) return
    const k = String(abilityKey).toLowerCase() as keyof Abilities
    if (!(k in abilities)) return
    const base = abilityMod(abilities[k])
    const hasProf = savingThrowSet.has(String(k).toLowerCase())
    const mod = base + (hasProf ? d.profBonus : 0)
    charRoll({ label: `${String(k).toUpperCase()} save`, formula: `1d20+${mod}`, rollType: 'save' })
  }

  function rollMainAttack() {
    if (!d) return

    const critRange = (d as any).critRange ?? 20
    const r = rollD20WithCrit(d.attackFormula, critRange)
    setLastAttackWasCrit(Boolean(r.isCrit))

    const label = r.isCrit
      ? `CRIT Attack — ${d.weaponName ?? 'Unarmed'}`
      : `Attack — ${d.weaponName ?? 'Unarmed'}`
    charRoll({ label, formula: d.attackFormula, rollType: 'attack' })
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

      charRoll({
        label: lastAttackWasCrit ? 'CRIT Sneak Attack' : 'Sneak Attack',
        formula: sneak.formula,
        rollType: 'damage',
      })
    }

    const label = lastAttackWasCrit
      ? `CRIT Damage — ${d.weaponName ?? 'Unarmed'}`
      : `Damage — ${d.weaponName ?? 'Unarmed'}`
    charRoll({ label, formula, rollType: 'damage' })

    // reset crit once spent
    setLastAttackWasCrit(false)
  }

  function onChangeResource(key: string, next: number) {
    if (!d) return
    const r = d.resources.find((x) => x.key === key)
    if (!r) return
    setResourceValues((prev) => ({ ...prev, [key]: clamp(next, 0, r.max) }))
  }

  function onToggleCondition(key: string) {
    setActionState((prev) => {
      const cur: string[] = Array.isArray(prev?.active_conditions) ? prev.active_conditions : []
      const next = cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]
      return { ...prev, active_conditions: next }
    })
  }

  // ✅ Spell slot tracking — stored in resourceValues as spell_slot_used_1, etc.
  function onSpendSlot(level: string) {
    if (!c?.spell_slots) return
    const max = Number(c.spell_slots[level] ?? 0)
    setResourceValues((prev) => {
      const key = `spell_slot_used_${level}`
      const cur = Number(prev[key] ?? 0)
      return { ...prev, [key]: Math.min(max, cur + 1) }
    })
  }

  function onRestoreSlot(level: string) {
    setResourceValues((prev) => {
      const key = `spell_slot_used_${level}`
      const cur = Number(prev[key] ?? 0)
      return { ...prev, [key]: Math.max(0, cur - 1) }
    })
  }

  const isWarlock = normKey(c?.main_job) === 'warlock'

  function onShortRest() {
    if (!d) return

    // refill resources that recharge on short rest
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        if (r.recharge === 'short_rest') next[r.key] = r.max
      }
      // Warlock spell slots recharge on short rest
      if (isWarlock && c?.spell_slots) {
        for (const lvl of Object.keys(c.spell_slots)) {
          delete next[`spell_slot_used_${lvl}`]
        }
      }
      return next
    })

    // ✅ clear "once per short rest" locks (Action Surge, Second Wind, etc)
    setActionState((prev) => clearPerRestFlags(prev, 'short'))
  }

  function onLongRest() {
    if (!d) return

    // refill resources that recharge on short or long rest + restore all spell slots
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        if (r.recharge === 'short_rest' || r.recharge === 'long_rest') next[r.key] = r.max
      }
      // Restore all spell slots on long rest
      if (c?.spell_slots) {
        for (const lvl of Object.keys(c.spell_slots)) {
          delete next[`spell_slot_used_${lvl}`]
        }
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

  function executeEffects(action: SheetAction) {
    if (!action.effects?.length) return
    for (const effect of action.effects) {
      switch (effect.type) {
        case 'setFlag':
          setActionState((prev) => ({ ...(prev ?? {}), [effect.flag]: effect.value }))
          break
        case 'rollFormula':
          charRoll({ label: effect.label || action.name, formula: effect.formula, rollType: 'sheet' })
          break
        case 'rollAttack':
          rollMainAttack()
          break
        case 'rollDamage':
          rollMainDamage()
          break
        case 'logNote':
          // logNote is purely informational — no dice roll, skip
          break
      }
    }
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
      case 'none':
        break

      case 'perTurnFlag':
        setActionState((prev) => ({ ...(prev ?? {}), [cost.flag]: true }))
        break

      case 'perRestFlag':
        setActionState((prev) => ({ ...(prev ?? {}), [cost.flag]: true }))
        break

      case 'resource': {
        const key = cost.key
        const have = Number(resourceValues?.[key] ?? 0)
        const nextVal = Math.max(0, have - cost.amount)
        setResourceValues((prev) => ({ ...(prev ?? {}), [key]: nextVal }))
        break
      }
    }

    executeEffects(action)
  }

  if (loading) return <div className="p-4 text-slate-300">Loading character...</div>
  if (!c || !d) return <div className="p-4 text-red-300">Character not found.</div>

  const isMageUser = Boolean(c.spellcasting_ability)

  const isCaya = Boolean((c as any)?.is_caya)
  const xp = isCaya ? ((c as any)?.experience_points ?? 0) : 0
  const earnedLevel = isCaya ? levelForXp(xp) : null
  const currentLevel = c.level ?? 1
  const xpForCurrentLevel = isCaya ? xpForLevel(currentLevel) : 0
  const xpForNextLevel = isCaya ? xpForLevel(Math.min(20, currentLevel + 1)) : 0
  const xpPct = isCaya && currentLevel < 20
    ? Math.min(100, Math.round(((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100))
    : 100

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-3 pb-16 md:px-6">
      <CharacterHeader c={c} d={d} />

      {/* Level-up banner */}
      {isCaya && earnedLevel !== null && earnedLevel > currentLevel && (
        <div className="rounded-lg border border-amber-500 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
          <span className="font-bold text-amber-300">Level Up!</span> You&apos;ve earned enough XP to reach level {earnedLevel}.
          Update your character sheet to reflect your new abilities, spells, and features.
        </div>
      )}

      {/* XP progress bar (CAYA only) */}
      {isCaya && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-300">CAYA — Experience Points</span>
            <span className="text-slate-400">
              {currentLevel < 20
                ? `${xp.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`
                : `${xp.toLocaleString()} XP — Max Level`}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${xpPct}%`,
                background: 'linear-gradient(90deg, #d97706, #f59e0b)',
              }}
            />
          </div>
          <p className="text-[10px] text-slate-500">
            Level {currentLevel}{currentLevel < 20 ? ` → ${currentLevel + 1}` : ' (max)'}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
        {(['overview', 'skills_traits', 'gear', 'notes'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === t
                ? 'bg-indigo-600/30 text-indigo-100 ring-1 ring-indigo-500/50'
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
                ? 'bg-indigo-600/30 text-indigo-100 ring-1 ring-indigo-500/50'
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

      <div className="grid gap-4 items-start md:grid-cols-[1.4fr,2fr]">
        {/* LEFT COLUMN — always visible core stats */}
        <div className="space-y-3">
          <AbilitiesPanel abilities={abilities} onRollAbilityCheck={rollAbilityCheck} />
          <CombatStatsPanel
            d={d}
            tempHp={tempHp}
            onAttack={rollMainAttack}
            onDamage={rollMainDamage}
            onAdjustHp={onAdjustHp}
            onSetTempHp={onSetTempHp}
          />
          <SavingThrowsPanel
            abilities={abilities}
            savingThrowSet={savingThrowSet}
            profBonus={d.profBonus}
            onRollSavingThrow={rollSavingThrow}
          />
        </div>

        {/* MIDDLE COLUMN — tab-specific content */}
        <div className="space-y-3">
          {activeTab === 'overview' && (
            <>
              <ConditionsPanel
                activeConditions={Array.isArray(actionState?.active_conditions) ? actionState.active_conditions : []}
                onToggleCondition={onToggleCondition}
                exhaustionLevel={Number(actionState?.exhaustion_level ?? 0)}
                onExhaustionChange={(level) => {
                  setActionState((prev) => ({ ...prev, exhaustion_level: level }))
                }}
              />
              <ActionsPanel
                classKey={normKey(c.main_job)}
                subclassKey={getSubclassKey(c as any)}
                actionState={actionState}
                resourceState={resourceValues}
                onUseAction={handleUseAction}
                sneakArmed={sneakArmed}
                onToggleSneakArm={() => setSneakArmed((prev) => !prev)}
              />
              <ResourcesPanel
                resources={d.resources ?? []}
                values={resourceValues}
                onChange={onChangeResource}
                onShortRest={onShortRest}
                onLongRest={onLongRest}
                conMod={abilityMod(abilities.con)}
                onRoll={({ label, formula }) => charRoll({ label, formula, rollType: 'sheet' })}
                currentHp={Number(c.hit_points_current ?? d.hpMax)}
                maxHp={d.hpMax}
                onHpChange={(newHp) => {
                  setC((prev) => prev ? { ...prev, hit_points_current: newHp } : prev)
                  supabase.from('characters').update({ hit_points_current: newHp }).eq('id', c.id)
                }}
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
              <div className="max-h-[60vh] overflow-y-auto rounded-xl">
                <TraitsFeaturesPanel c={c} />
              </div>
            </>
          )}

          {activeTab === 'gear' && (
            <EquipmentPanel
              c={c}
              onSaved={(patch) => setC((prev) => (prev ? ({ ...prev, ...patch } as any) : prev))}
            />
          )}

          {activeTab === 'notes' && <PersonalityNotesPanel c={c} />}

          {activeTab === 'magic' && isMageUser && (
            <SpellsPanel
              c={c}
              spellSlots={c.spell_slots ?? null}
              slotUsed={resourceValues}
              onSpendSlot={onSpendSlot}
              onRestoreSlot={onRestoreSlot}
            />
          )}
        </div>

      </div>
    </div>
  )
}
