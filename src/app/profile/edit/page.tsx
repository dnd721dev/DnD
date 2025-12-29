'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ProfileRow = {
  wallet_address: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  location: string | null
  timezone: string | null
  twitter: string | null
  discord: string | null
  twitch: string | null
}

export default function EditProfilePage() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [location, setLocation] = useState('')
  const [timezone, setTimezone] = useState('')
  const [twitter, setTwitter] = useState('')
  const [discord, setDiscord] = useState('')
  const [twitch, setTwitch] = useState('')

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false)
      return
    }

    const loadProfile = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .limit(1)
        .maybeSingle<ProfileRow>()

      if (error) {
        console.error(error)
        setError(error.message)
      } else if (data) {
        setUsername(data.username ?? '')
        setDisplayName(data.display_name ?? '')
        setBio(data.bio ?? '')
        setAvatarUrl(data.avatar_url ?? '')
        setLocation(data.location ?? '')
        setTimezone(data.timezone ?? '')
        setTwitter(data.twitter ?? '')
        setDiscord(data.discord ?? '')
        setTwitch(data.twitch ?? '')
      }

      setLoading(false)
    }

    void loadProfile()
  }, [isConnected, address])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!address) return

    const cleanUsername = username.trim()

    if (!cleanUsername) {
      setError('Username is required')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      wallet_address: address.toLowerCase(),
      username: cleanUsername,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      location: location.trim() || null,
      timezone: timezone.trim() || null,
      twitter: twitter.trim() || null,
      discord: discord.trim() || null,
      twitch: twitch.trim() || null,
    }

    try {
      // Wallet signature proves ownership (since we aren't using Supabase Auth)
      const message = `DND721 Profile Update\nWallet: ${payload.wallet_address}\nTime: ${new Date().toISOString()}`
      const signature = await signMessageAsync({ message })

      const res = await fetch('/api/profiles/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          message,
          signature,
        }),
      })

      const body = await res.json()

      setSaving(false)

      if (!res.ok || !body?.ok) {
        setError(body?.error || 'Failed to save profile')
        return
      }

      router.push(`/profile/${encodeURIComponent(payload.username)}`)
    } catch (err: any) {
      console.error(err)
      setSaving(false)
      setError(err?.message || 'Failed to save profile')
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-4">
        <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>
        <p className="text-sm text-gray-400">Connect your wallet to create or edit your profile.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-4">
        <p className="text-sm text-gray-400">Loading your profile…</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Username</label>
          <input
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="your-name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">This is your public handle. It must be unique.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Display name</label>
          <input
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="How you want to appear"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Bio</label>
          <textarea
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            rows={4}
            placeholder="A few lines about you as a player or DM…"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Avatar URL</label>
          <input
            className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="https://..."
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Location</label>
            <input
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="City, Country"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Timezone</label>
            <input
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="e.g. EST, PST, GMT+1"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Twitter / X</label>
            <input
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="@handle"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Discord</label>
            <input
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="username#0000"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Twitch</label>
            <input
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              placeholder="channel name"
              value={twitch}
              onChange={(e) => setTwitch(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}
