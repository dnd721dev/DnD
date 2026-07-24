'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import type { Abilities } from '../../../../types/character'
import { BACKGROUNDS, type BackgroundKey } from '@/lib/backgrounds'
import { asiSlotsForClassLevel } from '@/lib/rules'
import { STANDARD_FEAT_LIST, EPIC_BOON_LIST, getFeat, getFeatAbilityBonus } from '@/lib/feats'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

const ABILITY_LABELS: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export default function NewCharacterStep3Page() {
  const router = useRouter()

  // 1) Hooks – always in the same order
  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [loading, setLoading] = useState(true)

  // Load draft once
  useEffect(() => {
    const existing = loadDraft()
    if (!existing) {
      setDraft(null)
      setLoading(false)
      return
    }

    // Ensure ability objects exist
    const fixed: CharacterDraft = {
      level: existing.level ?? 1,
      baseAbilities: {
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10,
        ...(existing.baseAbilities ?? {}),
      },
      abilityBonuses: {
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0,
        ...(existing.abilityBonuses ?? {}),
      },
      ...existing,
    }

    setDraft(fixed)
    saveDraft(fixed)
    setLoading(false)
  }, [])

  // Background ASI modifiers (2024 rules: all ability bonuses come from background)
  const bgModifiers: Partial<Abilities> = useMemo(() => {
    if (!draft?.backgroundKey) return {}
    const bg = BACKGROUNDS[draft.backgroundKey as BackgroundKey]
    if (!bg?.abilityScoreModifiers) return {}
    return { ...bg.abilityScoreModifiers } as Partial<Abilities>
  }, [draft?.backgroundKey])

  // 2) Early returns AFTER all hooks are declared
  if (loading) {
    return <div className="text-sm text-slate-300">Loading draft…</div>
  }

  if (!draft || !draft.baseAbilities || !draft.abilityBonuses) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          No character draft found. Start again from Step 1.
        </p>
        <button
          type="button"
          onClick={() => router.push('/characters/new/step1')}
          className="inline-flex items-center rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-500"
        >
          Back to Step 1
        </button>
      </div>
    )
  }

  // From here down, TypeScript can treat the draft as non-null
  const currentDraft: CharacterDraft = draft

  // 3) Helpers that rely on draft
  function handleBonusChange(ability: AbilityKey, value: string) {
    const n = Number(value)
    if (Number.isNaN(n)) return

    const next: CharacterDraft = {
      ...currentDraft,
      abilityBonuses: {
        ...currentDraft.abilityBonuses!,
        [ability]: n,
      },
    }

    setDraft(next)
    saveDraft(next)
  }

  function handleNext() {
    saveDraft(currentDraft)
    router.push('/characters/new/step4')
  }

  function handleBack() {
    saveDraft(currentDraft)
    router.push('/characters/new/step2')
  }

  // 4) Render UI
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-white">
          Step 3 — Abilities &amp; Modifiers
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Your base scores come from your NFT. Background bonuses are applied automatically.
          Use the Bonus column for any additional modifiers (point buy, house rules, etc.).
        </p>
      </div>

      {/* Summary header */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 text-xs space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-500">
          Current Build
        </p>
        <p className="text-sm font-semibold text-white">
          {currentDraft.name || 'Unnamed Hero'}
        </p>
        <p className="text-[11px] text-slate-400">
          {currentDraft.classKey ? (
            <>
              Class:{' '}
              <span className="font-semibold text-cyan-300">
                {currentDraft.classKey}
              </span>
            </>
          ) : (
            'Class not selected yet'
          )}
        </p>
        <p className="text-[11px] text-slate-400">
          {currentDraft.raceKey ? (
            <>
              Race:{' '}
              <span className="font-semibold text-cyan-300">
                {currentDraft.raceKey}
              </span>
            </>
          ) : (
            'Race not selected yet'
          )}
        </p>
      </div>

      {/* Ability grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ABILITY_KEYS.map((key) => {
          const base = currentDraft.baseAbilities![key]
          const bgBonus = bgModifiers[key] ?? 0
          const bonus = currentDraft.abilityBonuses![key]
          const total = base + bgBonus + bonus
          const mod = abilityMod(total)
          const sign = mod >= 0 ? '+' : ''

          return (
            <div
              key={key}
              className="relative overflow-hidden rounded-xl border p-3"
              style={{
                borderColor: 'var(--edge)',
                background: 'linear-gradient(180deg, var(--surface-2), var(--surface-1))',
                boxShadow: 'var(--shadow-panel)',
              }}
            >
              {/* Ability name plaque */}
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-sm font-bold uppercase tracking-wider"
                      style={{ color: 'var(--gold-bright)' }}>
                  {ABILITY_LABELS[key]}
                </span>
                {/* Big engraved modifier medallion */}
                <span
                  className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full border text-base font-bold leading-none"
                  style={{
                    borderColor: 'var(--edge-strong)',
                    background: 'radial-gradient(circle at 50% 35%, var(--surface-3), var(--bg-abyss))',
                    color: 'var(--gold-bright)',
                    boxShadow: 'inset 0 1px 0 rgba(240,200,106,0.15)',
                  }}
                  title="Ability modifier"
                >
                  {sign}{mod}
                  <span className="mt-0.5 text-[7px] uppercase tracking-widest" style={{ color: 'var(--text-low)' }}>mod</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-md border px-2 py-1.5" style={{ borderColor: 'var(--divider)', background: 'rgba(7,10,18,0.6)' }}>
                  <div className="text-[10px]" style={{ color: 'var(--text-low)' }}>Base</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-hi)' }}>{base}</div>
                </div>
                <div className="rounded-md border px-2 py-1.5" style={{ borderColor: 'var(--divider)', background: 'rgba(7,10,18,0.6)' }}>
                  <div className="text-[10px]" style={{ color: 'var(--text-low)' }}>Background</div>
                  <div className="text-sm font-semibold" style={{ color: '#7fd6ab' }}>
                    {bgBonus >= 0 ? `+${bgBonus}` : bgBonus}
                  </div>
                </div>
                <div className="rounded-md border px-2 py-1.5" style={{ borderColor: 'var(--divider)', background: 'rgba(7,10,18,0.6)' }}>
                  <div className="text-[10px]" style={{ color: 'var(--text-low)' }}>Bonus</div>
                  <input
                    type="number"
                    className="mt-0.5 w-full bg-transparent text-center text-sm font-semibold outline-none"
                    style={{ color: 'var(--gold)' }}
                    value={bonus}
                    onChange={(e) => handleBonusChange(key, e.target.value)}
                  />
                </div>
              </div>

              {/* Total bar */}
              <div className="mt-2 flex items-center justify-between rounded-md px-3 py-1.5 text-[11px]"
                   style={{ background: 'rgba(212,169,79,0.08)', border: '1px solid var(--edge)' }}>
                <span className="uppercase tracking-wide" style={{ color: 'var(--text-mid)' }}>Total</span>
                <span className="font-display text-lg font-bold" style={{ color: 'var(--text-hi)' }}>{total}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Background ASI picker (Audit Wave 4 — Bug B fix) */}
      <BackgroundAsiSection
        draft={currentDraft}
        onChange={(next) => { setDraft(next); saveDraft(next) }}
      />

      {/* ASI / Feat section */}
      {(() => {
        const asiCount = asiSlotsForClassLevel(currentDraft.classKey ?? 'fighter', currentDraft.level ?? 1)
        if (asiCount === 0) return null

        const choices = currentDraft.asiChoices ?? []

        function setChoice(index: number, patch: Partial<NonNullable<CharacterDraft['asiChoices']>[number]>) {
          const next = Array.from({ length: asiCount }, (_, i) => {
            const base = choices[i] ?? { type: 'plus2' as const }
            return i === index ? { ...base, ...patch } : base
          })
          const updated: CharacterDraft = { ...currentDraft, asiChoices: next }
          setDraft(updated)
          saveDraft(updated)
        }

        return (
          <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold text-amber-200">
                Ability Score Improvements
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                At level {currentDraft.level ?? 1} your {currentDraft.classKey ?? 'class'} earns {asiCount} ASI slot{asiCount !== 1 ? 's' : ''}.
                Each slot can raise ability scores or grant a feat.
              </p>
            </div>

            {Array.from({ length: asiCount }, (_, i) => {
              const choice = choices[i] ?? { type: 'plus2' as const }
              return (
                <div key={i} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 space-y-3 text-xs">
                  <div className="font-semibold text-slate-300">Slot {i + 1}</div>

                  {/* Type selector */}
                  <div className="flex gap-2 flex-wrap">
                    {(['plus2', 'plus1plus1', 'feat'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setChoice(i, { type: t })}
                        className={`rounded-full border px-3 py-0.5 text-[11px] transition ${
                          choice.type === t
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                            : 'border-slate-600 text-slate-400 hover:border-slate-400'
                        }`}
                      >
                        {t === 'plus2' ? '+2 to one stat' : t === 'plus1plus1' ? '+1/+1 to two stats' : 'Take a Feat'}
                      </button>
                    ))}
                  </div>

                  {choice.type === 'plus2' && (
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Which ability?</label>
                      <select
                        className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs focus:border-cyan-400 focus:outline-none"
                        value={choice.ability1 ?? 'str'}
                        onChange={(e) => setChoice(i, { ability1: e.target.value as AbilityKey })}
                      >
                        {ABILITY_KEYS.map((k) => (
                          <option key={k} value={k}>{ABILITY_LABELS[k]}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {choice.type === 'plus1plus1' && (
                    <div className="flex gap-3 items-end flex-wrap">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">First ability</label>
                        <select
                          className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs focus:border-cyan-400 focus:outline-none"
                          value={choice.ability1 ?? 'str'}
                          onChange={(e) => setChoice(i, { ability1: e.target.value as AbilityKey })}
                        >
                          {ABILITY_KEYS.map((k) => (
                            <option key={k} value={k}>{ABILITY_LABELS[k]}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Second ability</label>
                        <select
                          className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs focus:border-cyan-400 focus:outline-none"
                          value={choice.ability2 ?? 'dex'}
                          onChange={(e) => setChoice(i, { ability2: e.target.value as AbilityKey })}
                        >
                          {ABILITY_KEYS.map((k) => (
                            <option key={k} value={k}>{ABILITY_LABELS[k]}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {choice.type === 'feat' && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Feat</label>
                        <select
                          className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs focus:border-cyan-400 focus:outline-none w-full"
                          value={choice.featName ?? ''}
                          onChange={(e) => setChoice(i, { featName: e.target.value || undefined })}
                        >
                          <option value="">— Choose a feat —</option>
                          {STANDARD_FEAT_LIST.map((feat) => (
                            <option key={feat.key} value={feat.key}>
                              {feat.name}
                              {feat.prerequisite ? ` (req: ${feat.prerequisite})` : ''}
                            </option>
                          ))}
                          {/* 2024 Epic Boons unlock at character level 19 */}
                          {((currentDraft.level ?? 1) + (currentDraft.secondaryLevel ?? 0)) >= 19 && (
                            <optgroup label="⭐ Epic Boons (level 19+)">
                              {EPIC_BOON_LIST.map((feat) => (
                                <option key={feat.key} value={feat.key}>{feat.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                      {choice.featName && (() => {
                        const feat = getFeat(choice.featName)
                        if (!feat) return null
                        return (
                          <div className="rounded-md border border-amber-700/30 bg-amber-900/10 px-2 py-1.5 text-[11px] text-slate-300 space-y-0.5">
                            {feat.prerequisite && (
                              <p className="text-amber-300/80">Req: {feat.prerequisite}</p>
                            )}
                            <p>{feat.summary}</p>
                          </div>
                        )
                      })()}
                      {/* Half-feat ability bump — pick which ability gets the +1
                          (Resilient, Athlete, Observant, …). Feats with a single
                          fixed ability just show a note; the +1 is auto-applied. */}
                      {choice.featName && (() => {
                        const fb = getFeatAbilityBonus(choice.featName)
                        if (!fb) return null
                        if (fb.abilities.length === 1) {
                          return (
                            <p className="text-[11px] text-amber-300/90">
                              Also grants +{fb.amount} {ABILITY_LABELS[fb.abilities[0]]}.
                            </p>
                          )
                        }
                        const picked = choice.featAbility ?? fb.abilities[0]
                        return (
                          <div className="space-y-1">
                            <label className="text-[11px] text-slate-400">+{fb.amount} to which ability?</label>
                            <select
                              className="rounded-md border border-slate-700 bg-slate-900/80 px-2 py-1 text-xs focus:border-cyan-400 focus:outline-none"
                              value={picked}
                              onChange={(e) => setChoice(i, { featAbility: e.target.value as AbilityKey })}
                            >
                              {fb.abilities.map((k) => (
                                <option key={k} value={k}>{ABILITY_LABELS[k]}</option>
                              ))}
                            </select>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Navigation buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs md:text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
        >
          ← Back to Step 2
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs md:text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.55)] transition"
        >
          Next: Spellcasting / Equipment
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}

// ─── Background ASI picker (Audit Wave 4 — Bug B) ────────────────────────────
// 2024 PHB: each background offers 3 ability scores. Player picks distribution:
//   • +2 to one + +1 to a different one   (pattern '2-1'), OR
//   • +1 to each of all three             (pattern '1-1-1')
// Total = +3. Stored on the draft as `backgroundAsi` (per-ability bonus map).
// If draft.backgroundAsi is unset, we initialize from the background's legacy
// `abilityScoreModifiers` so the existing default carries forward.
function BackgroundAsiSection({
  draft,
  onChange,
}: {
  draft: CharacterDraft
  onChange: (next: CharacterDraft) => void
}) {
  const bg = draft.backgroundKey ? BACKGROUNDS[draft.backgroundKey as BackgroundKey] : null

  // Initialize backgroundAsi from legacy modifiers if unset, ONCE per background.
  // This runs in a useEffect-safe way via render-time check + onChange callback.
  useEffect(() => {
    if (!bg) return
    if (draft.backgroundAsi && Object.keys(draft.backgroundAsi).length > 0) return
    const init: NonNullable<CharacterDraft['backgroundAsi']> = {}
    for (const [k, v] of Object.entries(bg.abilityScoreModifiers ?? {})) {
      if (typeof v === 'number' && v > 0) init[k as AbilityKey] = v
    }
    if (Object.keys(init).length > 0) {
      onChange({ ...draft, backgroundAsi: init })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.backgroundKey])

  if (!bg) return null
  const opts = (bg.abilityScoreOptions ?? []) as AbilityKey[]
  if (opts.length === 0) return null

  const asi = (draft.backgroundAsi ?? {}) as Record<AbilityKey, number | undefined>
  // Detect current pattern from the asi map
  const filledStats = opts.filter((k) => (asi[k] ?? 0) > 0)
  const allOnes = filledStats.length === 3 && filledStats.every((k) => asi[k] === 1)
  const isPattern111 = allOnes
  // +2/+1 pattern: one stat has 2, another has 1
  const plus2Stat = (opts.find((k) => asi[k] === 2) ?? null) as AbilityKey | null
  const plus1Stat = (opts.find((k) => asi[k] === 1 && k !== plus2Stat) ?? null) as AbilityKey | null

  function setPattern111() {
    const next: NonNullable<CharacterDraft['backgroundAsi']> = {}
    for (const k of opts) next[k] = 1
    onChange({ ...draft, backgroundAsi: next })
  }

  function set21(stat2: AbilityKey | null, stat1: AbilityKey | null) {
    const next: NonNullable<CharacterDraft['backgroundAsi']> = {}
    if (stat2) next[stat2] = 2
    if (stat1 && stat1 !== stat2) next[stat1] = 1
    onChange({ ...draft, backgroundAsi: next })
  }

  const total = opts.reduce((sum, k) => sum + (asi[k] ?? 0), 0)
  const valid = total === 3 && (
    isPattern111 ||
    (plus2Stat && plus1Stat && plus2Stat !== plus1Stat)
  )

  return (
    <div className="space-y-3 rounded-lg border border-violet-900/50 bg-slate-950/60 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-300/80">
            Background ability scores
          </div>
          <div className="text-[10px] text-slate-400">
            {bg.name}: choose <em>where</em> to apply your +3 bonus
          </div>
        </div>
        <span className={`text-[10px] font-semibold ${valid ? 'text-emerald-400' : 'text-amber-300'}`}>
          {valid ? '✓ valid' : `Total ${total}/3`}
        </span>
      </div>

      {/* Pattern picker */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => set21(plus2Stat ?? opts[0], plus1Stat ?? opts[1])}
          className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition ${
            !isPattern111
              ? 'border-violet-700/60 bg-violet-900/40 text-violet-100'
              : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-violet-700/40'
          }`}
        >
          +2 / +1
        </button>
        <button
          type="button"
          onClick={setPattern111}
          className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-semibold transition ${
            isPattern111
              ? 'border-violet-700/60 bg-violet-900/40 text-violet-100'
              : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-violet-700/40'
          }`}
        >
          +1 / +1 / +1
        </button>
      </div>

      {/* Per-pattern controls */}
      {!isPattern111 && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">+2 to</label>
            <select
              value={plus2Stat ?? ''}
              onChange={(e) => set21(e.target.value ? (e.target.value as AbilityKey) : null, plus1Stat)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
            >
              <option value="">— pick —</option>
              {opts.map((k) => (
                <option key={k} value={k}>{ABILITY_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">+1 to</label>
            <select
              value={plus1Stat ?? ''}
              onChange={(e) => set21(plus2Stat, e.target.value ? (e.target.value as AbilityKey) : null)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
            >
              <option value="">— pick —</option>
              {opts.filter((k) => k !== plus2Stat).map((k) => (
                <option key={k} value={k}>{ABILITY_LABELS[k]}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex flex-wrap gap-1.5">
        {opts.map((k) => {
          const v = asi[k] ?? 0
          return (
            <span
              key={k}
              className={`rounded-md px-2 py-0.5 text-[10px] font-mono uppercase ${
                v > 0
                  ? 'bg-violet-900/40 text-violet-100 ring-1 ring-violet-700/60'
                  : 'bg-slate-800/50 text-slate-500'
              }`}
            >
              {ABILITY_LABELS[k]} {v > 0 ? `+${v}` : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}
