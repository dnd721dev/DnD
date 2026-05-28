'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { RACE_LIST, RACES, getRace, hasRaceInnateSpells, type RaceKey } from '@/lib/races'
import { SRD_SPELLS } from '@/lib/srdspells'
import type { SpellClass } from '@/lib/srdspells/types'
import {
  getSpellSlotsForClass,
  getSlotsForCasterType,
  getWarlockPactRow,
  getCantripsKnown,
  getSpellsKnown,
  getWizardSpellbookSize,
  getDomainSpells,
  getAllowedSchoolsForSubclass,
  getWildcardCountForSubclass,
  getMysticArcanumLevels,
} from '@/lib/spellcastingProgression'
import { getEligibleInvocations, getInvocationCount, INVOCATIONS } from '@/lib/invocations'
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
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
}

const DEFAULT_BONUSES: Abilities = {
  str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0,
}

// classes that go through the spellcasting step
const SPELLCASTING_CLASSES = [
  'wizard', 'sorcerer', 'cleric', 'druid', 'bard',
  'paladin', 'ranger', 'warlock',
]

// prepared-spell classes (use ability mod + level formula instead of spells-known table)
const PREPARED_CASTERS = ['wizard', 'cleric', 'druid', 'paladin']

// known-spell classes (fixed number of spells they know permanently)
const KNOWN_SPELL_CASTERS = ['sorcerer', 'bard', 'warlock', 'ranger']

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

