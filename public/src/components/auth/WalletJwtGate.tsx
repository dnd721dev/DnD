'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

export default function WalletJwtGate() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!isConnected || !address) {
      setStatus('waiting_for_wallet')

      // Keep Supabase header wallet in sync
      try {
        if (typeof window !== 'undefined') window.localStorage.removeItem('dnd721_wallet')
      } catch {
        // ignore
      }
      return
    }

    // ✅ Store wallet for Supabase request headers (see src/lib/supabase.ts)
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dnd721_wallet', address.toLowerCase())
      }
    } catch {
      // ignore
    }

    // No Supabase auth / JWT. We rely on RLS reading x-wallet-address header.
    setStatus('wallet_connected')
  }, [isConnected, address])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        fontSize: 12,
        opacity: 0.8,
        zIndex: 9999,
      }}
    >
      Auth: {status}
    </div>
  )
}
