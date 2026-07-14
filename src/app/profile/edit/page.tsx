'use client'

import { useEffect, useState, FormEvent } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  DICE_PRESETS,
  resolveDicePrefs,
  type DiceMaterial,
  type DicePrefs,
} from '@/lib/diceSkins'

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
  dice_prefs: DicePrefs | null
}

export default function EditProfilePage() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [awaitingSignature, setAwaitingSignature] = useState(false)
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

  // 3D dice customization
  const [diceBody, setDiceBody] = useState('#1e3a8a')
  const [diceNumber, setDiceNumber] = useState('#f8fafc')
  const [diceMaterial, setDiceMaterial] = useState<DiceMaterial>('plastic')
  const [diceSound, setDiceSound] = useState(true)
  const [diceVolume, setDiceVolume] = useState(0.5)

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
        const dp = resolveDicePrefs(data.dice_prefs ?? null)
        setDiceBody(dp.bodyColor ?? '#1e3a8a')
        setDiceNumber(dp.numberColor)
        setDiceMaterial(dp.material)
        setDiceSound(dp.soundEnabled)
        setDiceVolume(dp.soundVolume)
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
      dice_prefs: {
        bodyColor: diceBody,
        numberColor: diceNumber,
        material: diceMaterial,
        soundEnabled: diceSound,
        soundVolume: diceVolume,
      } as DicePrefs,
    }

    try {
      // Wallet signature proves ownership (since we aren't using Supabase Auth).
      // WalletConnect sends the prompt to the phone wallet; if it's missed or
      // the relay drops it the promise never settles, so race a timeout to
      // avoid a permanently stuck "Saving…" button.
      const message = `DND721 Profile Update\nWallet: ${payload.wallet_address}\nTime: ${new Date().toISOString()}`
      setAwaitingSignature(true)
      let signature: string
      try {
        signature = await Promise.race([
          signMessageAsync({ message }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Signature request timed out. Open your wallet app and approve the "DND721 Profile Update" request, then try again.')), 60_000)
          ),
        ])
      } finally {
        setAwaitingSignature(false)
      }

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
      <div className="dossier max-w-xl mx-auto mt-10 p-4">
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

        {/* ── 3D Dice ── */}
        <div className="rounded-xl border border-gray-700 bg-gray-900/60 p-4">
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-semibold">🎲 Dice</label>
            {/* Live preview */}
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black shadow-inner"
              style={{
                background: diceMaterial === 'glass' ? `${diceBody}cc` : diceBody,
                color: diceNumber,
                border: diceMaterial === 'metal' ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(0,0,0,0.3)',
                boxShadow: diceMaterial === 'metal' ? 'inset 0 1px 3px rgba(255,255,255,0.4)' : 'inset 0 -2px 4px rgba(0,0,0,0.4)',
              }}
              title="Preview"
            >
              20
            </span>
          </div>
          <p className="mb-3 text-xs text-gray-500">Customize how your dice look and sound when you roll at the table.</p>

          {/* Presets */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {DICE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setDiceBody(p.bodyColor); setDiceNumber(p.numberColor); setDiceMaterial(p.material) }}
                className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-2 py-1 text-xs hover:border-indigo-500"
                title={p.name}
              >
                <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: p.bodyColor, border: `1px solid ${p.numberColor}` }} />
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Body color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={diceBody} onChange={(e) => setDiceBody(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-gray-700 bg-transparent" />
                <input value={diceBody} onChange={(e) => setDiceBody(e.target.value)} className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Number color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={diceNumber} onChange={(e) => setDiceNumber(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-gray-700 bg-transparent" />
                <input value={diceNumber} onChange={(e) => setDiceNumber(e.target.value)} className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Finish</label>
              <select
                value={diceMaterial}
                onChange={(e) => setDiceMaterial(e.target.value as DiceMaterial)}
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm outline-none focus:border-indigo-500"
              >
                <option value="plastic">Plastic (matte)</option>
                <option value="metal">Metal (shiny)</option>
                <option value="glass">Glass / Gem (translucent)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Sound</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDiceSound((v) => !v)}
                  className={`rounded-lg border px-2 py-1 text-xs ${diceSound ? 'border-emerald-600 bg-emerald-950/50 text-emerald-300' : 'border-gray-700 bg-gray-800 text-gray-400'}`}
                >
                  {diceSound ? '🔊 On' : '🔇 Off'}
                </button>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={diceVolume}
                  disabled={!diceSound}
                  onChange={(e) => setDiceVolume(parseFloat(e.target.value))}
                  className="flex-1 disabled:opacity-40"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
        {awaitingSignature && (
          <p className="text-xs text-amber-400">
            ✍️ Approve the signature request in your wallet to save. If you connected with
            WalletConnect, the prompt is in your wallet app on your phone.
          </p>
        )}
      </form>
    </div>
  )
}
