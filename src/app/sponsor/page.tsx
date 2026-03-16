'use client'

import { useEffect, useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { supabase } from '@/lib/supabase'
import {
  DND721_TOKEN_ADDRESS,
  DND721_TOKEN_ABI,
  SPONSOR_MONSTER_PRICE,
  toTokenWei,
} from '@/lib/dnd721Token'

const TREASURY = (process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '') as `0x${string}`

type SessionOption = {
  id: string
  title: string | null
  scheduled_start: string | null
}

type SponsorState = 'idle' | 'signing' | 'pending' | 'success' | 'error'

export default function SponsorPage() {
  const { address, isConnected } = useAccount()
  const walletLower = address?.toLowerCase() ?? null

  const [sessions, setSessions]           = useState<SessionOption[]>([])
  const [selectedSession, setSelected]    = useState<string>('')
  const [monsterName, setMonsterName]     = useState('')
  const [monsterDesc, setMonsterDesc]     = useState('')
  const [sponsorState, setSponsorState]   = useState<SponsorState>('idle')
  const [errorMsg, setErrorMsg]           = useState<string | null>(null)
  const [pendingTx, setPendingTx]         = useState<`0x${string}` | undefined>()

  const { writeContractAsync } = useWriteContract()
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: pendingTx })

  // Load upcoming sessions
  useEffect(() => {
    supabase
      .from('sessions')
      .select('id, title, scheduled_start')
      .eq('status', 'planned')
      .order('scheduled_start', { ascending: true })
      .then(({ data }) => setSessions((data ?? []) as SessionOption[]))
  }, [])

  // Record sponsorship once tx confirmed
  useEffect(() => {
    if (!txConfirmed || !pendingTx || !walletLower || !selectedSession) return

    const record = async () => {
      const { error } = await supabase.from('sponsored_monsters').insert({
        sponsor_wallet:      walletLower,
        session_id:          selectedSession,
        monster_name:        monsterName.trim() || null,
        monster_description: monsterDesc.trim() || null,
        payment_tx_hash:     pendingTx,
        payment_amount:      SPONSOR_MONSTER_PRICE,
        status:              'pending',
      })
      if (error) { console.error('sponsor insert error', error); setSponsorState('error'); return }
      setSponsorState('success')
    }
    void record()
  }, [txConfirmed, pendingTx, walletLower, selectedSession, monsterName, monsterDesc])

  async function handleSponsor() {
    if (!isConnected || !walletLower) { alert('Connect your wallet first.'); return }
    if (!selectedSession) { alert('Select a session to sponsor.'); return }
    if (!TREASURY) { alert('Treasury wallet not configured. Contact the GM.'); return }

    setSponsorState('signing')
    setErrorMsg(null)

    try {
      const hash = await writeContractAsync({
        address:      DND721_TOKEN_ADDRESS,
        abi:          DND721_TOKEN_ABI,
        functionName: 'transfer',
        args:         [TREASURY, toTokenWei(SPONSOR_MONSTER_PRICE)],
      })
      setPendingTx(hash)
      setSponsorState('pending')
    } catch (err: any) {
      console.error('sponsor transfer error', err)
      setErrorMsg(err?.shortMessage ?? err?.message ?? 'Transaction failed.')
      setSponsorState('error')
    }
  }

  if (sponsorState === 'success') {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <div className="text-4xl mb-4">🐉</div>
        <h1 className="text-2xl font-bold text-emerald-400 mb-2">Monster Sponsored!</h1>
        <p className="text-slate-300 text-sm">
          Your monster is pending GM approval. The DM will write it into the story and let you know when it's confirmed.
        </p>
        <p className="mt-3 text-xs text-slate-500">Tx: {pendingTx}</p>
        <a
          href="/sponsor"
          onClick={() => { setSponsorState('idle'); setPendingTx(undefined); setMonsterName(''); setMonsterDesc(''); setSelected('') }}
          className="mt-6 inline-block rounded bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
        >
          Sponsor Another
        </a>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Sponsor a Monster</h1>
        <p className="mt-2 text-sm text-slate-400">
          Pay {SPONSOR_MONSTER_PRICE} DND721 tokens to have the DM write a custom monster into an upcoming session.
          You can leave the name and description blank — the DM loves creative freedom.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">

        {/* Session selector */}
        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Session *
          </label>
          <select
            value={selectedSession}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="">— pick a session —</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title ?? 'Untitled'}{s.scheduled_start ? ` · ${new Date(s.scheduled_start).toLocaleDateString()}` : ''}
              </option>
            ))}
          </select>
          {sessions.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No upcoming sessions found.</p>
          )}
        </div>

        {/* Monster name */}
        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Monster Name <span className="text-slate-600 normal-case">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. The Shadow Drake, Big Gob..."
            value={monsterName}
            onChange={(e) => setMonsterName(e.target.value)}
            maxLength={80}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Monster description */}
        <div>
          <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Description / Lore <span className="text-slate-600 normal-case">(optional)</span>
          </label>
          <textarea
            placeholder="Any flavour you want — backstory, appearance, abilities, vibe. The DM will build the stat block."
            value={monsterDesc}
            onChange={(e) => setMonsterDesc(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <p className="mt-1 text-right text-[10px] text-slate-600">{monsterDesc.length}/500</p>
        </div>

        {/* Price + CTA */}
        <div className="rounded-lg bg-slate-800/60 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-lg font-bold text-emerald-400">{SPONSOR_MONSTER_PRICE} DND721</p>
          </div>

          {!isConnected ? (
            <p className="text-sm text-slate-500">Connect wallet to sponsor</p>
          ) : sponsorState === 'error' ? (
            <div className="text-right">
              <p className="text-xs text-red-400 mb-1">{errorMsg ?? 'Failed'}</p>
              <button
                onClick={() => setSponsorState('idle')}
                className="text-xs text-slate-400 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <button
              onClick={handleSponsor}
              disabled={!selectedSession || sponsorState !== 'idle'}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
              {sponsorState === 'signing' ? 'Approve in wallet…'
                : sponsorState === 'pending' ? 'Confirming on Base…'
                : `Sponsor · ${SPONSOR_MONSTER_PRICE} DND721`}
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-600 text-center">
          Payment goes directly to the DM's treasury on Base chain. The DM reviews and approves all sponsors before the session.
        </p>
      </div>

      <p className="text-center text-xs text-slate-500">
        Looking for item shop?{' '}
        <a href="/shop" className="text-emerald-400 underline hover:text-emerald-300">Shop →</a>
      </p>
    </div>
  )
}
