'use client'

import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type JoinMode = 'open' | 'password'

export default function NewCampaignPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [joinMode, setJoinMode] = useState<JoinMode>('open')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordHash = useMemo(() => {
    if (joinMode !== 'password' || !password) return null
    // simple browser-safe hash – matches /api/join route
    return typeof window !== 'undefined' ? btoa(password) : null
  }, [joinMode, password])

  const create = async () => {
    if (!isConnected || !address) {
      setError('Connect your wallet to create a campaign.')
      return
    }

    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    if (joinMode === 'password' && !password.trim()) {
      setError('Password is required for password-locked campaigns.')
      return
    }

    setSaving(true)
    setError(null)

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        gm_wallet: address,
        join_mode: joinMode,
        join_password_hash: passwordHash,
        status: 'active',
      })
      .select('id')
      .limit(1).maybeSingle()

    if (error) {
      console.error(error)
      setError(error.message)
      setSaving(false)
      return
    }

    if (data?.id) {
      router.push(`/campaigns/${data.id}`)
    } else {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">New Campaign</h1>
        <p className="text-sm text-slate-300">
          Create a new DND721 campaign, then add sessions and invite players.
        </p>
      </div>

      {!isConnected && (
        <p className="rounded border border-yellow-600 bg-yellow-950/40 px-3 py-2 text-sm text-yellow-200">
          Connect your wallet to create a campaign.
        </p>
      )}

      {error && (
        <p className="rounded border border-red-600 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-4">
        <label className="space-y-2">
          <div className="text-sm text-slate-200">Title</div>
          <input
            className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none ring-0"
            placeholder="Campaign title"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </label>

        <label className="space-y-2">
          <div className="text-sm text-slate-200">Description</div>
          <textarea
            className="min-h-[80px] w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none ring-0"
            placeholder="Short pitch, setting, tone…"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </label>

        <div className="space-y-2">
          <div className="text-sm text-slate-200">Join Mode</div>
          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                className="h-4 w-4"
                checked={joinMode === 'open'}
                onChange={() => setJoinMode('open')}
              />
              <span>Open</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="radio"
                className="h-4 w-4"
                checked={joinMode === 'password'}
                onChange={() => setJoinMode('password')}
              />
              <span>Password locked</span>
            </label>
          </div>
        </div>

        {joinMode === 'password' && (
          <label className="space-y-2">
            <div className="text-sm text-slate-200">Join Password</div>
            <input
              type="password"
              className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none ring-0"
              placeholder="Secret word players must enter"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>
        )}
      </div>

      <button
        className="mt-2 rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        onClick={create}
        disabled={saving || !isConnected}
      >
        {saving ? 'Creating…' : 'Create Campaign'}
      </button>
    </main>
  )
}
