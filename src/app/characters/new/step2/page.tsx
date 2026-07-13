'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { RACE_LIST, RACES, type RaceKey } from '@/lib/races'
import { BACKGROUND_LIST, BACKGROUNDS, type BackgroundKey } from '@/lib/backgrounds'
import { proficiencyForLevel } from '@/lib/rules'
import { supabase } from '@/lib/supabase'
import { getFeat } from '@/lib/feats'

// ✅ pull subclasses from the real library
import { CLASS_SUBCLASSES, type ClassKey, type SubclassKey } from '@/lib/subclasses'

// Class proficiency + skill data (Audit Wave 1)
import { CLASS_DATA, getClassDef, type ClassKey as ClassDataKey } from '@/lib/classes'
import { SKILLS } from '@/lib/dnd5e'

// 2024 rules: all classes unlock their subclass at level 3
const SUBCLASS_UNLOCK_LEVEL: Record<string, number> = {
  barbarian: 3,
  bard: 3,
  cleric: 3,
  druid: 3,
  fighter: 3,
  monk: 3,
  paladin: 3,
  ranger: 3,
  rogue: 3,
  sorcerer: 3,
  warlock: 3,
  wizard: 3,
}

/** Format background ability modifiers as "+2 STR, +1 CON" */
function formatAsiMods(mods: Partial<Record<string, number>>): string {
  const LABELS: Record<string, string> = {
    str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
  }
  return Object.entries(mods)
    .filter(([, v]) => v && v !== 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k, v]) => `+${v} ${LABELS[k] ?? k.toUpperCase()}`)
    .join(', ')
}

const CLASS_OPTIONS = [
  { key: 'fighter', label: 'Fighter', sigil: '⚔️', blurb: 'Master of arms and armor' },
  { key: 'rogue', label: 'Rogue', sigil: '🗡️', blurb: 'Precision, stealth, and cunning' },
  { key: 'wizard', label: 'Wizard', sigil: '📖', blurb: 'Arcane scholar of raw magic' },
  { key: 'barbarian', label: 'Barbarian', sigil: '🪓', blurb: 'Rage-fueled front-line fury' },
  { key: 'paladin', label: 'Paladin', sigil: '🛡️', blurb: 'Holy oaths and smiting steel' },
  { key: 'cleric', label: 'Cleric', sigil: '✨', blurb: 'Divine power made manifest' },
  { key: 'ranger', label: 'Ranger', sigil: '🏹', blurb: 'Hunter of the wild frontiers' },
  { key: 'warlock', label: 'Warlock', sigil: '👁️', blurb: 'Pact-bound eldritch might' },
  { key: 'sorcerer', label: 'Sorcerer', sigil: '🔥', blurb: 'Magic burning in the blood' },
  { key: 'bard', label: 'Bard', sigil: '🎶', blurb: 'Weaponized inspiration' },
  { key: 'monk', label: 'Monk', sigil: '🥋', blurb: 'Discipline, ki, and flying fists' },
  { key: 'druid', label: 'Druid', sigil: '🌿', blurb: 'Nature’s shapeshifting warden' },
]

