'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

type JoinMode = 'open' | 'password'
type ParticipantRole = 'gm' | 'player'

type Campaign = {
  id: string
  title: string
  description: string | null
  join_mode: JoinMode
  status: string | null
  gm_wallet: string | null
  join_password_hash: string | null
}

type Participant = {
  wallet_address: string
  role: ParticipantRole
}

export default function CampaignPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { address, isConnected } = useAccount()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [joinPassword, setJoinPassword] = useState('')
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const campaignId = typeof params?.id === 'string' ? params.id : ''

  const myAddress = address?.toLowerCase() ?? null

  const isGm =
    !!myAddress &&
    !!campaign?.gm_wallet &&
    campaign.gm_wallet.toLowerCase() === myAddress

  const isParticipant =
    !!myAddress &&
    participants.some(
      p => p.wallet_address.toLowerCase() === myAddress
    )

  useEffect(() => {
    if (!campaignId) return

    const load = async () => {
      setLoading(true)
      setError(null)

      const [{ data: campaignData, error: campaignError }, { data: participantData, error: participantError }] =
        await Promise.all([
          supabase
            .from('campaigns')
            .select(
              'id, title, description, join_mode, status, gm_wallet, join_password_hash'
            )
            .eq('id', campaignId)
            .single(),
          supabase
            .from('campaign_participants')
            .select('wallet_address, role')
            .eq('campaign_id', campaignId),
        ])

      if (campaignError) {
        console.error(campaignError)
        setError(campaignError.message)
        setLoading(false)
        return
      }

      if (participantError) {
        console.error(participantError)
      }

      setCampaign(campaignData as Campaign)
      setParticipants((participantData as Participant[]) ?? [])
      setLoading(false)
    }

    load()
  }, [campaignId])

  const handleJoin = async () => {
    if (!isConnected || !address) {
      setError('Connect your wallet to join this campaign.')
      return
    }

    if (!campaign) return

    setJoining(true)
    setError(null)

    // Password check if needed
    if (campaign.join_mode === 'password') {
      try {
        const res = await fetch('/api/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: joinPassword,
            hash: campaign.join_password_hash,
          }),
        })

        const body = await res.json()

        if (!body.ok) {
          setError('Incorrect password.')
          setJoining(false)
          return
        }
      } catch (err: any) {
        console.error(err)
        setError('Failed to verify password.')
        setJoining(false)
        return
      }
    }

    const role: ParticipantRole = isGm ? 'gm' : 'player'

    const { error } = await supabase
      .from('campaign_participants')
      .upsert(
        {
          campaign_id: campaign.id,
          wallet_address: address,
          role,
        },
        {
          onConflict: 'campaign_id,wallet_address',
        }
      )

    if (error) {
      console.error(error)
      setError(error.message)
      setJoining(false)
      return
    }

    setParticipants(prev => {
      const existingIndex = prev.findIndex(
        p => p.wallet_address.toLowerCase() === address.toLowerCase()
      )
      const updated = [...prev]
      if (existingIndex >= 0) {
        updated[existingIndex] = { wallet_address: address, role }
      } else {
        updated.push({ wallet_address: address, role })
      }
      return updated
    })

    setJoining(false)
  }

  const handleLeave = async () => {
    if (!isConnected || !address || !campaign) return

    setLeaving(true)
    setError(null)

    const { error } = await supabase
      .from('campaign_participants')
      .delete()
      .eq('campaign_id', campaign.id)
      .eq('wallet_address', address)

    if (error) {
      console.error(error)
      setError(error.message)
      setLeaving(false)
      return
    }

    setParticipants(prev =>
      prev.filter(
        p => p.wallet_address.toLowerCase() !== address.toLowerCase()
      )
    )

    setLeaving(false)
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      {loading && <p className="text-sm text-slate-300">Loading…</p>}
      {error && (
        <p className="rounded border border-red-600 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {!loading && campaign && (
        <>
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{campaign.title}</h1>
              <p className="text-xs text-slate-400">
                Status:{' '}
                <span className="font-medium">
                  {campaign.status ?? 'active'}
                </span>{' '}
                • Join Mode:{' '}
                <span className="font-medium">
                  {campaign.join_mode === 'open'
                    ? 'Open'
                    : 'Password locked'}
                </span>
              </p>
              {campaign.description && (
                <p className="mt-2 text-sm text-slate-200">
                  {campaign.description}
                </p>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-2 md:items-end">
              {campaign.gm_wallet && (
                <p className="text-xs text-slate-400">
                  GM:{' '}
                  <span className="font-mono">
                    {campaign.gm_wallet.slice(0, 6)}…
                    {campaign.gm_wallet.slice(-4)}
                  </span>
                </p>
              )}

              {campaign.join_mode === 'password' && !isParticipant && (
                <input
                  type="password"
                  placeholder="Join password"
                  className="w-full rounded bg-slate-800 px-3 py-1.5 text-sm md:w-52"
                  value={joinPassword}
                  onChange={e => setJoinPassword(e.target.value)}
                />
              )}

              {isParticipant ? (
                <button
                  className="rounded border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-100 hover:border-red-500 hover:text-red-200"
                  onClick={handleLeave}
                  disabled={leaving}
                >
                  {leaving ? 'Leaving…' : 'Leave Campaign'}
                </button>
              ) : (
                <button
                  className="rounded bg-sky-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  onClick={handleJoin}
                  disabled={joining || !isConnected}
                >
                  {joining ? 'Joining…' : 'Join Campaign'}
                </button>
              )}
            </div>
          </header>

          <section className="rounded border border-slate-700 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Sessions
                </h2>
                <p className="text-xs text-slate-400">
                  View and schedule sessions for this campaign.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/campaigns/${campaign.id}/sessions`}
                  className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  View Sessions
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Participants
            </h2>
            <p className="text-xs text-slate-400">
              Wallets currently joined to this campaign.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {participants.length === 0 && (
                <p className="text-xs text-slate-400">No participants yet.</p>
              )}
              {participants.map(p => (
                <span
                  key={p.wallet_address}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-100"
                >
                  <span className="font-mono">
                    {p.wallet_address.slice(0, 6)}…
                    {p.wallet_address.slice(-4)}
                  </span>
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                    {p.role}
                  </span>
                </span>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
