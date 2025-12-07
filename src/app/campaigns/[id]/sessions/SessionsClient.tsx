'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

type Session = {
  id: string
  title: string
  description: string | null
  scheduled_start: string | null
  duration_minutes: number
  status: SessionStatus
}

type Campaign = {
  id: string
  title: string
  gm_wallet: string | null
}

interface Props {
  campaignId: string
}

export default function SessionsClient({ campaignId }: Props) {
  const { address } = useAccount()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [datetime, setDatetime] = useState('')
  const [duration, setDuration] = useState('120')
  const [creating, setCreating] = useState(false)

  const myAddress = address?.toLowerCase() ?? null

  const isGm =
    !!myAddress &&
    campaign?.gm_wallet &&
    campaign.gm_wallet.toLowerCase() === myAddress

  useEffect(() => {
    if (!campaignId) return

    const load = async () => {
      setLoading(true)
      setError(null)

      const [{ data: campaignData, error: campaignError }, { data: sessionData, error: sessionError }] =
        await Promise.all([
          supabase
            .from('campaigns')
            .select('id, title, gm_wallet')
            .eq('id', campaignId)
            .single(),
          supabase
            .from('sessions')
            .select(
              'id, title, description, scheduled_start, duration_minutes, status'
            )
            .eq('campaign_id', campaignId)
            .order('scheduled_start', { ascending: true }),
        ])

      if (campaignError) {
        console.error(campaignError)
        setError(campaignError.message)
        setLoading(false)
        return
      }

      if (sessionError) {
        console.error(sessionError)
      }

      setCampaign(campaignData as Campaign)
      setSessions((sessionData as Session[]) ?? [])
      setLoading(false)
    }

    load()
  }, [campaignId])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!campaign || !isGm) return

    if (!title.trim()) {
      setError('Title is required.')
      return
    }

    setCreating(true)
    setError(null)

    let scheduled_start: string | null = null
    if (datetime) {
      const d = new Date(datetime)
      if (!isNaN(d.getTime())) {
        scheduled_start = d.toISOString()
      }
    }

    const parsedDuration = Number(duration) || 120

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        campaign_id: campaign.id,
        title: title.trim(),
        description: description.trim() || null,
        scheduled_start,
        duration_minutes: parsedDuration,
        status: 'planned',
        gm_wallet: campaign.gm_wallet,
      })
      .select(
        'id, title, description, scheduled_start, duration_minutes, status'
      )
      .single()

    if (error) {
      console.error(error)
      setError(error.message)
      setCreating(false)
      return
    }

    const session = data as Session

    setSessions(prev =>
      [...prev, session].sort((a, b) => {
        const ta = a.scheduled_start
          ? new Date(a.scheduled_start).getTime()
          : 0
        const tb = b.scheduled_start
          ? new Date(b.scheduled_start).getTime()
          : 0
        return ta - tb
      })
    )

    setTitle('')
    setDescription('')
    setDatetime('')
    setDuration('120')
    setCreating(false)
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      {loading && <p className="text-sm text-slate-300">Loading…</p>}
      {error && (
        <p className="rounded border border-red-600 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {campaign && (
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              Sessions – {campaign.title}
            </h1>
            <p className="text-xs text-slate-400">
              Campaign GM:{' '}
              {campaign.gm_wallet ? (
                <span className="font-mono">
                  {campaign.gm_wallet.slice(0, 6)}…
                  {campaign.gm_wallet.slice(-4)}
                </span>
              ) : (
                'Unknown'
              )}
            </p>
          </div>
          <Link
            href={`/campaigns/${campaign.id}`}
            className="text-xs text-sky-400 hover:text-sky-300"
          >
            ← Back to campaign
          </Link>
        </header>
      )}

      {isGm && (
        <section className="rounded border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Schedule New Session
          </h2>
          <p className="text-xs text-slate-400">
            Only the GM can create sessions for this campaign.
          </p>

          <form
            onSubmit={handleCreate}
            className="mt-4 grid gap-4 md:grid-cols-2"
          >
            <label className="space-y-1 text-sm">
              <span className="text-slate-200">Title</span>
              <input
                className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Session name"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-200">Start (local time)</span>
              <input
                type="datetime-local"
                className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none"
                value={datetime}
                onChange={e => setDatetime(e.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-slate-200">Description</span>
              <textarea
                className="min-h-[70px] w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What happens in this session?"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-200">Duration (minutes)</span>
              <input
                type="number"
                className="w-full rounded bg-slate-800 px-3 py-2 text-sm outline-none"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                min={30}
                step={15}
              />
            </label>

            <div className="flex items-end justify-end md:col-span-1">
              <button
                type="submit"
                className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                disabled={creating}
              >
                {creating ? 'Creating…' : 'Create Session'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-100">
          Sessions
        </h2>
        <p className="text-xs text-slate-400">
          Click a session to manage RSVPs and join the table.
        </p>

        <div className="mt-4 space-y-3">
          {sessions.length === 0 && (
            <p className="text-xs text-slate-400">No sessions yet.</p>
          )}

          {sessions.map(session => {
            const dateText = session.scheduled_start
              ? new Date(
                  session.scheduled_start
                ).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Time TBD'

            return (
              <div
                key={session.id}
                className="flex flex-col gap-2 rounded border border-slate-700 bg-slate-900/80 p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      {session.title}
                    </h3>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{dateText}</p>
                  {session.description && (
                    <p className="text-xs text-slate-300">
                      {session.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/sessions/${session.id}`}
                    className="rounded border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-sky-500"
                  >
                    Open Session
                  </Link>
                  <Link
                    href={`/sessions/${session.id}/table`}
                    className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
                  >
                    Join Table
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
