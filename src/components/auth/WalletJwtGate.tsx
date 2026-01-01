'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { BrowserProvider } from 'ethers'
import { supabase } from '@/lib/supabase'

export default function WalletJwtGate() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState('idle')
  const lastWalletRef = useRef<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        if (!isConnected || !address) {
          setStatus('waiting_for_wallet')
          return
        }

        const walletLower = address.toLowerCase()

        // If wallet changed, reset Supabase auth so auth.uid() isn't from the old wallet
        if (lastWalletRef.current && lastWalletRef.current !== walletLower) {
          setStatus('wallet_changed_signing_out_supabase')
          await supabase.auth.signOut()
        }
        lastWalletRef.current = walletLower

        // 1) Ensure Supabase session exists (anonymous)
        setStatus('checking_supabase_session')
        const { data: s1, error: s1err } = await supabase.auth.getSession()
        if (s1err) throw s1err

        if (!s1.session) {
          setStatus('signing_in_anonymous')
          const { error } = await supabase.auth.signInAnonymously()
          if (error) throw error
        }

        // 2) Read auth user id
        setStatus('reading_user_id')
        const { data: s2, error: s2err } = await supabase.auth.getSession()
        if (s2err) throw s2err

        const userId = s2.session?.user?.id
        if (!userId) throw new Error('No supabase user id')

        // 3) Sign link message using ethers (avoids wagmi connector issues)
        const eth = (globalThis as any).ethereum
        if (!eth) throw new Error('No injected wallet found (window.ethereum missing)')

        const message = `DND721 Link Wallet
wallet=${walletLower}
user_id=${userId}
issued_at=${new Date().toISOString()}`

        setStatus('requesting_wallet_signature')
        const provider = new BrowserProvider(eth)
        const signer = await provider.getSigner()
        const signature = await signer.signMessage(message)

        // 4) Link wallet <-> user_id on server (service role API)
        setStatus('linking_wallet_on_server')
        const res = await fetch('/api/auth/link-wallet', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            wallet_address: walletLower,
            user_id: userId,
            message,
            signature,
          }),
        })

        const json = await res.json()
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Link failed (${res.status})`)
        }

        setStatus(`ok (uid=${userId.slice(0, 8)}…)`)
      } catch (e: any) {
        console.error(e)
        setStatus(`error: ${e?.message || 'unknown'}`)
      }
    })()
  }, [isConnected, address])

  return (
    <div style={{ position: 'fixed', bottom: 8, right: 8, fontSize: 12, opacity: 0.85, zIndex: 9999 }}>
      Auth: {status}
    </div>
  )
}
