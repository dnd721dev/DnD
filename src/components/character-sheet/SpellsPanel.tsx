"use client"

import { useEffect, useMemo, useState } from 'react'
import type { CharacterSheetData, SpellSlotsSummary } from './types'
import { SRD_SPELLS, type SrdSpell } from '@/lib/srdspells'
import { formatMod } from './utils'
import { supabase } from '@/lib/supabase'
import {
  getDomainSpells,
  getMaxLeveledSpellsKnown,
  getMaxSpellLevelForClass,
  getCantripsKnown,
  getAllowedSchoolsForSubclass,
  getWildcardCountForSubclass,
} from '@/lib/spellcastingProgression'

// ── Spell Detail Modal ────────────────────────────────────────────────────────

function SpellDetailModal({
  spell,
  isKnown,
  isPrepared,
  isPreparedCaster,
  maxPrepared,
  preparedCount,
  saving,
  onClose,
  onToggleKnown,
  onTogglePrepared,
  spellSaveDc,
  spellAttackBonus,
}: {
  spell: SrdSpell
  isKnown: boolean
  isPrepared: boolean
  isPreparedCaster: boolean
  maxPrepared: number | null
  preparedCount: number
  saving: boolean
  onClose: () => void
  onToggleKnown: (name: string) => void
  onTogglePrepared: (name: string) => void
  spellSaveDc: number | null
  spellAttackBonus: number | null
}) {
  const isCantrip = spell.level === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-sm mx-4 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-100">{spell.name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isCantrip ? 'Cantrip' : `Level ${spell.level}`} · {spell.school}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-[12px] text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* 2×2 metadata grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg bg-slate-900/60 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Cast</div>
            <div className="text-[11px] text-slate-200">{spell.castingTime}</div>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Range</div>
            <div className="text-[11px] text-slate-200">{spell.range}</div>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Components</div>
            <div className="text-[11px] text-slate-200">{spell.components}</div>
          </div>
          <div className="rounded-lg bg-slate-900/60 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Duration</div>
            <div className="text-[11px] text-slate-200">{spell.duration}</div>
          </div>
        </div>

        {/* Effect row — enriched with character's actual stats */}
        {(spell.attackRoll || spell.saveAbility) && (
          <div className="mb-2 rounded-lg bg-slate-900/60 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400 mb-1">Effect</div>
            <div className="flex flex-wrap gap-2">
              {spell.attackRoll && (
                <span className="rounded bg-blue-900/40 border border-blue-700/40 px-2 py-0.5 text-[11px] text-blue-200">
                  Attack Roll
                  {spellAttackBonus != null
                    ? <span className="ml-1 font-bold">{spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus}</span>
                    : null}
                </span>
              )}
              {spell.saveAbility && (
                <span className="rounded bg-violet-900/40 border border-violet-700/40 px-2 py-0.5 text-[11px] text-violet-200">
                  {spell.saveAbility.toUpperCase()} Save
                  {spellSaveDc != null
                    ? <span className="ml-1 font-bold">DC {spellSaveDc}</span>
                    : null}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Damage */}
        {spell.damage && (
          <div className="mb-2 rounded-lg bg-slate-900/60 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Damage</div>
            <div className="text-[11px] font-mono text-amber-300">{spell.damage}</div>
          </div>
        )}

        {/* Notes */}
        {spell.notes && (
          <div className="mb-2 rounded-lg bg-slate-900/60 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">Notes</div>
            <div className="whitespace-pre-wrap text-[11px] text-slate-200">{spell.notes}</div>
          </div>
        )}

        {/* Upcast damage table */}
        {spell.upcastDamage && spell.level >= 1 && (
          <div className="mb-2 rounded-lg bg-slate-900/60 p-2">
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Upcast Damage
              {spell.upcastNotes && (
                <span className="ml-1 normal-case text-slate-500">— {spell.upcastNotes}</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {Array.from({ length: 9 - spell.level + 1 }, (_, i) => {
                const slot = spell.level + i
                const extraDice = i
                let label: string
                if (i === 0) {
                  label = spell.damage ?? '—'
                } else if (spell.upcastNotes) {
                  label = `+${extraDice}× ${spell.upcastDamage}`
                } else {
                  const base = spell.damage ?? ''
                  const extra = spell.upcastDamage!
                  const m = extra.match(/^(\d+)(d\d+.*)$/)
                  const scaled = m
                    ? `${parseInt(m[1]) * extraDice}${m[2]}`
                    : `+${extraDice}×${extra}`
                  label = `${base}+${scaled}`
                }
                return (
                  <div
                    key={slot}
                    className="flex flex-col items-center rounded bg-slate-800/70 px-2 py-1"
                  >
                    <span className="text-[9px] font-semibold text-slate-400">
                      {slot === 0 ? 'Cantrip' : `${slot}${['st','nd','rd'][slot-1] ?? 'th'}`}
                    </span>
                    <span className="text-[10px] text-amber-300">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onToggleKnown(spell.name)}
            disabled={saving}
            className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 transition"
          >
            {isKnown ? 'Remove Known' : 'Add Known'}
          </button>

          {!isCantrip && (
            <button
              type="button"
              onClick={() => onTogglePrepared(spell.name)}
              disabled={saving}
              className="rounded-lg bg-blue-500/15 px-3 py-1.5 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-50 transition"
            >
              {isPrepared ? 'Unprepare' : 'Prepare'}
            </button>
          )}

          {isCantrip && (
            <span className="flex items-center text-[10px] text-slate-500">
              Cantrips are always active
            </span>
          )}
        </div>

        {/* Prepared cap badge */}
        {maxPrepared !== null && (
          <div className={`mt-2 text-[10px] ${preparedCount >= maxPrepared ? 'text-amber-400' : 'text-slate-500'}`}>
            {preparedCount}/{maxPrepared} spells prepared
          </div>
        )}
      </div>
    </div>
  )
}

// ── SpellsPanel ───────────────────────────────────────────────────────────────

export function SpellsPanel({
  c,
  spellSlots,
  slotUsed,
  onSpendSlot,
  onRestoreSlot,
}: {
  c: CharacterSheetData
  spellSlots: SpellSlotsSummary | null
  slotUsed?: Record<string, number>
  onSpendSlot?: (level: string) => void
  onRestoreSlot?: (level: string) => void
}) {
  // ── existing state ──────────────────────────────────────────────────────────
  const [spellSearch, setSpellSearch] = useState('')
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | 'all'>('all')
  const [onlyMyClassSpells, setOnlyMyClassSpells] = useState(false)

  const [selected, setSelected] = useState<SrdSpell | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  const [knownList, setKnownList] = useState<string[]>(() => (c.spells_known ?? []) as string[])
  const [preparedList, setPreparedList] = useState<string[]>(
    () => (c.spells_prepared ?? []) as string[],
  )
  // Polish 4: track EK/AT wildcard_spells in local state so we can persist
  // consumption together with the spell add.
  const [wildcardList, setWildcardList] = useState<string[]>(
    () => Array.isArray((c as any).wildcard_spells) ? ((c as any).wildcard_spells as string[]) : [],
  )

  // ── new state ───────────────────────────────────────────────────────────────
  const [panelMode, setPanelMode] = useState<'my_spells' | 'browse_all'>('my_spells')

  // ── escape key dismiss ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [selected])

  // ── existing derived state ──────────────────────────────────────────────────
  const knownSpellNames = useMemo(() => new Set(knownList), [knownList])
  const preparedSpellNames = useMemo(() => new Set(preparedList), [preparedList])

  // Wave 6J: classSpellTag is now an ARRAY so multiclass characters see spells
  // from every class list they belong to. Single-class characters get one entry.
  const CASTER_CLASS_TAGS = new Set(['cleric','paladin','druid','wizard','sorcerer','warlock','bard','ranger'])
  const classSpellTags = useMemo<string[]>(() => {
    const out: string[] = []
    const primary = String(c.main_job ?? '').toLowerCase()
    if (CASTER_CLASS_TAGS.has(primary)) out.push(primary)
    const secondary = String((c as any).secondary_class ?? '').toLowerCase()
    if (secondary && CASTER_CLASS_TAGS.has(secondary)) out.push(secondary)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.main_job, (c as any).secondary_class])

  // Convenience: primary class only (for places that need to display a single label).
  const classSpellTag = classSpellTags[0] ?? null

  const isPreparedCaster = useMemo(() => {
    const job = String(c.main_job ?? '').toLowerCase().trim()
    return job === 'cleric' || job === 'druid' || job === 'wizard' || job === 'paladin'
  }, [c.main_job])

  // Magic audit section C.4: Paladin prepared cap uses HALF level (not full)
  // per 5e rules. The previous formula gave Paladins level+mod, which was wrong.
  const maxPrepared = useMemo(() => {
    if (!isPreparedCaster) return null
    const level = Number(c.level ?? 1)
    const abilityKey = (c.spellcasting_ability ?? 'int') as keyof NonNullable<typeof c.abilities>
    const score = Number((c.abilities as any)?.[abilityKey] ?? 10)
    const mod = Math.floor((score - 10) / 2)
    const job = String(c.main_job ?? '').toLowerCase().trim()
    if (job === 'paladin') return Math.max(1, Math.floor(level / 2) + mod)
    return Math.max(1, level + mod)
  }, [isPreparedCaster, c.level, c.spellcasting_ability, c.abilities, c.main_job])

  // Magic audit section C.4: domain / oath / circle spells are ALWAYS prepared
  // and must be excluded from the prepared cap count. Without this, a level-3
  // Life Cleric with 2 always-prepared domain spells effectively loses 2
  // preparation slots.
  //
  // Wave 6J: multiclass — union domain spells from BOTH primary and secondary
  // subclasses (each at the class's own level).
  const domainSpellNames = useMemo(() => {
    const result = new Set<string>()
    const primaryCls = String(c.main_job ?? '').toLowerCase()
    const primarySub = String(c.subclass ?? '').toLowerCase()
    const primaryLevel = Number(c.level ?? 1)
    if (primarySub) {
      const maxLvl = getMaxSpellLevelForClass(primaryCls, primarySub, primaryLevel, true)
      if (maxLvl > 0) {
        for (const name of getDomainSpells(primarySub, maxLvl)) result.add(name)
      }
    }
    const secCls = String((c as any).secondary_class ?? '').toLowerCase()
    const secSub = String((c as any).secondary_subclass ?? '').toLowerCase()
    const secLevel = Number((c as any).secondary_level ?? 0)
    if (secSub && secLevel > 0) {
      const maxLvl = getMaxSpellLevelForClass(secCls, secSub, secLevel, true)
      if (maxLvl > 0) {
        for (const name of getDomainSpells(secSub, maxLvl)) result.add(name)
      }
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.subclass, c.main_job, c.level, (c as any).secondary_class, (c as any).secondary_subclass, (c as any).secondary_level])

  // Count of prepared spells that ACTUALLY count against the cap (excludes
  // domain spells, since those are always prepared for free).
  const preparedNonDomainCount = useMemo(() => {
    return preparedList.filter(n => !domainSpellNames.has(n)).length
  }, [preparedList, domainSpellNames])

  // Magic audit section F.3: max-leveled-spells-known counter for known-spell
  // casters (Sorcerer / Bard / Warlock / Ranger) and Wizard spellbook size.
  // Existing characters with too many spells see a warning (we don't force a
  // removal — that's the player's call after rebalancing their build).
  const maxLeveledKnown = useMemo(() => {
    const cls = String(c.main_job ?? '').toLowerCase()
    return getMaxLeveledSpellsKnown(cls, Number(c.level ?? 1))
  }, [c.main_job, c.level])

  // Current leveled-spell count from spells_known (cantrips excluded).
  const currentLeveledKnown = useMemo(() => {
    return knownList.filter(name => {
      const s = SRD_SPELLS.find(sp => sp.name === name)
      return s && s.level > 0
    }).length
  }, [knownList])

  const maxCantrips = useMemo(() => {
    const cls = String(c.main_job ?? '').toLowerCase() as any
    return getCantripsKnown(cls, Number(c.level ?? 1))
  }, [c.main_job, c.level])

  const currentCantrips = useMemo(() => {
    return knownList.filter(name => {
      const s = SRD_SPELLS.find(sp => sp.name === name)
      return s && s.level === 0
    }).length
  }, [knownList])

  const filteredSpells: SrdSpell[] = useMemo(() => {
    let spells = SRD_SPELLS

    // Wave 6J: when "Class only" is on, OR all classes the character has.
    if (onlyMyClassSpells && classSpellTags.length > 0) {
      spells = spells.filter((s) => classSpellTags.some(t => s.classes?.includes(t as any)))
    }
    if (spellLevelFilter !== 'all') {
      spells = spells.filter((s) => s.level === spellLevelFilter)
    }
    if (spellSearch.trim()) {
      const q = spellSearch.toLowerCase()
      spells = spells.filter((s) => s.name.toLowerCase().includes(q))
    }
    return spells
  }, [onlyMyClassSpells, classSpellTags, spellLevelFilter, spellSearch])

  // ── new memos for My Spells view ────────────────────────────────────────────
  const knownSpells: SrdSpell[] = useMemo(() =>
    knownList
      .map((n) => SRD_SPELLS.find((s) => s.name === n))
      .filter((s): s is SrdSpell => s !== undefined),
    [knownList],
  )

  const knownByLevel: Map<number, SrdSpell[]> = useMemo(() => {
    const map = new Map<number, SrdSpell[]>()
    for (const spell of knownSpells) {
      const bucket = map.get(spell.level) ?? []
      bucket.push(spell)
      map.set(spell.level, bucket)
    }
    return map
  }, [knownSpells])

  const knownLevels: number[] = useMemo(
    () => Array.from(knownByLevel.keys()).sort((a, b) => a - b),
    [knownByLevel],
  )

  // Polish 4: EK/AT enforcement memoized helpers.
  const allowedSchools = useMemo(
    () => getAllowedSchoolsForSubclass(c.main_job, c.subclass),
    [c.main_job, c.subclass],
  )
  const wildcardBudget = useMemo(
    () => getWildcardCountForSubclass(c.main_job, c.subclass, Number(c.level ?? 1)),
    [c.main_job, c.subclass, c.level],
  )

  function isOffSchool(spell: SrdSpell | undefined | null): boolean {
    if (!spell || !allowedSchools) return false
    if (spell.level === 0) return false // cantrips unrestricted
    return !allowedSchools.includes(spell.school)
  }

  // ── persistence helpers (unchanged) ────────────────────────────────────────
  async function persistSpells(
    nextKnown: string[],
    nextPrepared: string[],
    nextWildcards?: string[],
  ) {
    setSaving(true)
    setSaveErr(null)
    try {
      const updatePayload: Record<string, any> = {
        spells_known: nextKnown,
        spells_prepared: nextPrepared,
      }
      if (nextWildcards !== undefined) {
        updatePayload.wildcard_spells = nextWildcards
      }
      const { error } = await supabase
        .from('characters')
        .update(updatePayload)
        .eq('id', c.id)

      if (error) throw error

      setKnownList(nextKnown)
      setPreparedList(nextPrepared)
      if (nextWildcards !== undefined) setWildcardList(nextWildcards)
    } catch (e: any) {
      setSaveErr(e?.message ?? 'Failed to save spells')
    } finally {
      setSaving(false)
    }
  }

  async function toggleKnown(spellName: string) {
    const cur = [...knownList]
    const exists = knownSpellNames.has(spellName)
    const spell = SRD_SPELLS.find(s => s.name === spellName)

    // Polish 4: EK/AT off-school adds consume one wildcard slot.
    let nextWildcards = wildcardList
    if (allowedSchools && !exists && spell && isOffSchool(spell)) {
      if (wildcardList.includes(spellName)) {
        // already tracked as wildcard — no extra consumption
      } else if (wildcardList.length >= wildcardBudget) {
        setSaveErr(`No wildcards available — ${spell.school} is off-school for this subclass.`)
        return
      } else {
        nextWildcards = [...wildcardList, spellName]
      }
    }
    if (exists && wildcardList.includes(spellName)) {
      // Removing a wildcard-tracked spell — free the slot.
      nextWildcards = wildcardList.filter(n => n !== spellName)
    }

    const next = exists ? cur.filter((n) => n !== spellName) : [...cur, spellName]
    const curPrep = [...preparedList]
    const nextPrep = exists ? curPrep.filter((n) => n !== spellName) : curPrep
    await persistSpells(next, nextPrep, nextWildcards !== wildcardList ? nextWildcards : undefined)
  }

  async function togglePrepared(spellName: string) {
    const curKnown = [...knownList]
    const nextKnown = knownSpellNames.has(spellName) ? curKnown : [...curKnown, spellName]

    const cur = [...preparedList]
    const exists = preparedSpellNames.has(spellName)

    // Magic audit section C.4: domain/oath/circle spells are always prepared
    // and don't count toward the cap. Compare against the non-domain count.
    if (!exists && maxPrepared !== null && !domainSpellNames.has(spellName)) {
      const curNonDomain = cur.filter(n => !domainSpellNames.has(n)).length
      if (curNonDomain >= maxPrepared) {
        setSaveErr(`Can only prepare ${maxPrepared} spell${maxPrepared === 1 ? '' : 's'} (domain spells don't count)`)
        return
      }
    }

    const next = exists ? cur.filter((n) => n !== spellName) : [...cur, spellName]
    await persistSpells(nextKnown, next)
  }

  // ── unknown-spell chip renderer (shared between both modes) ─────────────────
  const unknownSpellChips = [...knownList, ...preparedList]
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .filter((n) => !SRD_SPELLS.some((s) => s.name === n))
    .map((n) => (
      <div
        key={`unknown-${n}`}
        className="mb-1 rounded-md bg-red-900/30 border border-red-700/40 px-2 py-1 text-left"
      >
        <div className="flex items-center justify-between text-[11px]">
          <div>
            <span className="font-semibold text-red-300">Unknown spell: {n}</span>
            <div className="text-[10px] text-red-400/70">
              Not found in SRD data — may have been renamed or removed.
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              persistSpells(
                knownList.filter((x) => x !== n),
                preparedList.filter((x) => x !== n),
              )
            }
            disabled={saving}
            className="ml-2 rounded px-1.5 py-0.5 text-[10px] bg-red-900/50 text-red-300 hover:bg-red-900/70 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </div>
    ))

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">

      {/* Header: known/prepared counts + spellcasting stats */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Spellbook
          </h2>
          <span className="rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] text-slate-300">
            Known {knownSpellNames.size}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              maxPrepared !== null && preparedNonDomainCount >= maxPrepared
                ? 'bg-amber-900/60 text-amber-300'
                : 'bg-slate-900/70 text-slate-300'
            }`}
            title={domainSpellNames.size > 0
              ? `${preparedNonDomainCount} count against cap; ${domainSpellNames.size} domain spells always prepared.`
              : undefined}
          >
            Prepared {preparedNonDomainCount}{maxPrepared !== null ? `/${maxPrepared}` : ''}
          </span>

          {/* Magic audit section F.3: leveled-spells-known counter for
              known-spell casters and Wizard spellbook. */}
          {maxLeveledKnown !== null && maxLeveledKnown > 0 && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                currentLeveledKnown > maxLeveledKnown
                  ? 'bg-rose-900/60 text-rose-300'
                  : currentLeveledKnown === maxLeveledKnown
                    ? 'bg-emerald-900/40 text-emerald-300'
                    : 'bg-slate-900/70 text-slate-300'
              }`}
              title={String(c.main_job).toLowerCase() === 'wizard'
                ? 'Wizard spellbook size: 6 + 2×(level − 1)'
                : 'Max leveled spells known at this level'}
            >
              {String(c.main_job).toLowerCase() === 'wizard' ? 'Spellbook' : 'Spells known'} {currentLeveledKnown}/{maxLeveledKnown}
            </span>
          )}

          {/* Cantrip counter — applies to all cantrip-knowing classes. */}
          {maxCantrips > 0 && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                currentCantrips > maxCantrips
                  ? 'bg-rose-900/60 text-rose-300'
                  : 'bg-slate-900/70 text-slate-300'
              }`}
            >
              Cantrips {currentCantrips}/{maxCantrips}
            </span>
          )}

          {/* Polish 4: EK/AT wildcard counter */}
          {wildcardBudget > 0 && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                wildcardList.length === wildcardBudget
                  ? 'bg-fuchsia-900/40 text-fuchsia-300'
                  : 'bg-slate-900/70 text-slate-300'
              }`}
              title="EK / AT any-school wildcard picks (levels 3, 8, 14, 20)"
            >
              ✦ Wildcards {wildcardList.length}/{wildcardBudget}
            </span>
          )}
        </div>

        {/* Over-limit warning banner. Doesn't auto-remove spells — the player
            chooses what to drop. */}
        {((maxLeveledKnown !== null && currentLeveledKnown > maxLeveledKnown) ||
          (maxCantrips > 0 && currentCantrips > maxCantrips)) && (
          <div className="mb-2 rounded-md border border-rose-700/40 bg-rose-950/30 px-2 py-1 text-[10px] text-rose-200">
            ⚠ Over the limit for this class & level — remove a spell to balance your build.
          </div>
        )}
        {c.spellcasting_ability ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-violet-900/30 border border-violet-700/40 px-2.5 py-1">
              <span className="text-[10px] uppercase tracking-wide text-violet-400">Save DC</span>
              <span className="text-base font-bold text-violet-200">{c.spell_save_dc ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-blue-900/30 border border-blue-700/40 px-2.5 py-1">
              <span className="text-[10px] uppercase tracking-wide text-blue-400">Spell Attack</span>
              <span className="text-base font-bold text-blue-200">
                {c.spell_attack_bonus != null ? formatMod(c.spell_attack_bonus) : '—'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 ml-1">
              {c.spellcasting_ability.toUpperCase()}
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 italic">Non-spellcaster</div>
        )}
      </div>

      {/* Save / error banner */}
      {(saving || saveErr) && (
        <div className="mb-2 rounded-md border border-slate-800 bg-slate-950/80 p-2 text-[11px]">
          {saving && <div className="text-slate-300">Saving…</div>}
          {saveErr && <div className="text-red-300">{saveErr}</div>}
        </div>
      )}

      {/* Spell slots */}
      {spellSlots && (
        <div className="mb-3 rounded-md bg-slate-900/80 p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Spell Slots</div>
          <div className="space-y-1.5">
            {Object.entries(spellSlots).map(([lvl, maxCount]) => {
              const used = slotUsed?.[`spell_slot_used_${lvl}`] ?? 0
              const remaining = Math.max(0, maxCount - used)
              return (
                <div key={lvl} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 text-[11px] text-slate-400">Level {lvl}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: maxCount }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-3 w-3 rounded-full border transition ${
                          i < remaining
                            ? 'border-violet-500 bg-violet-500/60'
                            : 'border-slate-700 bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-auto text-[11px] tabular-nums text-slate-300">
                    {remaining}/{maxCount}
                  </span>
                  {onSpendSlot && (
                    <button
                      type="button"
                      disabled={remaining === 0}
                      onClick={() => onSpendSlot(lvl)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-violet-300 bg-violet-900/30 hover:bg-violet-900/50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      Use
                    </button>
                  )}
                  {onRestoreSlot && (
                    <button
                      type="button"
                      disabled={used === 0}
                      onClick={() => onRestoreSlot(lvl)}
                      className="rounded px-1.5 py-0.5 text-[10px] text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      +
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mode toggle bar */}
      <div className="mb-3 flex gap-1 rounded-lg bg-slate-900/60 p-1">
        <button
          type="button"
          onClick={() => setPanelMode('my_spells')}
          className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition ${
            panelMode === 'my_spells'
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          My Spells
        </button>
        <button
          type="button"
          onClick={() => setPanelMode('browse_all')}
          className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition ${
            panelMode === 'browse_all'
              ? 'bg-slate-700 text-slate-100'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Browse All
        </button>
      </div>

      {/* ── MY SPELLS view ────────────────────────────────────────────────────── */}
      {panelMode === 'my_spells' && (
        <div>
          {/* Long-rest prep hint for prepared casters */}
          {isPreparedCaster && (
            <div className="mb-2 rounded-md bg-violet-950/30 border border-violet-800/30 px-2 py-1.5 text-[10px] text-violet-300">
              Prepare spells here after a long rest.
              {maxPrepared !== null &&
                ` (${preparedNonDomainCount}/${maxPrepared} prepared${
                  domainSpellNames.size > 0 ? ` + ${domainSpellNames.size} domain` : ''
                })`}
            </div>
          )}

          {/* Empty state */}
          {knownList.length === 0 && (
            <p className="text-[11px] text-slate-500 italic px-1 mb-2">
              No known spells yet. Switch to Browse All to add spells.
            </p>
          )}

          {/* Unknown-spell chips */}
          {unknownSpellChips}

          {/* Known spells grouped by level */}
          {knownLevels.map((lvl) => {
            const spells = knownByLevel.get(lvl) ?? []
            return (
              <div key={lvl} className="mb-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {lvl === 0 ? 'Cantrips' : `Level ${lvl}`}
                </div>
                <div className="space-y-1">
                  {spells.map((spell) => {
                    const isPrepared = preparedSpellNames.has(spell.name)
                    const isCantrip = spell.level === 0
                    const isDomain = domainSpellNames.has(spell.name)
                    return (
                      <div
                        key={spell.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelected(spell)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelected(spell) }}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-md bg-slate-900/90 px-2 py-1.5 hover:bg-slate-900 transition"
                      >
                        {/* Spell name + subtitle */}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-semibold text-slate-100 flex items-center gap-1">
                            <span className="truncate">{spell.name}</span>
                            {isDomain && (
                              <span className="shrink-0 rounded bg-amber-900/40 border border-amber-700/40 px-1 py-0 text-[9px] text-amber-300" title="Always prepared — domain/oath/circle">
                                Domain
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {spell.school} · {spell.castingTime}
                          </div>
                        </div>

                        {/* Cantrip badge OR prepare toggle */}
                        {isCantrip ? (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400">
                            Cantrip
                          </span>
                        ) : isDomain ? (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] bg-amber-900/40 text-amber-300" title="Always prepared">
                            ✦ Always
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={(e) => {
                              e.stopPropagation() // prevent row click from opening modal
                              togglePrepared(spell.name)
                            }}
                            className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold transition disabled:opacity-50 ${
                              isPrepared
                                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {isPrepared ? 'Prepared ✓' : 'Prepare'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── BROWSE ALL view ───────────────────────────────────────────────────── */}
      {panelMode === 'browse_all' && (
        <div>
          {/* Search & filters */}
          <div className="mb-2 space-y-1">
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px]"
              placeholder="Search spells..."
              value={spellSearch}
              onChange={(e) => setSpellSearch(e.target.value)}
            />

            <div className="flex gap-1">
              <select
                className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-1 py-1 text-[11px]"
                value={spellLevelFilter}
                onChange={(e) =>
                  setSpellLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
              >
                <option value="all">All levels</option>
                <option value={0}>Cantrips</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Level {lvl}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1 text-[10px] text-slate-400">
                <input
                  type="checkbox"
                  className="h-3 w-3"
                  checked={onlyMyClassSpells}
                  onChange={(e) => setOnlyMyClassSpells(e.target.checked)}
                />
                Class only
              </label>
            </div>

            <div className="text-[10px] text-slate-500">
              Click a spell to view details and mark Known / Prepared.
              {isPreparedCaster ? ' (This class prepares spells.)' : ''}
            </div>
          </div>

          {/* Spell list */}
          <div className="max-h-80 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/80 p-2">
            {filteredSpells.length === 0 && (
              <p className="text-[11px] text-slate-500">No spells match your filters.</p>
            )}

            {/* Unknown-spell chips */}
            {unknownSpellChips}

            {filteredSpells.map((spell) => {
              const isKnown = knownSpellNames.has(spell.name)
              const isPrepared = preparedSpellNames.has(spell.name)
              // Wave 6J: show which of the character's classes can cast this spell.
              const fromTags = classSpellTags.length > 1
                ? classSpellTags.filter(t => spell.classes?.includes(t as any))
                : []

              return (
                <button
                  key={spell.name}
                  type="button"
                  onClick={() => setSelected(spell)}
                  className="mb-1 w-full rounded-md bg-slate-900/90 px-2 py-1 text-left hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-100">{spell.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`} · {spell.school} ·{' '}
                        {spell.castingTime}
                        {fromTags.length > 0 && (
                          <span className="ml-1 text-violet-300">
                            · {fromTags.map(t => `from ${t.charAt(0).toUpperCase()}${t.slice(1)}`).join(' / ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <span
                        className={`rounded px-1 py-0.5 text-[10px] ${
                          isKnown
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        Known
                      </span>
                      <span
                        className={`rounded px-1 py-0.5 text-[10px] ${
                          isPrepared
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        Prepared
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Spell detail modal (shared between both modes) ─────────────────────── */}
      {selected && (
        <SpellDetailModal
          spell={selected}
          isKnown={knownSpellNames.has(selected.name)}
          isPrepared={preparedSpellNames.has(selected.name)}
          isPreparedCaster={isPreparedCaster}
          maxPrepared={maxPrepared}
          // Section C.4: show the non-domain count so the cap badge in the
          // modal matches the rule that domain spells don't count.
          preparedCount={preparedNonDomainCount}
          saving={saving}
          onClose={() => setSelected(null)}
          onToggleKnown={toggleKnown}
          onTogglePrepared={togglePrepared}
          spellSaveDc={c.spell_save_dc ?? null}
          spellAttackBonus={c.spell_attack_bonus ?? null}
        />
      )}
    </section>
  )
}
