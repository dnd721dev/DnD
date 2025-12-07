'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { RACE_LIST, type RaceKey } from '@/lib/races'
import { BACKGROUND_LIST, type BackgroundKey } from '@/lib/backgrounds'
import { proficiencyForLevel } from '@/lib/rules'

const CLASS_OPTIONS = [
  { key: 'fighter', label: 'Fighter' },
  { key: 'rogue', label: 'Rogue' },
  { key: 'wizard', label: 'Wizard' },
  { key: 'barbarian', label: 'Barbarian' },
  { key: 'paladin', label: 'Paladin' },
  { key: 'cleric', label: 'Cleric' },
  { key: 'ranger', label: 'Ranger' },
  { key: 'warlock', label: 'Warlock' },
  { key: 'sorcerer', label: 'Sorcerer' },
  { key: 'bard', label: 'Bard' },
  { key: 'monk', label: 'Monk' },
  { key: 'druid', label: 'Druid' },
]

const SUBCLASS_OPTIONS = [
  { key: '', label: '— Any / None —' },
  { key: 'champion', label: 'Champion (Fighter)' },
  { key: 'thief', label: 'Thief (Rogue)' },
  { key: 'evoker', label: 'Evoker (Wizard)' },
]

const ALIGNMENT_OPTIONS = [
  { value: '', label: '— None / Undeclared —' },
  { value: 'LG', label: 'Lawful Good' },
  { value: 'NG', label: 'Neutral Good' },
  { value: 'CG', label: 'Chaotic Good' },
  { value: 'LN', label: 'Lawful Neutral' },
  { value: 'N', label: 'True Neutral' },
  { value: 'CN', label: 'Chaotic Neutral' },
  { value: 'LE', label: 'Lawful Evil' },
  { value: 'NE', label: 'Neutral Evil' },
  { value: 'CE', label: 'Chaotic Evil' },
]

