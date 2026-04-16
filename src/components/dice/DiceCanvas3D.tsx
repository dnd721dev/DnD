'use client'

import { useEffect, useRef, useState } from 'react'
import { DiceBox } from '@/lib/diceSoNice/DiceBox'
import type { RollOverlayPayload } from '@/components/table/tableclient/components/DiceRollOverlay'

interface Props {
  roll?: RollOverlayPayload | null
  show?: boolean
}

/**
 * Always-mounted 3D dice canvas.  Watches `roll` for changes and launches a
 * physics roll whenever a new payload arrives.  Must be rendered permanently
 * (not conditionally) so the Three.js renderer persists between rolls.
 */
export function DiceCanvas3D({ roll, show = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<DiceBox | null>(null)
  const [active, setActive] = useState(false)

  // Boot the DiceBox once on mount
  useEffect(() => {
    if (!containerRef.current) return
    const box = new DiceBox(containerRef.current)
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
  }, [])

  // Trigger a roll whenever the payload changes
  useEffect(() => {
    if (!roll || !show) return
    const box = boxRef.current
    if (!box) return

    const formula = roll.formula
    // result is the total; for multi-dice we just use it for the last die.
    // Pass it as a single-element array — DiceBox will assign to dice[0].
    const results = [roll.result]

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
