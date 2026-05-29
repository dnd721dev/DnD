'use client'

import { useMemo, useState } from 'react'
import { CONDITIONS, type ConditionKey } from '@/lib/conditions'

// ──────────────────────────────────────────────────────────────────────────────
// One player party card. Mirrors the spec from the plan: avatar, name +
// class/level, HP bar, AC shield, conditions row, quick HP/condition actions.
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
}: PartyCardProps) {
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

  return (
    <article className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-3 shadow-sm transition hover:border-indigo-500/40">
      {/* Top row — avatar + name (clickable) */}
      <button
        type="button"
        onClick={openSheet}
        className="flex w-full items-start gap-3 text-left"
        title="Open character sheet in new tab"
      >
        {data.avatarUrl ? (
          <img
            src={data.avatarUrl}
            alt={data.name}
            className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-indigo-500/40 group-hover:ring-indigo-400"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[10px] uppercase text-slate-500 ring-1 ring-slate-700">
            No NFT
          </div>
        )}
        <div className="flex flex-1 flex-col gap-0.5">
          <h3 className="text-sm font-bold text-white leading-tight hover:text-indigo-300">{data.name}</h3>
          <p className="text-[11px] text-slate-400">
            {(data.className ?? '—')} • Lv {data.level}
          </p>
          {data.concentratingOn && (
            <p className="text-[10px] text-violet-300">✦ Conc: {data.concentratingOn}</p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-indigo-900/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-200 ring-1 ring-indigo-700/50">
          🛡 AC {data.ac}
        </span>
      </button>

      {/* HP bar */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[10px] text-slate-400">
          <span className="uppercase tracking-wide">HP</span>
          <span className="tabular-nums text-slate-200">
            {data.hpCurrent}/{data.hpMax}
            {data.tempHp > 0 && <span className="ml-1 text-cyan-300">(+{data.tempHp})</span>}
          </span>
        </div>
        <div className="mt-0.5 h-2 w-full rounded-full bg-slate-800">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${hpColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* HP quick actions */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button onClick={() => onAdjustHp(-5)} className="rounded-md bg-red-950/50 px-2 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-800/50 hover:bg-red-900/60">−5</button>
        <button onClick={() => onAdjustHp(-1)} className="rounded-md bg-red-950/50 px-2 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-800/50 hover:bg-red-900/60">−1</button>
        <button onClick={() => onAdjustHp(+1)} className="rounded-md bg-emerald-950/50 px-2 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-800/50 hover:bg-emerald-900/60">+1</button>
        <button onClick={() => onAdjustHp(+5)} className="rounded-md bg-emerald-950/50 px-2 py-1 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-800/50 hover:bg-emerald-900/60">+5</button>
        <button
          onClick={() => setCustomOpen((v) => !v)}
          className="rounded-md bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
        >
          Custom
        </button>
        <button
          onClick={() => onSetHp(data.hpMax)}
          title="Restore to full HP"
          className="rounded-md bg-sky-950/50 px-2 py-1 text-[11px] font-semibold text-sky-300 ring-1 ring-sky-800/50 hover:bg-sky-900/60"
        >
          Heal Full
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
            className="w-20 rounded-md bg-slate-800 px-2 py-1 text-[11px] text-white ring-1 ring-slate-700 focus:ring-indigo-500 outline-none"
          />
          <button onClick={() => submitCustom(-1)} className="rounded-md bg-red-900/60 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-800">− Damage</button>
          <button onClick={() => submitCustom(+1)} className="rounded-md bg-emerald-900/60 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-800">+ Heal</button>
        </div>
      )}

      {/* Conditions */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[10px] text-slate-400">
          <span className="uppercase tracking-wide">Conditions</span>
          <button
            onClick={() => setAddOpen((v) => !v)}
            className="text-indigo-300 hover:text-indigo-200"
          >
            {addOpen ? '× Close' : '+ Add'}
          </button>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {conditionEntries.length === 0 && !addOpen && (
            <span className="text-[10px] italic text-slate-500">none</span>
          )}
          {conditionEntries.map((c) => (
            <span
              key={String(c.key)}
              className="inline-flex items-center gap-1 rounded-md bg-rose-900/40 px-2 py-0.5 text-[10px] font-semibold text-rose-200 ring-1 ring-rose-700/50"
            >
              {c.name}
              <button
                onClick={() => onRemoveCondition(String(c.key))}
                title="Remove"
                className="text-rose-300 hover:text-white"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
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
    </article>
  )
}
