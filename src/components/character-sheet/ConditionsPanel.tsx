'use client'

import { useState } from 'react'
import { CONDITION_LIST, getCondition, type ConditionKey } from '@/lib/conditions'

const EXHAUSTION_PENALTIES: Record<number, string> = {
  1: 'Disadvantage on ability checks',
  2: 'Speed halved',
  3: 'Disadvantage on attack rolls & saves',
  4: 'HP maximum halved',
  5: 'Speed = 0',
  6: 'Death',
}

export function ConditionsPanel({
  activeConditions,
  onToggleCondition,
  exhaustionLevel = 0,
  onExhaustionChange,
}: {
  activeConditions: string[]
  onToggleCondition: (key: string) => void
  exhaustionLevel?: number
  onExhaustionChange?: (level: number) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [addValue, setAddValue] = useState<string>(CONDITION_LIST[0]?.key ?? '')

  const activeSet = new Set(activeConditions.map((c) => c.toLowerCase()))

  function addCondition() {
    if (addValue && !activeSet.has(addValue)) {
      onToggleCondition(addValue)
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Conditions
      </h2>

      {/* Active condition badges */}
      <div className="mb-2 flex min-h-[28px] flex-wrap gap-1.5">
        {activeConditions.length === 0 && (
          <span className="text-[11px] text-slate-500 italic">No active conditions</span>
        )}
        {activeConditions.map((key) => {
          const cond = getCondition(key as ConditionKey)
          const label = cond?.name ?? key
          return (
            <div key={key} className="relative">
              <button
                type="button"
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onToggleCondition(key)}
                className="flex items-center gap-1 rounded-full border border-amber-700/50 bg-amber-900/30 px-2 py-0.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-900/50 transition"
              >
                {label}
                <span className="text-[9px] text-amber-400/70">✕</span>
              </button>

              {/* Tooltip */}
              {hovered === key && cond && (
                <div className="absolute bottom-full left-0 z-50 mb-1.5 w-56 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl">
                  <div className="text-[11px] font-semibold text-slate-100">{cond.name}</div>
                  <div className="mt-1 text-[10px] text-slate-400">{cond.summary}</div>
                  {cond.bullets && (
                    <ul className="mt-1 space-y-0.5 list-disc list-inside">
                      {cond.bullets.map((b, i) => (
                        <li key={i} className="text-[10px] text-slate-300">{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Exhaustion level stepper */}
      <div className="mb-2 rounded-lg border border-slate-800 bg-slate-900/50 px-2 py-1.5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-300">Exhaustion</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onExhaustionChange?.(Math.max(0, exhaustionLevel - 1))}
              disabled={exhaustionLevel === 0}
              className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >−</button>
            <span className="min-w-[1.5rem] text-center text-sm font-bold text-slate-100">{exhaustionLevel}</span>
            <button
              type="button"
              onClick={() => onExhaustionChange?.(Math.min(6, exhaustionLevel + 1))}
              disabled={exhaustionLevel === 6}
              className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700 disabled:opacity-40"
            >+</button>
          </div>
        </div>
        {exhaustionLevel > 0 && (
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: exhaustionLevel }, (_, i) => (
              <span
                key={i + 1}
                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                  i + 1 === 6 ? 'bg-red-900/70 text-red-300' : 'bg-orange-900/50 text-orange-300'
                }`}
              >
                {i + 1}: {EXHAUSTION_PENALTIES[i + 1]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Add condition */}
      <div className="flex gap-1.5">
        <select
          value={addValue}
          onChange={(e) => setAddValue(e.target.value)}
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 focus:border-amber-600 focus:outline-none"
        >
          {CONDITION_LIST.map((c) => (
            <option key={c.key} value={c.key} disabled={activeSet.has(c.key)}>
              {c.name}{activeSet.has(c.key) ? ' ✓' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={addCondition}
          disabled={!addValue || activeSet.has(addValue)}
          className="rounded-md bg-amber-600/20 px-3 py-1 text-[11px] text-amber-200 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          + Add
        </button>
      </div>
    </section>
  )
}
