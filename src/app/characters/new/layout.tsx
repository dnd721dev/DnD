'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useCharacterDraftSync } from '@/hooks/useCharacterDraftSync'
import { supabase } from '@/lib/supabase'

const STEPS = [
  { slug: 'step1', label: 'Link NFT' },
  { slug: 'step2', label: 'Basics' },
  { slug: 'step3', label: 'Abilities' },
  { slug: 'step4', label: 'Spellcasting' },
  { slug: 'step5', label: 'Equipment' },
  { slug: 'step6', label: 'Personality & Save' },
]

type ProfileStatus = 'loading' | 'no_wallet' | 'no_profile' | 'ok'

export default function NewCharacterLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading')
  useCharacterDraftSync()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    if (!address) {
      setProfileStatus('no_wallet')
      return
    }
    setProfileStatus('loading')
    const walletLower = address.toLowerCase()
    supabase
      .from('profiles')
      .select('wallet_address')
      .eq('wallet_address', walletLower)
      .maybeSingle()
      .then(({ data }) => {
        setProfileStatus(data ? 'ok' : 'no_profile')
      })
  }, [mounted, address])

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
          {!mounted || profileStatus === 'loading' ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-3">
              <svg className="animate-spin h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Checking wallet…
            </div>
          ) : profileStatus === 'no_wallet' ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="text-4xl">🔌</div>
              <h2 className="text-lg font-semibold text-white">Wallet not connected</h2>
              <p className="text-sm text-slate-400 max-w-sm">
                Connect your wallet to start creating a character. Your character is linked to your wallet address.
              </p>
            </div>
          ) : profileStatus === 'no_profile' ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="text-4xl">🧾</div>
              <h2 className="text-lg font-semibold text-white">Profile required</h2>
              <p className="text-sm text-slate-400 max-w-sm">
                You need a profile before creating a character. Set up your profile first — it only takes a moment.
              </p>
              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.45)] transition"
              >
                Go to Profile Setup →
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
