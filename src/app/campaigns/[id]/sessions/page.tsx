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

type CharacterRow = {
  id: string
  name: string
  level: number | null
  class_key: string | null
  race_key: string | null
}

type SessionPlayerRow = {
  session_id: string
  wallet_address: string
  character_id: string | null
  role: string
  is_ready: boolean
}

type CampaignParticipantRow = {
  wallet_address: string
  role: string
}

function normalizeParam(v: string | string[] | undefined): string {
  if (!v) return ''
  return Array.isArray(v) ? v[0] ?? '' : v
}

export default function SessionPage() {
  const router = useRouter()
  const params = useParams() as unknown as { id?: string | string[] } | null
  const { address, isConnected } = useAccount()

  // ✅ never touch params.id directly without guarding
  const sessionId = useMemo(() => normalizeParam(params?.id), [params])

  const [session, setSession] = useState<SessionRow | null>(null)
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [sessionPlayer, setSessionPlayer] = useState<SessionPlayerRow | null>(null)
  const [isCampaignParticipant, setIsCampaignParticipant] = useState(false)

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const myAddress = address?.toLowerCase() ?? null

  const isGm = useMemo(() => {
    if (!session || !myAddress || !session.gm_wallet) return false
    return session.gm_wallet.toLowerCase() === myAddress
  }, [session, myAddress])

  const requiresCharacter = !isGm

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select(
          'id, title, description, scheduled_start, duration_minutes, status, campaign_id, gm_wallet'
        )
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        setSession(null)
        setError(sessionError?.message ?? 'Session not found.')
        setLoading(false)
        return
      }

      const sessionRow = sessionData as SessionRow
      setSession(sessionRow)

      if (!address) {
        setLoading(false)
        return
      }

      const campaignId = sessionRow.campaign_id
      if (!campaignId) {
        setError('Session is missing campaign_id.')
        setLoading(false)
        return
      }

      const [
        { data: charactersData },
        { data: sessionPlayerData },
        { data: campaignParticipantData },
      ] = await Promise.all([
        supabase
          .from('characters')
          .select('id, name, level, class_key, race_key')
          .eq('wallet_address', address)
          .order('created_at', { ascending: true }),

        supabase
          .from('session_players')
          .select('session_id, wallet_address, character_id, role, is_ready')
          .eq('session_id', sessionRow.id)
          .eq('wallet_address', address)
          .maybeSingle(),

        supabase
          .from('campaign_participants')
          .select('wallet_address, role')
          .eq('campaign_id', campaignId)
          .eq('wallet_address', address),
      ])

      const chars = (charactersData as CharacterRow[]) ?? []
      setCharacters(chars)

      const sp = (sessionPlayerData as SessionPlayerRow | null) ?? null
      setSessionPlayer(sp)
      if (sp?.character_id) setSelectedCharacterId(sp.character_id)

      const isParticipant =
        ((campaignParticipantData as CampaignParticipantRow[] | null) ?? []).length > 0

      setIsCampaignParticipant(isParticipant || isGm)
      setLoading(false)
    }

    load()
  }, [sessionId, address, isGm])

  const handleSaveSelection = async () => {
    if (!session || !address) return

    if (requiresCharacter && !selectedCharacterId) {
      setError('Select a character before joining the table.')
      return
    }

    setSaving(true)
    setError(null)

    const role = sessionPlayer?.role ?? (isGm ? 'gm' : 'player')

    const { data, error } = await supabase
      .from('session_players')
      .upsert(
        {
          session_id: session.id,
          wallet_address: address,
          character_id: selectedCharacterId,
          role,
          is_ready: sessionPlayer?.is_ready ?? false,
        },
        { onConflict: 'session_id,wallet_address' }
      )
      .select('session_id, wallet_address, character_id, role, is_ready')
      .single()

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    setSessionPlayer(data as SessionPlayerRow)
    setSaving(false)
  }

  const handleJoinTable = () => {
    if (!session) return
    if (requiresCharacter && !selectedCharacterId) {
      setError('Select a character and save before joining the table.')
      return
    }
    router.push(`/sessions/${session.id}/table`)
  }

  if (!session) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
        {loading && <p className="text-sm text-slate-300">Loading session…</p>}
        {error && (
          <p className="rounded border border-red-600 bg-red-950/40 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        {!loading && !error && (
          <p className="text-sm text-slate-300">Session not found.</p>
        )}
      </main>
    )
  }

  const scheduledText = session.scheduled_start
    ? new Date(session.scheduled_start).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Time TBD'

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      {error && (
        <p className="rounded border border-red-600 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <header className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{session.title}</h1>
          <p className="text-xs text-slate-400">
            Status: <span className="font-medium">{session.status}</span> • Scheduled:{' '}
            <span className="font-medium">{scheduledText}</span>
          </p>
          {session.description && (
            <p className="mt-2 text-sm text-slate-200">{session.description}</p>
          )}
        </div>

        <div className="flex flex-col items-start gap-2 md:items-end">
          <Link
            href={`/campaigns/${session.campaign_id}`}
            className="text-xs text-sky-400 hover:text-sky-300"
          >
            ← Back to campaign
          </Link>

          {session.gm_wallet && (
            <p className="text-xs text-slate-400">
              GM:{' '}
              <span className="font-mono">
                {session.gm_wallet.slice(0, 6)}…{session.gm_wallet.slice(-4)}
              </span>
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
          <Link
            href={`/campaigns/${session.campaign_id}`}
            className="text-sky-400 hover:text-sky-300"
          >
            campaign page
          </Link>{' '}
          and join first.
        </p>
      )}

      {isConnected && (isCampaignParticipant || isGm) && (
        <section className="rounded border border-slate-700 bg-slate-900/60 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Your Character for this Session
              </h2>
              <p className="text-xs text-slate-400">
                Select which character you&apos;re bringing to this table.
                {isGm &&
                  ' As GM, this is optional – you can still join the table without selecting.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                className="rounded border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-sky-500 disabled:opacity-50"
                onClick={handleSaveSelection}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Selection'}
              </button>
              <button
                className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                onClick={handleJoinTable}
                disabled={saving}
              >
                Join Table
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {characters.length === 0 && !isGm && (
              <p className="text-xs text-slate-400">
                You don&apos;t have any characters yet. Create one on the{' '}
                <Link href="/characters/new" className="text-sky-400 hover:text-sky-300">
                  character builder
                </Link>{' '}
                and then come back here.
              </p>
            )}

            {characters.length === 0 && isGm && (
              <p className="text-xs text-slate-400">
                You have no characters. That&apos;s fine – as GM you can still run the table without
                one.
              </p>
            )}

            {characters.length > 0 && (
              <div className="grid gap-2 md:grid-cols-2">
                {characters.map((c) => {
                  const parts: string[] = []
                  if (c.level != null) parts.push(`Lv ${c.level}`)
                  if (c.race_key) parts.push(c.race_key)
                  if (c.class_key) parts.push(c.class_key)

                  const label = parts.join(' • ')
                  const isSelected = selectedCharacterId === c.id

                  return (
                    <label
                      key={c.id}
                      className={`flex cursor-pointer items-center gap-3 rounded border px-3 py-2 text-xs ${
                        isSelected
                          ? 'border-sky-500 bg-sky-900/40'
                          : 'border-slate-700 bg-slate-900/60 hover:border-sky-500'
                      }`}
                    >
                      <input
                        type="radio"
                        className="h-4 w-4"
                        checked={isSelected}
                        onChange={() => setSelectedCharacterId(c.id)}
                      />
                      <div>
                        <div className="font-semibold text-slate-100">
                          {c.name || 'Unnamed Character'}
                        </div>
                        {label && <div className="text-[11px] text-slate-400">{label}</div>}
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
