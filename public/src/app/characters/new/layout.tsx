'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const STEPS = [
  { slug: 'step1', label: 'Link NFT' },
  { slug: 'step2', label: 'Basics' },
  { slug: 'step3', label: 'Abilities' },
  { slug: 'step4', label: 'Spellcasting' },
  { slug: 'step5', label: 'Equipment' },
  { slug: 'step6', label: 'Personality & Save' },
]

export default function NewCharacterLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()

  // figure out which step we’re on from the URL
  const currentIndex = STEPS.findIndex((step) =>
    pathname?.endsWith(step.slug)
  )

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50 flex flex-col">
      {/* Neon gradient background overlay */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.18),_transparent_55%)] opacity-70" />

      {/* Content shell */}
      <div className="relative z-10 max-w-5xl mx-auto w-full px-4 py-8 md:py-10 space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            DND721 Character Creation
          </h1>
          <p className="text-sm text-slate-400">
            Guided wizard to forge your on-chain hero for the tabletop.
          </p>
        </header>

        {/* Step Circles Row */}
        <nav className="flex items-center gap-3 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const isActive = index === currentIndex
            const isCompleted = currentIndex > index

            return (
              <div
                key={step.slug}
                className="flex items-center gap-2 shrink-0"
              >
                <div
                  className={[
                    'flex items-center justify-center rounded-full border w-8 h-8 text-xs font-bold transition-all',
                    isActive &&
                      'border-cyan-400 bg-cyan-500/20 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.5)]',
                    !isActive && isCompleted &&
                      'border-emerald-400 bg-emerald-500/20 text-emerald-200',
                    !isActive && !isCompleted &&
                      'border-slate-700 bg-slate-900 text-slate-400',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {index + 1}
                </div>

                <span
                  className={[
                    'text-[11px] md:text-xs uppercase tracking-wide',
                    isActive
                      ? 'text-cyan-200'
                      : isCompleted
                      ? 'text-emerald-300'
                      : 'text-slate-500',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {step.label}
                </span>

                {index < STEPS.length - 1 && (
                  <div className="w-8 h-px bg-slate-700 hidden md:block" />
                )}
              </div>
            )
          })}
        </nav>

        {/* Step content card */}
        <main className="relative rounded-2xl border border-slate-800 bg-slate-950/80 shadow-[0_0_40px_rgba(15,23,42,0.9)] p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
