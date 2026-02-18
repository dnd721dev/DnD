'use client'

import { useEffect, useMemo, useState } from 'react'

export type RollOverlayPayload = {
  roller: string
  label: string
  formula: string
  result: number
  outcomeText?: string | null
}

function pickDie(formula: string): string {
  // choose the largest die mentioned in the formula (d20, d12, d10, d8, d6, d4, etc.)
  const matches = String(formula ?? '').match(/d(\d+)/gi) || []
  let best = 0
  for (const m of matches) {
    const n = parseInt(m.slice(1), 10)
    if (Number.isFinite(n) && n > best) best = n
  }
  return best > 0 ? `d${best}` : 'd20'
}

export function DiceRollOverlay(props: { roll?: RollOverlayPayload | null; show?: boolean; payload?: RollOverlayPayload | null }) {
  const enabled = props.show ?? true
  const roll = enabled ? (props.roll ?? props.payload ?? null) : null
  const [visible, setVisible] = useState(false)

  const die = useMemo(() => (roll ? pickDie(roll.formula) : 'd20'), [roll])

  useEffect(() => {
    if (!roll) {
      setVisible(false)
      return
    }
    setVisible(true)
    const t = window.setTimeout(() => setVisible(false), 1400)
    return () => window.clearTimeout(t)
  }, [roll])

  if (!roll || !visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1020]/90 p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center">
            <div className="text-lg font-semibold animate-spin">{die}</div>
          </div>
          <div className="min-w-0">
            <div className="text-sm text-white/70 truncate">{roll.roller}</div>
            <div className="text-base font-semibold truncate">{roll.label}</div>
            <div className="text-xs text-white/60 truncate">{roll.formula}</div>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div className="text-4xl font-extrabold tracking-tight animate-bounce">{roll.result}</div>
          {roll.outcomeText ? (
            <div className="text-sm font-semibold rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-white/90">
              {roll.outcomeText}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
