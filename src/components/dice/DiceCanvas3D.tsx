'use client'

import { useEffect, useRef, useState } from 'react'
import { DiceBox } from '@/lib/diceSoNice/DiceBox'
import type { DicePrefs } from '@/lib/diceSkins'
import type { RollOverlayPayload } from '@/components/table/tableclient/components/DiceRollOverlay'

interface Props {
  roll?: RollOverlayPayload | null
  show?: boolean
  /** Current viewer's dice appearance/sound prefs. */
  prefs?: DicePrefs | null
}

/**
 * Derive the natural per-die values to show on the dice.
 * Prefers the explicit `roll.dice` (the real pre-modifier rolls). Falls back to
 * `result - modifier` for single-die formulas when that's missing.
 */
function diceValues(roll: RollOverlayPayload): number[] {
  if (roll.dice && roll.dice.length > 0) return roll.dice
  const m = roll.formula.match(/(\d+)[dD](\d+)\s*([+-]\d+)?/)
  if (!m) return [roll.result]
  const count = parseInt(m[1], 10)
  const mod = m[3] ? parseInt(m[3], 10) : 0
  if (count === 1) return [roll.result - mod]
  // Multi-die without naturals: best effort — clamp the total into range.
  const sides = parseInt(m[2], 10)
  return [Math.max(1, Math.min(sides, roll.result - mod))]
}

/**
 * Always-mounted 3D dice canvas.  Watches `roll` for changes and launches a
 * physics roll whenever a new payload arrives.  Must be rendered permanently
 * (not conditionally) so the Three.js renderer persists between rolls.
 */
export function DiceCanvas3D({ roll, show = true, prefs }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<DiceBox | null>(null)
  const [active, setActive] = useState(false)

  // Boot the DiceBox once on mount
  useEffect(() => {
    if (!containerRef.current) return
    const box = new DiceBox(containerRef.current, prefs ?? null)
    box.initialize().then(() => {
      boxRef.current = box
    })
    const onResize = () => box.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      box.destroy()
      boxRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep prefs fresh between rolls without re-creating the renderer.
  useEffect(() => {
    boxRef.current?.setPrefs(prefs ?? null)
  }, [prefs])

  // Trigger a roll whenever the payload changes
  useEffect(() => {
    if (!roll || !show) return
    const box = boxRef.current
    if (!box) return

    const formula = roll.formula
    const results = diceValues(roll)

    setActive(true)
    box.roll(formula, results).then(() => {
      // Keep dice visible for 3 s then clear
      const timer = setTimeout(() => {
        box.clear()
        setActive(false)
      }, 3000)
      return () => clearTimeout(timer)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roll])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-[85]"
      style={{
        opacity: active ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    />
  )
}
