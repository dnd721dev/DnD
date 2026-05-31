'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'
import { InviteManager } from '@/components/invite/InviteManager'

type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

type RecordingRow = {
  id: string
  status: string
  started_at: string
  duration_sec: number | null
  file_url: string | null
  published: boolean
  episode_title: string | null
  episode_number: number | null
  master_script_status: string | null
}

type SessionRow = {
  id: string
  title: string
  description: string | null
  scheduled_start: string | null
  duration_minutes: number | null
  status: SessionStatus
  campaign_id: string
  gm_wallet: string | null
  session_type: 'set_level' | 'caya' | null
  required_level: number | null
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
  const [campaignCharacterLevel, setCampaignCharacterLevel] = useState<number | null>(null)
  const [campaignCharacterIsCaya, setCampaignCharacterIsCaya] = useState<boolean | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bug D fix: load recordings so the GM can access the editor after leaving the table
  const [recordings, setRecordings] = useState<RecordingRow[]>([])
  const [recoverLoading, setRecoverLoading] = useState<string | null>(null)

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
        .select('id, title, description, scheduled_start, duration_minutes, status, campaign_id, gm_wallet, session_type, required_level')
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

      // Fetch character level and CAYA status for join enforcement
      if (selectedId) {
        const { data: charData } = await supabase
          .from('characters')
          .select('level, is_caya')
          .eq('id', selectedId)
          .maybeSingle()
        if (charData) {
          setCampaignCharacterLevel((charData as any).level ?? null)
          setCampaignCharacterIsCaya((charData as any).is_caya ?? false)
        }
      }

      setLoading(false)
    }

    void load()
  }, [sessionId, address])

  // Bug D fix: fetch recordings whenever we have a sessionId
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/recording/${sessionId}`)
      .then((r) => (r.ok ? r.json() : { recordings: [] }))
      .then(({ recordings: rows }) => setRecordings(rows ?? []))
      .catch(() => {})
  }, [sessionId])

  async function handleRecover(recordingId: string) {
    setRecoverLoading(recordingId)
    try {
      const res = await fetch(`/api/recording/${sessionId}/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      })
      const data = await res.json()
      if (res.ok && data.recovered) {
        // Re-fetch to show updated status
        const r2 = await fetch(`/api/recording/${sessionId}`)
        if (r2.ok) {
          const { recordings: rows } = await r2.json()
          setRecordings(rows ?? [])
        }
      }
    } catch {}
    setRecoverLoading(null)
  }

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

    // ✅ Enforce session type restrictions
    if (!isGm && campaignCharacterId) {
      const sessionType = session.session_type
      const requiredLevel = session.required_level

      if (sessionType === 'set_level' && requiredLevel != null) {
        if (campaignCharacterLevel !== requiredLevel) {
          setError(
            `This session requires a level ${requiredLevel} character. Your selected character is level ${campaignCharacterLevel ?? '?'}.`
          )
          return
        }
      }

      if (sessionType === 'caya') {
        if (!campaignCharacterIsCaya) {
          setError('This is a CAYA session. You need a CAYA character to join. Create one from the Characters page.')
          return
        }
      }
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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{session.title}</h1>
            {session.session_type === 'caya' ? (
              <span className="rounded-full border border-amber-600 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                CAYA
              </span>
            ) : session.required_level ? (
              <span className="rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                Level {session.required_level} Required
              </span>
            ) : null}
          </div>
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

      {isGm && session.campaign_id && (
        <InviteManager campaignId={session.campaign_id} sessionId={session.id} />
      )}

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

      {/* Bug D fix: recordings section — visible to GM (and participants for published episodes) */}
      {recordings.length > 0 && (
        <section className="rounded border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">🎙 Recordings</h2>
          <div className="space-y-3">
            {recordings.map((r) => {
              const dateText = new Date(r.started_at).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })
              const durationText = r.duration_sec
                ? (() => {
                    const h = Math.floor(r.duration_sec / 3600)
                    const m = Math.floor((r.duration_sec % 3600) / 60)
                    const s = r.duration_sec % 60
                    return h > 0
                      ? `${h}h ${m}m`
                      : m > 0
                      ? `${m}m ${s}s`
                      : `${s}s`
                  })()
                : null

              const statusColor =
                r.status === 'completed' ? 'text-emerald-400' :
                r.status === 'recording' ? 'text-red-400' :
                r.status === 'stopped'   ? 'text-yellow-400' :
                'text-slate-500'

              const statusLabel =
                r.status === 'completed' ? '✓ Completed' :
                r.status === 'recording' ? '● Recording' :
                r.status === 'stopped'   ? '◼ Stopped'   :
                '✗ Failed'

              const isStuck = r.status === 'stopped' && !r.file_url

              return (
                <div key={r.id} className="flex flex-col gap-2 rounded border border-slate-700 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
                      {r.published && (
                        <span className="rounded-full border border-emerald-600 bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          🎙 Published
                        </span>
                      )}
                      {r.episode_number != null && (
                        <span className="text-[10px] text-slate-500">Ep. {r.episode_number}</span>
                      )}
                      {r.episode_title && (
                        <span className="text-[10px] text-slate-400">{r.episode_title}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {dateText}{durationText ? ` · ${durationText}` : ''}
                    </p>
                    {r.master_script_status === 'done' && (
                      <p className="text-[10px] text-emerald-400">📝 Script ready</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {r.file_url && (
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-slate-600 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-500"
                      >
                        ↓ Download
                      </a>
                    )}
                    {/* Recover button for stuck stopped recordings (GM only) */}
                    {isStuck && isGm && (
                      <button
                        onClick={() => handleRecover(r.id)}
                        disabled={recoverLoading === r.id}
                        className="rounded border border-yellow-700/60 bg-yellow-900/20 px-2.5 py-1 text-xs text-yellow-300 hover:bg-yellow-900/40 disabled:opacity-50"
                        title="Query LiveKit to recover this recording's status"
                      >
                        {recoverLoading === r.id ? '…' : '↻ Recover'}
                      </button>
                    )}
                    {/* Only GM sees the editor link */}
                    {isGm && (
                      <Link
                        href={`/sessions/${session.id}/recording/${r.id}`}
                        className="rounded bg-amber-900/60 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-800"
                      >
                        Open Editor
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
