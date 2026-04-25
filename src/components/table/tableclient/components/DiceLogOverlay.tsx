'use client'

import { useState } from 'react'
import { CoinFlip } from '@/components/dice/CoinFlip'
import type { DiceEntry } from '../types'

export function DiceLogOverlay(props: {
  show: boolean
  diceLog: DiceEntry[]
  onTestRoll: () => void
  onClose: () => void
  sessionId?: string
  rollerName?: string
  rollerWallet?: string
  onRollEntry?: (entry: DiceEntry) => void
}) {
  const { show, diceLog, onTestRoll, onClose, sessionId, rollerName, rollerWallet, onRollEntry } = props
  const [coinResult, setCoinResult] = useState<'heads' | 'tails' | null>(null)
  const [coinFlipping, setCoinFlipping] = useState(false)

  if (!show) return null

  async function handleCoinFlip() {
    if (coinFlipping || !sessionId) return
    setCoinFlipping(true)
    setCoinResult(null)

    try {
      const res = await fetch('/api/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notation: '1d2',
          sessionId,
          rollType: 'coin_flip',
          label: 'Coin Flip',
          rollerName: rollerName ?? 'Adventurer',
          rollerWallet: rollerWallet,
        }),
      })

      const json = await res.json()
      if (!res.ok) { console.error('coin flip failed', json); return }

      const result: 'heads' | 'tails' = json.outcome?.toLowerCase() === 'heads' ? 'heads' : 'tails'
      setCoinResult(result)

      // Push to dice log
      if (json.rollId && onRollEntry) {
        const entry: DiceEntry = {
          id: json.rollId,
          roller: rollerName ?? 'Adventurer',
          label: 'Coin Flip',
          formula: '1d2',
          result: json.total,
          timestamp: new Date().toLocaleTimeString(),
          outcome: json.outcome ?? null,
        }
        onRollEntry(entry)
      }
    } catch (e) {
      console.error('coin flip error', e)
    } finally {
      // Allow another flip after animation completes (4.3 s)
      setTimeout(() => setCoinFlipping(false), 4400)
    }
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex items-stretch justify-end p-4">
      <div className="pointer-events-auto h-full w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-100">Dice Log</h2>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
              Synced (Session)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CoinFlip
              onFlipRequest={handleCoinFlip}
              serverResult={coinResult}
              rollerName={rollerName}
              disabled={coinFlipping || !sessionId}
            />
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

          {diceLog.map((entry) => {
            const isCoin = entry.label === 'Coin Flip'
            const isHeads = isCoin && (entry.result === 1 || entry.outcome?.toLowerCase() === 'heads')
            const isCrit = entry.outcome === 'crit'
            const isFumble = entry.outcome === 'crit_miss'
            const isSheet = entry.roll_type === 'sheet'

            // Parse modifier from formula (e.g. "2d6+3" → "+3", "1d20-1" → "-1")
            const modMatch = entry.formula.match(/([+-]\d+)$/)
            const modDisplay = modMatch ? modMatch[1] : null

            return (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-2 border-b border-slate-800/60 py-1.5 last:border-b-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium text-slate-100">{entry.roller}</span>
                  <span className="text-[10px] text-slate-400">
                    {entry.label} · {entry.formula}
                  </span>
                  {isSheet && (
                    <span className="text-[9px] text-indigo-400/80">📋 Character Sheet</span>
                  )}
                  {/* Individual dice breakdown */}
                  {!isCoin && entry.individual_dice && entry.individual_dice.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      {entry.individual_dice.map((d, i) => {
                        const sides = parseInt(d.die.replace('d', ''), 10)
                        const isMax = d.value === sides
                        const isMin = d.value === 1
                        return (
                          <span
                            key={i}
                            title={`${d.die}: ${d.value}${d.dropped ? ' (dropped)' : ''}`}
                            className={`rounded px-1 py-0.5 font-mono text-[9px] font-semibold transition ${
                              d.dropped
                                ? 'bg-slate-800/40 text-slate-600 line-through'
                                : isMax
                                ? 'bg-amber-800/70 text-amber-200'
                                : isMin
                                ? 'bg-red-900/70 text-red-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {d.value}
                          </span>
                        )
                      })}
                      {modDisplay && modDisplay !== '+0' && modDisplay !== '-0' && (
                        <span className="text-[9px] text-slate-400">{modDisplay}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {isCoin ? (
                    <span className={`text-sm font-bold ${isHeads ? 'text-amber-300' : 'text-violet-300'}`}>
                      {isHeads ? '⚔ Heads' : '🛡 Tails'}
                    </span>
                  ) : (
                    <span
                      className={`text-sm font-bold ${
                        isCrit ? 'text-amber-300' : isFumble ? 'text-red-400' : 'text-sky-300'
                      }`}
                    >
                      {entry.result}
                      {isCrit && ' ✨'}
                      {isFumble && ' 💀'}
                    </span>
                  )}
                  {entry.outcome && !isCoin && !isCrit && !isFumble && (
                    <div className="text-[10px] font-semibold text-emerald-400">{entry.outcome}</div>
                  )}
                  {isCrit && (
                    <div className="text-[10px] font-semibold text-amber-400">CRITICAL</div>
                  )}
                  {isFumble && (
                    <div className="text-[10px] font-semibold text-red-400">FUMBLE</div>
                  )}
                  <div className="text-[10px] text-slate-500">{entry.timestamp}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
