'use client'

import { useMemo, useState } from 'react'
import type { CharacterSheetData, SpellSlotsSummary } from './types'
import { SRD_SPELLS, type SrdSpell } from '@/lib/srdspells'
import { formatMod } from './utils'

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

  const knownSpellNames = useMemo(
    () => new Set((c.spells_known ?? []) as string[]),
    [c.spells_known],
  )

  const preparedSpellNames = useMemo(
    () => new Set((c.spells_prepared ?? []) as string[]),
    [c.spells_prepared],
  )

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
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Spells
        </h2>
        <div className="text-[10px] text-slate-500">
          {c.spellcasting_ability
            ? `Save DC ${c.spell_save_dc ?? '—'} • Attack ${
                c.spell_attack_bonus != null ? formatMod(c.spell_attack_bonus) : '—'
              }`
            : 'Non-spellcaster'}
        </div>
      </div>

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
      </div>

      <div className="max-h-64 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/80 p-2">
        {filteredSpells.length === 0 && (
          <p className="text-[11px] text-slate-500">No spells match your filters.</p>
        )}

        {filteredSpells.map((spell) => {
          const isKnown = knownSpellNames.has(spell.name)
          const isPrepared = preparedSpellNames.has(spell.name)
          return (
            <div key={spell.name} className="mb-1 rounded-md bg-slate-900/90 px-2 py-1">
              <div className="flex items-center justify-between text-[11px]">
                <div>
                  <span className="font-semibold text-slate-100">{spell.name}</span>
                  <span className="ml-1 text-[10px] text-slate-400">
                    {spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level} ${spell.school}`}
                  </span>
                </div>
                <div className="flex gap-1 text-[10px]">
                  {isKnown && (
                    <span className="rounded bg-emerald-500/20 px-1 text-emerald-300">
                      Known
                    </span>
                  )}
                  {isPrepared && (
                    <span className="rounded bg-blue-500/20 px-1 text-blue-300">
                      Prepared
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
