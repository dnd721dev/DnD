'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Sponsor = {
  id: string
  sponsor_wallet: string
  session_id: string
  monster_name: string | null
  monster_description: string | null
  payment_tx_hash: string | null
  payment_amount: number
  status: 'pending' | 'approved' | 'rejected'
  gm_notes: string | null
  created_at: string
}

type Props = {
  sessionId: string
}

export default function SponsorsPanel({ sessionId }: Props) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [notesId, setNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  async function load() {
    const { data, error } = await supabase
      .from('sponsored_monsters')
      .select('id, sponsor_wallet, session_id, monster_name, monster_description, payment_tx_hash, payment_amount, status, gm_notes, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    setLoading(false)
    if (error) { console.error('sponsors load error', error); return }
    setSponsors((data ?? []) as Sponsor[])
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  async function act(id: string, status: 'approved' | 'rejected') {
    setActingId(id)
    const notes = notesId === id ? notesDraft.trim() : undefined

    const res = await fetch(`/api/sponsor/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...(notes ? { gm_notes: notes } : {}) }),
    })

    setActingId(null)

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('sponsor action error', err)
      return
    }

    // Update local state optimistically
    setSponsors((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status, gm_notes: notes ?? s.gm_notes } : s
      )
    )
    if (notesId === id) { setNotesId(null); setNotesDraft('') }
  }

  function shortWallet(w: string) {
    return w.length > 10 ? `${w.slice(0, 6)}…${w.slice(-4)}` : w
  }

  const pending  = sponsors.filter((s) => s.status === 'pending')
  const decided  = sponsors.filter((s) => s.status !== 'pending')

  return (
    <div className="flex flex-col gap-3">
      {loading && <p className="text-[11px] text-slate-400">Loading…</p>}

      {!loading && sponsors.length === 0 && (
        <p className="text-[11px] text-slate-500">No sponsored monsters for this session.</p>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-yellow-300">
            Pending Review ({pending.length})
          </span>
          {pending.map((s) => (
            <div key={s.id} className="rounded-lg border border-yellow-700/40 bg-slate-950/80 p-2.5 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-slate-100">
                    {s.monster_name || <span className="italic text-slate-400">No name — DM discretion</span>}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    From {shortWallet(s.sponsor_wallet)} · {s.payment_amount} DND721
                  </p>
                </div>
                <span className="shrink-0 rounded bg-yellow-900/40 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-300">
                  pending
                </span>
              </div>

              {s.monster_description && (
                <p className="text-[11px] text-slate-300 leading-relaxed border-l-2 border-slate-700 pl-2">
                  {s.monster_description}
                </p>
              )}

              {/* GM notes inline */}
              {notesId === s.id ? (
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="GM notes (optional)…"
                  className="w-full resize-none rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-yellow-600"
                />
              ) : (
                <button
                  onClick={() => { setNotesId(s.id); setNotesDraft(s.gm_notes ?? '') }}
                  className="text-[10px] text-slate-500 underline hover:text-slate-300"
                >
                  {s.gm_notes ? 'Edit GM notes' : '+ Add GM notes'}
                </button>
              )}

              <div className="flex gap-1.5">
                <button
                  onClick={() => act(s.id, 'approved')}
                  disabled={actingId === s.id}
                  className="flex-1 rounded bg-emerald-800 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-700 disabled:opacity-40"
                >
                  {actingId === s.id ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => act(s.id, 'rejected')}
                  disabled={actingId === s.id}
                  className="flex-1 rounded bg-slate-800 py-1 text-[11px] font-semibold text-slate-300 hover:bg-red-900/60 hover:text-red-300 disabled:opacity-40"
                >
                  Reject
                </button>
              </div>

              {s.payment_tx_hash && (
                <p className="text-[9px] text-slate-600 truncate">
                  Tx: {s.payment_tx_hash}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Decided */}
      {decided.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Decided
          </span>
          {decided.map((s) => (
            <div
              key={s.id}
              className={`rounded-lg border p-2 flex items-center justify-between gap-2 ${
                s.status === 'approved'
                  ? 'border-emerald-800/40 bg-emerald-950/30'
                  : 'border-slate-800 bg-slate-950/60'
              }`}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-slate-200 truncate">
                  {s.monster_name || <span className="italic text-slate-500">Unnamed</span>}
                </p>
                <p className="text-[9px] text-slate-500">{shortWallet(s.sponsor_wallet)}</p>
                {s.gm_notes && (
                  <p className="text-[10px] text-slate-400 mt-0.5 italic">Note: {s.gm_notes}</p>
                )}
              </div>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                  s.status === 'approved'
                    ? 'bg-emerald-900/60 text-emerald-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
