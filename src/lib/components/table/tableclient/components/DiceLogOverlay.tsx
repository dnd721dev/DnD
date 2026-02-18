'use client'

import type { DiceEntry } from '../types'

export function DiceLogOverlay(props: {
  show: boolean
  diceLog: DiceEntry[]
  onTestRoll: () => void
  onClose: () => void
}) {
  const { show, diceLog, onTestRoll, onClose } = props

  if (!show) return null

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex items-stretch justify-end p-4">
      <div className="pointer-events-auto h-full w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-100">Dice Log</h2>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">Synced (Session)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTestRoll}
              className="rounded-md bg-sky-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-500"
            >
              Roll d20
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>

        <div className="h-full overflow-y-auto px-3 py-2 text-[11px]">
          {diceLog.length === 0 && (
            <p className="text-[11px] text-slate-500">
              No rolls yet for this session. Use quick rolls or the &quot;Roll d20&quot; button to add a roll.
            </p>
          )}

          {diceLog.map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between border-b border-slate-800/60 py-1 last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="font-medium text-slate-100">{entry.roller}</span>
                <span className="text-[10px] text-slate-400">
                  {entry.label} · {entry.formula}
                  {entry.outcome ? (
                    <> · <span className="font-semibold text-slate-200">{entry.outcome}</span></>
                  ) : null}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-sky-300">{entry.result}</span>
                <div className="text-[10px] text-slate-500">{entry.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
