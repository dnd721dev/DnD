'use client'

import { useEffect, useRef, useState } from 'react'

const COIN_KEYFRAMES = `
  @keyframes coinFlip {
    0%   { transform: perspective(400px) rotateY(0deg);   }
    100% { transform: perspective(400px) rotateY(1800deg); }
  }
  @keyframes coinLandHeads {
    0%   { transform: perspective(400px) rotateY(1800deg); }
    100% { transform: perspective(400px) rotateY(1980deg); }
  }
  @keyframes coinLandTails {
    0%   { transform: perspective(400px) rotateY(1800deg); }
    100% { transform: perspective(400px) rotateY(2160deg); }
  }
  @keyframes coinFadeOut {
    from { opacity: 1; transform: perspective(400px) rotateY(1980deg) scale(1); }
    to   { opacity: 0; transform: perspective(400px) rotateY(1980deg) scale(0.7); }
  }
`

type CoinResult = 'heads' | 'tails' | null
type Phase = 'idle' | 'flipping' | 'landing' | 'result' | 'fading'

interface Props {
  /** Called when user clicks the button. Parent should call /api/roll and pass the result back. */
  onFlipRequest: () => void
  /** Server-determined result. Pass after /api/roll responds. */
  serverResult: CoinResult
  /** Roller display name */
  rollerName?: string
  disabled?: boolean
}

export function CoinFlip({ onFlipRequest, serverResult, rollerName = 'Adventurer', disabled }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  // When serverResult arrives, drive through flip → land → result → fade phases
  useEffect(() => {
    if (!serverResult) return
    clearTimers()
    setPhase('flipping')

    timers.current.push(setTimeout(() => setPhase('landing'),  900))
    timers.current.push(setTimeout(() => setPhase('result'),  1100))
    timers.current.push(setTimeout(() => setPhase('fading'),  3600))
    timers.current.push(setTimeout(() => setPhase('idle'),    4300))

    return clearTimers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverResult])

  const isHeads  = serverResult === 'heads'
  const isTails  = serverResult === 'tails'
  const showFace = phase === 'result' || phase === 'fading'

  const coinAnim =
    phase === 'flipping' ? 'coinFlip 0.9s cubic-bezier(0.2,0,0.8,1) forwards' :
    phase === 'landing'  ? (isHeads ? 'coinLandHeads 0.2s ease-out forwards' : 'coinLandTails 0.2s ease-out forwards') :
    phase === 'result'   ? `perspective(400px) rotateY(${isHeads ? 1980 : 2160}deg)` :
    phase === 'fading'   ? 'coinFadeOut 0.7s ease forwards' :
    undefined

  return (
    <>
      <style>{COIN_KEYFRAMES}</style>

      {/* Button — always visible */}
      <button
        type="button"
        onClick={onFlipRequest}
        disabled={disabled || phase !== 'idle'}
        className="rounded-md bg-amber-700/80 px-3 py-1 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-600/80 disabled:opacity-40"
        title="Flip a coin (server-seeded)"
      >
        🪙 Flip Coin
      </button>

      {/* 3D Coin overlay */}
      {phase !== 'idle' && (
        <div className="pointer-events-none fixed inset-0 z-[92] flex flex-col items-center justify-center gap-4">
          {/* Roller label */}
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/60 select-none"
               style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
            {rollerName} flips a coin
          </div>

          {/* Coin */}
          <div
            style={{
              width: 96,
              height: 96,
              position: 'relative',
              animation: typeof coinAnim === 'string' && (phase === 'flipping' || phase === 'landing' || phase === 'fading')
                ? coinAnim
                : undefined,
              transform: phase === 'result'
                ? `perspective(400px) rotateY(${isHeads ? 1980 : 2160}deg)`
                : undefined,
            }}
          >
            {/* Heads face */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #fde68a, #b45309)',
                boxShadow: '0 0 24px rgba(251,191,36,0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
                backfaceVisibility: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                userSelect: 'none',
              }}
            >
              ⚔
            </div>

            {/* Tails face */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #c4b5fd, #5b21b6)',
                boxShadow: '0 0 24px rgba(139,92,246,0.6), inset 0 2px 4px rgba(255,255,255,0.3)',
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                userSelect: 'none',
              }}
            >
              🛡
            </div>
          </div>

          {/* Result text */}
          {showFace && (
            <div
              className={`text-3xl font-black tracking-widest select-none ${isHeads ? 'text-amber-300' : 'text-violet-300'}`}
              style={{
                textShadow: isHeads
                  ? '0 0 20px rgba(251,191,36,0.9), 0 2px 8px rgba(0,0,0,0.9)'
                  : '0 0 20px rgba(139,92,246,0.9), 0 2px 8px rgba(0,0,0,0.9)',
              }}
            >
              {isHeads ? '⚔ HEADS' : '🛡 TAILS'}
            </div>
          )}
        </div>
      )}
    </>
  )
}
