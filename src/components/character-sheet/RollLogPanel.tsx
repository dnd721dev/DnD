import type { RollEntry } from './types'

export function RollLogPanel({ rollLog }: { rollLog: RollEntry[] }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Recent Rolls
      </h2>

      {rollLog.length === 0 && (
        <p className="text-[11px] text-slate-500">
          Click an ability score or save to roll.
        </p>
      )}

      <div className="space-y-1">
        {rollLog.map((r, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-md bg-slate-900/80 px-2 py-1"
          >
            <div>
              <div className="text-[11px] font-semibold text-slate-100">{r.label}</div>
              <div className="text-[10px] text-slate-400">{r.formula}</div>
            </div>
            <div className="text-lg font-bold text-emerald-400">{r.result}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