const ALL_LANGUAGES = [
  { key: 'common', label: 'Common' },
  { key: 'dwarvish', label: 'Dwarvish' },
  { key: 'elvish', label: 'Elvish' },
  { key: 'giant', label: 'Giant' },
  { key: 'gnomish', label: 'Gnomish' },
  { key: 'goblin', label: 'Goblin' },
  { key: 'halfling', label: 'Halfling' },
  { key: 'orc', label: 'Orc' },
  { key: 'draconic', label: 'Draconic' },
  { key: 'deepSpeech', label: 'Deep Speech' },
  { key: 'infernal', label: 'Infernal' },
  { key: 'celestial', label: 'Celestial' },
  { key: 'primordial', label: 'Primordial' },
  { key: 'sylvan', label: 'Sylvan' },
  { key: 'undercommon', label: 'Undercommon' },
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

function getSubclassOptions(classKeyRaw: string | null | undefined) {
  const ck = String(classKeyRaw ?? 'fighter').toLowerCase() as ClassKey
  const list = CLASS_SUBCLASSES[ck] ?? []
  return [{ key: '', label: '— Any / None —' }, ...list] as Array<{
    key: string
    label: string
    source?: string
  }>
}

type HomebrewSubclass = { id: string; name: string; parent_class: string; subclass_type: string | null }

export default function NewCharacterStep2Page() {
  const router = useRouter()
  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [homebrewSubclasses, setHomebrewSubclasses] = useState<HomebrewSubclass[]>([])

  function ensureAbilities(base?: CharacterDraft['baseAbilities']) {
    if (base) return base
    return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  }

  useEffect(() => {
    const existing = loadDraft()

    const level = existing.level ?? 1
    const classKey = existing.classKey ?? 'fighter'
    const raceKey =
      existing.raceKey ?? (RACE_LIST.length > 0 ? (RACE_LIST[0].key as RaceKey) : 'human')
    const backgroundKey =
      existing.backgroundKey ??
      (BACKGROUND_LIST.length > 0 ? (BACKGROUND_LIST[0].key as BackgroundKey) : 'soldier')

    const baseAbilities = ensureAbilities(existing.baseAbilities)
    const proficiencyBonus = existing.proficiencyBonus ?? proficiencyForLevel(level)

    // If a stored subclass isn't valid for the stored class, clear it
    const subclassOptions = getSubclassOptions(classKey)
    const allowedSubclassKeys = new Set(subclassOptions.map((o) => String(o.key)))
    const existingSubclass = String(existing.subclassKey ?? '')
    const safeSubclass =
      existingSubclass && !allowedSubclassKeys.has(existingSubclass) ? null : existing.subclassKey ?? null

    // Auto-set originFeat from background (2024 rules)
    const bgData = BACKGROUNDS[backgroundKey as BackgroundKey]
    const originFeat = existing.originFeat ?? bgData?.originFeatKey ?? undefined

    // Audit Wave 2 — backfill saving throws for existing drafts that were
    // created before this fix. If no saves are recorded, populate them from
    // the chosen class. (Only fires when missing entirely, so a user who has
    // intentionally cleared their saves stays cleared.)
    const classDef = getClassDef(classKey)
    const savingThrows: CharacterDraft['savingThrows'] = existing.savingThrows ?? (
      classDef
        ? {
            str: classDef.savingThrowProfs.includes('str'),
            dex: classDef.savingThrowProfs.includes('dex'),
            con: classDef.savingThrowProfs.includes('con'),
            int: classDef.savingThrowProfs.includes('int'),
            wis: classDef.savingThrowProfs.includes('wis'),
            cha: classDef.savingThrowProfs.includes('cha'),
          }
        : undefined
    )

    const merged: CharacterDraft = {
      ...existing,
      level,
      classKey,
      raceKey,
      backgroundKey,
      baseAbilities,
      proficiencyBonus,
      subclassKey: safeSubclass,
      originFeat,
      savingThrows,
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
          raceKey: RACE_LIST.length > 0 ? (RACE_LIST[0].key as RaceKey) : 'human',
          backgroundKey: BACKGROUND_LIST.length > 0 ? (BACKGROUND_LIST[0].key as BackgroundKey) : 'soldier',
          baseAbilities: ensureAbilities(),
          proficiencyBonus: proficiencyForLevel(1),
        } as CharacterDraft)

      const next: CharacterDraft = { ...current, ...update }
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

  // Load homebrew subclasses whenever class changes
  useEffect(() => {
    const classKey = draft?.classKey
    if (!classKey) return
    const parentClass = classKey.charAt(0).toUpperCase() + classKey.slice(1)
    supabase
      .from('homebrew_subclasses')
      .select('id, name, parent_class, subclass_type')
      .eq('parent_class', parentClass)
      .order('name')
      .then(({ data }) => { if (data) setHomebrewSubclasses(data as HomebrewSubclass[]) })
  }, [draft?.classKey])

  // ✅ FIX: hooks must run every render → compute subclassOptions BEFORE early return
  const subclassOptions = useMemo(() => {
    const ck = (draft?.classKey ?? 'fighter') as any
    const base = getSubclassOptions(ck)
    const homebrew = homebrewSubclasses.map((sc) => ({
      key: `hb_sc_${sc.id}`,
      label: sc.name,
      source: sc.subclass_type ? `Homebrew · ${sc.subclass_type}` : 'Homebrew',
    }))
    return [...base, ...homebrew]
  }, [draft?.classKey, homebrewSubclasses])

  if (!ready || !draft) {
    return <div className="text-sm text-slate-300">Loading basics…</div>
  }

  const selectedRace = RACE_LIST.find((r) => r.key === draft.raceKey)
  const selectedBackground = BACKGROUND_LIST.find((b) => b.key === draft.backgroundKey)

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-900/40 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <h2 className="text-lg md:text-xl font-semibold text-white">Step 2 — Character Basics</h2>
        <p className="text-xs md:text-sm text-slate-400">
          Name, class, race, and background. We'll bring the crunch (abilities, spells, and equipment) in the next
          steps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Character Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            placeholder="e.g. Nix Embercoil"
            value={draft.name ?? ''}
            onChange={(e) => updateDraft({ name: e.target.value })}
          />
          <p className="text-[11px] text-slate-500">This will appear on your character sheet and at the virtual table.</p>
        </div>

        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">Level</label>
          <input
            type="number"
            min={1}
            max={20}
            disabled={!!draft.is_caya}
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            value={draft.level ?? 1}
            onChange={(e) => {
              if (draft.is_caya) return
              const nextLevel = Math.min(20, Math.max(1, Number(e.target.value) || 1))
              updateDraft({ level: nextLevel, proficiencyBonus: proficiencyForLevel(nextLevel) })
            }}
          />
          <button
            type="button"
            onClick={() => {
              const next = !draft.is_caya
              updateDraft({
                is_caya: next,
                level: next ? 1 : draft.level ?? 1,
                proficiencyBonus: proficiencyForLevel(next ? 1 : draft.level ?? 1),
              })
            }}
            className={`mt-1 w-full rounded-md border px-3 py-1.5 text-[11px] font-semibold transition ${
              draft.is_caya
                ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                : 'border-slate-600 bg-slate-900/40 text-slate-400 hover:border-slate-400'
            }`}
          >
            {draft.is_caya ? 'CAYA — Come As You Are' : 'Enable CAYA mode'}
          </button>
          {draft.is_caya ? (
            <p className="text-[11px] text-amber-400/80">CAYA characters start at level 1 and earn XP through play.</p>
          ) : (
            <p className="text-[11px] text-slate-500">We'll auto-calc proficiency bonus and spell slots based on your level.</p>
          )}
        </div>

        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">Alignment</label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.alignment ?? ''}
            onChange={(e) => updateDraft({ alignment: e.target.value })}
          >
            {ALIGNMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500">Purely roleplay and flavor. DND721 doesn't lock mechanics to alignment.</p>
        </div>
      </div>

      {/* ── Class — pick your calling (iconography cards) ──────────────────── */}
      {(() => {
        function handleClassChange(nextClassRaw: string) {
          const nextClass = nextClassRaw as CharacterDraft['classKey']
          const nextSubclassOptions = getSubclassOptions(String(nextClass))
          const allowed = new Set(nextSubclassOptions.map((o) => String(o.key)))
          const currentSubclass = String(draft!.subclassKey ?? '')

          // ── Audit Wave 2 ───────────────────────────────────────────────
          // Auto-populate saving throw proficiencies from CLASS_DATA, and
          // reset previously-picked class-skill proficiencies so the user
          // re-picks from the new class's list. Background-granted skills
          // are merged separately in step6 and are untouched here.
          const classDef = getClassDef(String(nextClass))
          const nextSavingThrows: CharacterDraft['savingThrows'] = classDef
            ? {
                str: classDef.savingThrowProfs.includes('str'),
                dex: classDef.savingThrowProfs.includes('dex'),
                con: classDef.savingThrowProfs.includes('con'),
                int: classDef.savingThrowProfs.includes('int'),
                wis: classDef.savingThrowProfs.includes('wis'),
                cha: classDef.savingThrowProfs.includes('cha'),
              }
            : draft!.savingThrows
          // Clear any class-skill picks but keep background-granted profs.
          // The class skill picker (below) lets the user pick fresh.
          const prevProfs = draft!.skillProficiencies ?? {}
          const prevClassDef = getClassDef(String(draft!.classKey ?? ''))
          const prevClassSkillSet = new Set(prevClassDef?.skillChoices.options ?? [])
          const filteredSkillProfs: CharacterDraft['skillProficiencies'] = {}
          for (const [k, v] of Object.entries(prevProfs)) {
            if (!prevClassSkillSet.has(k)) filteredSkillProfs[k] = v
          }

          updateDraft({
            classKey: nextClass,
            subclassKey: currentSubclass && !allowed.has(currentSubclass) ? null : draft!.subclassKey ?? null,
            savingThrows: nextSavingThrows,
            skillProficiencies: filteredSkillProfs,
          })
        }

        const currentClass = String(draft.classKey ?? 'fighter')
        return (
          <div className="space-y-2">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-mid)' }}>
              Class <span style={{ color: 'var(--danger)' }}>*</span>
              <span className="ml-2 font-normal" style={{ color: 'var(--text-low)' }}>
                Determines your hit dice, primary abilities, and which spells you&apos;ll learn later.
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="Choose a class">
              {CLASS_OPTIONS.map((opt) => {
                const selected = currentClass === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleClassChange(opt.key)}
                    className="flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition"
                    style={{
                      borderColor: selected ? 'var(--gold)' : 'var(--divider)',
                      background: selected
                        ? 'linear-gradient(180deg, rgba(212,169,79,0.14), rgba(212,169,79,0.05))'
                        : 'var(--surface-1)',
                      boxShadow: selected ? 'var(--glow-gold)' : undefined,
                    }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg"
                      style={{
                        borderColor: selected ? 'var(--edge-strong)' : 'var(--divider)',
                        background: 'radial-gradient(circle at 50% 35%, var(--surface-3), var(--bg-abyss))',
                      }}
                      aria-hidden
                    >
                      {opt.sigil}
                    </span>
                    <span className="min-w-0">
                      <span className="font-display block text-sm font-bold leading-tight"
                            style={{ color: selected ? 'var(--gold-bright)' : 'var(--text-hi)' }}>
                        {opt.label}
                      </span>
                      <span className="block truncate text-[10px]" style={{ color: 'var(--text-low)' }}>
                        {opt.blurb}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {(() => {
          const unlockLevel = SUBCLASS_UNLOCK_LEVEL[String(draft.classKey ?? 'fighter')] ?? 3
          const characterLevel = draft.level ?? 1
          const subclassUnlocked = characterLevel >= unlockLevel

          if (!subclassUnlocked) {
            return (
              <div className="space-y-1 text-xs">
                <label className="font-semibold text-slate-400">Subclass</label>
                <div className="rounded-md border border-slate-700/50 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-500 italic">
                  🔒 Unlocks at level {unlockLevel} — choose your subclass when your character advances.
                </div>
              </div>
            )
          }

          return (
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-300">
                Subclass{' '}
                <span className="text-[10px] font-normal text-slate-500">(optional at level {characterLevel})</span>
              </label>
              <select
                className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
                value={draft.subclassKey ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  updateDraft({ subclassKey: v ? (v as SubclassKey) : null })
                }}
              >
                {subclassOptions.map((opt) => (
                  <option key={String(opt.key)} value={String(opt.key)}>
                    {opt.label}
                    {opt.source ? ` (${opt.source})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">Leave blank to decide later.</p>
            </div>
          )
        })()}

        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">Proficiency Bonus</label>
          <div className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2">
            <div className="text-lg font-bold text-white">+{draft.proficiencyBonus ?? proficiencyForLevel(draft.level ?? 1)}</div>
            <p className="text-[11px] text-slate-500">Auto-calculated from level.</p>
          </div>
        </div>
      </div>

      {/* ── Audit Wave 2 — Class skill picker + auto-set saves preview ──── */}
      <ClassProficienciesSection
        classKey={draft.classKey ?? null}
        savingThrows={draft.savingThrows}
        skillProficiencies={draft.skillProficiencies}
        onChangeSkills={(next) => updateDraft({ skillProficiencies: next })}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Race <span className="text-red-400">*</span>
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.raceKey ?? ''}
            onChange={(e) => updateDraft({ raceKey: e.target.value as RaceKey })}
          >
            {RACE_LIST.map((race) => (
              <option key={race.key} value={race.key}>
                {race.name}
              </option>
            ))}
          </select>

          {selectedRace && selectedRace.traits && selectedRace.traits.length > 0 && (
            <div className="mt-2 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 space-y-1">
              <div className="text-[11px] font-semibold text-slate-300">{selectedRace.name}</div>
              <ul className="list-disc ml-4 space-y-1 text-[11px] text-slate-400">
                {selectedRace.traits.map((trait: any, index: number) => {
                  const label = trait?.name ?? trait?.label ?? trait?.description ?? String(trait)
                  return <li key={index}>{label}</li>
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-1 text-xs">
          <label className="font-semibold text-slate-300">
            Background <span className="text-red-400">*</span>
          </label>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.backgroundKey ?? ''}
            onChange={(e) => {
              const bgKey = e.target.value as BackgroundKey
              const bgEntry = BACKGROUNDS[bgKey]
              // Audit Wave 4 — when the player switches background, clear any
              // prior background ASI so step 3 re-initializes the picker with
              // the new background's defaults / allowed stats.
              updateDraft({
                backgroundKey: bgKey,
                originFeat: bgEntry?.originFeatKey ?? undefined,
                backgroundAsi: undefined,
              })
            }}
          >
            {BACKGROUND_LIST.map((bg) => (
              <option key={bg.key} value={bg.key}>
                {bg.name}
              </option>
            ))}
          </select>

          {selectedBackground && (
            <div className="mt-2 rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-300">{selectedBackground.name}</div>

              {/* Ability Score Improvements */}
              {selectedBackground.abilityScoreModifiers && Object.keys(selectedBackground.abilityScoreModifiers).length > 0 && (
                <p className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Ability scores: </span>
                  <span className="font-semibold text-emerald-300">
                    {formatAsiMods(selectedBackground.abilityScoreModifiers)}
                  </span>
                </p>
              )}

              {/* Origin Feat */}
              {selectedBackground.originFeatKey && (
                <p className="text-[11px] text-slate-400">
                  <span className="text-slate-500">Origin feat: </span>
                  <span className="font-semibold text-amber-300">
                    {getFeat(selectedBackground.originFeatKey)?.name ?? selectedBackground.originFeatKey}
                  </span>
                </p>
              )}

              {/* Background feature */}
              {selectedBackground.feature && (
                <p className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">{selectedBackground.feature.name}:</strong>{' '}
                  {selectedBackground.feature.summary}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Language section */}
      {(() => {
        const raceData = draft.raceKey ? (RACES as any)[draft.raceKey] : null
        const bgData = draft.backgroundKey ? (BACKGROUNDS as any)[draft.backgroundKey] : null
        const autoLanguages: string[] = raceData?.languages ?? []
        const extraCount = (raceData?.extraLanguageChoices ?? 0) + (bgData?.extraLanguageChoices ?? 0)
        const chosenExtras: string[] = draft.languages ?? []

        function toggleLanguage(key: string) {
          const already = chosenExtras.includes(key)
          if (already) {
            updateDraft({ languages: chosenExtras.filter((l) => l !== key) })
          } else if (chosenExtras.length < extraCount) {
            updateDraft({ languages: [...chosenExtras, key] })
          }
        }

        return (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3 text-xs">
            <div className="font-semibold text-slate-300 text-sm">Languages</div>

            {autoLanguages.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Automatic (from race)</div>
                <div className="flex flex-wrap gap-2">
                  {autoLanguages.map((lang) => (
                    <span key={lang} className="rounded-full border border-emerald-700 bg-emerald-900/30 px-2.5 py-0.5 text-[11px] text-emerald-200 capitalize">
                      {ALL_LANGUAGES.find((l) => l.key === lang)?.label ?? lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {extraCount > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                  Choose {extraCount} extra language{extraCount !== 1 ? 's' : ''} ({chosenExtras.length}/{extraCount} selected)
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_LANGUAGES.filter((l) => !autoLanguages.includes(l.key)).map((lang) => {
                    const selected = chosenExtras.includes(lang.key)
                    const disabled = !selected && chosenExtras.length >= extraCount
                    return (
                      <button
                        key={lang.key}
                        type="button"
                        onClick={() => toggleLanguage(lang.key)}
                        disabled={disabled}
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                          selected
                            ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                            : disabled
                            ? 'border-slate-700 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                            : 'border-slate-600 bg-slate-900/40 text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {lang.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {autoLanguages.length === 0 && extraCount === 0 && (
              <p className="text-slate-500 text-[11px]">Select a race to see your languages.</p>
            )}
          </div>
        )
      })()}

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
          Next: Abilities &amp; Skills <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}

// ─── Class proficiencies section (Audit Wave 2) ──────────────────────────────
// Renders:
//   • Read-only display of the class's saving throw proficiencies (auto-set
//     when the class is chosen above).
//   • A checkbox list of the class's skill choices — capped at the class's
//     `count`. The user's picks merge with background skills in step6's save
//     handler (already wired).
function ClassProficienciesSection({
  classKey,
  savingThrows,
  skillProficiencies,
  onChangeSkills,
}: {
  classKey: string | null | undefined
  savingThrows: CharacterDraft['savingThrows']
  skillProficiencies: CharacterDraft['skillProficiencies']
  onChangeSkills: (next: CharacterDraft['skillProficiencies']) => void
}) {
  const classDef = getClassDef(classKey ?? null)
  if (!classDef) return null

  const profs = skillProficiencies ?? {}
  const optionSet = new Set(classDef.skillChoices.options)
  const pickedFromClass = Object.entries(profs).filter(
    ([k, v]) => v === 'proficient' && optionSet.has(k)
  ).map(([k]) => k)

  const remaining = Math.max(0, classDef.skillChoices.count - pickedFromClass.length)

  function toggleSkill(skillKey: string) {
    const next = { ...(profs as Record<string, 'none' | 'proficient' | 'expertise'>) }
    if (next[skillKey] === 'proficient') {
      // Deselect
      delete next[skillKey]
    } else {
      // Select — only if we haven't exceeded the cap
      if (pickedFromClass.length >= classDef!.skillChoices.count) return
      next[skillKey] = 'proficient'
    }
    onChangeSkills(next)
  }

  const skillNameByKey = new Map(SKILLS.map(s => [s.key, s.name]))
  const skillAbilityByKey = new Map(SKILLS.map(s => [s.key, s.ability]))

  return (
    <div className="space-y-3 rounded-lg border border-cyan-900/40 bg-slate-950/60 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-cyan-300/80">
        Class proficiencies
      </div>

      {/* Saving throws — auto-set, read-only display */}
      <div>
        <div className="mb-1 text-[11px] font-semibold text-slate-300">Saving throws</div>
        <div className="flex flex-wrap gap-1.5">
          {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map((ab) => {
            const isProf = !!savingThrows?.[ab]
            return (
              <span
                key={ab}
                className={`rounded-md px-2 py-0.5 text-[10px] font-mono uppercase ${
                  isProf
                    ? 'bg-cyan-900/40 text-cyan-200 ring-1 ring-cyan-700/60'
                    : 'bg-slate-800/50 text-slate-500'
                }`}
              >
                {ab}
              </span>
            )
          })}
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          Auto-set from class. {classDef.savingThrowProfs.map(s => s.toUpperCase()).join(' + ')}.
        </p>
      </div>

      {/* Class skill picker */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[11px] font-semibold text-slate-300">
            Class skills — pick {classDef.skillChoices.count}
          </div>
          <span className={`text-[10px] font-semibold ${remaining > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
            {remaining > 0 ? `${remaining} remaining` : '✓ done'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {classDef.skillChoices.options.map((skillKey) => {
            const name = skillNameByKey.get(skillKey) ?? skillKey
            const ability = skillAbilityByKey.get(skillKey)
            const isChecked = profs[skillKey] === 'proficient'
            const disabled = !isChecked && pickedFromClass.length >= classDef.skillChoices.count
            return (
              <label
                key={skillKey}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition ${
                  isChecked
                    ? 'border-cyan-700/60 bg-cyan-900/30 text-cyan-100'
                    : disabled
                      ? 'border-slate-800 bg-slate-900/30 text-slate-600 cursor-not-allowed'
                      : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-cyan-700/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={disabled}
                  onChange={() => toggleSkill(skillKey)}
                  className="accent-cyan-500"
                />
                <span className="flex-1">{name}</span>
                {ability && (
                  <span className="text-[9px] font-mono uppercase text-slate-500">{ability}</span>
                )}
              </label>
            )
          })}
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          Background skills are added automatically and don't count against this pick.
        </p>
      </div>
    </div>
  )
}
