'use client'

import { useMemo, useState } from 'react'
import { CONDITIONS, type ConditionKey } from '@/lib/conditions'

// ──────────────────────────────────────────────────────────────────────────────
// One player party card — compact combat card for the DM dashboard sidebar.
// Collapsed (~80px): portrait · name/class · AC, plus the HP bar. Expanding
// reveals HP controls, conditions, and (at 0 HP) death saves. Death saves stay
// visible even when collapsed — a dying PC needs attention.
// Click on the name/avatar area opens the character sheet in a new tab.
// ──────────────────────────────────────────────────────────────────────────────

export type PartyCardData = {
  characterId: string
  name: string
  avatarUrl: string | null
  className: string | null          // main_job + secondary if multiclassed (caller pre-formats)
  level: number
  hpCurrent: number                 // live (token-aware) HP
  hpMax: number
  tempHp: number
  ac: number
  conditions: string[]              // raw strings from action_state.active_conditions
  concentratingOn: string | null
  /** Death-save state {s,f} from action_state.death_saves (null when not dying). */
  deathSaves: { s: number; f: number } | null
  /** True when an encounter is active and a token exists for this character.
   *  Drives whether HP buttons write to tokens.current_hp or characters.hit_points_current. */
  hasLiveToken: boolean
}

type PartyCardProps = {
  data: PartyCardData
  onAdjustHp: (delta: number) => Promise<void> | void
  onSetHp:    (next: number)  => Promise<void> | void
  onAddCondition:    (key: ConditionKey) => Promise<void> | void
  onRemoveCondition: (key: string)       => Promise<void> | void
  onAdjustDeathSave?: (kind: 's' | 'f', delta: number) => Promise<void> | void
}

function hpColor(pct: number) {
  if (pct >= 60) return 'bg-emerald-500'
  if (pct >= 30) return 'bg-amber-400'
  return 'bg-red-500'
}

