'use client'

import type { ExternalRoll } from '../types'

export function GMQuickRolls(props: { onRoll: (roll: ExternalRoll) => void }) {
  const { onRoll } = props

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">GM Quick Rolls</h2>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">Tools</span>
      </div>

      <p className="text-[11px] text-slate-400">Fire off common GM rolls directly into the session dice log.</p>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => {
            const result = Math.floor(Math.random() * 20) + 1
            onRoll({ label: 'GM: Flat d20', formula: '1d20', result })
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-sky-500"
        >
          Flat d20
        </button>

        <button
          type="button"
          onClick={() => {
            const result = Math.floor(Math.random() * 20) + 1
            onRoll({ label: 'GM: Group Perception', formula: '1d20', result })
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-emerald-500"
        >
          Group Perception
        </button>

        <button
          type="button"
          onClick={() => {
            const result = Math.floor(Math.random() * 20) + 1
            onRoll({ label: 'GM: Group Stealth', formula: '1d20', result })
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-emerald-500"
        >
          Group Stealth
        </button>

        <button
          type="button"
          onClick={() => {
            const result = Math.floor(Math.random() * 20) + 1
            onRoll({ label: 'GM: Group CON Save', formula: '1d20', result })
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-rose-500"
        >
          Group CON Save
        </button>

        <button
          type="button"
          onClick={() => {
            const result = Math.floor(Math.random() * 20) + 1
            onRoll({ label: 'GM: Random Encounter Check', formula: '1d20 (high = encounter)', result })
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-amber-500"
        >
          Encounter Check
        </button>
      </div>

      <p className="text-[10px] text-slate-500">
        These rolls are GM helpers and don&apos;t depend on any specific character.
      </p>
    </div>
  )
}
