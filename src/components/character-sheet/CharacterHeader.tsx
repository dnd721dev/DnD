import { useState } from 'react'
import type { CharacterSheetData } from './types'
import type { DerivedStats } from './calc'
import { getAllClasses, isMulticlassed } from '@/lib/multiclass'

function HpPill({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  const barColor =
    pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="flex flex-col gap-0.5 min-w-[80px]">
      <div className="flex items-baseline justify-between gap-1 text-[10px] text-slate-400">
        <span className="uppercase tracking-wide">HP</span>
        <span className="tabular-nums text-slate-200">
          {current}/{max}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-700/60">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function CharacterHeader({
  c,
  d,
  onRename,
  onDelete,
}: {
  c: CharacterSheetData
  d: DerivedStats
  onRename?: (newName: string) => void
  onDelete?: () => void
}) {
  const name = (c.name ?? 'Unnamed Character').toString()
  const subclassLabel = (c.subclass ?? '').toString()

  // Inline rename state
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  function startEdit() {
    setDraft(name)
    setEditing(true)
  }

  function save() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) {
      onRename?.(trimmed)
    }
    setEditing(false)
  }

  function cancel() {
    setDraft(name)
    setEditing(false)
  }

  return (
    <header className="flex flex-col gap-4 rounded-xl border border-indigo-900/40 bg-gradient-to-r from-indigo-950/40 via-slate-950 to-slate-950 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        {c.avatar_url ? (
          <img
            src={String(c.avatar_url)}
            alt={name}
            className="h-24 w-24 rounded-xl object-cover shadow-lg ring-2 ring-indigo-500/50 shadow-[0_0_18px_rgba(99,102,241,0.3)]"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-800 text-xs text-slate-500 ring-2 ring-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]">
            No NFT
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {/* Inline rename — click the pencil to edit */}
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); save() }
                  if (e.key === 'Escape') { e.preventDefault(); cancel() }
                }}
                className="text-2xl font-bold tracking-tight text-white leading-tight bg-transparent border-b border-indigo-400 outline-none w-full max-w-xs"
              />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-white leading-tight">{name}</h1>
            )}
            {!editing && onRename && (
              <button
                onClick={startEdit}
                title="Rename character"
                className="shrink-0 text-slate-500 hover:text-indigo-300 transition-colors"
              >
                {/* pencil icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
              </button>
            )}
            {!editing && onDelete && (
              <button
                onClick={onDelete}
                title="Delete character"
                className="shrink-0 text-slate-600 hover:text-red-400 transition-colors"
              >
                {/* trash icon */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          <p className="text-sm text-slate-300">
            {c.race ?? 'Unknown Race'}
            {/* Wave 6: render every class entry with its level so multiclass
                characters show e.g. "Human • Cleric 5 / Wizard 1" */}
            {isMulticlassed(c)
              ? ' • ' + getAllClasses(c).map(e =>
                  `${e.classKey.charAt(0).toUpperCase()}${e.classKey.slice(1)} ${e.level}`,
                ).join(' / ')
              : (
                <>
                  {c.main_job ? ` • ${c.main_job}` : ''}
                  {subclassLabel ? ` (${subclassLabel})` : ''}
                </>
              )}
          </p>

          {/* Stat pills row */}
          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {/* Level — gold/amber D&D flavor */}
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/40">
              Lv {d.level}
            </span>

            {/* AC shield badge — indigo brand */}
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-900/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-200 ring-1 ring-indigo-700/50">
              <svg viewBox="0 0 14 16" fill="none" className="h-3 w-3 shrink-0">
                <path
                  d="M7 1L1.5 3v5.5c0 3.5 2.5 6.5 5.5 7.5 3-1 5.5-4 5.5-7.5V3L7 1z"
                  fill="rgba(99,102,241,0.3)"
                  stroke="rgba(165,180,252,0.7)"
                  strokeWidth="1"
                />
              </svg>
              AC {d.ac}
            </span>

            {/* HP bar pill */}
            <div className="rounded-md bg-slate-800/80 px-2 py-0.5 ring-1 ring-slate-700">
              <HpPill current={d.hpCurrent} max={d.hpMax} />
            </div>
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500 space-y-1">
        <div><span className="text-slate-400">Alignment:</span> {c.alignment ?? '—'}</div>
        <div><span className="text-slate-400">Background:</span> {c.background ?? '—'}</div>
        <div className="font-mono text-[10px] truncate max-w-[200px] bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700 text-indigo-300">
          {c.wallet_address ?? '—'}
        </div>
      </div>
    </header>
  )
}
