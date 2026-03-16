'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SRD_SPELLS, type SrdSpell } from '@/lib/srdspells'
import { MONSTERS, type Monster } from '@/lib/monsters'

type ResultItem =
  | { kind: 'spell'; data: SrdSpell }
  | { kind: 'monster'; data: Monster }

function scoreMatch(name: string, q: string): number {
  const n = name.toLowerCase()
  const query = q.toLowerCase()
  if (n === query) return 3
  if (n.startsWith(query)) return 2
  if (n.includes(query)) return 1
  return 0
}

function search(q: string): ResultItem[] {
  if (!q.trim()) return []
  const query = q.trim()

  const spellResults: ResultItem[] = SRD_SPELLS
    .filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => scoreMatch(b.name, query) - scoreMatch(a.name, query))
    .slice(0, 8)
    .map(s => ({ kind: 'spell', data: s }))

  const monsterResults: ResultItem[] = MONSTERS
    .filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => scoreMatch(b.name, query) - scoreMatch(a.name, query))
    .slice(0, 8)
    .map(m => ({ kind: 'monster', data: m }))

  return [...spellResults, ...monsterResults].slice(0, 12)
}

function abilityMod(score: number) {
  return Math.floor((score - 10) / 2)
}
function fmtMod(n: number) {
  return n >= 0 ? `+${n}` : `${n}`
}

function SpellCard({ spell }: { spell: SrdSpell }) {
  const levelLabel = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`
  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[10px] rounded bg-violet-900/60 px-1.5 py-0.5 text-violet-300 font-semibold">
          {levelLabel} · {spell.school}
        </span>
        {spell.classes && spell.classes.length > 0 && (
          <span className="text-[10px] text-slate-500">
            {spell.classes.join(', ')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
        <div><span className="text-slate-500">Cast time</span> {spell.castingTime}</div>
        <div><span className="text-slate-500">Range</span> {spell.range}</div>
        <div><span className="text-slate-500">Components</span> {spell.components}</div>
        <div><span className="text-slate-500">Duration</span> {spell.duration}</div>
        {spell.damage && (
          <div><span className="text-slate-500">Damage</span> <span className="font-mono text-amber-300">{spell.damage}</span></div>
        )}
        {spell.saveAbility && (
          <div><span className="text-slate-500">Save</span> {spell.saveAbility.toUpperCase()}</div>
        )}
        {spell.attackRoll && (
          <div className="col-span-2 text-slate-400">Requires attack roll</div>
        )}
      </div>

      {spell.notes && (
        <p className="text-slate-400 text-[11px] leading-relaxed">{spell.notes}</p>
      )}
    </div>
  )
}

function MonsterCard({ monster }: { monster: Monster }) {
  const crLabel = monster.cr < 1 ? (monster.cr === 0.125 ? '1/8' : monster.cr === 0.25 ? '1/4' : '1/2') : String(monster.cr)
  const abs = monster.abilities
  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[10px] rounded bg-red-900/60 px-1.5 py-0.5 text-red-300 font-semibold">
          CR {crLabel} · {monster.size} {monster.type}
        </span>
        <span className="text-[10px] text-slate-500">{monster.alignment}</span>
      </div>

      <div className="flex gap-3 text-slate-300">
        <div><span className="text-slate-500">AC</span> {monster.armorClass}</div>
        <div><span className="text-slate-500">HP</span> {monster.hitPoints} <span className="text-slate-500">({monster.hitDice})</span></div>
        <div><span className="text-slate-500">Speed</span> {monster.speed}</div>
      </div>

      <div className="grid grid-cols-6 gap-1 text-center">
        {(['str','dex','con','int','wis','cha'] as const).map(k => (
          <div key={k} className="rounded bg-slate-800 px-1 py-0.5">
            <div className="text-[9px] text-slate-500 uppercase">{k}</div>
            <div className="font-semibold text-slate-100">{abs[k]}</div>
            <div className="text-[10px] text-slate-400">{fmtMod(abilityMod(abs[k]))}</div>
          </div>
        ))}
      </div>

      {monster.actions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Actions</p>
          <ul className="space-y-1">
            {monster.actions.slice(0, 3).map((a, i) => (
              <li key={i} className="text-slate-300">
                <span className="font-semibold">{a.name}.</span>{' '}
                {a.attackBonus !== undefined && (
                  <span className="text-amber-300 font-mono">{fmtMod(a.attackBonus)} to hit · </span>
                )}
                {a.damage && (
                  <span className="font-mono text-amber-300">{a.damage} </span>
                )}
                <span className="text-slate-400 text-[11px]">{a.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface Props {
  open: boolean
  onClose: () => void
}

export function SrdSearchOverlay({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResultItem[]>([])
  const [selected, setSelected] = useState<ResultItem | null>(null)
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelected(null)
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const r = search(query)
    setResults(r)
    setSelected(null)
    setCursor(0)
  }, [query])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && results[cursor]) {
      setSelected(results[cursor])
    }
  }, [results, cursor, onClose])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
          <span className="text-slate-500 text-sm">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search spells, monsters… (Esc to close)"
            className="flex-1 bg-transparent text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex max-h-[60vh] overflow-hidden">
          {/* Results list */}
          <div className={`overflow-y-auto ${selected ? 'w-2/5 border-r border-slate-800' : 'w-full'}`}>
            {results.length === 0 && query.trim() && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No results for "{query}"</p>
            )}
            {results.length === 0 && !query.trim() && (
              <p className="px-4 py-6 text-center text-sm text-slate-600">
                Type to search SRD spells &amp; monsters
              </p>
            )}
            {results.map((item, i) => {
              const isSpell = item.kind === 'spell'
              const name = isSpell ? item.data.name : item.data.name
              const sub = isSpell
                ? `${item.data.level === 0 ? 'Cantrip' : `Lvl ${item.data.level}`} · ${item.data.school}`
                : `CR ${(item.data as Monster).cr} · ${(item.data as Monster).type}`
              const isActive = i === cursor
              const isSelected = selected === item

              return (
                <button
                  key={`${item.kind}-${name}`}
                  onClick={() => { setCursor(i); setSelected(item) }}
                  onMouseEnter={() => setCursor(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-slate-700'
                      : isActive
                      ? 'bg-slate-800'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`text-[10px] font-bold w-10 shrink-0 ${isSpell ? 'text-violet-400' : 'text-red-400'}`}>
                    {isSpell ? 'SPELL' : 'MON'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-100 truncate">{name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{sub}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Detail pane */}
          {selected && (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-base font-bold text-slate-50 mb-3">{selected.data.name}</h3>
              {selected.kind === 'spell'
                ? <SpellCard spell={selected.data} />
                : <MonsterCard monster={selected.data as Monster} />
              }
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t border-slate-800 px-4 py-2 text-[10px] text-slate-600">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>Esc close</span>
          <span className="ml-auto">{results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : ''}</span>
        </div>
      </div>
    </div>
  )
}
