'use client'

import { useEffect, useState } from 'react'
import { type DiceSkin } from '@/lib/diceSkins'

export type RollOverlayPayload = {
  roller: string
  label: string
  formula: string
  result: number
  outcomeText?: string | null
}

function outcomeColor(text: string | null | undefined): string {
  if (!text) return 'text-white'
  const t = text.toLowerCase()
  if (t.includes('hit') || t.includes('success') || t.includes('nat 20') || t.includes('critical') || t.includes('regain')) return 'text-emerald-400'
  if (t.includes('miss') || t.includes('fail') || t.includes('nat 1') || t.includes('fumble') || t.includes('two fail')) return 'text-red-400'
  return 'text-yellow-300'
}

const CSS_KEYFRAMES = `
  @keyframes resultPop {
    0%   { opacity:0; transform: scale(0.3) translateY(20px); }
    60%  { opacity:1; transform: scale(1.18) translateY(-6px); }
    80%  { transform: scale(0.96) translateY(1px); }
    100% { opacity:1; transform: scale(1) translateY(0); }
  }
  @keyframes infoFade {
    from { opacity:0; transform: translateY(-8px); }
    to   { opacity:1; transform: translateY(0); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.65; }
    50%       { opacity: 1; }
  }
  @keyframes overlayFadeOut {
    from { opacity:1; }
    to   { opacity:0; }
  }
  @keyframes critTextPop {
    0%   { opacity:0; transform: scale(0.4) translateY(12px); letter-spacing: 0.1em; }
    55%  { opacity:1; transform: scale(1.22) translateY(-5px); letter-spacing: 0.35em; }
    75%  { transform: scale(0.97) translateY(0); letter-spacing: 0.28em; }
    100% { opacity:1; transform: scale(1) translateY(0); letter-spacing: 0.3em; }
  }
  @keyframes critRingPulse {
    0%, 100% { opacity:0.75; stroke-width:3.5; }
    50%       { opacity:1;    stroke-width:5; }
  }
`

export function DiceRollOverlay(props: {
  roll?: RollOverlayPayload | null
  show?: boolean
  payload?: RollOverlayPayload | null
  skin?: DiceSkin | null
}) {
  const enabled = props.show ?? true
  const roll = enabled ? (props.roll ?? props.payload ?? null) : null
  const [phase, setPhase] = useState<'hidden' | 'rolling' | 'result' | 'fading'>('hidden')

  useEffect(() => {
    if (!roll) {
      setPhase('hidden')
      return
    }
    setPhase('rolling')
    const t1 = window.setTimeout(() => setPhase('result'), 2400)
    const t2 = window.setTimeout(() => setPhase('fading'), 5000)
    const t3 = window.setTimeout(() => setPhase('hidden'), 5700)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [roll])

  if (phase === 'hidden' || !roll) return null

  const isFading = phase === 'fading'
  const showResult = phase === 'result' || phase === 'fading'

  const outcomeStr = roll.outcomeText?.toLowerCase() ?? ''
  const isCrit   = outcomeStr.includes('nat 20') || outcomeStr.includes('critical') || outcomeStr.includes('crit')
  const isFumble = outcomeStr.includes('nat 1')  || outcomeStr.includes('fumble')
  const critType = isCrit ? 'crit' : isFumble ? 'fumble' : null

  const labelShadow = '0 0 8px rgba(0,0,0,0.9), 0 2px 12px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.7)'

  return (
    <>
      <style>{CSS_KEYFRAMES}</style>

      {/* Text HUD — sits above the Three.js canvas (z-[90] > z-[85]) */}
      <div
        className="pointer-events-none fixed inset-0 z-[90] flex flex-col items-center justify-center"
        style={isFading ? { animation: 'overlayFadeOut 0.7s ease forwards' } : undefined}
      >
        {/* Roller info */}
        <div
          className="mb-5 text-center select-none"
          style={{ animation: 'infoFade 0.4s ease forwards' }}
        >
          <div
            className="text-[10px] uppercase tracking-[0.24em] text-white/70 mb-0.5"
            style={{ textShadow: labelShadow }}
          >
            {roll.roller}
          </div>
          <div
            className="text-xl font-bold text-white leading-tight"
            style={{ textShadow: labelShadow }}
          >
            {roll.label}
          </div>
          <div
            className="text-[10px] font-mono text-white/40 mt-0.5"
            style={{ textShadow: labelShadow }}
          >
            {roll.formula}
          </div>
        </div>

        {/* Spacer where dice would be (the 3D canvas is behind at z-85) */}
        <div style={{ height: 100 }} />

        {/* Crit / fumble banner */}
        {showResult && critType && (
          <div
            className={`font-black select-none tracking-widest ${critType === 'crit' ? 'text-yellow-300' : 'text-red-400'}`}
            style={{
              fontSize: 22,
              marginTop: 14,
              marginBottom: -6,
              animation: 'critTextPop 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards',
              textShadow: critType === 'crit'
                ? '0 0 18px rgba(251,191,36,0.95), 0 0 36px rgba(251,191,36,0.5), 0 2px 8px rgba(0,0,0,0.9)'
                : '0 0 18px rgba(239,68,68,0.95), 0 0 36px rgba(239,68,68,0.5), 0 2px 8px rgba(0,0,0,0.9)',
            }}
          >
            {critType === 'crit' ? '✦ CRITICAL HIT! ✦' : '☠ FUMBLE ☠'}
          </div>
        )}

        {/* Result number */}
        {showResult && (
          <div
            className="mt-10 flex flex-col items-center gap-2"
            style={{ animation: 'resultPop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            <div
              className="text-8xl font-black tabular-nums select-none"
              style={{
                color: critType === 'crit' ? '#fde68a' : critType === 'fumble' ? '#fca5a5' : 'white',
                textShadow: [
                  `0 0 40px ${critType === 'crit' ? 'rgba(251,191,36,0.9)' : critType === 'fumble' ? 'rgba(239,68,68,0.9)' : 'rgba(99,102,241,0.8)'}`,
                  `0 0 80px ${critType === 'crit' ? 'rgba(251,191,36,0.4)' : critType === 'fumble' ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.35)'}`,
                  '0 4px 20px rgba(0,0,0,0.95)',
                  '0 2px 6px rgba(0,0,0,1)',
                ].join(', '),
                animation: 'glowPulse 2s ease-in-out infinite',
              }}
            >
              {roll.result}
            </div>
            {roll.outcomeText && (
              <div
                className={`text-xl font-bold tracking-widest ${outcomeColor(roll.outcomeText)}`}
                style={{
                  textShadow: [
                    '0 0 20px currentColor',
                    '0 0 40px currentColor',
                    '0 2px 8px rgba(0,0,0,0.9)',
                  ].join(', '),
                }}
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
