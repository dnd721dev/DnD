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

        // 1) Ensure we have a Supabase auth session (anonymous is fine)
        setStatus('checking_supabase_session')
        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          setStatus('signing_in_anonymous')
          const { error } = await supabase.auth.signInAnonymously()
          if (error) throw error
        }

        // 2) Upsert profile mapping user_id -> wallet_address
        setStatus('upserting_profile')
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr) throw sessionErr

        const userId = sessionData.session?.user?.id
        if (!userId) throw new Error('No supabase user id after sign-in')

        const walletLower = address.toLowerCase()

        // ✅ IMPORTANT:
        // Your profiles table has UNIQUE(wallet_address).
        // So we must upsert using wallet_address as the conflict key,
        // otherwise inserting a new user_id will collide with the existing wallet row.
        const { error: upsertErr } = await supabase
          .from('profiles')
          .upsert(
            { user_id: userId, wallet_address: walletLower },
            { onConflict: 'wallet_address' }
          )

        if (upsertErr) throw upsertErr

        setStatus('ok')
      } catch (e: any) {
        console.error(e)
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
