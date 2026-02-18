'use client'

import { useEffect, useMemo, useState } from 'react'

export type RollOverlayPayload = {
  roller: string
  label: string
  formula: string
  result: number
  detail?: string
  outcome?: string
}

type Props =
  | { roll: RollOverlayPayload | null }
  | { show: boolean; payload: RollOverlayPayload | null }

function pickDie(formula: string) {
  const s = String(formula || '').toLowerCase()
  const matches = [...s.matchAll(/d(\d+)/g)].map((m) => Number(m[1] || 0)).filter(Boolean)
  const max = matches.length ? Math.max(...matches) : 20
  return `d${max}`
}

export default function DiceRollOverlay(props: Props) {
  const roll = 'roll' in props ? props.roll : props.payload
  const show = 'roll' in props ? Boolean(props.roll) : props.show

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show || !roll) {
      setVisible(false)
      return
    }
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 1600)
    return () => clearTimeout(t)
  }, [show, roll?.result, roll?.formula, roll?.label])

  const die = useMemo(() => pickDie(roll?.formula ?? ''), [roll?.formula])

  if (!roll || !visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <div className="rounded-2xl bg-black/80 px-5 py-4 shadow-xl ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-xl bg-white/10 flex items-center justify-center font-bold">
            {die}
          </div>
          <div className="min-w-[220px]">
            <div className="text-sm text-white/80">{roll.roller}</div>
            <div className="text-base font-semibold text-white">{roll.label}</div>
            <div className="text-xs text-white/70">{roll.formula}</div>
          </div>
          <div className="text-3xl font-extrabold text-white">{roll.result}</div>
        </div>

        {(roll.outcome || roll.detail) && (
          <div className="mt-2 text-sm text-white/85">
            {roll.outcome ? <span className="font-semibold">{roll.outcome}</span> : null}
            {roll.outcome && roll.detail ? <span className="mx-2 text-white/40">•</span> : null}
            {roll.detail ? <span>{roll.detail}</span> : null}
          </div>
        )}
      </div>
    </div>
  )
}
