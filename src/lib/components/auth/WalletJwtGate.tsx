'use client'

import { useEffect, useRef, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { clearStoredJwt, getStoredJwt, setStoredJwt } from '@/lib/walletJwtAuth'

function norm(a?: string | null) {
  return (a ?? '').trim().toLowerCase()
}

export default function WalletJwtGate() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const prevAddr = useRef<string>('')
  const mintingFor = useRef<string>('') // prevents double prompts
  const [ready, setReady] = useState(false)

  useEffect(() => setReady(true), [])

  useEffect(() => {
    if (!ready) return

    const w = norm(address)

    // disconnected => clear everything
    if (!isConnected || !w) {
      prevAddr.current = ''
      mintingFor.current = ''
      try {
        clearStoredJwt()
        localStorage.removeItem('wallet_address')
        localStorage.removeItem('wallet_jwt')
        localStorage.removeItem('dnd721_wallet')
      } catch {}
      return
    }

    // always store current wallet in one place
    try {
      localStorage.setItem('wallet_address', w)
    } catch {}

    // if wallet changed => clear jwt so it MUST re-mint for new wallet
    if (prevAddr.current && prevAddr.current !== w) {
      mintingFor.current = ''
      try {
        clearStoredJwt()
        localStorage.removeItem('wallet_jwt')
      } catch {}
    }

    prevAddr.current = w

    // if we already have a jwt, we're done
    const existing = (getStoredJwt() ?? '').trim()
    if (existing) return

    // avoid infinite loops / double popups
    if (mintingFor.current === w) return
    mintingFor.current = w

    const run = async () => {
      try {
        // Any message is fine: server recovers address from message+signature
        const message = `DnD721 Auth\nWallet: ${w}\nTime: ${new Date().toISOString()}`
        const signature = await signMessageAsync({ message })

        const res = await fetch('/api/auth/mint', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ wallet_address: w, message, signature }),
        })

        const json = await res.json().catch(() => null)

        if (!res.ok || !json?.ok || !json?.access_token) {
          console.error('mint failed', json)
          return
        }

        setStoredJwt(String(json.access_token))
      } catch (e) {
        // user cancelled signature or wallet failed — keep them unlinked
        console.warn('mint cancelled/failed', e)
      } finally {
        // allow retry later if needed
        mintingFor.current = ''
      }
    }

    void run()
  }, [ready, address, isConnected, signMessageAsync])

  return null
}
