'use client'

import { useEffect, useMemo, useState } from 'react'

export type RollOverlayPayload = {
  roller: string
  label: string
  formula: string
  result: number
  outcomeText?: string | null
}

function parseDice(formula: string): { count: number; sides: number } {
  const match = String(formula ?? '').match(/(\d+)?d(\d+)/i)
  if (!match) return { count: 1, sides: 20 }
  return {
    count: Math.min(parseInt(match[1] ?? '1', 10) || 1, 4),
    sides: parseInt(match[2], 10),
  }
}

function outcomeColor(text: string | null | undefined): string {
  if (!text) return 'text-white'
  const t = text.toLowerCase()
  if (t.includes('hit') || t.includes('success') || t.includes('nat 20') || t.includes('critical')) return 'text-emerald-400'
  if (t.includes('miss') || t.includes('fail') || t.includes('nat 1') || t.includes('fumble')) return 'text-red-400'
  return 'text-yellow-300'
}

export function DiceRollOverlay(props: {
  roll?: RollOverlayPayload | null
  show?: boolean
  payload?: RollOverlayPayload | null
}) {
  const enabled = props.show ?? true
  const roll = enabled ? (props.roll ?? props.payload ?? null) : null
  const [phase, setPhase] = useState<'hidden' | 'rolling' | 'result' | 'fading'>('hidden')

  const { count, sides } = useMemo(
    () => (roll ? parseDice(roll.formula) : { count: 1, sides: 20 }),
    [roll]
  )

  // Generate stable intermediate values — last die always shows the real result
  const diceValues = useMemo(() => {
    if (!roll) return []
    return Array.from({ length: count }, (_, i) =>
      i === count - 1 ? roll.result : Math.floor(Math.random() * sides) + 1
    )
  }, [roll, count, sides])

  useEffect(() => {
    if (!roll) {
      setPhase('hidden')
      return
    }
    setPhase('rolling')
    const t1 = window.setTimeout(() => setPhase('result'), 1500)
    const t2 = window.setTimeout(() => setPhase('fading'), 3400)
    const t3 = window.setTimeout(() => setPhase('hidden'), 3900)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [roll])

  if (phase === 'hidden' || !roll) return null

  const isFading = phase === 'fading'
  const showResult = phase === 'result' || phase === 'fading'

  return (
    <>
      <style>{`
        @keyframes diceSlide {
          0%   { transform: translateX(-110vw) rotate(0deg); opacity: 0.3; }
          15%  { opacity: 1; }
          70%  { transform: translateX(8px) rotate(1020deg); }
          85%  { transform: translateX(-4px) rotate(1040deg); }
          100% { transform: translateX(0px) rotate(1080deg); }
        }
        @keyframes resultPop {
          0%   { opacity: 0; transform: scale(0.3) translateY(20px); }
          60%  { opacity: 1; transform: scale(1.12) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes overlayOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
      `}</style>

      <div
        className="pointer-events-none fixed inset-0 z-[90] flex flex-col items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(5,10,30,0.82) 0%, rgba(0,0,0,0.93) 100%)',
          animation: isFading
            ? 'overlayOut 0.5s ease forwards'
            : 'overlayIn 0.18s ease forwards',
        }}
      >
        {/* Roller info */}
        <div className="mb-8 text-center select-none">
          <div className="text-[11px] text-white/40 uppercase tracking-[0.2em] mb-0.5">{roll.roller}</div>
          <div className="text-xl font-bold text-white/90 leading-tight">{roll.label}</div>
          <div className="text-xs text-white/30 font-mono mt-1">{roll.formula}</div>
        </div>

        {/* Dice */}
        <div className="flex gap-5 items-center justify-center">
          {diceValues.map((val, i) => (
            <div
              key={i}
              style={{
                animation: `diceSlide ${1.1 + i * 0.1}s cubic-bezier(0.22, 0.61, 0.36, 1) ${i * 90}ms both`,
              }}
              className="relative h-20 w-20 rounded-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(145deg, #3f4a6b 0%, #1e2540 50%, #141928 100%)',
                }}
              />
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
                <div className="absolute top-1.5 right-2 text-[8px] text-white/25 font-mono">d{sides}</div>
                <div className="text-3xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  {val}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Result reveal */}
        {showResult && (
          <div
            className="mt-10 flex flex-col items-center gap-3"
            style={{ animation: 'resultPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
          >
            <div
              className="text-8xl font-black text-white tabular-nums"
              style={{ textShadow: '0 0 40px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.8)' }}
            >
              {roll.result}
            </div>
            {roll.outcomeText && (
              <div
                className={`text-2xl font-bold tracking-wide ${outcomeColor(roll.outcomeText)}`}
                style={{ textShadow: '0 0 20px currentColor' }}
              >
                {roll.outcomeText}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
