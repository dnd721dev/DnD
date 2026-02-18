'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
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

type CharacterRow = {
  id: string
  name: string
  level: number | null
  class_key: string | null
  race_key: string | null
}

function shortWallet(w: string) {
  if (!w) return ''
  return `${w.slice(0, 6)}…${w.slice(-4)}`
}

export default function CampaignPage() {
  const params = useParams<{ id: string }>()
  const { address, isConnected } = useAccount()

  const campaignId = typeof params?.id === 'string' ? params.id : ''
  const myAddress = address?.toLowerCase() ?? null

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [joinPassword, setJoinPassword] = useState('')
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // Campaign character selection flow
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [campaignCharacterId, setCampaignCharacterId] = useState<string | null>(null)
  const [charLoading, setCharLoading] = useState(false)
  const [savingChar, setSavingChar] = useState(false)

  // Modal
  const [showCharacterModal, setShowCharacterModal] = useState(false)

  const isGm = useMemo(() => {
    if (!myAddress || !campaign?.gm_wallet) return false
    return campaign.gm_wallet.toLowerCase() === myAddress
  }, [campaign?.gm_wallet, myAddress])

  const isParticipant = useMemo(() => {
    if (!myAddress) return false
    return participants.some(p => p.wallet_address.toLowerCase() === myAddress)
  }, [participants, myAddress])

  // ---------- load campaign + participants ----------
  useEffect(() => {
    if (!campaignId) return

    const load = async () => {
      setLoading(true)
      setError(null)

      const [{ data: campaignData, error: campaignError }, { data: participantData, error: participantError }] =
        await Promise.all([
          supabase
            .from('campaigns')
            .select('id, title, description, join_mode, status, gm_wallet, join_password_hash')
            .eq('id', campaignId)
            .limit(1)
            .maybeSingle(),
          supabase.from('campaign_participants').select('wallet_address, role').eq('campaign_id', campaignId),
        ])

      if (campaignError) {
        console.error(campaignError)
        setError(campaignError.message)
        setLoading(false)
        return
      }

      if (participantError) console.error(participantError)

      setCampaign(campaignData as Campaign)
      setParticipants((participantData as Participant[]) ?? [])
      setLoading(false)
    }

    void load()
  }, [campaignId])

  // ---------- load my characters + my campaign character selection ----------
  useEffect(() => {
    if (!campaign || !address) {
      setCharacters([])
      setCampaignCharacterId(null)
      setSelectedCharacterId(null)
      return
    }

    const loadMine = async () => {
      setCharLoading(true)

      const [charsRes, selRes] = await Promise.all([
        supabase
          .from('characters')
          .select('id, name, level, class_key, race_key')
          .eq('wallet_address', (myAddress ?? '').toLowerCase())
          .order('created_at', { ascending: true }),
        supabase
          .from('campaign_character_selections')
          .select('character_id')
          .eq('campaign_id', campaign.id)
          .eq('wallet_address', (myAddress ?? '').toLowerCase())
          .limit(1)
          .maybeSingle(),
      ])

      if (charsRes.error) console.error('characters load error', charsRes.error)
      if (selRes.error) console.error('campaign_character_selections load error', selRes.error)

      const chars = (charsRes.data as CharacterRow[]) ?? []
      setCharacters(chars)

      const existingCharacterId = (selRes.data as any)?.character_id ?? null
      setCampaignCharacterId(existingCharacterId)
      setSelectedCharacterId(existingCharacterId ?? chars[0]?.id ?? null)

      setCharLoading(false)
    }

    void loadMine()
  }, [campaign?.id, address])

  // ---------- join campaign, then force character pick ----------
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

    const { error: upsertError } = await supabase.from('campaign_participants').upsert(
      {
        campaign_id: campaign.id,
        wallet_address: myAddress,
        role,
      },
      { onConflict: 'campaign_id,wallet_address' }
    )

    if (upsertError) {
      console.error(upsertError)
      setError(upsertError.message)
      setJoining(false)
      return
    }

    setParticipants(prev => {
      const existingIndex = prev.findIndex(p => p.wallet_address.toLowerCase() === (myAddress ?? ''))
      const updated = [...prev]
      if (existingIndex >= 0) updated[existingIndex] = { wallet_address: myAddress ?? '', role }
      else updated.push({ wallet_address: myAddress ?? '', role })
      return updated
    })

    setJoining(false)

    // ✅ Now force character selection for players
    if (!isGm) {
      setShowCharacterModal(true)
    }
  }

  // ---------- save campaign default character ----------
  const handleSaveCampaignCharacter = async () => {
    if (!campaign || !myAddress) return

    // GM can skip
    if (!isGm && !selectedCharacterId) {
      setError('Select a character to join this campaign.')
      return
    }

    setSavingChar(true)
    setError(null)

    // If GM and they chose nothing, just close modal (optional)
    if (isGm && !selectedCharacterId) {
      setShowCharacterModal(false)
      setSavingChar(false)
      return
    }

    const { data, error: selErr } = await supabase
      .from('campaign_character_selections')
      .upsert(
        {
          campaign_id: campaign.id,
          wallet_address: myAddress,
          character_id: selectedCharacterId,
        },
        { onConflict: 'campaign_id,wallet_address' }
      )
      .select('character_id')
      .limit(1)
      .maybeSingle()

    if (selErr) {
      console.error(selErr)
      setError(selErr.message)
      setSavingChar(false)
      return
    }

    const savedId = (data as any)?.character_id ?? selectedCharacterId
    setCampaignCharacterId(savedId)
    setShowCharacterModal(false)
    setSavingChar(false)
  }

  const handleLeave = async () => {
    if (!isConnected || !myAddress || !campaign) return

    setLeaving(true)
    setError(null)

    const { error: leaveError } = await supabase
      .from('campaign_participants')
      .delete()
      .eq('campaign_id', campaign.id)
      .eq('wallet_address', myAddress)

    if (leaveError) {
      console.error(leaveError)
      setError(leaveError.message)
      setLeaving(false)
      return
    }

    // Optional: also clear their campaign character selection
    await supabase
      .from('campaign_character_selections')
      .delete()
      .eq('campaign_id', campaign.id)
      .eq('wallet_address', myAddress)

    setParticipants(prev => prev.filter(p => p.wallet_address.toLowerCase() !== (myAddress ?? '')))
    setCampaignCharacterId(null)
    setSelectedCharacterId(null)
    setShowCharacterModal(false)

    setLeaving(false)
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      {loading && <p className="text-sm text-slate-300">Loading…</p>}
      {error && (
        <p className="rounded border border-red-600 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
      )}

      {!loading && campaign && (
        <>
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{campaign.title}</h1>
              <p className="text-xs text-slate-400">
                Status: <span className="font-medium">{campaign.status ?? 'active'}</span> • Join Mode:{' '}
                <span className="font-medium">{campaign.join_mode === 'open' ? 'Open' : 'Password locked'}</span>
              </p>
              {campaign.description && <p className="mt-2 text-sm text-slate-200">{campaign.description}</p>}
            </div>

            <div className="flex flex-col items-stretch gap-2 md:items-end">
              {campaign.gm_wallet && (
                <p className="text-xs text-slate-400">
                  GM: <span className="font-mono">{shortWallet(campaign.gm_wallet)}</span>
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
                <div className="flex flex-col gap-2 md:items-end">
                  {/* show current campaign character */}
                  {!isGm && (
                    <div className="rounded border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-200">
                      <div className="text-[11px] text-slate-400">Campaign Character</div>
                      <div className="mt-1 font-semibold">
                        {charLoading
                          ? 'Loading…'
                          : campaignCharacterId
                            ? characters.find(c => c.id === campaignCharacterId)?.name ?? 'Selected'
                            : 'Not set'}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCharacterModal(true)}
                        className="mt-2 rounded bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sky-500"
                      >
                        Change Character
                      </button>
                    </div>
                  )}

                  <button
                    className="rounded border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-100 hover:border-red-500 hover:text-red-200"
                    onClick={handleLeave}
                    disabled={leaving}
                  >
                    {leaving ? 'Leaving…' : 'Leave Campaign'}
                  </button>
                </div>
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
                <h2 className="text-sm font-semibold text-slate-100">Sessions</h2>
                <p className="text-xs text-slate-400">View and schedule sessions for this campaign.</p>
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
            <h2 className="text-sm font-semibold text-slate-100">Participants</h2>
            <p className="text-xs text-slate-400">Wallets currently joined to this campaign.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {participants.length === 0 && <p className="text-xs text-slate-400">No participants yet.</p>}
              {participants.map(p => (
                <span
                  key={p.wallet_address}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-100"
                >
                  <span className="font-mono">{shortWallet(p.wallet_address)}</span>
                  <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                    {p.role}
                  </span>
                </span>
              ))}
            </div>
          </section>

          {/* Character picker modal */}
          {showCharacterModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-950 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Choose your Campaign Character</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      This character will be used automatically in every session table for this campaign.
                      {!isGm && ' (Required)'}
                      {isGm && ' (Optional for GM)'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-slate-400 hover:text-slate-200"
                    onClick={() => setShowCharacterModal(false)}
                  >
                    Close
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {charLoading && <p className="text-xs text-slate-400">Loading characters…</p>}

                  {!charLoading && characters.length === 0 && !isGm && (
                    <p className="text-xs text-slate-300">
                      You don&apos;t have any characters yet. Create one on the{' '}
                      <Link href="/characters/new" className="text-sky-400 hover:text-sky-300">
                        character builder
                      </Link>
                      .
                    </p>
                  )}

                  {!charLoading && characters.length > 0 && (
                    <div className="grid gap-2 md:grid-cols-2">
                      {characters.map(c => {
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
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-100">{c.name || 'Unnamed Character'}</div>
                              {label && <div className="text-[11px] text-slate-400">{label}</div>}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCharacterModal(false)}
                    className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={savingChar || (!isGm && !selectedCharacterId)}
                    onClick={handleSaveCampaignCharacter}
                    className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    {savingChar ? 'Saving…' : 'Save Character'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}
