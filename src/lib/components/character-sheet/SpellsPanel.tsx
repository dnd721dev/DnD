"use client"

import { useMemo, useState } from 'react'
import type { CharacterSheetData, SpellSlotsSummary } from './types'
import { SRD_SPELLS, type SrdSpell } from '@/lib/srdspells'
import { formatMod } from './utils'
import { supabase } from '@/lib/supabase'

export function SpellsPanel({
  c,
  spellSlots,
}: {
  c: CharacterSheetData
  spellSlots: SpellSlotsSummary | null
}) {
  const [spellSearch, setSpellSearch] = useState('')
  const [spellLevelFilter, setSpellLevelFilter] = useState<number | 'all'>('all')
  const [onlyMyClassSpells, setOnlyMyClassSpells] = useState(false)

  const [selected, setSelected] = useState<SrdSpell | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  // Local state so the UI updates immediately after marking spells.
  const [knownList, setKnownList] = useState<string[]>(() => (c.spells_known ?? []) as string[])
  const [preparedList, setPreparedList] = useState<string[]>(
    () => (c.spells_prepared ?? []) as string[],
  )

  const knownSpellNames = useMemo(() => new Set(knownList), [knownList])
  const preparedSpellNames = useMemo(() => new Set(preparedList), [preparedList])

  const classSpellTag = useMemo(() => {
    const jobRaw = (c.main_job ?? '').toLowerCase()
    switch (jobRaw) {
      case 'cleric':
        return 'cleric'
      case 'paladin':
        return 'paladin'
      case 'druid':
        return 'druid'
      case 'wizard':
        return 'wizard'
      case 'sorcerer':
        return 'sorcerer'
      case 'warlock':
        return 'warlock'
      case 'bard':
        return 'bard'
      case 'ranger':
        return 'ranger'
      default:
        return null
    }
  }, [c.main_job])

  const isPreparedCaster = useMemo(() => {
    const job = String(c.main_job ?? '').toLowerCase().trim()
    return job === 'cleric' || job === 'druid' || job === 'wizard' || job === 'paladin'
  }, [c.main_job])

  async function persistSpells(nextKnown: string[], nextPrepared: string[]) {
    setSaving(true)
    setSaveErr(null)
    try {
      const { error } = await supabase
        .from('characters')
        .update({ spells_known: nextKnown, spells_prepared: nextPrepared })
        .eq('id', c.id)

      if (error) throw error

      // optimistic local sync
      setKnownList(nextKnown)
      setPreparedList(nextPrepared)
    } catch (e: any) {
      setSaveErr(e?.message ?? 'Failed to save spells')
    } finally {
      setSaving(false)
    }
  }

  async function toggleKnown(spellName: string) {
    const cur = [...knownList]
    const exists = knownSpellNames.has(spellName)
    const next = exists ? cur.filter((n) => n !== spellName) : [...cur, spellName]

    // If we un-know a spell, also un-prepare it.
    const curPrep = [...preparedList]
    const nextPrep = exists ? curPrep.filter((n) => n !== spellName) : curPrep

    await persistSpells(next, nextPrep)
  }

  async function togglePrepared(spellName: string) {
    // Prepared spells must also be known, so we enforce that.
    const curKnown = [...knownList]
    const nextKnown = knownSpellNames.has(spellName) ? curKnown : [...curKnown, spellName]

    const cur = [...preparedList]
    const exists = preparedSpellNames.has(spellName)
    const next = exists ? cur.filter((n) => n !== spellName) : [...cur, spellName]

    await persistSpells(nextKnown, next)
  }

  const filteredSpells: SrdSpell[] = useMemo(() => {
    let spells = SRD_SPELLS

    if (onlyMyClassSpells && classSpellTag) {
      spells = spells.filter((s) => s.classes?.includes(classSpellTag))
    }

    if (spellLevelFilter !== 'all') {
      spells = spells.filter((s) => s.level === spellLevelFilter)
    }

    if (spellSearch.trim()) {
      const q = spellSearch.toLowerCase()
      spells = spells.filter((s) => s.name.toLowerCase().includes(q))
    }

    return spells
  }, [onlyMyClassSpells, classSpellTag, spellLevelFilter, spellSearch])

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Spellbook
          </h2>
          <span className="rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] text-slate-300">
            Known {knownSpellNames.size}
          </span>
          <span className="rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] text-slate-300">
            Prepared {preparedSpellNames.size}
          </span>
        </div>
        <div className="text-[10px] text-slate-500">
          {c.spellcasting_ability
            ? `Save DC ${c.spell_save_dc ?? '—'} • Attack ${
                c.spell_attack_bonus != null ? formatMod(c.spell_attack_bonus) : '—'
              }`
            : 'Non-spellcaster'}
        </div>
      </div>

      {(saving || saveErr) && (
        <div className="mb-2 rounded-md border border-slate-800 bg-slate-950/80 p-2 text-[11px]">
          {saving && <div className="text-slate-300">Saving…</div>}
          {saveErr && <div className="text-red-300">{saveErr}</div>}
        </div>
      )}

      {spellSlots && (
        <div className="mb-2 rounded-md bg-slate-900/80 p-2">
          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">
            Spell Slots
          </div>
          <div className="space-y-1">
            {Object.entries(spellSlots).map(([lvl, count]) => (
              <div key={lvl} className="flex items-center justify-between">
                <span className="text-[11px] text-slate-200">Level {lvl}</span>
                <span className="text-[11px] text-slate-100">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
          Tip: click a spell to view details. Use the buttons to mark Known / Prepared.
          {isPreparedCaster ? ' (This class prepares spells.)' : ''}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/80 p-2">
        {filteredSpells.length === 0 && (
          <p className="text-[11px] text-slate-500">No spells match your filters.</p>
        )}

        {filteredSpells.map((spell) => {
          const isKnown = knownSpellNames.has(spell.name)
          const isPrepared = preparedSpellNames.has(spell.name)

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
                    {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`} • {spell.school} •{' '}
                    {spell.castingTime}
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

      {selected && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-100">{selected.name}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                {selected.level === 0 ? 'Cantrip' : `Level ${selected.level}`} • {selected.school}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-md bg-slate-900/60 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-900"
            >
              Close
            </button>
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-900/60 p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Cast</div>
              <div className="text-[11px] text-slate-200">{selected.castingTime}</div>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Range</div>
              <div className="text-[11px] text-slate-200">{selected.range}</div>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Components</div>
              <div className="text-[11px] text-slate-200">{selected.components}</div>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Duration</div>
              <div className="text-[11px] text-slate-200">{selected.duration}</div>
            </div>
          </div>

          {(selected.damage || selected.saveAbility || selected.attackRoll) && (
            <div className="mt-2 rounded-lg bg-slate-900/60 p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Effect</div>
              <div className="text-[11px] text-slate-200">
                {selected.attackRoll ? 'Attack roll' : null}
                {selected.attackRoll && (selected.damage || selected.saveAbility) ? ' • ' : null}
                {selected.saveAbility ? `Save: ${selected.saveAbility.toUpperCase()}` : null}
                {(selected.attackRoll || selected.saveAbility) && selected.damage ? ' • ' : null}
                {selected.damage ? `Damage: ${selected.damage}` : null}
              </div>
            </div>
          )}

          {selected.notes && (
            <div className="mt-2 rounded-lg bg-slate-900/60 p-2">
              <div className="text-[10px] font-semibold uppercase text-slate-400">Notes</div>
              <div className="whitespace-pre-wrap text-[11px] text-slate-200">{selected.notes}</div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => toggleKnown(selected.name)}
              disabled={saving}
              className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {knownSpellNames.has(selected.name) ? 'Remove Known' : 'Add Known'}
            </button>

            <button
              type="button"
              onClick={() => togglePrepared(selected.name)}
              disabled={saving}
              className="rounded-lg bg-blue-500/15 px-3 py-1.5 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
            >
              {preparedSpellNames.has(selected.name) ? 'Unprepare' : 'Prepare'}
            </button>

            {!isPreparedCaster && (
              <div className="flex items-center text-[10px] text-slate-500">
                Preparing is optional for this class.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
