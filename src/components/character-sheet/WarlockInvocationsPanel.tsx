'use client'

// src/components/character-sheet/WarlockInvocationsPanel.tsx
// Polish 3 — Read-only display of a Warlock's selected Eldritch Invocations.
// Selection happens at character creation (step4); this panel just lists
// the picked invocations with their rules text so the player can reference
// them mid-session without leaving the sheet.

import type { CharacterSheetData } from './types'
import { INVOCATIONS, getInvocationCount } from '@/lib/invocations'

export function WarlockInvocationsPanel({ c }: { c: CharacterSheetData }) {
  const isWarlock = String(c.main_job ?? '').toLowerCase().trim() === 'warlock'
  if (!isWarlock) return null

  const picks = ((c as any).warlock_invocations ?? []) as string[]
  const level = Number(c.level ?? 1)
  const budget = getInvocationCount(level)

  if (picks.length === 0 && budget === 0) return null

  const invMap = new Map(INVOCATIONS.map(i => [i.key, i]))
  const picked = picks.map(k => invMap.get(k as any)).filter(Boolean) as typeof INVOCATIONS

  return (
    <section className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-purple-200">
          Eldritch Invocations
        </h3>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] ${
            picked.length === budget
              ? 'bg-purple-900/40 text-purple-300'
              : picked.length < budget
                ? 'bg-amber-900/40 text-amber-300'
                : 'bg-rose-900/40 text-rose-300'
          }`}
          title={picked.length > budget ? 'Over the invocation budget for this level' : undefined}
        >
          {picked.length}/{budget}
        </span>
      </div>

      {picked.length === 0 ? (
        <p className="text-[11px] text-slate-500 italic">
          No invocations selected. You can pick {budget} at character level {level} (set during creation).
        </p>
      ) : (
        <div className="space-y-1.5">
          {picked.map(inv => (
            <div key={inv.key} className="rounded-md border border-purple-900/30 bg-slate-900/70 px-2.5 py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-purple-100">{inv.name}</span>
                <span className="text-[9px] text-purple-400/70">L{inv.minLevel}</span>
              </div>
              {inv.prereq && (
                <div className="text-[10px] text-amber-400/80 mt-0.5">Requires: {inv.prereq}</div>
              )}
              <div className="text-[11px] text-slate-300 mt-0.5">{inv.summary}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
