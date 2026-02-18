'use client'
import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  // prevent hydration mismatch by matching SSR markup until mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // On the server (and first client render), always show the same placeholder.
  if (!mounted) {
    return (
      <button className="px-3 py-2 rounded bg-indigo-600" aria-hidden>
        Connect Wallet
      </button>
    )
  }

  if (isConnected) {
    return (
      <button className="px-3 py-2 rounded bg-slate-800" onClick={() => disconnect()}>
        {address?.slice(0, 6)}…{address?.slice(-4)} — Disconnect
      </button>
    )
  }

  return (
    <button
      className="px-3 py-2 rounded bg-indigo-600"
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
    >
      {isPending ? 'Connecting…' : 'Connect Wallet'}
    </button>
  )
}
