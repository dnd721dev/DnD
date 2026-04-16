'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MONSTERS, type Monster as SrdMonster } from '@/lib/monsters'

// Ability modifier helper
function mod(score: number): string {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

// CR display string
function crDisplay(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

type MonsterSource = 'srd' | 'custom'

type UnifiedMonster = {
  id: string
  name: string
  cr: number
  size?: string | null
  type?: string | null
  armorClass?: number | null
  hitPoints?: number | null
  tokenImage?: string | null
  tags?: string[]
  source: MonsterSource
}

type DbMonsterRow = {
  id: string
  owner_wallet: string | null
  name: string
  cr: number | null
  size: string | null
  type: string | null
  armor_class: number | null
  hit_points: number | null
  token_image_url: string | null
  tags: string[] | null
}

type MonsterLibraryProps = {
  onSpawnMonster?: (monster: { id: string; name: string }) => void | Promise<void>
}

export default function MonsterLibrary({
  onSpawnMonster,
}: MonsterLibraryProps) {
  const [search, setSearch] = useState('')
  const [crFilter, setCrFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbMonsters, setDbMonsters] = useState<DbMonsterRow[]>([])

  // Stat block detail view
  const [selectedMonsterId, setSelectedMonsterId] = useState<string | null>(null)
  // Look up full SRD data — strip 'srd:' prefix
  const srdLookup = useMemo(() => {
    const map = new Map<string, SrdMonster>()
    for (const m of MONSTERS) map.set(m.id, m)
    return map
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('monsters')
        .select(
          'id, owner_wallet, name, cr, size, type, armor_class, hit_points, token_image_url, tags'
        )
        .order('name', { ascending: true })

      if (cancelled) return

      if (error) {
        console.error('Load monsters error', error)
        setError(error.message)
        setDbMonsters([])
      } else {
        setDbMonsters((data ?? []) as DbMonsterRow[])
      }

      setLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const unifiedList: UnifiedMonster[] = useMemo(() => {
    const srdList: UnifiedMonster[] = (Array.isArray(MONSTERS) ? MONSTERS : []).map(
      (m: SrdMonster) => ({
        id: `srd:${m.id}`,
        name: m.name,
        cr: m.cr,
        size: m.size,
        type: m.type,
        armorClass: m.armorClass,
        hitPoints: m.hitPoints,
        tokenImage: m.tokenImage ?? null,
        tags: m.tags ?? [],
        source: 'srd' as MonsterSource,
      })
    )

    const customList: UnifiedMonster[] = (dbMonsters ?? []).map((m) => ({
      id: `db:${m.id}`,
      name: m.name,
      cr: m.cr ?? 0,
      size: m.size,
      type: m.type,
      armorClass: m.armor_class,
      hitPoints: m.hit_points,
      tokenImage: m.token_image_url,
      tags: m.tags ?? [],
      source: 'custom' as MonsterSource,
    }))

    return [...customList, ...srdList]
  }, [dbMonsters])

  const selectedSrd = selectedMonsterId?.startsWith('srd:')
    ? srdLookup.get(selectedMonsterId.slice(4)) ?? null
    : null
  const selectedUnified = selectedMonsterId
    ? (unifiedList.find(m => m.id === selectedMonsterId) ?? null)
    : null

  const filtered = useMemo(() => {
    return unifiedList.filter((m) => {
      const matchesSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()))

      const matchesCr =
        crFilter === 'all'
          ? true
          : crFilter === 'low'
          ? m.cr <= 2
          : crFilter === 'mid'
          ? m.cr > 2 && m.cr <= 8
          : m.cr > 8

      return matchesSearch && matchesCr
    })
  }, [unifiedList, search, crFilter])

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-slate-100">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
            Monster Library
          </h2>
          <p className="text-[10px] text-slate-400">
            SRD + community homebrew
          </p>
        </div>
        <Link
          href="/homebrew"
          target="_blank"
          className="rounded-md border border-emerald-700/60 bg-emerald-900/40 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-800/50"
        >
          + Homebrew
        </Link>
      </div>

      <div className="mb-3 flex gap-2">
        <input
          type="text"
          placeholder="Search monsters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 text-sm outline-none focus:border-blue-500"
        />
        <select
          value={crFilter}
          onChange={(e) => setCrFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-700 bg-slate-800 px-2 text-xs uppercase tracking-wide text-slate-200"
        >
          <option value="all">CR All</option>
          <option value="low">CR 0–2</option>
          <option value="mid">CR 3–8</option>
          <option value="high">CR 9+</option>
        </select>
      </div>

      {loading && (
        <div className="mb-2 text-[11px] text-slate-400">
          Loading monsters…
        </div>
      )}
      {error && (
        <div className="mb-2 text-[11px] text-red-400">
          {error}
        </div>
      )}

      {/* ── Stat block detail panel ── */}
      {selectedUnified && (
        <div className="flex-1 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/80 p-2 text-[11px]">
          {/* Header row */}
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-slate-100">{selectedUnified.name}</div>
              <div className="text-[10px] text-slate-400">
                {selectedUnified.size} {selectedUnified.type}
                {selectedUnified.cr != null && ` • CR ${crDisplay(selectedUnified.cr)}`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMonsterId(null)}
              className="shrink-0 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
            >
              ← Back
            </button>
          </div>

          {/* Quick stats */}
          <div className="mb-2 flex gap-3 rounded-md bg-slate-900/60 p-2">
            {selectedUnified.armorClass != null && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase text-slate-500">AC</span>
                <span className="font-bold text-slate-100">{selectedUnified.armorClass}</span>
              </div>
            )}
            {selectedUnified.hitPoints != null && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase text-slate-500">HP</span>
                <span className="font-bold text-slate-100">
                  {selectedUnified.hitPoints}
                  {selectedSrd?.hitDice && (
                    <span className="ml-1 text-[9px] font-normal text-slate-400">({selectedSrd.hitDice})</span>
                  )}
                </span>
              </div>
            )}
            {selectedSrd && (
              <div className="flex flex-col items-center">
                <span className="text-[9px] uppercase text-slate-500">Speed</span>
                <span className="text-slate-200">{selectedSrd.speed}</span>
              </div>
            )}
          </div>

          {/* Ability scores */}
          {selectedSrd && (
            <div className="mb-2 grid grid-cols-6 gap-0.5 rounded-md bg-slate-900/60 p-1.5 text-center">
              {(['str','dex','con','int','wis','cha'] as const).map(ab => (
                <div key={ab} className="flex flex-col">
                  <span className="text-[9px] font-semibold uppercase text-slate-500">{ab}</span>
                  <span className="text-[11px] font-bold text-slate-100">{selectedSrd.abilities[ab]}</span>
                  <span className="text-[9px] text-slate-400">{mod(selectedSrd.abilities[ab])}</span>
                </div>
              ))}
            </div>
          )}

          {/* Skills / Senses */}
          {selectedSrd && (selectedSrd.skills?.length || selectedSrd.senses?.length) ? (
            <div className="mb-2 space-y-0.5 text-[10px]">
              {selectedSrd.skills?.length ? (
                <div><span className="font-semibold text-slate-400">Skills </span><span className="text-slate-300">{selectedSrd.skills.join(', ')}</span></div>
              ) : null}
              {selectedSrd.senses?.length ? (
                <div><span className="font-semibold text-slate-400">Senses </span><span className="text-slate-300">{selectedSrd.senses.join(', ')}</span></div>
              ) : null}
              {selectedSrd.languages?.length ? (
                <div><span className="font-semibold text-slate-400">Languages </span><span className="text-slate-300">{selectedSrd.languages.join(', ')}</span></div>
              ) : null}
            </div>
          ) : null}

          {/* Traits */}
          {selectedSrd?.traits?.length ? (
            <div className="mb-2">
              <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">Traits</div>
              {selectedSrd.traits.map((t, i) => (
                <div key={i} className="mb-1 text-[10px]">
                  <span className="font-semibold italic text-slate-300">{t.name}. </span>
                  <span className="text-slate-400">{t.description}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Actions */}
          {selectedSrd?.actions?.length ? (
            <div className="mb-2">
              <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">Actions</div>
              {selectedSrd.actions.map((a, i) => (
                <div key={i} className="mb-1 text-[10px]">
                  <span className="font-semibold italic text-slate-300">{a.name}. </span>
                  <span className="text-slate-400">{a.description}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Legendary Actions */}
          {selectedSrd?.legendaryActions?.length ? (
            <div className="mb-2">
              <div className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-500">Legendary Actions</div>
              {selectedSrd.legendaryActions.map((a, i) => (
                <div key={i} className="mb-1 text-[10px]">
                  <span className="font-semibold italic text-amber-300">{a.name}. </span>
                  <span className="text-slate-400">{a.description}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Spawn button */}
          {onSpawnMonster && (
            <button
              type="button"
              onClick={() => {
                onSpawnMonster({ id: selectedUnified.id, name: selectedUnified.name })
                setSelectedMonsterId(null)
              }}
              className="mt-1 w-full rounded-md bg-emerald-700 py-1.5 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-600"
            >
              ⊕ Spawn Token
            </button>
          )}
        </div>
      )}

      {/* ── Monster list ── */}
      {!selectedUnified && (
        <div className="scrollbar-thin scrollbar-thumb-slate-700/70 scrollbar-track-transparent flex-1 space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <div className="rounded-lg bg-slate-800/70 p-3 text-xs text-slate-400">
              No monsters match your search.
            </div>
          )}

          {filtered.map((monster) => (
            <button
              key={monster.id}
              type="button"
              onClick={() => setSelectedMonsterId(monster.id)}
              className="flex w-full items-center gap-3 rounded-lg bg-slate-800/70 p-2 text-left text-sm transition hover:bg-slate-700/80"
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-900">
                {monster.tokenImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={monster.tokenImage}
                    alt={monster.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    {monster.name.charAt(0)}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{monster.name}</span>
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
                    CR {crDisplay(monster.cr)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  {monster.size && monster.type && (
                    <>
                      <span>{monster.size} {monster.type}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-500" />
                    </>
                  )}
                  {monster.armorClass != null && (
                    <>
                      <span>AC {monster.armorClass}</span>
                      <span className="h-1 w-1 rounded-full bg-slate-500" />
                    </>
                  )}
                  {monster.hitPoints != null && <span>HP {monster.hitPoints}</span>}
                </div>
                {monster.tags && monster.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {monster.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-900/90 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="ml-1 shrink-0">
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    monster.source === 'srd'
                      ? 'bg-sky-600/80 text-white'
                      : 'bg-emerald-600/80 text-white'
                  }`}
                >
                  {monster.source === 'srd' ? 'SRD' : 'Custom'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
