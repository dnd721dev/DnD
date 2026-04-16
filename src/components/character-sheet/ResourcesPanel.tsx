'use client'

import { useState } from 'react'
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
  conMod?: number
  onRoll?: (entry: { label: string; formula: string; result: number }) => void
  currentHp?: number
  maxHp?: number
  onHpChange?: (newHp: number) => void
}) {
  const { resources, values, onChange, onShortRest, onLongRest, conMod = 0, onRoll, currentHp, maxHp, onHpChange } = props

  // Short rest hit dice modal state
  const [shortRestOpen, setShortRestOpen] = useState(false)
  const [diceRolls, setDiceRolls] = useState<number[]>([])

  function labelRecharge(r: RechargeType) {
    if (r === 'short_rest') return 'Short Rest'
    if (r === 'long_rest') return 'Long Rest'
    if (r === 'dawn') return 'Dawn'
    return 'Special'
  }

  const hasResources = Boolean(resources?.length)

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-100">Resources</div>
          <div className="text-xs text-slate-400">
            Track class/subclass uses and reset on rests.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShortRestOpen(true)}
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

      {/* Short rest modal */}
      {shortRestOpen && (() => {
        const hitDieResource = resources.find(r => r.key === 'hit_die')
        const hitDieAvail = hitDieResource
          ? clamp(values[hitDieResource.key] ?? hitDieResource.current ?? hitDieResource.max, 0, hitDieResource.max)
          : 0
        const dieSides = hitDieResource?.die ? parseInt(hitDieResource.die.replace('d', ''), 10) : 0
        const totalHealed = diceRolls.reduce((s, r) => s + r, 0)
        const newHp = maxHp != null && currentHp != null ? Math.min(maxHp, currentHp + totalHealed) : null

        function rollOneDie() {
          if (!dieSides || hitDieAvail - diceRolls.length <= 0) return
          const roll = Math.floor(Math.random() * dieSides) + 1
          const total = Math.max(1, roll + conMod)
          const modStr = conMod >= 0 ? `+${conMod}` : `${conMod}`
          onRoll?.({ label: `Hit Die (${hitDieResource!.die})`, formula: `1${hitDieResource!.die}${modStr}`, result: total })
          setDiceRolls(prev => [...prev, total])
        }

        function confirmRest() {
          // Apply HP healing
          if (newHp != null && onHpChange) onHpChange(newHp)
          // Deduct spent hit dice
          if (hitDieResource && diceRolls.length > 0) {
            onChange(hitDieResource.key, Math.max(0, hitDieAvail - diceRolls.length))
          }
          // Refill short-rest resources
          onShortRest()
          setDiceRolls([])
          setShortRestOpen(false)
        }

        return (
          <div className="mb-3 rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-200">Short Rest — Spend Hit Dice</span>
              <button
                type="button"
                onClick={() => { setDiceRolls([]); setShortRestOpen(false) }}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >✕</button>
            </div>

            {!hitDieResource || hitDieAvail === 0 ? (
              <p className="text-xs text-slate-400 mb-2">No hit dice remaining.</p>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2 text-xs text-slate-300">
                  <span>Available: <strong className="text-slate-100">{hitDieAvail - diceRolls.length}</strong> × {hitDieResource.die}</span>
                  {currentHp != null && maxHp != null && (
                    <span className="text-slate-400">HP: {currentHp}/{maxHp}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={rollOneDie}
                  disabled={hitDieAvail - diceRolls.length <= 0}
                  className="mb-2 rounded-lg border border-emerald-700/60 bg-emerald-900/40 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-800/50 disabled:opacity-40"
                >
                  Roll 1{hitDieResource.die}{conMod >= 0 ? `+${conMod}` : conMod}
                </button>
              </>
            )}

            {diceRolls.length > 0 && (
              <div className="mb-2">
                <div className="mb-1 flex flex-wrap gap-1">
                  {diceRolls.map((r, i) => (
                    <span key={i} className="rounded bg-emerald-900/50 px-2 py-0.5 text-xs font-bold text-emerald-200">+{r}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-300">
                  Total healed: <strong className="text-emerald-300">+{totalHealed}</strong>
                  {newHp != null && currentHp != null && (
                    <> → HP {currentHp} → <strong className="text-emerald-100">{newHp}</strong></>
                  )}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmRest}
                className="flex-1 rounded-lg bg-emerald-700 py-1.5 text-xs font-semibold text-emerald-50 hover:bg-emerald-600"
              >
                Confirm Rest{diceRolls.length > 0 ? ` (+${totalHealed} HP)` : ''}
              </button>
              <button
                type="button"
                onClick={() => setDiceRolls([])}
                disabled={diceRolls.length === 0}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>
        )
      })()}

      {!hasResources ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-2 text-xs text-slate-400">
          No trackable resources at this level (example: Monk Ki starts at level 2).
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => {
            const current = clamp(values[r.key] ?? r.current ?? r.max, 0, r.max)

            return (
              <div
                key={r.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-2"
              >
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
                  {r.key === 'hit_die' && onRoll && r.die && (
                    <button
                      type="button"
                      disabled={current <= 0}
                      onClick={() => {
                        if (current <= 0) return
                        const sides = parseInt(r.die!.replace('d', ''), 10)
                        const dieRoll = Math.floor(Math.random() * sides) + 1
                        const total = Math.max(1, dieRoll + conMod)
                        const modStr = conMod >= 0 ? `+${conMod}` : `${conMod}`
                        const formula = `1${r.die}${modStr}`
                        onRoll({ label: `Hit Die (${r.die})`, formula, result: total })
                        onChange(r.key, clamp(current - 1, 0, r.max))
                      }}
                      className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-2 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Roll
                    </button>
                  )}

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
      )}
    </div>
  )
}
