'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { Scroll, Lock, DoorOpen, Plus, Crown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageHeader, Panel, EmptyState, SkeletonGrid, StatusPill } from '@/components/ui/primitives'

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

  const CampaignCard = ({ c, mine }: { c: Campaign; mine?: boolean }) => (
    <Link key={c.id} href={`/campaigns/${c.id}`} className="panel card-hover group flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {mine && <Crown className="h-4 w-4 shrink-0" style={{ color: 'var(--gold)' }} aria-label="You are GM" />}
          <h3 className="font-display truncate text-base font-bold" style={{ color: 'var(--text-hi)' }}>{c.title}</h3>
        </div>
        <StatusPill tone={c.status === 'active' ? 'ok' : 'arcane'}>{c.status ?? 'active'}</StatusPill>
      </div>
      {c.description && (
        <p className="mt-1.5 line-clamp-2 text-sm" style={{ color: 'var(--text-mid)' }}>{c.description}</p>
      )}
      <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-low)' }}>
        {c.join_mode === 'open'
          ? <><DoorOpen className="h-3.5 w-3.5" /> Open to join</>
          : <><Lock className="h-3.5 w-3.5" /> Password required</>}
      </div>
    </Link>
  )

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Your Adventures"
        title="Campaigns"
        subtitle="Gather a party, forge a story, and take your seat at the table."
        actions={<Link href="/campaigns/new" className="btn btn-primary"><Plus className="h-4 w-4" /> New Campaign</Link>}
      />

      {loading && <SkeletonGrid count={4} />}
      {error && (
        <Panel className="border-red-900/50 px-4 py-3 text-sm text-red-300">Error loading campaigns: {error}</Panel>
      )}

      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon={<Scroll className="h-6 w-6" />}
          title="No campaigns yet"
          body="Start the first one and invite your party — every legend needs a beginning."
          action={{ href: '/campaigns/new', label: '+ Create a Campaign' }}
        />
      )}

      {myCampaigns.length > 0 && (
        <section className="mb-8">
          <h2 className="eyebrow mb-3">Your Campaigns · GM</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myCampaigns.map((c) => <CampaignCard key={c.id} c={c} mine />)}
          </div>
        </section>
      )}

      {otherCampaigns.length > 0 && (
        <section>
          {myCampaigns.length > 0 && <h2 className="eyebrow mb-3">Other Campaigns</h2>}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherCampaigns.map((c) => <CampaignCard key={c.id} c={c} />)}
          </div>
        </section>
      )}
    </div>
  )
}
