'use client'

// src/components/character-sheet/LevelUpAsiModal.tsx
// Level-up ASI / Feat picker. Renders when
// `c.action_state.pending_choices.levelup_asi` is set (queued by take-class-level
// when a class level crosses an ASI breakpoint: 4/8/12/16/19, +6/14 Fighter,
// +10 Rogue). Lets the player raise ability scores or take a feat, then POSTs to
// /api/characters/[id]/apply-asi.

import { useState } from 'react'
import type { CharacterSheetData } from './types'
import { FEAT_LIST, getFeat, getFeatAbilityBonus } from '@/lib/feats'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}

type ChoiceType = 'plus2' | 'plus1plus1' | 'feat'

export function LevelUpAsiModal({
  c,
  onApplied,
}: {
  c: CharacterSheetData
  /** Called after a successful apply so the parent can refetch. */
  onApplied: () => void
}) {
  const pending = (c.action_state as any)?.pending_choices?.levelup_asi

  const [type, setType] = useState<ChoiceType>('plus2')
  const [ability1, setAbility1] = useState<AbilityKey>('str')
  const [ability2, setAbility2] = useState<AbilityKey>('dex')
  const [featKey, setFeatKey] = useState<string>('')
  const [featAbility, setFeatAbility] = useState<AbilityKey>('str')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!pending) return null

  const abilities = (c.abilities ?? {}) as Record<string, number>
  const cls = String(pending.class ?? c.main_job ?? '')
  const atLevel = Number(pending.at_total_level ?? c.level ?? 1)
  const count = Number(pending.count ?? 1)

  const featBonus = type === 'feat' && featKey ? getFeatAbilityBonus(featKey) : undefined
  const featNeedsAbilityPick = !!featBonus && featBonus.abilities.length > 1

  const valid =
    type === 'plus2' ? true :
    type === 'plus1plus1' ? ability1 !== ability2 :
    /* feat */ !!featKey && (!featNeedsAbilityPick || featBonus!.abilities.includes(featAbility))

  async function apply() {
    if (!valid || busy) return
    setBusy(true)
    setErr(null)
    try {
      const wallet = (typeof window !== 'undefined' && window.localStorage.getItem('dnd721_wallet')) || ''
      const choice =
        type === 'plus2' ? { type, ability1 } :
        type === 'plus1plus1' ? { type, ability1, ability2 } :
        { type, featName: featKey, ...(featBonus ? { featAbility } : {}) }
      const res = await fetch(`/api/characters/${c.id}/apply-asi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.toLowerCase(), choice }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Failed (${res.status})`)
      }
      onApplied()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to apply')
    } finally {
      setBusy(false)
    }
  }

  const previewScore = (k: AbilityKey, add: number) =>
    Math.min(20, Number(abilities[k] ?? 10) + add)

  return (
    <div className="rounded-xl border border-amber-500/60 bg-amber-950/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-amber-300">✦ Ability Score Improvement</span>
        <span className="text-xs text-amber-400/80">
          {cls.charAt(0).toUpperCase() + cls.slice(1)} · Level {atLevel}
          {count > 1 && ` (${count} to assign)`}
        </span>
      </div>
      <p className="text-xs text-amber-200/90">
        Raise your ability scores or take a feat.
      </p>

      {err && (
        <div className="rounded-md border border-rose-700/40 bg-rose-950/40 px-3 py-1.5 text-[11px] text-rose-200">
          {err}
        </div>
      )}

      {/* Type selector */}
      <div className="flex flex-wrap gap-2">
        {(['plus2', 'plus1plus1', 'feat'] as ChoiceType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-0.5 text-[11px] transition ${
              type === t
                ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                : 'border-slate-600 text-slate-400 hover:border-slate-400'
            }`}
          >
            {t === 'plus2' ? '+2 to one stat' : t === 'plus1plus1' ? '+1/+1 to two stats' : 'Take a Feat'}
          </button>
        ))}
      </div>

      {type === 'plus2' && (
        <div className="space-y-1 text-xs">
          <label className="text-[11px] text-slate-400">Which ability?</label>
          <select
            className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100"
            value={ability1}
            onChange={(e) => setAbility1(e.target.value as AbilityKey)}
          >
            {ABILITY_KEYS.map((k) => (
              <option key={k} value={k}>
                {ABILITY_LABELS[k]} ({abilities[k] ?? 10} → {previewScore(k, 2)})
              </option>
            ))}
          </select>
        </div>
      )}

      {type === 'plus1plus1' && (
        <div className="flex flex-wrap gap-3 items-end text-xs">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">First ability</label>
            <select
              className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100"
              value={ability1}
              onChange={(e) => setAbility1(e.target.value as AbilityKey)}
            >
              {ABILITY_KEYS.map((k) => (
                <option key={k} value={k}>{ABILITY_LABELS[k]} ({abilities[k] ?? 10} → {previewScore(k, 1)})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">Second ability</label>
            <select
              className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100"
              value={ability2}
              onChange={(e) => setAbility2(e.target.value as AbilityKey)}
            >
              {ABILITY_KEYS.map((k) => (
                <option key={k} value={k}>{ABILITY_LABELS[k]} ({abilities[k] ?? 10} → {previewScore(k, 1)})</option>
              ))}
            </select>
          </div>
          {ability1 === ability2 && (
            <span className="text-[11px] text-rose-300">Pick two different abilities.</span>
          )}
        </div>
      )}

      {type === 'feat' && (
        <div className="space-y-2 text-xs">
          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">Feat</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100"
              value={featKey}
              onChange={(e) => setFeatKey(e.target.value)}
            >
              <option value="">— Choose a feat —</option>
              {FEAT_LIST.map((feat) => (
                <option key={feat.key} value={feat.key}>
                  {feat.name}{feat.prerequisite ? ` (req: ${feat.prerequisite})` : ''}
                </option>
              ))}
            </select>
          </div>
          {featKey && (() => {
            const feat = getFeat(featKey)
            if (!feat) return null
            return (
              <div className="rounded-md border border-amber-700/30 bg-amber-900/10 px-2 py-1.5 text-[11px] text-slate-300 space-y-0.5">
                {feat.prerequisite && <p className="text-amber-300/80">Req: {feat.prerequisite}</p>}
                <p>{feat.summary}</p>
              </div>
            )
          })()}

          {/* Half-feat ability bump */}
          {featBonus && featBonus.abilities.length === 1 && (
            <p className="text-[11px] text-amber-300/90">
              This feat also grants +{featBonus.amount} {ABILITY_LABELS[featBonus.abilities[0]]}.
            </p>
          )}
          {featNeedsAbilityPick && (
            <div className="space-y-1">
              <label className="text-[11px] text-slate-400">+{featBonus!.amount} to which ability?</label>
              <select
                className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs text-slate-100"
                value={featAbility}
                onChange={(e) => setFeatAbility(e.target.value as AbilityKey)}
              >
                {featBonus!.abilities.map((k) => (
                  <option key={k} value={k}>
                    {ABILITY_LABELS[k]} ({abilities[k] ?? 10} → {previewScore(k, featBonus!.amount)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={!valid || busy}
          onClick={apply}
          className="rounded-md border border-amber-500/60 bg-amber-900/30 px-4 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-800/40 disabled:opacity-50"
        >
          {busy ? 'Applying…' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}
