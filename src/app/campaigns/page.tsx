'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

type Campaign = {
  id: string
  title: string
  description: string | null
  join_mode: 'open' | 'password'
  status: string | null
  gm_wallet: string | null
}

export default function CampaignsPage() {
  const { address } = useAccount()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, description, join_mode, status, gm_wallet')
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
        setError(error.message)
      } else {
        setCampaigns((data as Campaign[]) ?? [])
      }

      setLoading(false)
    }

    load()
  }, [])

  const myAddress = address?.toLowerCase() ?? null

  const myCampaigns = myAddress
    ? campaigns.filter(c => c.gm_wallet?.toLowerCase() === myAddress)
    : []

  const otherCampaigns = myAddress
    ? campaigns.filter(c => c.gm_wallet?.toLowerCase() !== myAddress)
    : campaigns

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-slate-300">
            Browse and open your DND721 campaigns.
          </p>
        </div>

        <Link
          href="/campaigns/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New Campaign
        </Link>
      </div>

      {loading && <p className="text-sm text-slate-300">Loading…</p>}
      {error && (
        <p className="text-sm text-red-400">
          Error loading campaigns: {error}
        </p>
      )}

      {!loading && campaigns.length === 0 && (
        <p className="text-sm text-slate-300">No campaigns yet.</p>
      )}

      {myCampaigns.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Your Campaigns (GM)
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {myCampaigns.map(c => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="rounded border border-slate-700 bg-slate-900/60 p-4 hover:border-indigo-500"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{c.title}</h3>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
                    {c.status ?? 'active'}
                  </span>
                </div>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                    {c.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {c.join_mode === 'open' ? 'Open to join' : 'Password required'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {otherCampaigns.length > 0 && (
        <section className="space-y-3">
          {myCampaigns.length > 0 && (
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Other Campaigns
            </h2>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {otherCampaigns.map(c => (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="rounded border border-slate-700 bg-slate-900/60 p-4 hover:border-sky-500"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{c.title}</h3>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
                    {c.status ?? 'active'}
                  </span>
                </div>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                    {c.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {c.join_mode === 'open' ? 'Open to join' : 'Password required'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
