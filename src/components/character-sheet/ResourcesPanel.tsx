'use client'

import type { DerivedResource, RechargeType } from '@/lib/applySubclassEffects'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function ResourcesPanel(props: {
  resources: DerivedResource[]
  values: Record<string, number>
  onChange: (key: string, next: number) => void
  onShortRest: () => void
  onLongRest: () => void
}) {
  const { resources, values, onChange, onShortRest, onLongRest } = props

  if (!resources?.length) return null

  function labelRecharge(r: RechargeType) {
    if (r === 'short_rest') return 'Short Rest'
    if (r === 'long_rest') return 'Long Rest'
    if (r === 'dawn') return 'Dawn'
    return 'Special'
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-100">Resources</div>
          <div className="text-xs text-slate-400">Track class/subclass uses and reset on rests.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShortRest}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-100 hover:bg-slate-800"
          >
            Short Rest
          </button>
          <button
            type="button"
            onClick={onLongRest}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-100 hover:bg-slate-800"
          >
            Long Rest
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {resources.map((r) => {
          const current = clamp(values[r.key] ?? r.current ?? r.max, 0, r.max)

          return (
            <div key={r.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-sm font-medium text-slate-100">{r.name}</div>
                  {r.die ? (
                    <span className="rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-300">
                      {r.die}
                    </span>
                  ) : null}
                  <span className="rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400">
                    {labelRecharge(r.recharge)}
                  </span>
                </div>
                {r.note ? <div className="mt-0.5 text-xs text-slate-400">{r.note}</div> : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange(r.key, clamp(current - 1, 0, r.max))}
                  className="h-8 w-8 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 hover:bg-slate-800"
                  aria-label={`Decrease ${r.name}`}
                >
                  –
                </button>

                <div className="w-12 text-center text-sm font-semibold text-slate-100">
                  {current}/{r.max}
                </div>

                <button
                  type="button"
                  onClick={() => onChange(r.key, clamp(current + 1, 0, r.max))}
                  className="h-8 w-8 rounded-lg border border-slate-800 bg-slate-950 text-slate-100 hover:bg-slate-800"
                  aria-label={`Increase ${r.name}`}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
