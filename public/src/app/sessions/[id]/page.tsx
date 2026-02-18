'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

type SessionRow = {
  id: string
  title: string
  description: string | null
  scheduled_start: string | null
  duration_minutes: number | null
  status: SessionStatus
  campaign_id: string
  gm_wallet: string | null
}

type CampaignParticipantRow = {
  wallet_address: string
  role: string
}

function normalizeParam(v: string | string[] | undefined): string {
  if (!v) return ''
  return Array.isArray(v) ? v[0] ?? '' : v
}

function shortWallet(w: string) {
  if (!w) return ''
  return `${w.slice(0, 6)}…${w.slice(-4)}`
}

export default function SessionPage() {
  const router = useRouter()
  const params = useParams() as unknown as { id?: string | string[] } | null
  const { address, isConnected } = useAccount()

  const sessionId = useMemo(() => normalizeParam(params?.id), [params])

  const [session, setSession] = useState<SessionRow | null>(null)
  const [isCampaignParticipant, setIsCampaignParticipant] = useState(false)
  const [campaignCharacterId, setCampaignCharacterId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const myAddress = address?.toLowerCase() ?? null

  const isGm = useMemo(() => {
    if (!session || !myAddress || !session.gm_wallet) return false
    return session.gm_wallet.toLowerCase() === myAddress
  }, [session, myAddress])

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      // 1) Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, title, description, scheduled_start, duration_minutes, status, campaign_id, gm_wallet')
        .eq('id', sessionId)
        .limit(1)
        .maybeSingle()

      if (sessionError || !sessionData) {
        setSession(null)
        setError(sessionError?.message ?? 'Session not found.')
        setLoading(false)
        return
      }

      const sessionRow = sessionData as SessionRow
      setSession(sessionRow)

      // If wallet not connected yet, stop here (still show session)
      if (!address) {
        setIsCampaignParticipant(false)
        setCampaignCharacterId(null)
        setLoading(false)
        return
      }

      // 2) Check campaign participant
      const campaignId = sessionRow.campaign_id
      if (!campaignId) {
        setError('Session is missing campaign_id.')
        setLoading(false)
        return
      }

      const isGmLocal =
        Boolean(sessionRow.gm_wallet) &&
        sessionRow.gm_wallet!.toLowerCase() === address.toLowerCase()

      const [cpRes, selRes] = await Promise.all([
        supabase
          .from('campaign_participants')
          .select('wallet_address, role')
          .eq('campaign_id', campaignId)
          .eq('wallet_address', address),
        supabase
          .from('campaign_character_selections')
          .select('character_id')
          .eq('campaign_id', campaignId)
          .eq('wallet_address', address)
          .limit(1)
          .maybeSingle(),
      ])

      const isParticipant = ((cpRes.data as CampaignParticipantRow[] | null) ?? []).length > 0
      setIsCampaignParticipant(isParticipant || isGmLocal)

      const selectedId = (selRes.data as any)?.character_id ?? null
      setCampaignCharacterId(selectedId)

      setLoading(false)
    }

    void load()
  }, [sessionId, address])

  const handleJoinTable = () => {
    if (!session) return

    if (!isConnected || !address) {
      setError('Connect your wallet to join the table.')
      return
    }

    if (!isGm && !isCampaignParticipant) {
      setError('You must join the campaign first.')
      return
    }

    // ✅ Enforce campaign default character for players
    if (!isGm && !campaignCharacterId) {
      setError('Pick your Campaign Character first (on the campaign page).')
      return
    }

    router.push(`/sessions/${session.id}/table`)
  }

  if (!session) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
        {loading && <p className="text-sm text-slate-300">Loading session…</p>}
        {error && (
          <p className="rounded border border-red-600 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
        )}
        {!loading && !error && <p className="text-sm text-slate-300">Session not found.</p>}
      </main>
    )
  }

  const scheduledText = session.scheduled_start
    ? new Date(session.scheduled_start).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Time TBD'

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      {error && (
        <p className="rounded border border-red-600 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
      )}

      <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{session.title}</h1>
          <p className="text-xs text-slate-400">
            Status: <span className="font-medium">{session.status}</span> • Scheduled:{' '}
            <span className="font-medium">{scheduledText}</span>
          </p>
          {session.description && <p className="mt-2 text-sm text-slate-200">{session.description}</p>}
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <Link href={`/campaigns/${session.campaign_id}`} className="text-xs text-sky-400 hover:text-sky-300">
            ← Back to campaign
          </Link>

          {session.gm_wallet && (
            <p className="text-xs text-slate-400">
              GM: <span className="font-mono">{shortWallet(session.gm_wallet)}</span>
            </p>
          )}

          {isGm && (
            <span className="rounded-full bg-purple-700/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-purple-100">
              You are the GM
            </span>
          )}
        </div>
      </header>

      {!isConnected && (
        <p className="rounded border border-yellow-600 bg-yellow-950/40 px-3 py-2 text-sm text-yellow-200">
          Connect your wallet to join this session.
        </p>
      )}

      {isConnected && !isCampaignParticipant && !isGm && (
        <p className="rounded border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
          You&apos;re not part of this campaign yet. Go to the{' '}
          <Link href={`/campaigns/${session.campaign_id}`} className="text-sky-400 hover:text-sky-300">
            campaign page
          </Link>{' '}
          and join first.
        </p>
      )}

      {isConnected && isCampaignParticipant && !isGm && !campaignCharacterId && (
        <p className="rounded border border-slate-600 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
          You need to pick your <b>Campaign Character</b> first. Go to the{' '}
          <Link href={`/campaigns/${session.campaign_id}`} className="text-sky-400 hover:text-sky-300">
            campaign page
          </Link>{' '}
          and set it.
        </p>
      )}

      <section className="rounded border border-slate-700 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Table</h2>
            <p className="text-xs text-slate-400">
              This session uses your <b>Campaign Character</b> automatically.
            </p>
          </div>

          <button
            className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            onClick={handleJoinTable}
            disabled={loading}
          >
            Join Table
          </button>
        </div>
      </section>
    </main>
  )
}
