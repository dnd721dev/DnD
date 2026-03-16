'use client'

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base } from '@reown/appkit/networks'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!

if (!projectId) {
  console.warn('[appkit] Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')
}

export const networks = [base] as const

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

let created = false

export function initAppKit() {
  if (created || typeof window === 'undefined') return
  created = true

  createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    themeMode: 'dark',
    metadata: {
      name: 'DND721',
      description: 'D&D on the blockchain',
      // NEXT_PUBLIC_APP_URL should be set to the real domain in production
      // and to http://<your-local-ip>:3000 when testing on mobile dev.
      // Wallet apps use this URL to deep-link back after signing.
      url: process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin,
      icons: ['/favicon.ico'],
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
    themeVariables: {
      '--w3m-accent': '#6366f1',        // indigo-500
      '--w3m-border-radius-master': '8px',
    },
  })
}