export function PartyCard({
  data,
  onAdjustHp,
  onSetHp,
  onAddCondition,
  onRemoveCondition,
  onAdjustDeathSave,
}: PartyCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customDelta, setCustomDelta] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const pct = useMemo(() => {
    const max = Math.max(1, data.hpMax)
    return Math.round(Math.max(0, Math.min(100, (data.hpCurrent / max) * 100)))
  }, [data.hpCurrent, data.hpMax])

  // Conditions are stored as lowercase strings — map back to the catalog.
  const conditionEntries = useMemo(() => {
    return data.conditions
      .map((raw) => {
        const k = String(raw ?? '').toLowerCase() as ConditionKey
        return CONDITIONS[k] ? { key: k, name: CONDITIONS[k].name } : { key: raw, name: raw }
      })
  }, [data.conditions])

  // Available conditions to add (catalog minus the ones already on the card).
  const availableConditions = useMemo(() => {
    const have = new Set(data.conditions.map((c) => String(c).toLowerCase()))
    return (Object.keys(CONDITIONS) as ConditionKey[]).filter((k) => !have.has(k))
  }, [data.conditions])

  function openSheet() {
    window.open(`/characters/${data.characterId}`, '_blank', 'noopener,noreferrer')
  }

  function submitCustom(sign: 1 | -1) {
    const n = parseInt(customDelta.trim(), 10)
    if (!Number.isFinite(n) || n <= 0) return
    void onAdjustHp(sign * n)
    setCustomDelta('')
    setCustomOpen(false)
  }

  const dying = data.hpCurrent === 0 && data.deathSaves && onAdjustDeathSave

  return (
    <article
      className={`rounded-xl border bg-slate-900/70 p-2.5 shadow-sm transition ${
        data.hpCurrent === 0
          ? 'border-red-800/70'
          : 'border-slate-700/60 hover:border-amber-500/40'
      }`}
    >
      {/* Header row — portrait · name/class · AC · expand */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={openSheet}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          title="Open character sheet in new tab"
        >
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-amber-600/40"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[8px] uppercase text-slate-500 ring-1 ring-slate-700">
              No NFT
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-bold text-white hover:text-amber-300" title={data.name}>
              {data.name}
            </h3>
            <p className="truncate text-[11px] text-slate-400">
              {(data.className ?? '—')} · Lv {data.level}
              {data.concentratingOn && (
                <span className="ml-1.5 text-violet-300" title={`Concentrating on ${data.concentratingOn}`}>
                  ✦ {data.concentratingOn}
                </span>
              )}
            </p>
          </div>
        </button>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[11px] font-semibold text-amber-200 ring-1 ring-amber-700/40">
          🛡 {data.ac}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse card' : 'Expand card for HP controls and conditions'}
          title={expanded ? 'Collapse' : 'HP controls & conditions'}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
        >
          <span className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </button>
      </div>

      {/* HP — always visible */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between text-[10px] text-slate-400">
          <span className="uppercase tracking-wide">HP</span>
          <span className="tabular-nums text-slate-200">
            {data.hpCurrent}/{data.hpMax}
            {data.tempHp > 0 && <span className="ml-1 text-cyan-300">(+{data.tempHp})</span>}
          </span>
        </div>
        <div className="mt-0.5 h-1.5 w-full rounded-full bg-slate-800">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${hpColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Death saves — surfaced even collapsed; a dying PC needs attention. */}
      {dying && (
        <div className="mt-2 rounded-lg border border-red-900/40 bg-red-950/20 p-2">
          <div className="flex items-baseline justify-between text-[10px] text-red-300/80">
            <span className="uppercase tracking-wide">💀 Death Saves</span>
            <span className="tabular-nums">{data.deathSaves!.s}/3 · {data.deathSaves!.f}/3</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-emerald-400/80">Success</span>
              {[1, 2, 3].map((i) => (
                <button
                  key={`s${i}`}
                  type="button"
                  onClick={() => onAdjustDeathSave!('s', i <= data.deathSaves!.s ? -1 : 1)}
                  className={`h-3.5 w-3.5 rounded-full border transition ${i <= data.deathSaves!.s ? 'border-emerald-500 bg-emerald-500/80' : 'border-emerald-700/50 bg-transparent hover:bg-emerald-900/40'}`}
                  title={`Success ${i}`}
                  aria-label={`Death save success ${i}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-red-400/80">Failure</span>
              {[1, 2, 3].map((i) => (
                <button
                  key={`f${i}`}
                  type="button"
                  onClick={() => onAdjustDeathSave!('f', i <= data.deathSaves!.f ? -1 : 1)}
                  className={`h-3.5 w-3.5 rounded-full border transition ${i <= data.deathSaves!.f ? 'border-red-500 bg-red-500/80' : 'border-red-700/50 bg-transparent hover:bg-red-900/40'}`}
                  title={`Failure ${i}`}
                  aria-label={`Death save failure ${i}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Condition chips — visible collapsed so states are never hidden. */}
      {conditionEntries.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {conditionEntries.map((c) => (
            <span
              key={String(c.key)}
              className="inline-flex items-center gap-1 rounded-md bg-rose-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-rose-200 ring-1 ring-rose-700/50"
            >
              {c.name}
              <button
                onClick={() => onRemoveCondition(String(c.key))}
                title={`Remove ${c.name}`}
                aria-label={`Remove ${c.name}`}
                className="text-rose-300 hover:text-white"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Expanded — HP controls + condition management */}
      {expanded && (
        <>
          <div className="mt-2 flex flex-wrap gap-1">
            <button onClick={() => onAdjustHp(-5)} className="min-w-[2.25rem] rounded-md bg-red-950/50 px-2 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-800/50 hover:bg-red-900/60">−5</button>
            <button onClick={() => onAdjustHp(-1)} className="min-w-[2.25rem] rounded-md bg-red-950/50 px-2 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-800/50 hover:bg-red-900/60">−1</button>
            <button onClick={() => onAdjustHp(+1)} className="min-w-[2.25rem] rounded-md bg-emerald-950/50 px-2 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-800/50 hover:bg-emerald-900/60">+1</button>
            <button onClick={() => onAdjustHp(+5)} className="min-w-[2.25rem] rounded-md bg-emerald-950/50 px-2 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-800/50 hover:bg-emerald-900/60">+5</button>
            <button
              onClick={() => setCustomOpen((v) => !v)}
              className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
            >
              Custom
            </button>
            <button
              onClick={() => onSetHp(data.hpMax)}
              title="Restore to full HP"
              aria-label="Restore to full HP"
              className="rounded-md bg-sky-950/50 px-2 py-1 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-800/50 hover:bg-sky-900/60"
            >
              ✚ Full
            </button>
          </div>

          {customOpen && (
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="number"
                autoFocus
                value={customDelta}
                onChange={(e) => setCustomDelta(e.target.value)}
                placeholder="amount"
                className="w-20 rounded-md bg-slate-800 px-2 py-1 text-[11px] text-white ring-1 ring-slate-700 focus:ring-amber-500 outline-none"
              />
              <button onClick={() => submitCustom(-1)} className="rounded-md bg-red-900/60 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-800">− Damage</button>
              <button onClick={() => submitCustom(+1)} className="rounded-md bg-emerald-900/60 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-800">+ Heal</button>
            </div>
          )}

          <div className="mt-2">
            <div className="flex items-baseline justify-between text-[10px] text-slate-400">
              <span className="uppercase tracking-wide">Conditions</span>
              <button
                onClick={() => setAddOpen((v) => !v)}
                className="text-amber-300 hover:text-amber-200"
              >
                {addOpen ? '× Close' : '+ Add condition'}
              </button>
            </div>
            {conditionEntries.length === 0 && !addOpen && (
              <p className="mt-0.5 text-[10px] italic text-slate-500">No conditions</p>
            )}
            {addOpen && availableConditions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {availableConditions.map((k) => (
                  <button
                    key={k}
                    onClick={() => { void onAddCondition(k); setAddOpen(false) }}
                    className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700 hover:text-white"
                  >
                    {CONDITIONS[k].name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </article>
  )
}
