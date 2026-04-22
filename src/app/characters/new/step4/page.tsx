'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { RACE_LIST, RACES, getRace, hasRaceInnateSpells, type RaceKey } from '@/lib/races'
import { SRD_SPELLS } from '@/lib/srdspells'
import type { SpellClass } from '@/lib/srdspells/types'
import { getSpellSlotsForClass, getSlotsForCasterType, getWarlockPactRow } from '@/lib/spellcastingProgression'
import { proficiencyForLevel } from '@/lib/rules'

type Abilities = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

const DEFAULT_ABILITIES: Abilities = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
}

const DEFAULT_BONUSES: Abilities = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
}

// which classes get spellcasting step
const SPELLCASTING_CLASSES = [
  'wizard',
  'sorcerer',
  'cleric',
  'druid',
  'bard',
  'paladin',
  'ranger',
  'warlock',
]

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export default function NewCharacterStep4Page() {
  const router = useRouter()
  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [ready, setReady] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  const [spellSearch, setSpellSearch] = useState('')
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | 'all'>('all')
  const [usedSlots, setUsedSlots] = useState<number[]>(() => Array(10).fill(0))

  // Load draft, check if class needs this step
  useEffect(() => {
    const existing = loadDraft()

    const level = existing.level ?? 1
    const classKey = (existing.classKey ?? 'fighter').toLowerCase()
    const subclassKey = String(existing.subclassKey ?? '').toLowerCase()
    const raceKey = String(existing.raceKey ?? '').toLowerCase()

    const isSpellcastingClass = SPELLCASTING_CLASSES.includes(classKey)
    const isSpellcastingSubclass =
      (classKey === 'fighter' && subclassKey === 'fighter_eldritch_knight' && level >= 3) ||
      (classKey === 'rogue' && subclassKey === 'rogue_arcane_trickster' && level >= 3)
    const raceHasMagic = hasRaceInnateSpells(raceKey)

    if (!isSpellcastingClass && !isSpellcastingSubclass && !raceHasMagic) {
      const merged: CharacterDraft = {
        ...existing,
        level,
        classKey,
      }
      saveDraft(merged)
      setRedirecting(true)
      router.replace('/characters/new/step5')
      return
    }

    const baseAbilities: Abilities = {
      ...DEFAULT_ABILITIES,
      ...(existing.baseAbilities ?? {}),
    }

    const abilityBonuses: Abilities = {
      ...DEFAULT_BONUSES,
      ...(existing.abilityBonuses ?? {}),
    }

    const knownSpells: string[] = existing.knownSpells ?? []
    const preparedSpells: string[] = existing.preparedSpells ?? []

    const proficiencyBonus =
      existing.proficiencyBonus ?? proficiencyForLevel(level)

    const merged: CharacterDraft = {
      ...existing,
      level,
      classKey,
      baseAbilities,
      abilityBonuses,
      knownSpells,
      preparedSpells,
      proficiencyBonus,
    }

    setDraft(merged)
    saveDraft(merged)
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateDraft(update: Partial<CharacterDraft>) {
    setDraft((prev) => {
      const current: CharacterDraft =
        prev ?? {
          baseAbilities: DEFAULT_ABILITIES,
          abilityBonuses: DEFAULT_BONUSES,
          level: 1,
          classKey: 'fighter',
          knownSpells: [],
          preparedSpells: [],
          proficiencyBonus: proficiencyForLevel(1),
        }

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
    router.push('/characters/new/step3')
  }

  function handleNext() {
    if (draft) saveDraft(draft)
    router.push('/characters/new/step5')
  }

  if (redirecting) {
    return (
      <div className="text-sm text-slate-300">
        This class does not use spellcasting. Skipping to equipment…
      </div>
    )
  }

  if (!ready || !draft || !draft.baseAbilities || !draft.abilityBonuses) {
    return (
      <div className="text-sm text-slate-300">
        Loading spellcasting…
      </div>
    )
  }

  const level = draft.level ?? 1
  const classKey = (draft.classKey ?? 'fighter').toLowerCase()
  const subclassKey = String(draft.subclassKey ?? '').toLowerCase()
  const proficiencyBonus =
    draft.proficiencyBonus ?? proficiencyForLevel(level)

  const raceKey = (draft.raceKey as RaceKey) ?? (RACE_LIST[0]?.key as RaceKey)
  const race = getRace(raceKey)
  const raceData = (RACES as any)[raceKey]

  // Is this an EK / AT third-caster subclass?
  const isEK = classKey === 'fighter' && subclassKey === 'fighter_eldritch_knight' && level >= 3
  const isAT = classKey === 'rogue' && subclassKey === 'rogue_arcane_trickster' && level >= 3
  const isThirdCasterSubclass = isEK || isAT

  // Determine which SpellClass we should filter by (no hooks)
  let spellClass: SpellClass | null = null
  switch (classKey) {
    case 'wizard':
      spellClass = 'wizard'
      break
    case 'sorcerer':
      spellClass = 'sorcerer'
      break
    case 'cleric':
      spellClass = 'cleric'
      break
    case 'druid':
      spellClass = 'druid'
      break
    case 'bard':
      spellClass = 'bard'
      break
    case 'paladin':
      spellClass = 'paladin'
      break
    case 'ranger':
      spellClass = 'ranger'
      break
    case 'warlock':
      spellClass = 'warlock'
      break
    case 'fighter': // Eldritch Knight
    case 'rogue':   // Arcane Trickster
      if (isThirdCasterSubclass) spellClass = 'wizard'
      break
    default:
      spellClass = null
  }

  // racial bonuses (no hooks)
  const racialBonuses: Partial<Abilities> = (() => {
    const out: Partial<Abilities> = {}
    if (race?.abilityBonuses) {
      for (const [k, v] of Object.entries(race.abilityBonuses)) {
        out[k as keyof Abilities] = v
      }
    }
    return out
  })()

  // final abilities (no hooks)
  const finalAbilities: Abilities = (() => {
    const out: Abilities = { ...draft.baseAbilities! }
    ;(Object.keys(draft.abilityBonuses!) as (keyof Abilities)[]).forEach(
      (k) => {
        out[k] += draft.abilityBonuses![k]
      }
    )
    ;(Object.keys(racialBonuses) as (keyof Abilities)[]).forEach((k) => {
      out[k] += racialBonuses[k] ?? 0
    })
    return out
  })()

  // slot progression for non-warlocks
  const spellSlots = (() => {
    if (classKey === 'warlock') return null
    if (isThirdCasterSubclass) return getSlotsForCasterType('third', level)
    if (SPELLCASTING_CLASSES.includes(classKey)) return getSpellSlotsForClass(classKey as any, level)
    return null
  })()

  // warlock pact data
  const pact = classKey === 'warlock'
    ? getWarlockPactRow(level)
    : null

  // Max spell level accessible at this class+level
  const maxSpellLevel = (() => {
    if (classKey === 'warlock') return pact?.pactSlotLevel ?? 1
    if (spellSlots) {
      const keys = Object.keys(spellSlots).map(Number).filter(k => spellSlots[k] > 0)
      return keys.length > 0 ? Math.max(...keys) : 0
    }
    return 0 // racial magic only, no class slots
  })()

  // Filter spells (no hooks)
  // Only show class spells if the character has a spellcasting class/subclass
  const showClassSpells = Boolean(spellClass)

  const filteredSpells = showClassSpells ? SRD_SPELLS.filter((spell) => {
    // class filter
    if (spellClass && !spell.classes?.includes(spellClass)) return false

    // level-cap filter: never show spells above the max accessible level
    if (spell.level > 0 && spell.level > maxSpellLevel) return false

    // manual level filter (user dropdown)
    if (spellLevelFilter !== 'all' && spell.level !== spellLevelFilter) return false

    // search filter
    if (spellSearch) {
      const t = spellSearch.toLowerCase()
      if (!spell.name.toLowerCase().includes(t) && !spell.school.toLowerCase().includes(t)) return false
    }

    return true
  }) : []

  // Determine casting ability for DC/attack (no hooks)
  let castingAbilityKey: keyof Abilities | null = null
  switch (classKey) {
    case 'wizard':
      castingAbilityKey = 'int'
      break
    case 'fighter': // Eldritch Knight — INT
    case 'rogue':   // Arcane Trickster — INT
      if (isThirdCasterSubclass) castingAbilityKey = 'int'
      break
    case 'sorcerer':
    case 'bard':
    case 'paladin':
    case 'warlock':
      castingAbilityKey = 'cha'
      break
    case 'cleric':
    case 'druid':
    case 'ranger':
      castingAbilityKey = 'wis'
      break
    default:
      castingAbilityKey = null
  }

  const castingAbilityLabel = castingAbilityKey
    ? castingAbilityKey.toUpperCase()
    : '—'

  let spellSaveDC: number | null = null
  let spellAttackBonus: number | null = null

  if (castingAbilityKey) {
    const mod = abilityMod(finalAbilities[castingAbilityKey])
    spellSaveDC = 8 + proficiencyBonus + mod
    spellAttackBonus = proficiencyBonus + mod
  }

  const knownSpells = draft.knownSpells ?? []
  const preparedSpells = draft.preparedSpells ?? []

  // Racial cantrip choice
  const racialCantripChoice = draft.racialCantripChoice ?? null
  const cantripChoiceFrom = raceData?.innateSpells?.cantripChoiceFrom as SpellClass | undefined
  const racialCantripOptions = cantripChoiceFrom
    ? SRD_SPELLS.filter(s => s.level === 0 && s.classes?.includes(cantripChoiceFrom))
    : []

  function selectRacialCantrip(spellName: string) {
    updateDraft({ racialCantripChoice: spellName === racialCantripChoice ? undefined : spellName })
  }

  function toggleKnown(spellName: string) {
    const exists = knownSpells.includes(spellName)
    const nextKnown = exists
      ? knownSpells.filter((s) => s !== spellName)
      : [...knownSpells, spellName]

    updateDraft({ knownSpells: nextKnown })
  }

  function togglePrepared(spellName: string) {
    const exists = preparedSpells.includes(spellName)
    const nextPrepared = exists
      ? preparedSpells.filter((s) => s !== spellName)
      : [...preparedSpells, spellName]

    updateDraft({ preparedSpells: nextPrepared })
  }

  function resetSlots() {
    setUsedSlots(Array(10).fill(0))
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="space-y-1">
        <h2 className="text-lg md:text-xl font-semibold text-white">
          Step 4 — Spellcasting
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Manage your spellbook, prepared spells, and slots. This step only appears for spellcasting classes.
        </p>
      </div>

      {/* Racial Magic section */}
      {raceData?.innateSpells && (
        <div className="rounded-xl border border-violet-700/40 bg-violet-900/10 p-4 space-y-3">
          <div className="text-sm font-semibold text-violet-200">
            Racial Magic — {raceData.name ?? raceKey}
          </div>

          {/* Auto-granted spells */}
          {(raceData.innateSpells.auto ?? []).length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">
                Innate Spells (auto-granted)
              </div>
              <div className="flex flex-wrap gap-2">
                {(raceData.innateSpells.auto as Array<{ spellName: string; unlocksAtLevel?: number }>).map((entry) => {
                  const locked = entry.unlocksAtLevel != null && level < entry.unlocksAtLevel
                  return (
                    <div
                      key={entry.spellName}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${
                        locked
                          ? 'border-slate-700 bg-slate-900/60 text-slate-500'
                          : 'border-violet-600/60 bg-violet-900/30 text-violet-200'
                      }`}
                    >
                      {locked ? '🔒' : '✦'} {entry.spellName}
                      {entry.unlocksAtLevel != null && (
                        <span className="text-slate-500 text-[10px]">
                          {locked ? `(level ${entry.unlocksAtLevel})` : ''}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Cantrip choice (e.g. High Elf) */}
          {cantripChoiceFrom && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">
                Choose 1 cantrip from the {cantripChoiceFrom} list
                {racialCantripChoice && (
                  <span className="ml-2 text-violet-300 normal-case">— {racialCantripChoice} selected</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                {racialCantripOptions.map((spell) => {
                  const selected = racialCantripChoice === spell.name
                  return (
                    <button
                      key={spell.name}
                      type="button"
                      onClick={() => selectRacialCantrip(spell.name)}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                        selected
                          ? 'border-violet-400 bg-violet-500/25 text-violet-200'
                          : 'border-slate-600 text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {spell.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subclass spellcasting note for EK/AT */}
      {isThirdCasterSubclass && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-900/10 px-4 py-2.5 text-xs text-amber-200">
          <span className="font-semibold">{isEK ? 'Eldritch Knight' : 'Arcane Trickster'}:</span>{' '}
          {isEK
            ? 'You cast spells from the Wizard list, primarily Abjuration and Enchantment schools. Third-caster progression.'
            : 'You cast spells from the Wizard list, primarily Divination and Enchantment schools. Third-caster progression.'}
        </div>
      )}

      {/* Filters (only shown when there's a class spell list) */}
      {showClassSpells && (
        <div className="space-y-2">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <input
              className="flex-1 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              placeholder="Search spells by name or school…"
              value={spellSearch}
              onChange={(e) => setSpellSearch(e.target.value)}
            />

            <select
              className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none w-44"
              value={spellLevelFilter}
              onChange={(e) =>
                setSpellLevelFilter(
                  e.target.value === 'all' ? 'all' : Number(e.target.value)
                )
              }
            >
              <option value="all">All Levels</option>
              <option value={0}>Cantrips</option>
              {[1,2,3,4,5,6,7,8,9].map((n) => (
                <option key={n} value={n} disabled={n > maxSpellLevel}>
                  {n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`} Level{n > maxSpellLevel ? ' (locked)' : ''}
                </option>
              ))}
            </select>
          </div>
          {/* Spell access info chip */}
          <div className="text-[11px] text-slate-400">
            Spell access:{' '}
            <span className="text-slate-200">
              {maxSpellLevel === 0 ? 'Cantrips only' : `Cantrips + up to ${maxSpellLevel === 1 ? '1st' : maxSpellLevel === 2 ? '2nd' : maxSpellLevel === 3 ? '3rd' : `${maxSpellLevel}th`} level`}
            </span>
            {' '}• based on level {level} {isThirdCasterSubclass ? (isEK ? 'Eldritch Knight' : 'Arcane Trickster') : classKey} progression
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {!showClassSpells && (
          <div className="text-sm text-slate-500 py-6 text-center italic">
            This character has no class-based spells. Use Racial Magic above.
          </div>
        )}
        {/* Spell list */}
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-2">
          {filteredSpells.map((spell) => {
            const isKnown = knownSpells.includes(spell.name)
            const isPrepared = preparedSpells.includes(spell.name)

            return (
              <div
                key={spell.name}
                className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 flex justify-between items-start text-xs"
              >
                <div>
                  <div className="font-semibold text-white text-sm">
                    {spell.name}{' '}
                    <span className="text-[10px] text-slate-400">
                      {spell.level === 0
                        ? 'Cantrip'
                        : `${spell.level}th level`}{' '}
                      • {spell.school}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1">
                    Range: {spell.range} • {spell.castingTime} • {spell.duration}
                  </div>

                  {spell.components && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Components: {spell.components}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 ml-3">
                  <button
                    type="button"
                    onClick={() => toggleKnown(spell.name)}
                    className={`px-2 py-1 rounded border text-[10px] ${
                      isKnown
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                        : 'border-slate-600 bg-slate-800 text-slate-200'
                    }`}
                  >
                    {isKnown ? 'Known' : 'Mark Known'}
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePrepared(spell.name)}
                    className={`px-2 py-1 rounded border text-[10px] ${
                      isPrepared
                        ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                        : 'border-slate-600 bg-slate-800 text-slate-200'
                    }`}
                  >
                    {isPrepared ? 'Prepared' : 'Prepare'}
                  </button>
                </div>
              </div>
            )
          })}

          {filteredSpells.length === 0 && (
            <div className="text-sm text-slate-500 py-4 text-center">
              No spells match your filters.
            </div>
          )}
        </div>

        {/* Side panel: spell stats + slots */}
        <div className="space-y-4 text-xs">
          {/* Spellcasting stats */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4">
            <h3 className="text-sm font-semibold text-white mb-2">
              Spellcasting Stats
            </h3>

            <p className="text-slate-300">
              Class: <span className="font-semibold text-cyan-300">{classKey}</span>
            </p>

            <p className="text-slate-300 mt-1">
              Casting Ability:{' '}
              <span className="font-mono text-white">
                {castingAbilityLabel}
              </span>
            </p>

            {spellSaveDC !== null && spellAttackBonus !== null && (
              <>
                <p className="text-slate-300 mt-1">
                  Spell Save DC:{' '}
                  <span className="font-mono text-white">
                    {spellSaveDC}
                  </span>
                </p>
                <p className="text-slate-300 mt-1">
                  Spell Attack Bonus:{' '}
                  <span className="font-mono text-white">
                    {spellAttackBonus >= 0 ? '+' : ''}
                    {spellAttackBonus}
                  </span>
                </p>
              </>
            )}

            {spellSaveDC === null && (
              <p className="text-[11px] text-slate-500 mt-2">
                This class currently has no configured spellcasting ability.
              </p>
            )}
          </div>

          {/* Spell slots / Pact Magic */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white mb-1">
              Spell Slots
            </h3>

            {/* Regular casters */}
            {classKey !== 'warlock' && (
              <>
                {!spellSlots && (
                  <div className="text-[11px] text-slate-500">
                    No spell slots at this level.
                  </div>
                )}

                {spellSlots && (
                  <div className="space-y-2">
                    {Object.entries(spellSlots).map(([levelKey, slotCount]) => {
                      const lvl = Number(levelKey)
                      if (!slotCount) return null

                      const used = usedSlots[lvl] ?? 0

                      return (
                        <div
                          key={lvl}
                          className="flex items-center justify-between rounded bg-slate-800/80 px-3 py-2"
                        >
                          <span className="text-white text-sm">
                            Level {lvl}:
                          </span>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-white">
                              {used}/{slotCount}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setUsedSlots((prev) => {
                                  const next = [...prev]
                                  if (used < (slotCount as number)) {
                                    next[lvl] = (next[lvl] ?? 0) + 1
                                  }
                                  return next
                                })
                              }}
                              className="px-2 py-1 text-[10px] border border-slate-600 rounded bg-slate-700 hover:bg-slate-600"
                            >
                              Use
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Warlock pact magic */}
            {classKey === 'warlock' && (
              <>
                {!pact && (
                  <div className="text-[11px] text-slate-500">
                    No pact slots at this level.
                  </div>
                )}

                {pact && (
                  <div className="space-y-2">
                    <div className="rounded bg-slate-800/80 px-3 py-2 text-white text-sm">
                      Pact Level {pact.pactSlotLevel} • {pact.pactSlots} slot
                      {pact.pactSlots > 1 ? 's' : ''}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const lvl = pact.pactSlotLevel
                        const used = usedSlots[lvl] ?? 0
                        setUsedSlots((prev) => {
                          const next = [...prev]
                          if (used < pact.pactSlots) {
                            next[lvl] = (next[lvl] ?? 0) + 1
                          }
                          return next
                        })
                      }}
                      className="w-full px-2 py-1 text-[11px] border border-slate-600 rounded bg-slate-700 hover:bg-slate-600"
                    >
                      Use Pact Slot
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              type="button"
              onClick={resetSlots}
              className="mt-3 w-full py-1.5 text-[11px] rounded border border-slate-600 bg-slate-800/80 hover:bg-slate-700"
            >
              Reset All Slots
            </button>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs md:text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
        >
          ← Back to Abilities
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs md:text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.55)] transition"
        >
          Next: Equipment
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}