export default function NewCharacterStep2Page() {
  const router = useRouter()
  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function ensureAbilities(base?: CharacterDraft['baseAbilities']) {
    if (base) return base
    return {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    }
  }

  useEffect(() => {
    const existing = loadDraft()

    const level = existing.level ?? 1
    const classKey = existing.classKey ?? 'fighter'
    const raceKey =
      existing.raceKey ??
      (RACE_LIST.length > 0 ? (RACE_LIST[0].key as RaceKey) : 'human')
    const backgroundKey =
      existing.backgroundKey ??
      (BACKGROUND_LIST.length > 0
        ? (BACKGROUND_LIST[0].key as BackgroundKey)
        : 'soldier')

    const baseAbilities = ensureAbilities(existing.baseAbilities)
    const proficiencyBonus =
      existing.proficiencyBonus ?? proficiencyForLevel(level)

    const merged: CharacterDraft = {
      ...existing,
      level,
      classKey,
      raceKey,
      backgroundKey,
      baseAbilities,
      proficiencyBonus,
    }

    setDraft(merged)
    saveDraft(merged)
    setReady(true)
  }, [])

  function updateDraft(update: Partial<CharacterDraft>) {
    setDraft((prev) => {
      const current: CharacterDraft =
        prev ??
        ({
          level: 1,
          classKey: 'fighter',
          raceKey:
            RACE_LIST.length > 0
              ? (RACE_LIST[0].key as RaceKey)
              : 'human',
          backgroundKey:
            BACKGROUND_LIST.length > 0
              ? (BACKGROUND_LIST[0].key as BackgroundKey)
              : 'soldier',
          baseAbilities: ensureAbilities(),
          proficiencyBonus: proficiencyForLevel(1),
        } as CharacterDraft)

      const next: CharacterDraft = {
        ...current,
        ...update,
      }

      saveDraft(next)
      return next
    })
  }

  function handleBack() {
    if (draft) saveDraft(draft)
    router.push('/characters/new/step1')
  }

  function handleNext() {
    if (!draft) return

    if (!draft.name || draft.name.trim().length === 0) {
      setError('Please give your character a name before continuing.')
      return
    }

    if (!draft.classKey) {
      setError('Please choose a class.')
      return
    }

    if (!draft.raceKey) {
      setError('Please choose a race.')
      return
    }

    if (!draft.backgroundKey) {
      setError('Please choose a background.')
      return
    }

    saveDraft(draft)
    setError(null)
    router.push('/characters/new/step3')
  }

  if (!ready || !draft) {
    return (
      <div className="text-sm text-slate-300">
        Loading basics…
      </div>
    )
  }

  const selectedRace = RACE_LIST.find((r) => r.key === draft.raceKey)
  const selectedBackground = BACKGROUND_LIST.find(
    (b) => b.key === draft.backgroundKey
  )

  return (
    <div className="space-y-6">
      {/* Step header */}
      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-900/40 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}
      <div className="space-y-1">
        <h2 className="text-lg md:text-xl font-semibold text-white">
          Step 2 — Character Basics
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Name, class, race, and background. We’ll bring the crunch (abilities,
          spells, and equipment) in the next steps.
        </p>
      </div>

      {/* Top row: name + level + alignment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Name */}
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Character Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            placeholder="e.g. Nix Embercoil"
            value={draft.name ?? ''}
            onChange={(e) =>
              updateDraft({
                name: e.target.value,
              })
            }
          />
          <p className="text-[11px] text-slate-500">
            This will appear on your character sheet and at the virtual table.
          </p>
        </div>

        {/* Level */}
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Level
          </label>
          <input
            type="number"
            min={1}
            max={20}
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.level ?? 1}
            onChange={(e) => {
              const nextLevel = Math.min(
                20,
                Math.max(1, Number(e.target.value) || 1)
              )
              updateDraft({
                level: nextLevel,
                proficiencyBonus: proficiencyForLevel(nextLevel),
              })
            }}
          />
          <p className="text-[11px] text-slate-500">
            We’ll auto-calc proficiency bonus and spell slots based on your
            level.
          </p>
        </div>

        {/* Alignment */}
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Alignment
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.alignment ?? ''}
            onChange={(e) =>
              updateDraft({
                alignment: e.target.value,
              })
            }
          >
            {ALIGNMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Purely roleplay and flavor. DND721 doesn’t lock mechanics to
            alignment.
          </p>
        </div>
      </div>

      {/* Second row: class / subclass / proficiency preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Class */}
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Class <span className="text-red-400">*</span>
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.classKey ?? 'fighter'}
            onChange={(e) =>
              updateDraft({
                classKey: e.target.value as CharacterDraft['classKey'],
              })
            }
          >
            {CLASS_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Determines your hit dice, primary abilities, and which spells
            (if any) you’ll learn later.
          </p>
        </div>

        {/* Subclass */}
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Subclass (optional)
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.subclassKey ?? ''}
            onChange={(e) =>
              updateDraft({
                subclassKey: e.target.value || null,
              })
            }
          >
            {SUBCLASS_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            You can leave this blank at low levels and decide later.
          </p>
        </div>

        {/* Proficiency summary */}
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Proficiency Bonus
          </label>
          <div className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2">
            <div className="text-lg font-bold text-white">
              +
              {draft.proficiencyBonus ??
                proficiencyForLevel(draft.level ?? 1)}
            </div>
            <p className="text-[11px] text-slate-500">
              Auto-calculated from level. This number is added to attack rolls,
              trained skills, and saves where you’re proficient.
            </p>
          </div>
        </div>
      </div>

      {/* Race & background */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Race */}
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Race <span className="text-red-400">*</span>
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.raceKey ?? ''}
            onChange={(e) =>
              updateDraft({
                raceKey: e.target.value as RaceKey,
              })
            }
          >
            {RACE_LIST.map((race) => (
              <option key={race.key} value={race.key}>
                {race.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Your race provides ability bonuses, traits, languages, and more.
          </p>

          {selectedRace && selectedRace.traits && selectedRace.traits.length > 0 && (
            <div className="mt-2 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 space-y-1">
              <div className="text-[11px] font-semibold text-slate-300">
                {selectedRace.name}
              </div>
              <ul className="list-disc ml-4 space-y-1 text-[11px] text-slate-400">
                {selectedRace.traits.map((trait: any, index: number) => {
                  const label =
                    trait?.name ??
                    trait?.label ??
                    trait?.description ??
                    String(trait)
                  return (
                    <li key={index}>
                      {label}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Background */}
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Background <span className="text-red-400">*</span>
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.backgroundKey ?? ''}
            onChange={(e) =>
              updateDraft({
                backgroundKey: e.target.value as BackgroundKey,
              })
            }
          >
            {BACKGROUND_LIST.map((bg) => (
              <option key={bg.key} value={bg.key}>
                {bg.name}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">
            Background gives you skills, tools, and a roleplay hook for your
            backstory.
          </p>

          {selectedBackground && (
            <div className="mt-2 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 space-y-1">
              <div className="text-[11px] font-semibold text-slate-300">
                {selectedBackground.name}
              </div>
              {selectedBackground.feature && (
                <p className="text-[11px] text-slate-400">
                  {typeof selectedBackground.feature === 'string'
                    ? selectedBackground.feature
                    : (selectedBackground.feature as any)?.description ??
                      (selectedBackground.feature as any)?.name ??
                      JSON.stringify(selectedBackground.feature)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs md:text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
        >
          ← Back to NFT Link
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs md:text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.55)] transition"
        >
          Next: Abilities &amp; Skills
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}
