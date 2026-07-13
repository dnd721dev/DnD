'use client'

// Character creation shell — "The Forge". A shared fantasy frame around all
// six builder steps: engraved progress rail, ember-lit content panel, and the
// wallet/profile gates. All gating + draft-sync logic is unchanged.

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { Check, Loader2, PlugZap, ScrollText } from 'lucide-react'
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
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Header */}
      <header>
        <p className="eyebrow">The Forge</p>
        <h1 className="page-title mt-1">Forge Your Hero</h1>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--text-mid)' }}>
          Six steps from NFT to a table-ready 5e adventurer. Your progress saves as you go.
        </p>
      </header>

      {/* Progress rail — engraved markers joined by a gold vein */}
      <nav aria-label="Creation steps" className="overflow-x-auto pb-1">
        <ol className="flex min-w-max items-center gap-0">
          {STEPS.map((step, index) => {
            const isActive = index === currentIndex
            const isCompleted = currentIndex > index
            return (
              <li key={step.slug} className="flex items-center">
                <div className="flex shrink-0 items-center gap-2 px-1.5">
                  <span
                    aria-current={isActive ? 'step' : undefined}
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-all"
                    style={
                      isActive
                        ? { borderColor: 'var(--gold)', background: 'rgba(212,169,79,0.14)', color: 'var(--gold-bright)', boxShadow: 'var(--glow-gold)' }
                        : isCompleted
                        ? { borderColor: 'rgba(63,174,122,0.6)', background: 'rgba(63,174,122,0.12)', color: '#7fd6ab' }
                        : { borderColor: 'var(--divider)', background: 'var(--surface-1)', color: 'var(--text-low)' }
                    }
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span
                    className="text-[11px] uppercase tracking-wider md:text-xs"
                    style={{ color: isActive ? 'var(--gold-bright)' : isCompleted ? '#7fd6ab' : 'var(--text-low)' }}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="mx-1 hidden h-px w-8 md:block"
                    style={{
                      background: isCompleted
                        ? 'linear-gradient(90deg, rgba(63,174,122,0.5), rgba(63,174,122,0.2))'
                        : 'var(--divider)',
                    }}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {/* Step content — the anvil */}
      <main className="panel-ornate relative p-4 md:p-6">
        {!mounted || profileStatus === 'loading' ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm" style={{ color: 'var(--text-mid)' }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--gold)' }} />
            Checking wallet…
          </div>
        ) : profileStatus === 'no_wallet' ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border"
                  style={{ borderColor: 'var(--edge)', background: 'var(--surface-3)', color: 'var(--gold)' }}>
              <PlugZap className="h-6 w-6" />
            </span>
            <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-hi)' }}>Wallet not connected</h2>
            <p className="max-w-sm text-sm" style={{ color: 'var(--text-mid)' }}>
              Connect your wallet to start creating a character. Your character is linked to your wallet address.
            </p>
          </div>
        ) : profileStatus === 'no_profile' ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border"
                  style={{ borderColor: 'var(--edge)', background: 'var(--surface-3)', color: 'var(--gold)' }}>
              <ScrollText className="h-6 w-6" />
            </span>
            <h2 className="font-display text-lg font-bold" style={{ color: 'var(--text-hi)' }}>Profile required</h2>
            <p className="max-w-sm text-sm" style={{ color: 'var(--text-mid)' }}>
              You need a profile before creating a character. Set up your profile first — it only takes a moment.
            </p>
            <Link href="/profile/edit" className="btn btn-primary">
              Go to Profile Setup →
            </Link>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}
