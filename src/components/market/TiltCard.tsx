'use client'

// Subtle pointer-tracking 3D tilt for marketplace cards. Pure CSS transform —
// no rerenders (writes style directly), capped at ~5°, and inert under
// prefers-reduced-motion.

import { useRef, type ReactNode } from 'react'

const MAX_DEG = 5

export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useRef<boolean | null>(null)

  function isReduced(): boolean {
    if (reduced.current === null) {
      reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return reduced.current
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current
    if (!el || isReduced() || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateX(${(-py * MAX_DEG).toFixed(2)}deg) rotateY(${(px * MAX_DEG).toFixed(2)}deg) translateY(-2px)`
  }

  function onLeave() {
    const el = ref.current
    if (el) el.style.transform = ''
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={className}
      style={{ transition: 'transform 180ms ease, box-shadow 180ms ease', willChange: 'transform' }}
    >
      {children}
    </div>
  )
}
