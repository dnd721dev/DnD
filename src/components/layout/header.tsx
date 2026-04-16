'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ConnectButton } from '@/components/wallet/ConnectButton'
import ProfileNavButton from '@/components/profile/ProfileNavButton'

const NAV_LINKS = [
  { href: '/campaigns', label: 'Games' },
  { href: '/homebrew',  label: 'Homebrew' },
  { href: '/shop',      label: 'Shop'  },
  { href: '/sponsor',   label: 'Sponsor' },
]

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="relative flex items-center justify-between py-3">
      {/* Logo */}
      <Link href="/" className="font-bold text-white tracking-wide">
        DND721
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-4">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="text-sm opacity-80 hover:opacity-100 text-white">
            {l.label}
          </Link>
        ))}
        <ProfileNavButton />
        <ConnectButton />
      </nav>

      {/* Mobile: connect + hamburger */}
      <div className="flex md:hidden items-center gap-2">
        <ConnectButton />
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
          className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          {menuOpen ? (
            // X icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            // Hamburger icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 z-50 md:hidden flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-xl backdrop-blur-sm">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-1 border-t border-slate-800">
            <ProfileNavButton />
          </div>
        </div>
      )}
    </header>
  )
}
