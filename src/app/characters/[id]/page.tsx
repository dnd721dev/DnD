'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { roll, rollD20WithCrit, rollDamageWithCrit } from '@/lib/dice'
import type { Abilities } from '../../../types/character'

import type { CharacterSheetData, RollEntry } from '@/components/character-sheet/types'
import { CharacterHeader } from '@/components/character-sheet/CharacterHeader'
import { AbilitiesPanel } from '../../../components/character-sheet/AbilitiesPanel'
import { SavingThrowsPanel } from '@/components/character-sheet/SavingThrowsPanel'
import { SkillsPanel } from '@/components/character-sheet/SkillsPanel'
import { TraitsFeaturesPanel } from '@/components/character-sheet/TraitsFeaturesPanel'
import { SpellsPanel } from '@/components/character-sheet/SpellsPanel'
import { RollLogPanel } from '@/components/character-sheet/RollLogPanel'
import { PersonalityNotesPanel } from '@/components/character-sheet/PersonalityNotesPanel'
import { abilityMod } from '@/components/character-sheet/utils'

import { deriveStats } from '@/components/character-sheet/calc'
import { CombatStatsPanel } from '@/components/character-sheet/CombatStatsPanel'
import { EquipmentPanel } from '@/components/character-sheet/EquipmentPanel'
import { InventoryPanel } from '@/components/character-sheet/InventoryPanel'
import { ResourcesPanel } from '@/components/character-sheet/ResourcesPanel'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function CharacterSheetPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [c, setC] = useState<CharacterSheetData | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ Track whether last attack roll was a crit (for doubling damage dice)
  const [lastAttackWasCrit, setLastAttackWasCrit] = useState(false)

  // ✅ Resource values (persisted locally per character)
  const [resourceValues, setResourceValues] = useState<Record<string, number>>({})

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
    return new Set(raw.map((v) => v.toLowerCase()))
  }, [c?.saving_throw_profs])

  const spellSlots = useMemo(() => c?.spell_slots ?? null, [c?.spell_slots])

  const d = useMemo(() => {
    if (!c) return null
    return deriveStats(c, abilities)
  }, [c, abilities])

  // ✅ Load persisted resource values once we have derived resources
  useEffect(() => {
    if (!d) return
    const key = `dnd721:char:${id}:resources`
    try {
      const raw = localStorage.getItem(key)
      const saved = raw ? (JSON.parse(raw) as Record<string, number>) : {}
      const next: Record<string, number> = {}

      for (const r of d.resources ?? []) {
        const fallback = r.current ?? r.max
        const savedVal = typeof saved?.[r.key] === 'number' ? saved[r.key] : fallback
        next[r.key] = clamp(savedVal, 0, r.max)
      }

      setResourceValues(next)
    } catch {
      const next: Record<string, number> = {}
      for (const r of d.resources ?? []) next[r.key] = clamp(r.current ?? r.max, 0, r.max)
      setResourceValues(next)
    }
  }, [d, id])

  // ✅ Persist resource values
  useEffect(() => {
    if (!d) return
    const key = `dnd721:char:${id}:resources`
    try {
      localStorage.setItem(key, JSON.stringify(resourceValues))
    } catch {}
  }, [resourceValues, d, id])

  const [rollLog, setRollLog] = useState<RollEntry[]>([])

  function showRoll(label: string, formula: string, result: number) {
    setRollLog((prev) => [{ label, formula: formula.trim(), result }, ...prev.slice(0, 9)])
  }

  function rollAbilityCheck(abilityKey: keyof Abilities) {
    if (!c) return
    const mod = abilityMod(abilities[abilityKey])
    const r = roll(`1d20+${mod}`)
    showRoll(`${abilityKey.toUpperCase()} check`, `1d20+${mod}`, r.total)
  }

  function rollSavingThrow(abilityKey: keyof Abilities) {
    if (!c || !d) return
    const base = abilityMod(abilities[abilityKey])
    const hasProf = savingThrowSet.has(abilityKey.toLowerCase())
    const mod = base + (hasProf ? d.profBonus : 0)
    const r = roll(`1d20+${mod}`)
    showRoll(`${abilityKey.toUpperCase()} save`, `1d20+${mod}`, r.total)
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
    if (!d) return

    const r = rollDamageWithCrit(d.damageFormula, lastAttackWasCrit)

    const label = lastAttackWasCrit
      ? `CRIT Damage — ${d.weaponName ?? 'Unarmed'}`
      : `Damage — ${d.weaponName ?? 'Unarmed'}`

    showRoll(label, r.formula, r.total)

    // reset after spending the crit
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
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        if (r.recharge === 'short_rest') next[r.key] = r.max
      }
      return next
    })
  }

  function onLongRest() {
    if (!d) return
    setResourceValues((prev) => {
      const next = { ...prev }
      for (const r of d.resources ?? []) {
        if (r.recharge === 'short_rest' || r.recharge === 'long_rest') next[r.key] = r.max
      }
      return next
    })
  }

  if (loading) {
    return <div className="p-4 text-slate-300">Loading character...</div>
  }

  if (!c || !d) {
    return <div className="p-4 text-red-300">Character not found.</div>
  }

  return (
    <div className="space-y-4 pb-16">
      <CharacterHeader c={c} d={d} />

      <div className="grid gap-4 md:grid-cols-[1.4fr,2fr,1.2fr]">
        <div className="space-y-3">
          <AbilitiesPanel abilities={abilities} onRollAbilityCheck={rollAbilityCheck} />

          {/* ✅ NEW: Resource buttons */}
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
        </div>

        <div className="space-y-3">
          <EquipmentPanel
            c={c}
            onSaved={(patch) => {
              setC((prev) => (prev ? ({ ...prev, ...patch } as any) : prev))
            }}
          />

          <InventoryPanel
            c={c}
            onSaved={(patch) => {
              setC((prev) => (prev ? ({ ...prev, ...patch } as any) : prev))
            }}
          />

          <SkillsPanel c={c} abilities={abilities} profBonus={d.profBonus} passivePerception={d.passivePerception} />

          <TraitsFeaturesPanel c={c} />
        </div>

        <div className="space-y-3">
          <SpellsPanel c={c} spellSlots={spellSlots} />
          <RollLogPanel rollLog={rollLog} />
        </div>
      </div>

      <PersonalityNotesPanel c={c} />
    </div>
  )
}
