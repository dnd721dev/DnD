'use client'

// src/components/character-sheet/MulticlassLevelUpModal.tsx
// Wave 6I — Level-up class-pick UI.
//
// When `c.action_state.pending_choices.levelup_class_pick` is set, this
// component renders a banner that lets the player advance:
//   - the primary class
//   - the existing secondary class (if any)
//   - a NEW secondary class (filtered by multiclass prereqs)
//
// Confirmation calls POST /api/characters/[id]/take-class-level which
// commits the choice atomically (level + slots + DC + attack + HP).

import { useMemo, useState } from 'react'
import type { CharacterSheetData } from './types'
import type { ClassKey } from '@/lib/subclasses'
import { MULTICLASS_PREREQS, canMulticlassInto } from '@/lib/spellcastingProgression'

// Inline class list (no shared CLASS_LIST export in subclasses.ts yet).
const ALL_CLASSES: Array<{ key: ClassKey; label: string }> = [
  { key: 'barbarian', label: 'Barbarian' },
  { key: 'bard',      label: 'Bard' },
  { key: 'cleric',    label: 'Cleric' },
  { key: 'druid',     label: 'Druid' },
  { key: 'fighter',   label: 'Fighter' },
  { key: 'monk',      label: 'Monk' },
  { key: 'paladin',   label: 'Paladin' },
  { key: 'ranger',    label: 'Ranger' },
  { key: 'rogue',     label: 'Rogue' },
  { key: 'sorcerer',  label: 'Sorcerer' },
  { key: 'warlock',   label: 'Warlock' },
  { key: 'wizard',    label: 'Wizard' },
  { key: 'artificer', label: 'Artificer' },
]

export function MulticlassLevelUpModal({
  c,
  onApplied,
}: {
  c: CharacterSheetData
  /** Called after a successful level-up so the parent can refetch. */
  onApplied: () => void
}) {
  const pending = (c.action_state as any)?.pending_choices?.levelup_class_pick
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [newClassKey, setNewClassKey] = useState<string>('')

  const primaryClass = String(c.main_job ?? '').toLowerCase() as ClassKey | ''
  const secondaryClass = String((c as any).secondary_class ?? '').toLowerCase() as ClassKey | ''
  const secondaryLevel = Number((c as any).secondary_level ?? 0)

  const abilities = (c.abilities ?? {}) as any

  // Eligible NEW classes (filtered to those the character qualifies for and
  // not already their primary/secondary).
  const eligibleNewClasses = useMemo(() => {
    if (!primaryClass) return []
    return ALL_CLASSES.filter(cls => {
      const key = cls.key
      if (key === primaryClass) return false
      if (key === secondaryClass) return false
      // No prereq table entry → assume restricted (be conservative)
      if (!MULTICLASS_PREREQS[key]) return false
      const ok = canMulticlassInto(key, abilities, primaryClass).ok
      return ok
    })
  }, [primaryClass, secondaryClass, abilities])

  if (!pending) return null

  const toLevel = Number(pending.to_level ?? 0)
  const fromLevel = Number(pending.from_level ?? 0)
  const levelsRemaining = Math.max(0, toLevel - fromLevel)

  async function pickAndApply(pickClass: 'primary' | 'secondary' | 'new', extra?: { newClassKey?: string }) {
    setBusy(true)
    setErr(null)
    try {
      const wallet = (typeof window !== 'undefined' && window.localStorage.getItem('dnd721_wallet')) || ''
      const res = await fetch(`/api/characters/${c.id}/take-class-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: wallet.toLowerCase(),
          pickClass,
          ...(extra ?? {}),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Failed (${res.status})`)
      }
      onApplied()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to apply level-up')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-amber-500/60 bg-amber-950/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-amber-300">⬆ Level Up!</span>
        <span className="text-xs text-amber-400/80">
          Level {fromLevel} → {toLevel}
          {levelsRemaining > 1 && ` (${levelsRemaining} levels to assign)`}
        </span>
      </div>

      <p className="text-xs text-amber-200/90">
        Choose which class gets this level. You can continue an existing class or take a level in a new one.
      </p>

      {err && (
        <div className="rounded-md border border-rose-700/40 bg-rose-950/40 px-3 py-1.5 text-[11px] text-rose-200">
          {err}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Primary */}
        {primaryClass && (
          <button
            type="button"
            disabled={busy}
            onClick={() => pickAndApply('primary')}
            className="rounded-md border border-amber-500/60 bg-amber-900/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-800/40 disabled:opacity-50"
          >
            Continue {primaryClass.charAt(0).toUpperCase() + primaryClass.slice(1)} ({Number(c.level ?? 1)} → {Number(c.level ?? 1) + 1})
          </button>
        )}

        {/* Secondary */}
        {secondaryClass && secondaryLevel > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => pickAndApply('secondary')}
            className="rounded-md border border-amber-500/60 bg-amber-900/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-800/40 disabled:opacity-50"
          >
            Continue {secondaryClass.charAt(0).toUpperCase() + secondaryClass.slice(1)} ({secondaryLevel} → {secondaryLevel + 1})
          </button>
        )}

        {/* New */}
        {eligibleNewClasses.length > 0 && !secondaryClass && (
          <div className="flex items-center gap-1.5">
            <select
              value={newClassKey}
              onChange={e => setNewClassKey(e.target.value)}
              className="rounded-md border border-amber-700/40 bg-slate-900/60 px-2 py-1 text-xs text-amber-200"
            >
              <option value="">— Take a new class —</option>
              {eligibleNewClasses.map(cls => (
                <option key={cls.key} value={cls.key}>{cls.label}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !newClassKey}
              onClick={() => pickAndApply('new', { newClassKey })}
              className="rounded-md border border-amber-500/60 bg-amber-900/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-800/40 disabled:opacity-50"
              title="Start a new secondary class (prereqs already validated)"
            >
              + Add Class
            </button>
          </div>
        )}
      </div>

      <p className="text-[10px] text-amber-500/70">
        Multiclass picks require minimum ability scores per PHB (e.g. Wizard: INT 13+). Ineligible classes are hidden.
      </p>
    </div>
  )
}
