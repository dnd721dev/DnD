'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

export default function WalletJwtGate() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    ;(async () => {
      try {
        if (!isConnected || !address) {
          setStatus('waiting_for_wallet')
          return
        }

        // 1) Ensure Supabase auth session (anonymous is fine)
        setStatus('checking_supabase_session')
        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          setStatus('signing_in_anonymous')
          const { error } = await supabase.auth.signInAnonymously()
          if (error) throw error
        }

        // 2) Ensure profile via SERVER route (bypasses RLS safely)
        setStatus('ensuring_profile')
        const walletLower = address.toLowerCase()

        const res = await fetch('/api/profile/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: walletLower }),
        })

        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Profile ensure failed: ${text}`)
        }

        setStatus('ok')
      } catch (e: any) {
        console.error('WalletJwtGate error:', e)
        setStatus(`error: ${e?.message || 'unknown'}`)
      }
    })()
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
