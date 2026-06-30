'use client'

// src/components/character-sheet/LevelUpSubclassModal.tsx
// Subclass picker at level 3 (2024 rules). Renders when
// `c.action_state.pending_choices.levelup_subclass` is set (queued by
// take-class-level when a class reaches level 3 without a subclass). POSTs to
// /api/characters/[id]/apply-subclass, which sets the subclass and recomputes
// spell slots / DC and unions the subclass's always-prepared spells.

import { useState } from 'react'
import type { CharacterSheetData } from './types'
import { CLASS_SUBCLASSES, type ClassKey } from '@/lib/subclasses'

export function LevelUpSubclassModal({
  c,
  onApplied,
}: {
  c: CharacterSheetData
  onApplied: () => void
}) {
  const pending = (c.action_state as any)?.pending_choices?.levelup_subclass
  const [subclassKey, setSubclassKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!pending) return null

  const classKey = String(pending.class ?? '').toLowerCase() as ClassKey
  const options = CLASS_SUBCLASSES[classKey] ?? []
  const classLabel = classKey.charAt(0).toUpperCase() + classKey.slice(1)

  async function apply() {
    if (!subclassKey || busy) return
    setBusy(true)
    setErr(null)
    try {
      const wallet = (typeof window !== 'undefined' && window.localStorage.getItem('dnd721_wallet')) || ''
      const res = await fetch(`/api/characters/${c.id}/apply-subclass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.toLowerCase(), subclassKey }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Failed (${res.status})`)
      }
      onApplied()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to apply subclass')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-violet-500/60 bg-violet-950/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-violet-300">✦ Choose Your Subclass</span>
        <span className="text-xs text-violet-400/80">{classLabel} · Level 3</span>
      </div>
      <p className="text-xs text-violet-200/90">
        At level 3 your {classLabel} specializes. Pick a subclass — its features and
        always-prepared spells are applied immediately.
      </p>

      {err && (
        <div className="rounded-md border border-rose-700/40 bg-rose-950/40 px-3 py-1.5 text-[11px] text-rose-200">
          {err}
        </div>
      )}

      <div className="space-y-1 text-xs">
        <label className="text-[11px] text-slate-400">Subclass</label>
        <select
          className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100"
          value={subclassKey}
          onChange={(e) => setSubclassKey(e.target.value)}
        >
          <option value="">— Choose a subclass —</option>
          {options.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}{o.source ? ` (${o.source})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={!subclassKey || busy}
          onClick={apply}
          className="rounded-md border border-violet-500/60 bg-violet-900/30 px-4 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-800/40 disabled:opacity-50"
        >
          {busy ? 'Applying…' : 'Confirm Subclass'}
        </button>
      </div>
    </div>
  )
}
