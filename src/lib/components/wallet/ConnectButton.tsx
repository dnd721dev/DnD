'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { clearStoredJwt } from '@/lib/walletJwtAuth'

function shortAddr(a?: string | null) {
  if (!a) return ''
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function clearWalletLocal() {
  try {
    // your local keys
    localStorage.removeItem('wallet_jwt')
    localStorage.removeItem('wallet_address')
  } catch {}
  try {
    // your app’s auth/JWT storage (this is the important one)
    clearStoredJwt()
  } catch {}
}

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connectAsync, connectors, isPending } = useConnect()
  const { disconnectAsync } = useDisconnect()

  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => setMounted(true), [])

  const available = useMemo(() => {
    const seen = new Set<string>()
    return connectors.filter((c) => {
      if (!c?.id) return false
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  }, [connectors])

  async function hardDisconnect() {
    setOpen(false)

    // clear app auth FIRST
    clearWalletLocal()

    // then disconnect wagmi
    try {
      await disconnectAsync()
    } catch (e) {
      // not fatal; still cleared local auth
      console.warn('disconnectAsync failed', e)
    }
  }

  async function connectWith(connectorId: string) {
    const target = available.find((c) => c.id === connectorId)
    if (!target) return

    // ✅ hard reset first (prevents “sticking”)
    await hardDisconnect()

    try {
      await connectAsync({ connector: target })
      setOpen(false)
    } catch (e) {
      console.error('connect error', e)
    }
  }

  // SSR-safe placeholder to avoid hydration mismatch
  if (!mounted) {
    return (
      <button className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm">
        Connect
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
        disabled={isPending}
      >
        {isConnected ? shortAddr(address) : isPending ? 'Connecting…' : 'Connect'}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0b1020] p-2 shadow-xl z-50">
          {isConnected ? (
            <>
              <button
                onClick={hardDisconnect}
                className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-left text-sm hover:bg-red-500/20"
              >
                Disconnect
              </button>

              <div className="my-2 h-px bg-white/10" />
              <div className="px-1 pb-1 text-xs text-white/60">Switch wallet</div>

              <div className="flex flex-col gap-1">
                {available.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => connectWith(c.id)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <div className="mt-2 px-1 text-[11px] text-white/50">
                To switch accounts inside MetaMask/Coinbase, change the account in the wallet popup first.
              </div>
            </>
          ) : (
            <>
              <div className="px-1 pb-1 text-xs text-white/60">Choose wallet</div>

              <div className="flex flex-col gap-1">
                {available.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => connectWith(c.id)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10"
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setOpen(false)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-white/0 px-3 py-2 text-left text-sm hover:bg-white/5"
              >
                Close
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
