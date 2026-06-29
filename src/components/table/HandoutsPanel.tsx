'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/ToastHub'
import { useProfileNames } from '@/hooks/useProfileNames'

export type Handout = {
  id: string
  session_id: string
  uploader_wallet: string
  title: string
  content: string
  content_type: 'text' | 'image' | 'url'
  revealed: boolean
  /** Wallets this handout was revealed to individually (contest winners). */
  revealed_to?: string[] | null
  created_at: string
}

const CONTEST_SKILLS = [
  'investigation', 'perception', 'insight', 'arcana', 'history',
  'nature', 'religion', 'survival', 'medicine',
] as const

interface Props {
  sessionId: string
  isGm: boolean
  gmWallet: string | null   // needed for GM auth header
  /** The viewing player's wallet — lets the API include handouts revealed only to them. */
  playerWallet?: string | null
}

export function HandoutsPanel({ sessionId, isGm, gmWallet, playerWallet }: Props) {
  const [handouts, setHandouts] = useState<Handout[]>([])
  const [loading, setLoading] = useState(true)

  // Create form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState<'text' | 'image' | 'url'>('text')
  const [creating, setCreating] = useState(false)
  const [formOpen, setFormOpen] = useState(false)

  // Contest state — GM picks a skill, then "rolls for it" per handout.
  const [contestSkill, setContestSkill] = useState<string>('investigation')
  const [contesting, setContesting] = useState<string | null>(null)

  const fetchHandouts = useCallback(async () => {
    const params = new URLSearchParams({ sessionId })
    if (isGm && gmWallet) params.set('gmWallet', gmWallet)
    if (!isGm && playerWallet) params.set('wallet', playerWallet)
    const res = await fetch(`/api/handouts?${params}`)
    if (res.ok) {
      const { handouts: rows } = await res.json()
      setHandouts(rows ?? [])
    }
    setLoading(false)
  }, [sessionId, isGm, gmWallet, playerWallet])

  /** GM: run a skill contest — every PC rolls; the highest gets the handout. */
  async function handleContest(h: Handout) {
    if (!gmWallet) return
    setContesting(h.id)
    try {
      const res = await fetch('/api/handouts/contest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, handoutId: h.id, gmWallet, skill: contestSkill }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success(`🎲 ${json.winner?.name ?? 'Winner'} rolled ${json.winner?.total} and receives "${h.title}".`)
        void fetchHandouts()
      } else {
        toast.error(`Contest failed: ${json?.error ?? `HTTP ${res.status}`}`)
      }
    } catch (e: any) {
      toast.error(`Contest failed: ${e?.message ?? 'network error'}`)
    } finally {
      setContesting(null)
    }
  }

  useEffect(() => {
    fetchHandouts()
  }, [fetchHandouts])

  // Real-time subscription so players see handouts the moment GM reveals them
  useEffect(() => {
    const channel = supabase
      .channel(`handouts-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_handouts', filter: `session_id=eq.${sessionId}` },
        () => fetchHandouts()
      )
      .subscribe()
    return () => void supabase.removeChannel(channel)
  }, [sessionId, fetchHandouts])

  async function handleCreate() {
    if (!title.trim() || !content.trim() || !gmWallet) return
    setCreating(true)
    try {
      const res = await fetch('/api/handouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, uploaderWallet: gmWallet, title: title.trim(), content: content.trim(), contentType }),
      })
      if (res.ok) {
        const { handout } = await res.json()
        setHandouts(prev => [...prev, handout])
        setTitle('')
        setContent('')
        setFormOpen(false)
        toast.success('Handout created.')
      } else {
        const body = await res.text().catch(() => '')
        toast.error(`Couldn't create handout (HTTP ${res.status})${body ? `: ${body.slice(0, 80)}` : ''}`)
      }
    } catch (e: any) {
      toast.error(`Network error creating handout: ${e?.message ?? 'unknown'}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleReveal(h: Handout) {
    if (!gmWallet) return
    try {
      const res = await fetch('/api/handouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: h.id, revealed: !h.revealed, gmWallet }),
      })
      if (res.ok) {
        setHandouts(prev => prev.map(x => x.id === h.id ? { ...x, revealed: !x.revealed } : x))
      } else {
        toast.error(`Couldn't toggle handout (HTTP ${res.status}).`)
      }
    } catch (e: any) {
      toast.error(`Network error: ${e?.message ?? 'unknown'}`)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this handout?')) return
    if (!gmWallet) return
    try {
      const params = new URLSearchParams({ id, gmWallet })
      const res = await fetch(`/api/handouts?${params}`, { method: 'DELETE' })
      if (res.ok) {
        setHandouts(prev => prev.filter(x => x.id !== id))
      } else {
        toast.error(`Couldn't delete handout (HTTP ${res.status}).`)
      }
    } catch (e: any) {
      toast.error(`Network error deleting handout: ${e?.message ?? 'unknown'}`)
    }
  }

  const visible = isGm ? handouts : handouts.filter(h => h.revealed)

  return (
    <div className="flex flex-col gap-3 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-200">
          Handouts
          {isGm && handouts.length > 0 && (
            <span className="ml-1.5 text-[10px] text-slate-400">
              ({handouts.filter(h => h.revealed).length}/{handouts.length} revealed)
            </span>
          )}
        </span>
        {isGm && (
          <button
            onClick={() => setFormOpen(v => !v)}
            className="rounded-md bg-amber-700/60 px-2.5 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-700/80"
          >
            {formOpen ? 'Cancel' : '+ Add'}
          </button>
        )}
      </div>

      {/* Create form */}
      {isGm && formOpen && (
        <div className="rounded-lg border border-amber-800/50 bg-slate-900/80 p-3 space-y-2">
          <input
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-600"
          />

          <div className="flex gap-2">
            {(['text', 'image', 'url'] as const).map(t => (
              <label key={t} className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                <input type="radio" checked={contentType === t} onChange={() => setContentType(t)} />
                {t === 'text' ? 'Note' : t === 'image' ? 'Image URL' : 'Link'}
              </label>
            ))}
          </div>

          <textarea
            placeholder={contentType === 'text' ? 'Write a note…' : contentType === 'image' ? 'https://…image.png' : 'https://…'}
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={4000}
            rows={3}
            className="w-full resize-none rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-600"
          />

          <button
            onClick={handleCreate}
            disabled={creating || !title.trim() || !content.trim() || !gmWallet}
            className="w-full rounded-md bg-amber-700 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-600 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create Handout'}
          </button>
        </div>
      )}

      {/* Handout list */}
      {loading && <p className="text-[11px] text-slate-500">Loading handouts…</p>}

      {!loading && visible.length === 0 && (
        <p className="text-[11px] text-slate-500">
          {isGm ? 'No handouts yet. Add one above.' : 'The GM hasn\'t revealed any handouts yet.'}
        </p>
      )}

      {/* Contest skill picker — shared across all handouts (GM only). */}
      {isGm && handouts.length > 0 && (
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>Contest skill:</span>
          <select
            value={contestSkill}
            onChange={(e) => setContestSkill(e.target.value)}
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-200 focus:border-amber-600 focus:outline-none"
          >
            {CONTEST_SKILLS.map((s) => (
              <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        {visible.map(h => (
          <HandoutCard
            key={h.id}
            handout={h}
            isGm={isGm}
            onToggleReveal={() => handleToggleReveal(h)}
            onDelete={() => handleDelete(h.id)}
            onContest={() => handleContest(h)}
            contesting={contesting === h.id}
            contestSkill={contestSkill}
          />
        ))}
      </div>
    </div>
  )
}

function HandoutCard({
  handout,
  isGm,
  onToggleReveal,
  onDelete,
  onContest,
  contesting,
  contestSkill,
}: {
  handout: Handout
  isGm: boolean
  onToggleReveal: () => void
  onDelete: () => void
  onContest?: () => void
  contesting?: boolean
  contestSkill?: string
}) {
  const [expanded, setExpanded] = useState(false)
  // Contest winners are shown by profile name, never wallet.
  const nameFor = useProfileNames(handout.revealed_to ?? [])

  return (
    <div
      className={`rounded-lg border text-xs ${
        handout.revealed
          ? 'border-amber-700/50 bg-amber-950/30'
          : 'border-slate-700 bg-slate-900/60'
      }`}
    >
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
      >
        <span className="font-semibold text-slate-100 truncate">{handout.title}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {isGm && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
              handout.revealed ? 'bg-amber-700/60 text-amber-200' : 'bg-slate-700 text-slate-400'
            }`}>
              {handout.revealed ? 'Revealed' : 'Hidden'}
            </span>
          )}
          <span className="text-slate-500">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-800 px-2.5 py-2 space-y-2">
          {handout.content_type === 'image' ? (
            <img src={handout.content} alt={handout.title} className="max-w-full rounded-lg" />
          ) : handout.content_type === 'url' ? (
            <a
              href={handout.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 underline break-all"
            >
              {handout.content}
            </a>
          ) : (
            <p className="whitespace-pre-wrap text-slate-300 leading-relaxed">{handout.content}</p>
          )}

          {isGm && (handout.revealed_to?.length ?? 0) > 0 && (
            <div className="text-[10px] text-emerald-300">
              ✓ Won by contest: {handout.revealed_to!.map((w) => nameFor(w)).join(', ')}
            </div>
          )}

          {isGm && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={onToggleReveal}
                className={`rounded px-2.5 py-1 text-[11px] font-medium ${
                  handout.revealed
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-amber-700 text-amber-100 hover:bg-amber-600'
                }`}
              >
                {handout.revealed ? 'Hide from players' : 'Reveal to players'}
              </button>
              {/* Reveal via skill contest — every PC rolls; highest gets it. */}
              {!handout.revealed && onContest && (
                <button
                  onClick={onContest}
                  disabled={contesting}
                  className="rounded bg-sky-800/60 px-2.5 py-1 text-[11px] font-medium text-sky-100 hover:bg-sky-700/70 disabled:opacity-50"
                  title={`All player characters roll ${contestSkill ?? 'the chosen skill'}; the highest roll receives this handout privately.`}
                >
                  {contesting ? 'Rolling…' : `🎲 Roll ${contestSkill ?? 'check'} for it`}
                </button>
              )}
              <button
                onClick={onDelete}
                className="rounded px-2.5 py-1 text-[11px] text-rose-400 hover:bg-slate-800"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
