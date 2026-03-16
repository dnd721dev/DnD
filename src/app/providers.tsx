'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig, initAppKit } from '@/lib/appkit'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  // Initialize AppKit synchronously during first render, NOT in a useEffect.
  // useEffect runs after render — by then wagmi has already started restoring
  // the WalletConnect session and relay messages may arrive before AppKit's
  // handlers are registered, causing the {} relay error on mobile.
  useState(() => { initAppKit() })

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
