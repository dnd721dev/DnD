import './globals.css'
import type { Metadata } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import Providers from './providers'
import WalletJwtGate from '@/components/auth/WalletJwtGate'
import Header from '@/components/layout/header'
import { ToastHub } from '@/components/ui/ToastHub'

// DND721 type system: Cinzel for fantasy display headings, Inter for
// highly-readable body copy and controls. Exposed as CSS variables that
// globals.css maps into --font-display / --font-body.
const cinzel = Cinzel({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-cinzel' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'DND721 — NFT-Powered Virtual Tabletop',
  description:
    'Forge 5e heroes from your NFTs, gather your party, and play live — maps, dice, voice, and a marketplace of player-made treasures.',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="min-h-screen text-white">
        <Providers>
          <WalletJwtGate />
          <Header />
          <main className="px-4 py-6 sm:px-6">{children}</main>
          <ToastHub />
        </Providers>
      </body>
    </html>
  )
}
