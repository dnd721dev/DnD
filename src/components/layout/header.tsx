'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import ProfileNavButton from '@/components/profile/ProfileNavButton'

const NAV_LINKS = [
  { href: '/campaigns', label: 'Games' },
  { href: '/homebrew',  label: 'Homebrew' },
  { href: '/shop',      label: 'Shop'  },
  { href: '/market',    label: 'Market' },
  { href: '/rewards',   label: 'Rewards' },
  { href: '/sponsor',   label: 'Sponsor' },
  { href: '/community', label: 'Community' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{
        background: 'linear-gradient(180deg, rgba(12,17,28,0.92), rgba(7,10,18,0.85))',
        borderColor: 'var(--edge)',
      }}
    >
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Sigil + wordmark */}
        <Link href="/" className="group flex items-center gap-2.5" aria-label="DND721 home">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold transition-shadow group-hover:shadow-[var(--glow-gold)]"
            style={{
              borderColor: 'var(--edge-strong)',
              background: 'linear-gradient(160deg, var(--surface-3), var(--surface-1))',
              color: 'var(--gold-bright)',
            }}
            aria-hidden
          >
            ⌘
          </span>
          <span className="font-display text-lg font-bold tracking-wider" style={{ color: 'var(--text-hi)' }}>
            DND<span style={{ color: 'var(--gold)' }}>721</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => {
            const active = pathname?.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className="relative rounded-md px-3 py-1.5 text-sm transition-colors"
                style={{ color: active ? 'var(--gold-bright)' : 'var(--text-mid)' }}
              >
                <span className="transition-colors hover:text-[var(--text-hi)]">{l.label}</span>
                {/* Engraved active indicator */}
                {active && (
                  <span
                    className="absolute inset-x-2 -bottom-[13px] h-[2px] rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }}
                  />
                )}
              </Link>
            )
          })}
          <div className="ml-2 flex items-center gap-2 border-l pl-3" style={{ borderColor: 'var(--divider)' }}>
            <ProfileNavButton />
            <ConnectButton />
          </div>
        </nav>

        {/* Mobile: connect + menu toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <ConnectButton />
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md p-2 transition-colors"
            style={{ color: 'var(--text-mid)' }}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div
            className="absolute left-0 right-0 top-full z-50 mx-3 mt-1 flex flex-col gap-1 rounded-xl border p-3 shadow-2xl md:hidden"
            style={{ background: 'rgba(12,17,28,0.98)', borderColor: 'var(--edge)' }}
          >
            {NAV_LINKS.map((l) => {
              const active = pathname?.startsWith(l.href)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm transition-colors"
                  style={{
                    color: active ? 'var(--gold-bright)' : 'var(--text-mid)',
                    background: active ? 'rgba(212,169,79,0.08)' : 'transparent',
                  }}
                >
                  {l.label}
                </Link>
              )
            })}
            <div className="mt-1 border-t pt-2" style={{ borderColor: 'var(--divider)' }}>
              <ProfileNavButton />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
