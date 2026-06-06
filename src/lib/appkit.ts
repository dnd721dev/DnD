'use client'

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base } from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!

if (!projectId) {
  console.warn('[appkit] Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')
}

export const networks = [base] as [AppKitNetwork, ...AppKitNetwork[]]

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
    // Always expose the full wallet picker so mobile users can scan with any
    // wallet (Rainbow, Trust, Coinbase, Zerion, …), not just MetaMask.
    allWallets: 'SHOW',
    // Feature a curated set of WalletConnect wallets so the modal doesn't
    // default to a MetaMask-first layout. IDs are Reown's canonical wallet IDs.
    featuredWalletIds: [
      '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Coinbase Wallet
      '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Bitget
      'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    ],
    enableWalletConnect: true,
    themeVariables: {
      '--w3m-accent': '#6366f1',        // indigo-500
      '--w3m-border-radius-master': '8px',
    },
  })
}
