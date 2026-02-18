'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'

type ApiOk = {
  ok: true
  profile: { username: string | null }
}

type ApiErr = {
  ok: false
  error: string
}

function isApiOk(v: any): v is ApiOk {
  return Boolean(v && v.ok === true && v.profile && typeof v.profile === 'object')
}

export default function ProfileNavButton() {
  const { address, isConnected } = useAccount()

  const [mounted, setMounted] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (!isConnected || !address) {
      setUsername(null)
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)

      try {
        const res = await fetch(
          `/api/profiles/by-wallet?wallet=${encodeURIComponent(address.toLowerCase())}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          }
        )

        const text = await res.text()

        let parsed: any
        try {
          parsed = JSON.parse(text)
        } catch {
          console.error('ProfileNavButton: non-JSON response:', text.slice(0, 200))
          setUsername(null)
          return
        }

        if (!isApiOk(parsed)) {
          // ok:false or unexpected shape
          setUsername(null)
          return
        }

        setUsername(parsed.profile.username ?? null)
      } catch (err) {
        console.error('ProfileNavButton: fetch failed', err)
        setUsername(null)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [mounted, isConnected, address])

  if (!mounted) return null
  if (!isConnected || !address) return null

  if (loading && !username) {
    return <div className="text-xs text-gray-400">Loading profile…</div>
  }

  if (!username) {
    return (
      <Link
        href="/profile/edit"
        className="text-sm px-3 py-1 rounded-md border border-zinc-700 hover:bg-zinc-800 transition"
      >
        Set up profile
      </Link>
    )
  }

  return (
    <Link
      href={`/profile/${encodeURIComponent(username)}`}
      className="text-sm px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 transition"
    >
      My Profile
    </Link>
  )
}
