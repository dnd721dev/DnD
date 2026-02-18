'use client'

import React, { useMemo } from 'react'

function pickDieSides(formula: string): number {
  const s = String(formula || '')
  const matches = [...s.matchAll(/d(\d+)/gi)].map((m) => Number(m[1]))
  const nums = matches.filter((n) => Number.isFinite(n) && n > 1)
  if (nums.length === 0) return 20
  return Math.max(...nums)
}

function DieIcon({ sides }: { sides: number }) {
  const common = 'h-7 w-7'
  const stroke = 'stroke-slate-300'
  const fill = 'fill-slate-800'

  if (sides === 6) {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden>
        <rect x="5" y="5" width="14" height="14" rx="3" className={`${fill} ${stroke}`} strokeWidth="1.5" />
        <circle cx="9" cy="9" r="1" className="fill-slate-200" />
        <circle cx="15" cy="9" r="1" className="fill-slate-200" />
        <circle cx="9" cy="15" r="1" className="fill-slate-200" />
        <circle cx="15" cy="15" r="1" className="fill-slate-200" />
      </svg>
    )
  }

  if (sides === 4) {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden>
        <path
          d="M12 4 L4.5 19.5 H19.5 Z"
          className={`${fill} ${stroke}`}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (sides === 8) {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden>
        <path
          d="M12 3 L20 12 L12 21 L4 12 Z"
          className={`${fill} ${stroke}`}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (sides === 10 || sides === 12) {
    return (
      <svg viewBox="0 0 24 24" className={common} aria-hidden>
        <path
          d="M12 3 L20 8 L18 18 L12 21 L6 18 L4 8 Z"
          className={`${fill} ${stroke}`}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  // default: d20-ish
  return (
    <svg viewBox="0 0 24 24" className={common} aria-hidden>
      <path
        d="M12 2 L20 7 L22 16 L12 22 L2 16 L4 7 Z"
        className={`${fill} ${stroke}`}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 2 L12 22" className={stroke} strokeWidth="1" opacity="0.35" />
      <path d="M4 7 L22 16" className={stroke} strokeWidth="1" opacity="0.25" />
      <path d="M20 7 L2 16" className={stroke} strokeWidth="1" opacity="0.25" />
    </svg>
  )
}

export function DiceRollOverlay(props: {
  show: boolean
  payload: null | { roller: string; label: string; formula: string; result: number; outcome?: string | null }
}) {
  const { show, payload } = props
  if (!show || !payload) return null

  const sides = useMemo(() => pickDieSides(payload.formula), [payload.formula])
  const outcome = String(payload.outcome ?? '').trim()

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <div className="pointer-events-none relative">
        <div className="absolute inset-0 -m-16 rounded-3xl bg-black/30 blur-2xl" />

        <div className="relative flex min-w-[300px] max-w-[460px] items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/90 px-4 py-3 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
            <div className="relative">
              <div className="animate-spin">
                <DieIcon sides={sides} />
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded bg-slate-900/70 px-1 py-[1px] text-[9px] font-mono text-slate-300">
                d{sides}
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="text-[11px] text-slate-300">
              <span className="font-semibold text-slate-100">{payload.roller}</span>
              <span className="text-slate-500"> · </span>
              <span className="text-slate-200">{payload.label}</span>
              {outcome ? (
                <span className="ml-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-[2px] text-[10px] font-bold text-slate-100">
                  {outcome}
                </span>
              ) : null}
            </div>
            <div className="text-[10px] text-slate-500">{payload.formula}</div>
          </div>

          <div className="ml-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
            <div className="text-xl font-black text-sky-300 animate-bounce">{payload.result}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
