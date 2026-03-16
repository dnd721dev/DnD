'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

type Recording = {
  id: string
  status: 'recording' | 'stopped' | 'failed'
  started_at: string
  stopped_at: string | null
  file_url: string | null
  duration_sec: number | null
}

type SponsoredMonster = {
  id: string
  sponsor_wallet: string
  monster_name: string | null
  monster_description: string | null
  payment_tx_hash: string | null
  payment_amount: number
  status: 'pending' | 'approved' | 'rejected'
  gm_notes: string | null
  created_at: string
}

type Session = {
  id: string
  campaign_id: string | null
  title: string
  description: string | null
  scheduled_start: string | null
  duration_minutes: number
  gm_wallet: string | null
  status: SessionStatus
}

type ParticipantRole = 'gm' | 'player' | 'guest'
type RsvpStatus = 'invited' | 'going' | 'maybe' | 'declined'

type Participant = {
  session_id: string
  wallet_address: string
  role: ParticipantRole
  rsvp_status: RsvpStatus
  created_at: string
  // optional profile data
  profile_username?: string | null
}

interface SessionClientProps {
  sessionId: string
}

export default function SessionClient({ sessionId }: SessionClientProps) {
  const { address } = useAccount()

  const [session, setSession] = useState<Session | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [savingRsvp, setSavingRsvp] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sponsors, setSponsors] = useState<SponsoredMonster[]>([])
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [recordings, setRecordings] = useState<Recording[]>([])

  const isGm = Boolean(
    address && session?.gm_wallet &&
    session.gm_wallet.toLowerCase() === address.toLowerCase()
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      // 1) Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(
          'id, campaign_id, title, description, scheduled_start, duration_minutes, gm_wallet, status'
        )
        .eq('id', sessionId)
        .limit(1).maybeSingle()

      if (sessionError || !sessionData) {
        console.error(sessionError)
        setError(sessionError?.message ?? 'Session not found.')
        setSession(null)
        setParticipants([])
        setLoading(false)
        return
      }

      setSession(sessionData as Session)

      // 2) Load participants (with profile username if available)
      const { data: participantsData, error: participantsError } = await supabase
        .from('session_participants')
        .select(
          `
          session_id,
          wallet_address,
          role,
          rsvp_status,
          created_at,
          profiles:wallet_address (
            username
          )
        `
        )
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (participantsError) {
        console.error(participantsError)
        setError(participantsError.message)
        setParticipants([])
      } else {
        const normalized: Participant[] =
          (participantsData ?? []).map((row: any) => ({
            session_id: row.session_id,
            wallet_address: row.wallet_address,
            role: row.role,
            rsvp_status: row.rsvp_status,
            created_at: row.created_at,
            profile_username: row.profiles?.username ?? null,
          })) ?? []

        setParticipants(normalized)
      }

      setLoading(false)
    }

    load()
  }, [sessionId])

  // Load recordings for this session
  useEffect(() => {
    if (!session?.id) return
    fetch(`/api/recording/${session.id}`)
      .then((r) => r.json())
      .then(({ recordings: rows }) => {
        if (Array.isArray(rows)) setRecordings(rows as Recording[])
      })
      .catch(console.error)
  }, [session?.id])

  // Load sponsored monsters whenever session is set + user is gm
  useEffect(() => {
    if (!session?.id || !isGm) return
    supabase
      .from('sponsored_monsters')
      .select('id, sponsor_wallet, monster_name, monster_description, payment_tx_hash, payment_amount, status, gm_notes, created_at')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setSponsors((data ?? []) as SponsoredMonster[]))
  }, [session?.id, isGm])

  async function handleSponsorDecision(id: string, decision: 'approved' | 'rejected') {
    setApprovingId(id)
    const res = await fetch(`/api/sponsor/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: decision }),
    })
    if (res.ok) {
      setSponsors((prev) => prev.map((s) => s.id === id ? { ...s, status: decision } : s))
    }
    setApprovingId(null)
  }

  function fmtDuration(sec: number | null) {
    if (!sec) return ''
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m ${s}s`
  }

  function formatDateTime(value: string | null) {
    if (!value) return 'TBD'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString()
  }

  const currentParticipant = participants.find(
    (p) =>
      address && p.wallet_address.toLowerCase() === address.toLowerCase()
  )

  async function handleRsvp(nextStatus: RsvpStatus) {
    if (!address) {
      setError('Connect your wallet to RSVP.')
      return
    }

    if (!session) {
      setError('Session not loaded.')
      return
    }

    setSavingRsvp(true)
    setError(null)

    const role: ParticipantRole =
      session.gm_wallet &&
      session.gm_wallet.toLowerCase() === address.toLowerCase()
        ? 'gm'
        : currentParticipant?.role ?? 'player'

    // Upsert participant row
    const { data, error: upsertError } = await supabase
      .from('session_participants')
      .upsert(
        {
          session_id: session.id,
          wallet_address: address,
          role,
          rsvp_status: nextStatus,
        },
        {
          onConflict: 'session_id,wallet_address',
        }
      )
      .select(
        `
        session_id,
        wallet_address,
        role,
        rsvp_status,
        created_at,
        profiles:wallet_address (
          username
        )
      `
      )

    if (upsertError) {
      console.error(upsertError)
      setError(upsertError.message)
      setSavingRsvp(false)
      return
    }

    const updated = (data ?? []).map((row: any) => ({
      session_id: row.session_id,
      wallet_address: row.wallet_address,
      role: row.role,
      rsvp_status: row.rsvp_status,
      created_at: row.created_at,
      profile_username: row.profiles?.username ?? null,
    }))

    // Merge/update into participants list
    setParticipants((prev) => {
      const others = prev.filter(
        (p) =>
          !(
            address &&
            p.wallet_address.toLowerCase() === address.toLowerCase()
          )
      )
      return [...others, ...updated].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      )
    })

    setSavingRsvp(false)
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-4">
      {loading && (
        <p className="text-sm text-slate-400">Loading session…</p>
      )}

      {!loading && error && (
        <div className="rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && !session && (
        <p className="text-sm text-slate-400">Session not found.</p>
      )}

      {!loading && session && (
        <>
          {/* Session header */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold">{session.title}</h1>
                {session.description && (
                  <p className="mt-1 text-sm text-slate-200">
                    {session.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {formatDateTime(session.scheduled_start)} ·{' '}
                  {session.duration_minutes} minutes
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
                    {session.status}
                  </span>
                  {session.scheduled_start && (
                    <a
                      href={`/api/sessions/ics?sessionId=${session.id}`}
                      download
                      className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-sky-300 hover:bg-slate-700"
                      title="Download .ics to add to your calendar"
                    >
                      📅 Add to Calendar
                    </a>
                  )}
                </div>
                {session.gm_wallet && (
                  <p className="text-xs text-slate-400">
                    GM:{' '}
                    <span className="font-mono text-slate-200">
                      {session.gm_wallet.slice(0, 6)}…
                      {session.gm_wallet.slice(-4)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* RSVP Panel */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-2 text-lg font-semibold">Your RSVP</h2>

            {!address && (
              <p className="text-sm text-amber-400">
                Connect your wallet to RSVP for this session.
              </p>
            )}

            {address && (
              <>
                <p className="mb-3 text-xs text-slate-400">
                  Connected wallet:{' '}
                  <span className="font-mono text-slate-200">
                    {address.slice(0, 6)}…{address.slice(-4)}
                  </span>
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleRsvp('going')}
                    disabled={savingRsvp}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      currentParticipant?.rsvp_status === 'going'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-100 hover:bg-emerald-700/70'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Going
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRsvp('maybe')}
                    disabled={savingRsvp}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      currentParticipant?.rsvp_status === 'maybe'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-100 hover:bg-amber-700/70'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Maybe
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRsvp('declined')}
                    disabled={savingRsvp}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      currentParticipant?.rsvp_status === 'declined'
                        ? 'bg-rose-700 text-white'
                        : 'bg-slate-800 text-slate-100 hover:bg-rose-700/70'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    Declined
                  </button>
                </div>

                {currentParticipant && (
                  <p className="mt-2 text-xs text-slate-400">
                    Current status:{' '}
                    <span className="font-semibold text-slate-200">
                      {currentParticipant.rsvp_status}
                    </span>{' '}
                    ({currentParticipant.role})
                  </p>
                )}
              </>
            )}
          </section>

          {/* Participants list */}
          <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h2 className="mb-2 text-lg font-semibold">
              Participants
            </h2>
            {participants.length === 0 && (
              <p className="text-sm text-slate-400">
                No one has RSVP’d yet.
              </p>
            )}

            <ul className="space-y-2">
              {participants.map((p) => (
                <li
                  key={p.wallet_address}
                  className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-100">
                        {p.profile_username ||
                          `${p.wallet_address.slice(
                            0,
                            6
                          )}…${p.wallet_address.slice(-4)}`}
                      </span>
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                        {p.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {p.wallet_address}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                        p.rsvp_status === 'going'
                          ? 'bg-emerald-700 text-emerald-50'
                          : p.rsvp_status === 'maybe'
                          ? 'bg-amber-700 text-amber-50'
                          : p.rsvp_status === 'declined'
                          ? 'bg-rose-800 text-rose-50'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      {p.rsvp_status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Sponsored Monsters — GM only */}
          {isGm && (
            <section className="rounded-xl border border-amber-900/40 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-amber-300">
                  Sponsored Monsters
                  {sponsors.filter((s) => s.status === 'pending').length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-700 px-2 py-0.5 text-xs text-white">
                      {sponsors.filter((s) => s.status === 'pending').length} pending
                    </span>
                  )}
                </h2>
                <a
                  href="/sponsor"
                  target="_blank"
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Share sponsor link →
                </a>
              </div>

              {sponsors.length === 0 ? (
                <p className="text-sm text-slate-500">No sponsors yet for this session.</p>
              ) : (
                <ul className="space-y-3">
                  {sponsors.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-100">
                              {s.monster_name || <span className="italic text-slate-400">No name — DM's choice</span>}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                s.status === 'approved' ? 'bg-emerald-800 text-emerald-200'
                                  : s.status === 'rejected' ? 'bg-rose-900 text-rose-300'
                                  : 'bg-amber-800 text-amber-200'
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>

                          {s.monster_description && (
                            <p className="mt-1 text-xs text-slate-400 line-clamp-3">{s.monster_description}</p>
                          )}

                          <p className="mt-1.5 text-[10px] text-slate-600">
                            From: {s.sponsor_wallet.slice(0, 6)}…{s.sponsor_wallet.slice(-4)}
                            {' · '}{s.payment_amount} DND721
                            {' · '}{new Date(s.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        {s.status === 'pending' && (
                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={() => handleSponsorDecision(s.id, 'approved')}
                              disabled={approvingId === s.id}
                              className="rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleSponsorDecision(s.id, 'rejected')}
                              disabled={approvingId === s.id}
                              className="rounded bg-slate-700 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-600 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Recordings */}
          {recordings.length > 0 && (
            <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-200">Recordings</h2>
              <ul className="space-y-2">
                {recordings.map((rec) => (
                  <li
                    key={rec.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="text-slate-200">
                        {new Date(rec.started_at).toLocaleString()}
                      </span>
                      {rec.duration_sec && (
                        <span className="ml-2 text-xs text-slate-500">{fmtDuration(rec.duration_sec)}</span>
                      )}
                      <div>
                        <span
                          className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            rec.status === 'recording'
                              ? 'bg-red-900/60 text-red-300'
                              : rec.status === 'stopped'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-rose-900/40 text-rose-400'
                          }`}
                        >
                          {rec.status === 'recording' ? '● Live' : rec.status}
                        </span>
                      </div>
                    </div>
                    {rec.file_url && rec.status === 'stopped' && (
                      <a
                        href={rec.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                      >
                        Download ↓
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Table join + recap export */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">Game Table</h2>
                <p className="text-sm text-slate-400">
                  Join the live session table with map, dice, voice, and initiative.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(session.status === 'completed' || isGm) && (
                  <a
                    href={`/api/sessions/recap?sessionId=${session.id}`}
                    download
                    className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                  >
                    📄 Export Recap
                  </a>
                )}
                <Link
                  href={`/sessions/${session.id}/table`}
                  className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  Join Table
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
