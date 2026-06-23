import './globals.css'
import type { Metadata } from 'next'
import Providers from './providers'
import WalletJwtGate from '@/components/auth/WalletJwtGate'
import Header from '@/components/layout/header' // <-- make sure this path matches your project
import { ToastHub } from '@/components/ui/ToastHub'

// Browser-tab icon (favicon). The image lives at public/favicon.png and is
// served from the site root as /favicon.png. Replacing that file swaps the
// tab icon — no code change needed.
export const metadata: Metadata = {
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070a12] text-white">
        <Providers>
          <WalletJwtGate />
          <Header />
          <main className="px-6 py-6">{children}</main>
          <ToastHub />
        </Providers>
      </body>
    </html>
  )
}
