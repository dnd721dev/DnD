'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import type { Abilities } from '../../../../types/character'
import { RACE_LIST } from '@/lib/races'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export default function NewCharacterStep3Page() {
  const router = useRouter()

  // 1) Hooks – always in the same order
  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [loading, setLoading] = useState(true)

  // Load draft once
  useEffect(() => {
    const existing = loadDraft()
    if (!existing) {
      setDraft(null)
      setLoading(false)
      return
    }

    // Ensure ability objects exist
    const fixed: CharacterDraft = {
      level: existing.level ?? 1,
      baseAbilities: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        ...(existing.baseAbilities ?? {}),
      },
      abilityBonuses: {
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0,
        ...(existing.abilityBonuses ?? {}),
      },
      ...existing,
    }

    setDraft(fixed)
    saveDraft(fixed)
    setLoading(false)
  }, [])

  // Race object from raceKey
  const race = useMemo(() => {
    if (!draft?.raceKey) return undefined
    return RACE_LIST.find((r) => r.key === draft.raceKey)
  }, [draft?.raceKey])

  // Racial bonuses, if any
  const racialBonuses: Partial<Abilities> = useMemo(() => {
    const out: Partial<Abilities> = {}
    if (race?.abilityBonuses) {
      for (const [k, v] of Object.entries(race.abilityBonuses)) {
        out[k as AbilityKey] = v as number
      }
    }
    return out
  }, [race])

  // 2) Early returns AFTER all hooks are declared
  if (loading) {
    return <div className="text-sm text-slate-300">Loading draft…</div>
  }

  if (!draft || !draft.baseAbilities || !draft.abilityBonuses) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          No character draft found. Start again from Step 1.
        </p>
        <button
          type="button"
          onClick={() => router.push('/characters/new/step1')}
          className="inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-500"
        >
          Back to Step 1
        </button>
      </div>
    )
  }

  // From here down, TypeScript can treat the draft as non-null
  const currentDraft: CharacterDraft = draft

  // 3) Helpers that rely on draft
  function handleBonusChange(ability: AbilityKey, value: string) {
    const n = Number(value)
    if (Number.isNaN(n)) return

    const next: CharacterDraft = {
      ...currentDraft,
      abilityBonuses: {
        ...currentDraft.abilityBonuses!,
        [ability]: n,
      },
    }

    setDraft(next)
    saveDraft(next)
  }

  function handleNext() {
    saveDraft(currentDraft)
    router.push('/characters/new/step4')
  }

  function handleBack() {
    saveDraft(currentDraft)
    router.push('/characters/new/step2')
  }

  // 4) Render UI
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-white">
          Step 3 — Abilities &amp; Modifiers
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Your base scores come from your NFT and race. You can apply additional
          bonuses here (point buy, ASI, etc.).
        </p>
      </div>

      {/* Summary header */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 text-xs space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Current Build
        </p>
        <p className="text-sm font-semibold text-white">
          {currentDraft.name || 'Unnamed Hero'}
        </p>
        <p className="text-[11px] text-slate-400">
          {currentDraft.classKey ? (
            <>
              Class:{' '}
              <span className="font-semibold text-cyan-300">
                {currentDraft.classKey}
              </span>
            </>
          ) : (
            'Class not selected yet'
          )}
        </p>
        <p className="text-[11px] text-slate-400">
          {currentDraft.raceKey ? (
            <>
              Race:{' '}
              <span className="font-semibold text-cyan-300">
                {currentDraft.raceKey}
              </span>
            </>
          ) : (
            'Race not selected yet'
          )}
        </p>
      </div>

      {/* Ability grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ABILITY_KEYS.map((key) => {
          const base = currentDraft.baseAbilities![key]
          const racial = racialBonuses[key] ?? 0
          const bonus = currentDraft.abilityBonuses![key]
          const total = base + racial + bonus
          const mod = abilityMod(total)
          const sign = mod >= 0 ? '+' : ''

          return (
            <div
              key={key}
              className="rounded-lg border border-slate-700 bg-slate-950/70 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  {ABILITY_LABELS[key]}
                </span>
                <span className="text-[11px] text-slate-500">
                  Modifier:{' '}
                  <span className="font-semibold text-cyan-300">
                    {sign}
                    {mod}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1.5">
                  <div className="text-[10px] text-slate-500">Base</div>
                  <div className="text-sm font-semibold text-white">
                    {base}
                  </div>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1.5">
                  <div className="text-[10px] text-slate-500">Racial</div>
                  <div className="text-sm font-semibold text-cyan-300">
                    {racial >= 0 ? `+${racial}` : racial}
                  </div>
                </div>
                <div className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1.5">
                  <div className="text-[10px] text-slate-500">Bonus</div>
                  <input
                    type="number"
                    className="mt-0.5 w-full bg-transparent text-center text-sm font-semibold text-amber-300 outline-none"
                    value={bonus}
                    onChange={(e) => handleBonusChange(key, e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-1 rounded-md bg-slate-900/60 px-2 py-1 text-center text-[11px] text-slate-300">
                Total:{' '}
                <span className="font-semibold text-white">{total}</span>{' '}
                (<span className="text-cyan-300">
                  {sign}
                  {mod}
                </span>
                )
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs md:text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
        >
          ← Back to Step 2
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs md:text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.55)] transition"
        >
          Next: Spellcasting / Equipment
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}