function spellLevelLabel(n: number): string {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
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
      const merged: CharacterDraft = { ...existing, level, classKey }
      saveDraft(merged)
      setRedirecting(true)
      router.replace('/characters/new/step5')
      return
    }

    const baseAbilities: Abilities = { ...DEFAULT_ABILITIES, ...(existing.baseAbilities ?? {}) }
    const abilityBonuses: Abilities = { ...DEFAULT_BONUSES, ...(existing.abilityBonuses ?? {}) }
    const knownSpells: string[] = existing.knownSpells ?? []
    const preparedSpells: string[] = existing.preparedSpells ?? []
    const proficiencyBonus = existing.proficiencyBonus ?? proficiencyForLevel(level)

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
      const current: CharacterDraft = prev ?? {
        baseAbilities: DEFAULT_ABILITIES,
        abilityBonuses: DEFAULT_BONUSES,
        level: 1,
        classKey: 'fighter',
        knownSpells: [],
        preparedSpells: [],
        proficiencyBonus: proficiencyForLevel(1),
      }
      const next: CharacterDraft = { ...current, ...update }
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
    return <div className="text-sm text-slate-300">Loading spellcasting…</div>
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Derived values (all pure computation, no hooks after this point)
  // ─────────────────────────────────────────────────────────────────────────
  const level = draft.level ?? 1
  const classKey = (draft.classKey ?? 'fighter').toLowerCase()
  const subclassKey = String(draft.subclassKey ?? '').toLowerCase()
  const proficiencyBonus = draft.proficiencyBonus ?? proficiencyForLevel(level)

  const raceKey = (draft.raceKey as RaceKey) ?? (RACE_LIST[0]?.key as RaceKey)
  const raceData = (RACES as any)[raceKey]

  const isEK = classKey === 'fighter' && subclassKey === 'fighter_eldritch_knight' && level >= 3
  const isAT = classKey === 'rogue' && subclassKey === 'rogue_arcane_trickster' && level >= 3
  const isThirdCasterSubclass = isEK || isAT
  const isWizard = classKey === 'wizard'
  const isPreparedCaster = PREPARED_CASTERS.includes(classKey)
  const isKnownSpellCaster = KNOWN_SPELL_CASTERS.includes(classKey)

  // Spell class for SRD filter
  let spellClass: SpellClass | null = null
  switch (classKey) {
    case 'wizard':    spellClass = 'wizard'; break
    case 'sorcerer':  spellClass = 'sorcerer'; break
    case 'cleric':    spellClass = 'cleric'; break
    case 'druid':     spellClass = 'druid'; break
    case 'bard':      spellClass = 'bard'; break
    case 'paladin':   spellClass = 'paladin'; break
    case 'ranger':    spellClass = 'ranger'; break
    case 'warlock':   spellClass = 'warlock'; break
    case 'fighter': case 'rogue':
      if (isThirdCasterSubclass) spellClass = 'wizard'
      break
  }

  const showClassSpells = Boolean(spellClass)

  // Final abilities
  const finalAbilities: Abilities = (() => {
    const out: Abilities = { ...draft.baseAbilities! }
    ;(Object.keys(draft.abilityBonuses!) as (keyof Abilities)[]).forEach(
      (k) => { out[k] += draft.abilityBonuses![k] }
    )
    return out
  })()

  // Slot progression
  const spellSlots = (() => {
    if (classKey === 'warlock') return null
    if (isThirdCasterSubclass) return getSlotsForCasterType('third', level)
    if (SPELLCASTING_CLASSES.includes(classKey)) return getSpellSlotsForClass(classKey as any, level)
    return null
  })()

  const pact = classKey === 'warlock' ? getWarlockPactRow(level) : null

  // Raw max spell level from slot table
  const rawMaxSpellLevel = (() => {
    if (classKey === 'warlock') return pact?.pactSlotLevel ?? 1
    if (spellSlots) {
      const keys = Object.keys(spellSlots).map(Number).filter(k => spellSlots[k] > 0)
      return keys.length > 0 ? Math.max(...keys) : 0
    }
    return 0
  })()

  // BUG 2 FIX: level 1 Paladin/Ranger have no spell slots yet but should still be able to
  // choose spells they'll cast starting at level 2. Show 1st-level spells for them.
  const isHalfCasterNoSlotsYet = rawMaxSpellLevel === 0 && (classKey === 'paladin' || classKey === 'ranger')
  const maxSpellLevel = isHalfCasterNoSlotsYet ? 1 : rawMaxSpellLevel

  // Casting ability
  let castingAbilityKey: keyof Abilities | null = null
  switch (classKey) {
    case 'wizard': case 'fighter': case 'rogue':
      if (classKey === 'wizard' || isThirdCasterSubclass) castingAbilityKey = 'int'
      break
    case 'sorcerer': case 'bard': case 'paladin': case 'warlock':
      castingAbilityKey = 'cha'; break
    case 'cleric': case 'druid': case 'ranger':
      castingAbilityKey = 'wis'; break
  }

  const castingAbilityLabel = castingAbilityKey ? castingAbilityKey.toUpperCase() : '—'

  let spellSaveDC: number | null = null
  let spellAttackBonus: number | null = null
  if (castingAbilityKey) {
    const mod = abilityMod(finalAbilities[castingAbilityKey])
    spellSaveDC = 8 + proficiencyBonus + mod
    spellAttackBonus = proficiencyBonus + mod
  }

  // ── Spell selection limits ────────────────────────────────────────────────
  const maxCantrips = getCantripsKnown(classKey as any, level)

  // For known-spell casters: max leveled spells known
  const maxSpellsKnown = getSpellsKnown(classKey as any, level) // null = prepared caster

  // For Wizard: spellbook size (leveled spells only)
  const wizardSpellbookSize = isWizard ? getWizardSpellbookSize(level) : null

  // For prepared casters: max prepared = ability mod + level (Paladin uses half level)
  const maxPrepared: number | null = (() => {
    if (!castingAbilityKey || !isPreparedCaster) return null
    const mod = abilityMod(finalAbilities[castingAbilityKey])
    if (classKey === 'paladin') return Math.max(1, Math.floor(level / 2) + mod)
    return Math.max(1, level + mod)
  })()

  // ── Domain spells (auto-granted by subclass) ──────────────────────────────
  const rawDomainSpells = getDomainSpells(subclassKey, maxSpellLevel)
  // Filter to only spells that exist in the SRD data
  const domainSpells = rawDomainSpells.filter(name => SRD_SPELLS.some(s => s.name === name))

  // ── Current selection counts ──────────────────────────────────────────────
  const knownSpells: string[] = draft.knownSpells ?? []
  const preparedSpells: string[] = draft.preparedSpells ?? []

  const currentCantrips = knownSpells.filter(n => {
    const s = SRD_SPELLS.find(sp => sp.name === n)
    return s?.level === 0
  })
  const currentLeveledKnown = knownSpells.filter(n => {
    const s = SRD_SPELLS.find(sp => sp.name === n)
    return s && s.level > 0
  })
  // Prepared count: exclude domain spells (they're always prepared, don't count against cap)
  const currentPreparedNonDomain = preparedSpells.filter(n => !domainSpells.includes(n))

  // ── Racial cantrip ────────────────────────────────────────────────────────
  const racialCantripChoice = draft.racialCantripChoice ?? null
  const cantripChoiceFrom = raceData?.innateSpells?.cantripChoiceFrom as SpellClass | undefined
  const racialCantripOptions = cantripChoiceFrom
    ? SRD_SPELLS.filter(s => s.level === 0 && s.classes?.includes(cantripChoiceFrom))
    : []

  // Magic audit section D: enforce EK/AT school restrictions.
  // EK is limited to Abjuration + Evocation; AT is limited to Enchantment + Illusion.
  // Cantrips are not restricted (per 5e). Wave 1B adds the any-school wildcard
  // picks at levels 3, 8, 14, 20.
  const allowedSchools = getAllowedSchoolsForSubclass(classKey, subclassKey)
  const wildcardSpells: string[] = draft.wildcardSpells ?? []
  const wildcardBudget = getWildcardCountForSubclass(classKey, subclassKey, level)
  const wildcardsUsed = wildcardSpells.length

  // Wave 3 — Mystic Arcanum (Warlock 11+). Picks are stored keyed by spell
  // level. The picker is rendered separately from the main spell list.
  const arcanumLevels = getMysticArcanumLevels(classKey, level)
  const mysticArcanum: Record<string, string | null> = draft.mysticArcanum ?? {}

  // Wave 4 — Warlock Eldritch Invocations. Pick up to invocationBudget; the
  // budget grows with class level (2/2/2/3/3/4/4/5/5/5/6/6/6/7/7/7/8 from PHB).
  const invocationBudget = classKey === 'warlock' ? getInvocationCount(level) : 0
  const warlockInvocations: string[] = draft.warlockInvocations ?? []
  const eligibleInvocations = classKey === 'warlock' ? getEligibleInvocations(level) : []
  const invocationsPickedCount = warlockInvocations.length

  // ── Filtered spell lists ──────────────────────────────────────────────────
  // Wave 1B: spells that violate the school restriction are NOT hidden — instead
  // they're left visible so the EK/AT player can use a wildcard pick to add
  // them. The visual treatment + add-button below distinguishes "free pick"
  // from "wildcard pick."
  const baseSpells = showClassSpells
    ? SRD_SPELLS.filter(spell => {
        if (spellClass && !spell.classes?.includes(spellClass)) return false
        if (spell.level > 0 && spell.level > maxSpellLevel) return false
        if (spellLevelFilter !== 'all' && spell.level !== spellLevelFilter) return false
        if (spellSearch) {
          const t = spellSearch.toLowerCase()
          if (!spell.name.toLowerCase().includes(t) && !spell.school.toLowerCase().includes(t)) return false
        }
        return true
      })
    : []

  // Wave 1B helper: is a given spell off-school for the current subclass?
  function isOffSchool(spell: { school: string; level: number }): boolean {
    if (!allowedSchools) return false
    if (spell.level === 0) return false // cantrips are unrestricted
    return !allowedSchools.includes(spell.school)
  }

  // Split into cantrips and leveled spells
  const filteredCantrips = baseSpells.filter(s => s.level === 0)
  const filteredLeveledSpells = baseSpells.filter(s => s.level > 0)

  // ── Validation message ────────────────────────────────────────────────────
  const validationMessage: string | null = (() => {
    if (!showClassSpells) return null

    // Cantrip requirement (skip paladin/ranger which have 0 cantrips)
    if (maxCantrips > 0 && currentCantrips.length === 0) {
      return `Select at least 1 cantrip — ${classKey}s get ${maxCantrips} at level ${level}`
    }

    // Wizard must have at least 1 spell in spellbook
    if (isWizard && wizardSpellbookSize !== null && currentLeveledKnown.length === 0 && maxSpellLevel > 0) {
      return `Add at least 1 spell to your spellbook`
    }

    // Known-spell casters must select their known spells if the class grants any
    if (isKnownSpellCaster && maxSpellsKnown !== null && maxSpellsKnown > 0 && currentLeveledKnown.length === 0) {
      return `Select at least 1 known spell — ${classKey}s know ${maxSpellsKnown} at level ${level}`
    }

    return null
  })()

  // ─────────────────────────────────────────────────────────────────────────
  // Event handlers
  // ─────────────────────────────────────────────────────────────────────────

  function selectRacialCantrip(spellName: string) {
    updateDraft({ racialCantripChoice: spellName === racialCantripChoice ? undefined : spellName })
  }

  function toggleKnown(spellName: string) {
    const spell = SRD_SPELLS.find(s => s.name === spellName)
    if (!spell) return

    const isCantrip = spell.level === 0
    const exists = knownSpells.includes(spellName)
    const isWildcardPick = wildcardSpells.includes(spellName)
    const requiresWildcard = isOffSchool(spell)

    if (!exists) {
      // Check cantrip cap
      if (isCantrip && maxCantrips > 0 && currentCantrips.length >= maxCantrips) return

      if (!isCantrip) {
        // Check Wizard spellbook cap
        if (isWizard && wizardSpellbookSize !== null && currentLeveledKnown.length >= wizardSpellbookSize) return
        // Check known-spell caster cap
        if (!isWizard && maxSpellsKnown !== null && currentLeveledKnown.length >= maxSpellsKnown) return

        // Wave 1B: off-school spells require a wildcard pick from the EK/AT budget.
        if (requiresWildcard) {
          if (wildcardsUsed >= wildcardBudget) return // no wildcards available
        }
      }
    }

    const nextKnown = exists
      ? knownSpells.filter(s => s !== spellName)
      : [...knownSpells, spellName]

    // Wave 1B: track which spells consumed a wildcard so the school filter
    // continues to allow them and the budget counter stays accurate.
    let nextWildcards = wildcardSpells
    if (exists) {
      // Removing a known spell — also drop it from wildcard tracking.
      if (isWildcardPick) nextWildcards = wildcardSpells.filter(s => s !== spellName)
    } else if (requiresWildcard && !isCantrip) {
      nextWildcards = [...wildcardSpells, spellName]
    }

    // For known-spell casters: keep prepared in sync with known
    if (isKnownSpellCaster) {
      const nextPrepared = exists
        ? preparedSpells.filter(s => s !== spellName)
        : [...preparedSpells, spellName]
      updateDraft({ knownSpells: nextKnown, preparedSpells: nextPrepared, wildcardSpells: nextWildcards })
    } else {
      updateDraft({ knownSpells: nextKnown, wildcardSpells: nextWildcards })
    }
  }

  function togglePrepared(spellName: string) {
    const exists = preparedSpells.includes(spellName)

    if (!exists && maxPrepared !== null) {
      // Domain spells don't count against the prepared cap
      if (currentPreparedNonDomain.length >= maxPrepared) return
    }

    // For Wizard, must add to spellbook first
    if (isWizard && !exists && !knownSpells.includes(spellName)) {
      // Auto-add to spellbook if there's space
      if (wizardSpellbookSize === null || currentLeveledKnown.length < wizardSpellbookSize) {
        const nextKnown = [...knownSpells, spellName]
        const nextPrepared = [...preparedSpells, spellName]
        updateDraft({ knownSpells: nextKnown, preparedSpells: nextPrepared })
        return
      }
      return // spellbook full
    }

    const nextPrepared = exists
      ? preparedSpells.filter(s => s !== spellName)
      : [...preparedSpells, spellName]
    updateDraft({ preparedSpells: nextPrepared })
  }

  function resetSlots() {
    setUsedSlots(Array(10).fill(0))
  }

  // Labels based on class type
  const knownButtonLabel = isWizard ? 'Add to Spellbook' : 'Mark Known'
  const knownButtonActiveLabel = isWizard ? 'In Spellbook' : 'Known'

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="space-y-1">
        <h2 className="text-lg md:text-xl font-semibold text-white">
          Step 4 — Spellcasting
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Choose your spells for the adventure ahead.
        </p>
      </div>

      {/* Racial Magic */}
      {raceData?.innateSpells && (
        <div className="rounded-xl border border-violet-700/40 bg-violet-900/10 p-4 space-y-3">
          <div className="text-sm font-semibold text-violet-200">
            Racial Magic — {raceData.name ?? raceKey}
          </div>
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
                      {entry.unlocksAtLevel != null && locked && (
                        <span className="text-slate-500 text-[10px]">(level {entry.unlocksAtLevel})</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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

      {/* EK / AT subclass note */}
      {isThirdCasterSubclass && (
        <div className="rounded-lg border border-amber-700/40 bg-amber-900/10 px-4 py-2.5 text-xs text-amber-200 space-y-1">
          <div>
            <span className="font-semibold">{isEK ? 'Eldritch Knight' : 'Arcane Trickster'}:</span>{' '}
            {isEK
              ? 'You cast spells from the Wizard list — leveled spells must be Abjuration or Evocation. Third-caster progression.'
              : 'You cast spells from the Wizard list — leveled spells must be Enchantment or Illusion. Third-caster progression.'}
          </div>
          {/* Wave 1B: wildcard counter */}
          {wildcardBudget > 0 && (
            <div className="text-[11px] text-amber-300/90">
              ✦ <span className="font-semibold">Any-school picks</span>: {wildcardsUsed}/{wildcardBudget} used
              <span className="ml-1 text-amber-400/70">— gained at levels 3, 8, 14, 20. Any spell off-school requires one.</span>
            </div>
          )}
        </div>
      )}

      {/* Wave 3 — Mystic Arcanum picker (Warlock 11+) */}
      {arcanumLevels.length > 0 && (
        <div className="rounded-xl border border-fuchsia-700/40 bg-fuchsia-900/10 p-4 space-y-3">
          <div className="text-sm font-semibold text-fuchsia-200">
            Mystic Arcanum
            <span className="ml-2 text-[11px] font-normal text-fuchsia-400/80">
              — pick one spell per level. Each castable 1/day (long rest), bypasses pact slots.
            </span>
          </div>
          {arcanumLevels.map(arcLvl => {
            const picked = mysticArcanum[String(arcLvl)] ?? ''
            const options = SRD_SPELLS.filter(
              s => s.classes?.includes('warlock') && s.level === arcLvl,
            )
            return (
              <div key={arcLvl} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-xs font-semibold text-fuchsia-300">
                  {spellLevelLabel(arcLvl)} Level
                </span>
                <select
                  className="flex-1 rounded-md border border-fuchsia-700/40 bg-slate-900/80 px-3 py-1.5 text-xs focus:border-fuchsia-400 focus:outline-none"
                  value={picked}
                  onChange={e => {
                    const next = { ...mysticArcanum, [String(arcLvl)]: e.target.value || null }
                    updateDraft({ mysticArcanum: next })
                  }}
                >
                  <option value="">— Choose a {spellLevelLabel(arcLvl)}-level Warlock spell —</option>
                  {options.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name} · {s.school}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      )}

      {/* Wave 4 — Warlock Eldritch Invocations picker (level 2+) */}
      {classKey === 'warlock' && invocationBudget > 0 && (
        <div className="rounded-xl border border-purple-700/40 bg-purple-900/10 p-4 space-y-3">
          <div className="text-sm font-semibold text-purple-200">
            Eldritch Invocations
            <span className="ml-2 text-[11px] font-normal text-purple-400/80">
              — pick {invocationBudget} ({invocationsPickedCount}/{invocationBudget} picked). Book of Ancient Secrets grants ritual casting.
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {eligibleInvocations.map(inv => {
              const picked = warlockInvocations.includes(inv.key)
              const atCap = !picked && invocationsPickedCount >= invocationBudget
              return (
                <button
                  key={inv.key}
                  type="button"
                  onClick={() => {
                    const next = picked
                      ? warlockInvocations.filter(k => k !== inv.key)
                      : [...warlockInvocations, inv.key]
                    updateDraft({ warlockInvocations: next })
                  }}
                  disabled={atCap}
                  className={`rounded-lg border px-3 py-2 text-left text-[11px] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    picked
                      ? 'border-purple-400 bg-purple-500/15 text-purple-100'
                      : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-purple-500/50'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1">
                    {picked && <span className="text-purple-300">✓</span>}
                    {inv.name}
                    <span className="ml-auto text-[9px] text-slate-500">L{inv.minLevel}</span>
                  </div>
                  {inv.prereq && (
                    <div className="text-[10px] text-amber-400/80 mt-0.5">Requires: {inv.prereq}</div>
                  )}
                  <div className="text-[10px] text-slate-400 mt-0.5">{inv.summary}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* BUG 2 — level 1 half-caster note */}
      {isHalfCasterNoSlotsYet && (
        <div className="rounded-lg border border-amber-600/40 bg-amber-900/10 px-4 py-2.5 text-xs text-amber-200">
          <span className="font-semibold">{classKey === 'paladin' ? 'Paladins' : 'Rangers'}</span> don't gain spell slots until level 2 (2014 rules).
          You can still choose your spells now — they'll be ready when you reach level 2.
        </div>
      )}

      {/* Domain / oath / circle spells section (BUG 8) */}
      {domainSpells.length > 0 && (
        <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-amber-200">
              {classKey === 'cleric' ? 'Domain Spells' : classKey === 'druid' ? 'Circle Spells' : 'Oath Spells'}
              <span className="ml-2 text-[11px] font-normal text-amber-400/80">— always prepared, don't count against your limit</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {domainSpells.map(name => {
              const spell = SRD_SPELLS.find(s => s.name === name)
              return (
                <div
                  key={name}
                  className="flex items-center gap-1 rounded-full border border-amber-600/50 bg-amber-900/30 px-3 py-1 text-[11px] text-amber-200"
                >
                  ✦ {name}
                  {spell && <span className="text-amber-500/70 text-[10px] ml-1">({spellLevelLabel(spell.level)})</span>}
                </div>
              )
            })}
          </div>
          {rawDomainSpells.length > domainSpells.length && (
            <p className="text-[10px] text-amber-500/70">
              {rawDomainSpells.length - domainSpells.length} domain spell(s) not in SRD — will be available via DM or homebrew.
            </p>
          )}
        </div>
      )}

      {/* Class rule summary (BUG 5 + 6) */}
      {showClassSpells && (
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your Spellcasting</div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Casting ability + stats */}
            <div className="rounded-lg bg-slate-800/60 p-2 text-center">
              <div className="text-[10px] uppercase text-slate-500">Ability</div>
              <div className="text-base font-bold text-white">{castingAbilityLabel}</div>
            </div>
            {spellSaveDC !== null && (
              <div className="rounded-lg bg-slate-800/60 p-2 text-center">
                <div className="text-[10px] uppercase text-slate-500">Save DC</div>
                <div className="text-base font-bold text-violet-200">{spellSaveDC}</div>
              </div>
            )}
            {spellAttackBonus !== null && (
              <div className="rounded-lg bg-slate-800/60 p-2 text-center">
                <div className="text-[10px] uppercase text-slate-500">Spell Attack</div>
                <div className="text-base font-bold text-blue-200">
                  {spellAttackBonus >= 0 ? '+' : ''}{spellAttackBonus}
                </div>
              </div>
            )}
            <div className="rounded-lg bg-slate-800/60 p-2 text-center">
              <div className="text-[10px] uppercase text-slate-500">Spell Access</div>
              <div className="text-base font-bold text-cyan-200">
                {maxSpellLevel === 0 ? 'Cantrips' : spellLevelLabel(maxSpellLevel)}
              </div>
            </div>
          </div>

          {/* Selection counters row */}
          <div className="flex flex-wrap gap-2 text-xs">
            {/* Cantrips counter */}
            {maxCantrips > 0 && (
              <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${
                currentCantrips.length >= maxCantrips
                  ? 'border-emerald-600/60 bg-emerald-900/20 text-emerald-300'
                  : 'border-slate-600 bg-slate-800/60 text-slate-300'
              }`}>
                Cantrips: {currentCantrips.length}/{maxCantrips}
                {currentCantrips.length >= maxCantrips && ' ✓'}
              </div>
            )}

            {/* Wizard spellbook counter */}
            {isWizard && wizardSpellbookSize !== null && (
              <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${
                currentLeveledKnown.length >= wizardSpellbookSize
                  ? 'border-emerald-600/60 bg-emerald-900/20 text-emerald-300'
                  : 'border-slate-600 bg-slate-800/60 text-slate-300'
              }`}>
                Spellbook: {currentLeveledKnown.length}/{wizardSpellbookSize}
              </div>
            )}

            {/* Wizard prepared counter */}
            {isWizard && maxPrepared !== null && (
              <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${
                currentPreparedNonDomain.length >= maxPrepared
                  ? 'border-sky-600/60 bg-sky-900/20 text-sky-300'
                  : 'border-slate-600 bg-slate-800/60 text-slate-300'
              }`}>
                Prepared: {currentPreparedNonDomain.length}/{maxPrepared}
                {currentPreparedNonDomain.length >= maxPrepared && ' ✓'}
              </div>
            )}

            {/* Known-spell caster counter */}
            {isKnownSpellCaster && maxSpellsKnown !== null && maxSpellsKnown > 0 && (
              <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${
                currentLeveledKnown.length >= maxSpellsKnown
                  ? 'border-emerald-600/60 bg-emerald-900/20 text-emerald-300'
                  : 'border-slate-600 bg-slate-800/60 text-slate-300'
              }`}>
                Spells Known: {currentLeveledKnown.length}/{maxSpellsKnown}
                {currentLeveledKnown.length >= maxSpellsKnown && ' ✓'}
              </div>
            )}

            {/* Prepared caster (non-Wizard) counter */}
            {isPreparedCaster && !isWizard && maxPrepared !== null && (
              <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${
                currentPreparedNonDomain.length >= maxPrepared
                  ? 'border-sky-600/60 bg-sky-900/20 text-sky-300'
                  : 'border-slate-600 bg-slate-800/60 text-slate-300'
              }`}>
                Prepared: {currentPreparedNonDomain.length}/{maxPrepared}
                {currentPreparedNonDomain.length >= maxPrepared && ' ✓'}
              </div>
            )}

            {/* Warlock spells known */}
            {classKey === 'warlock' && maxSpellsKnown !== null && (
              <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] ${
                currentLeveledKnown.length >= maxSpellsKnown
                  ? 'border-emerald-600/60 bg-emerald-900/20 text-emerald-300'
                  : 'border-slate-600 bg-slate-800/60 text-slate-300'
              }`}>
                Spells Known: {currentLeveledKnown.length}/{maxSpellsKnown}
              </div>
            )}
          </div>

          {/* Prepared spell formula explanation */}
          {isPreparedCaster && maxPrepared !== null && (
            <div className="text-[11px] text-slate-400">
              {isWizard && (
                <>
                  <span className="text-slate-200 font-medium">Wizard:</span> Your spellbook holds up to {wizardSpellbookSize} spells.
                  Each day you prepare up to{' '}
                  <span className="text-white font-medium">{maxPrepared}</span>{' '}
                  spells from it ({castingAbilityLabel} mod + wizard level).
                  You can change your prepared spells on a long rest.
                </>
              )}
              {classKey === 'cleric' && (
                <>
                  <span className="text-slate-200 font-medium">Cleric:</span> Prepare up to{' '}
                  <span className="text-white font-medium">{maxPrepared}</span>{' '}
                  spells each day ({castingAbilityLabel} mod + cleric level).
                  Domain spells are always prepared and don't count against this limit.
                </>
              )}
              {classKey === 'druid' && (
                <>
                  <span className="text-slate-200 font-medium">Druid:</span> Prepare up to{' '}
                  <span className="text-white font-medium">{maxPrepared}</span>{' '}
                  spells each day ({castingAbilityLabel} mod + druid level).
                  Circle spells are always prepared.
                </>
              )}
              {classKey === 'paladin' && (
                <>
                  <span className="text-slate-200 font-medium">Paladin:</span> Prepare up to{' '}
                  <span className="text-white font-medium">{maxPrepared}</span>{' '}
                  spells each day ({castingAbilityLabel} mod + ½ paladin level, min 1).
                  Oath spells are always prepared.
                </>
              )}
            </div>
          )}
          {isKnownSpellCaster && (
            <div className="text-[11px] text-slate-400">
              <span className="text-slate-200 font-medium capitalize">{classKey}:</span>{' '}
              {classKey === 'warlock'
                ? `You know ${maxSpellsKnown ?? 2} spells — choose carefully. You can swap 1 out when you gain a level.`
                : classKey === 'ranger'
                  ? maxSpellsKnown === 0
                    ? 'Rangers do not know spells at level 1. You gain 2 known spells at level 2.'
                    : `You know ${maxSpellsKnown} spells. These are always ready to cast — no preparation needed.`
                  : `You know ${maxSpellsKnown ?? '?'} spells. These are always ready to cast — no preparation needed.`
              }
            </div>
          )}
        </div>
      )}

      {/* Search + level filter */}
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
                setSpellLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
            >
              <option value="all">All Levels</option>
              {maxCantrips > 0 && <option value={0}>Cantrips</option>}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n} disabled={n > maxSpellLevel}>
                  {spellLevelLabel(n)} Level{n > maxSpellLevel ? ' (locked)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        {/* Spell list (left column) */}
        <div className="space-y-4">
          {!showClassSpells && (
            <div className="text-sm text-slate-500 py-6 text-center italic">
              This character has no class-based spells. Use Racial Magic above.
            </div>
          )}

          {/* ── Cantrips section (BUG 9) ── */}
          {showClassSpells && (spellLevelFilter === 'all' || spellLevelFilter === 0) && maxCantrips > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cantrips</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] border ${
                  currentCantrips.length >= maxCantrips
                    ? 'border-emerald-600/60 text-emerald-300'
                    : 'border-slate-700 text-slate-400'
                }`}>
                  {currentCantrips.length}/{maxCantrips}
                </span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {filteredCantrips.map((spell) => {
                  const isSelected = knownSpells.includes(spell.name)
                  const atCap = !isSelected && currentCantrips.length >= maxCantrips
                  return (
                    <div
                      key={spell.name}
                      className={`rounded-lg border p-2.5 flex justify-between items-center text-xs transition ${
                        isSelected
                          ? 'border-emerald-700/50 bg-emerald-900/15'
                          : atCap
                            ? 'border-slate-800 bg-slate-900/40 opacity-50'
                            : 'border-slate-800 bg-slate-900/80'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-white text-sm">{spell.name}</span>
                        <span className="ml-2 text-[10px] text-slate-400">Cantrip • {spell.school}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {spell.castingTime} • {spell.range}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleKnown(spell.name)}
                        disabled={atCap}
                        className={`ml-3 px-2 py-1 rounded border text-[10px] shrink-0 disabled:cursor-not-allowed ${
                          isSelected
                            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400'
                        }`}
                      >
                        {isSelected ? '✓ Known' : atCap ? 'At limit' : 'Select'}
                      </button>
                    </div>
                  )
                })}
                {filteredCantrips.length === 0 && (
                  <div className="text-sm text-slate-500 py-2 text-center">No cantrips match filters.</div>
                )}
              </div>
            </div>
          )}

          {/* ── Leveled spells section (BUG 9) ── */}
          {showClassSpells && (spellLevelFilter === 'all' || spellLevelFilter > 0) && maxSpellLevel > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isWizard ? 'Spellbook Spells' : isPreparedCaster ? 'Spells to Prepare' : 'Known Spells'}
                </h3>
                {/* Counter badge */}
                {isWizard && wizardSpellbookSize !== null && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] border ${
                    currentLeveledKnown.length >= wizardSpellbookSize
                      ? 'border-emerald-600/60 text-emerald-300'
                      : 'border-slate-700 text-slate-400'
                  }`}>
                    {currentLeveledKnown.length}/{wizardSpellbookSize}
                  </span>
                )}
                {!isWizard && maxSpellsKnown !== null && maxSpellsKnown > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] border ${
                    currentLeveledKnown.length >= maxSpellsKnown
                      ? 'border-emerald-600/60 text-emerald-300'
                      : 'border-slate-700 text-slate-400'
                  }`}>
                    {currentLeveledKnown.length}/{maxSpellsKnown}
                  </span>
                )}
                {isPreparedCaster && !isWizard && maxPrepared !== null && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] border ${
                    currentPreparedNonDomain.length >= maxPrepared
                      ? 'border-sky-600/60 text-sky-300'
                      : 'border-slate-700 text-slate-400'
                  }`}>
                    {currentPreparedNonDomain.length}/{maxPrepared} prepared
                  </span>
                )}
              </div>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {filteredLeveledSpells.map((spell) => {
                  const isKnown = knownSpells.includes(spell.name)
                  const isPrepared = preparedSpells.includes(spell.name) || domainSpells.includes(spell.name)
                  const isDomain = domainSpells.includes(spell.name)
                  // Wave 1B: off-school for EK/AT — needs a wildcard pick.
                  const isOff = isOffSchool(spell)
                  const isWildcardPick = wildcardSpells.includes(spell.name)
                  const wildcardExhausted = isOff && !isKnown && wildcardsUsed >= wildcardBudget

                  // Cap logic per class type
                  const knownAtCap = !isKnown && (
                    (isWizard && wizardSpellbookSize !== null && currentLeveledKnown.length >= wizardSpellbookSize) ||
                    (!isWizard && !isPreparedCaster && maxSpellsKnown !== null && currentLeveledKnown.length >= maxSpellsKnown) ||
                    wildcardExhausted
                  )
                  const preparedAtCap = !isPrepared && !isDomain && maxPrepared !== null &&
                    currentPreparedNonDomain.length >= maxPrepared

                  return (
                    <div
                      key={spell.name}
                      className={`rounded-lg border p-2.5 flex justify-between items-start text-xs transition ${
                        isDomain
                          ? 'border-amber-700/40 bg-amber-900/10'
                          : isKnown || isPrepared
                            ? 'border-cyan-700/40 bg-slate-900/80'
                            : 'border-slate-800 bg-slate-900/80'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white text-sm">
                          {spell.name}
                          {isDomain && <span className="ml-1.5 text-[10px] text-amber-400">Domain</span>}
                          {/* Wave 1B: off-school flag for EK/AT */}
                          {isOff && !isWildcardPick && (
                            <span
                              className="ml-1.5 text-[10px] text-fuchsia-400"
                              title="Off-school for your subclass. Requires a wildcard pick."
                            >
                              ✦ Off-school
                            </span>
                          )}
                          {isWildcardPick && (
                            <span
                              className="ml-1.5 text-[10px] text-fuchsia-300"
                              title="Picked using one of your any-school wildcards."
                            >
                              ✦ Wildcard
                            </span>
                          )}
                          <span className="ml-1.5 text-[10px] text-slate-400">
                            {spellLevelLabel(spell.level)} level • {spell.school}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {spell.castingTime} • Range: {spell.range} • {spell.duration}
                        </div>
                        {spell.components && (
                          <div className="text-[11px] text-slate-500 mt-0.5">Components: {spell.components}</div>
                        )}
                      </div>

                      {isDomain ? (
                        <div className="ml-3 shrink-0 px-2 py-1 rounded border border-amber-600/50 text-[10px] text-amber-300">
                          ✦ Always Prepared
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 ml-3 shrink-0">
                          {/* Known / Spellbook button — for all but prepared casters */}
                          {(!isPreparedCaster || isWizard) && (
                            <button
                              type="button"
                              onClick={() => toggleKnown(spell.name)}
                              disabled={knownAtCap && !isKnown}
                              className={`px-2 py-1 rounded border text-[10px] disabled:cursor-not-allowed ${
                                isKnown
                                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                                  : knownAtCap
                                    ? 'border-slate-700 bg-slate-800/40 text-slate-500'
                                    : isOff
                                      ? 'border-fuchsia-600 bg-fuchsia-900/30 text-fuchsia-200 hover:border-fuchsia-400'
                                      : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400'
                              }`}
                              title={isOff && !isKnown ? 'Off-school — will use one wildcard pick' : undefined}
                            >
                              {isKnown
                                ? knownButtonActiveLabel
                                : wildcardExhausted
                                  ? 'No wildcards'
                                  : knownAtCap
                                    ? 'Spellbook full'
                                    : isOff
                                      ? '✦ Use Wildcard'
                                      : knownButtonLabel}
                            </button>
                          )}

                          {/* Prepare button — for prepared casters (and Wizard) */}
                          {(isPreparedCaster) && (
                            <button
                              type="button"
                              onClick={() => togglePrepared(spell.name)}
                              disabled={preparedAtCap}
                              className={`px-2 py-1 rounded border text-[10px] disabled:cursor-not-allowed ${
                                isPrepared && !isDomain
                                  ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                                  : preparedAtCap
                                    ? 'border-slate-700 bg-slate-800/40 text-slate-500'
                                    : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400'
                              }`}
                            >
                              {isPrepared && !isDomain ? 'Prepared ✓' : preparedAtCap ? 'Limit reached' : 'Prepare'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {filteredLeveledSpells.length === 0 && maxSpellLevel > 0 && (
                  <div className="text-sm text-slate-500 py-4 text-center">
                    No spells match your filters.
                  </div>
                )}
                {filteredLeveledSpells.length === 0 && maxSpellLevel === 0 && showClassSpells && (
                  <div className="text-sm text-slate-500 py-4 text-center">
                    No leveled spells available yet at level {level}.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side panel: spell slots */}
        <div className="space-y-4 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white mb-1">Spell Slots</h3>

            {/* Regular casters */}
            {classKey !== 'warlock' && (
              <>
                {(!spellSlots || Object.keys(spellSlots).length === 0) && (
                  <div className="text-[11px] text-slate-500">
                    {isHalfCasterNoSlotsYet
                      ? `No spell slots until level 2 (${classKey})`
                      : 'No spell slots at this level.'}
                  </div>
                )}
                {spellSlots && Object.keys(spellSlots).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(spellSlots).map(([levelKey, slotCount]) => {
                      const lvl = Number(levelKey)
                      if (!slotCount) return null
                      const used = usedSlots[lvl] ?? 0
                      return (
                        <div key={lvl} className="flex items-center justify-between rounded bg-slate-800/80 px-3 py-2">
                          <span className="text-white text-sm">Level {lvl}:</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-white">{used}/{slotCount}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setUsedSlots((prev) => {
                                  const next = [...prev]
                                  if (used < (slotCount as number)) next[lvl] = (next[lvl] ?? 0) + 1
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
                {!pact && <div className="text-[11px] text-slate-500">No pact slots at this level.</div>}
                {pact && (
                  <div className="space-y-2">
                    <div className="rounded bg-slate-800/80 px-3 py-2 text-white text-sm">
                      Pact Level {pact.pactSlotLevel} • {pact.pactSlots} slot{pact.pactSlots > 1 ? 's' : ''}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const lvl = pact.pactSlotLevel
                        const used = usedSlots[lvl] ?? 0
                        setUsedSlots((prev) => {
                          const next = [...prev]
                          if (used < pact.pactSlots) next[lvl] = (next[lvl] ?? 0) + 1
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
      <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-800 mt-4">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs md:text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
        >
          ← Back to Abilities
        </button>

        <div className="flex flex-1 items-center justify-end gap-3">
          {validationMessage && (
            <div className="rounded-md border border-amber-700/50 bg-amber-900/20 px-3 py-1.5 text-xs text-amber-300 max-w-xs text-right">
              ⚠ {validationMessage}
            </div>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={Boolean(validationMessage)}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs md:text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.55)] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Next: Equipment
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </div>
  )
}
