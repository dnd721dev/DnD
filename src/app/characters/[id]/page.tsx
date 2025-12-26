'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { roll } from '@/lib/dice'
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

export default function CharacterSheetPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [c, setC] = useState<CharacterSheetData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .limit(1).maybeSingle()

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
    const r = roll(d.attackFormula)
    showRoll(`Attack — ${d.weaponName ?? 'Unarmed'}`, d.attackFormula, r.total)
  }

  function rollMainDamage() {
    if (!d) return
    const r = roll(d.damageFormula)
    showRoll(`Damage — ${d.weaponName ?? 'Unarmed'}`, d.damageFormula, r.total)
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

          {/* ✅ NEW: Inventory system (saved to characters.inventory_items) */}
          <InventoryPanel
            c={c}
            onSaved={(patch) => {
              setC((prev) => (prev ? ({ ...prev, ...patch } as any) : prev))
            }}
          />

          <SkillsPanel
            c={c}
            abilities={abilities}
            profBonus={d.profBonus}
            passivePerception={d.passivePerception}
          />

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
