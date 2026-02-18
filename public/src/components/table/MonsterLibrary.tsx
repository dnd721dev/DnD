'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MONSTERS, type Monster as SrdMonster } from '@/lib/monsters'

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
  onSpawnMonster?: (monster: { id: string; name: string }) => void
  ownerWallet?: string | null
}

export default function MonsterLibrary({
  onSpawnMonster,
  ownerWallet,
}: MonsterLibraryProps) {
  const [search, setSearch] = useState('')
  const [crFilter, setCrFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbMonsters, setDbMonsters] = useState<DbMonsterRow[]>([])

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCr, setNewCr] = useState('0')
  const [newHp, setNewHp] = useState('')
  const [newAc, setNewAc] = useState('')

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

  async function handleCreateMonster() {
    if (!newName.trim()) return

    const parsedCr = parseFloat(newCr || '0') || 0
    const parsedHp = newHp ? parseInt(newHp, 10) : null
    const parsedAc = newAc ? parseInt(newAc, 10) : null

    const insertPayload: Partial<DbMonsterRow> & {
      name: string
      cr: number
    } = {
      name: newName.trim(),
      cr: parsedCr,
      armor_class: parsedAc,
      hit_points: parsedHp,
      owner_wallet: ownerWallet ?? null,
    }

    const { data, error } = await supabase
      .from('monsters')
      .insert(insertPayload as any)
      .select(
        'id, owner_wallet, name, cr, size, type, armor_class, hit_points, token_image_url, tags'
      )
      .limit(1).maybeSingle()

    if (error) {
      console.error('Create monster error', error)
      setError(error.message)
      return
    }

    setDbMonsters((prev) => [...prev, data as DbMonsterRow])

    setNewName('')
    setNewCr('0')
    setNewHp('')
    setNewAc('')
    setIsCreating(false)
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-slate-100">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
            Monster Library
          </h2>
          <p className="text-[10px] text-slate-400">
            SRD + your custom monsters
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating((v) => !v)}
          className="rounded-md bg-emerald-600 px-2 py-1 text-[11px] font-semibold hover:bg-emerald-500"
        >
          {isCreating ? 'Cancel' : 'New'}
        </button>
      </div>

      {isCreating && (
        <div className="mb-3 space-y-2 rounded-lg border border-slate-700 bg-slate-950/80 p-2">
          <p className="text-[11px] font-semibold text-slate-100">
            Create Monster
          </p>
          <div className="flex flex-col gap-1 text-[11px]">
            <label className="flex flex-col gap-1">
              <span className="text-slate-300">Name *</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 rounded border border-slate-700 bg-slate-900 px-2 text-[11px] outline-none focus:border-sky-500"
              />
            </label>
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-slate-300">CR</span>
                <input
                  type="number"
                  step="0.25"
                  value={newCr}
                  onChange={(e) => setNewCr(e.target.value)}
                  className="h-8 rounded border border-slate-700 bg-slate-900 px-2 text-[11px] outline-none focus:border-sky-500"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-slate-300">HP</span>
                <input
                  type="number"
                  value={newHp}
                  onChange={(e) => setNewHp(e.target.value)}
                  className="h-8 rounded border border-slate-700 bg-slate-900 px-2 text-[11px] outline-none focus:border-sky-500"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-slate-300">AC</span>
                <input
                  type="number"
                  value={newAc}
                  onChange={(e) => setNewAc(e.target.value)}
                  className="h-8 rounded border border-slate-700 bg-slate-900 px-2 text-[11px] outline-none focus:border-sky-500"
                />
              </label>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateMonster}
            className="w-full rounded-md bg-emerald-600 py-1.5 text-[11px] font-semibold hover:bg-emerald-500"
          >
            Save Monster
          </button>
        </div>
      )}

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
            onClick={() => {
              if (onSpawnMonster) {
                onSpawnMonster({ id: monster.id, name: monster.name })
              } else {
                console.log('Spawn monster pressed:', monster.name)
              }
            }}
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
                  CR {monster.cr}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                {monster.size && monster.type && (
                  <>
                    <span>
                      {monster.size} {monster.type}
                    </span>
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
    </div>
  )
}
