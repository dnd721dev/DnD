'use client'

import { useState } from 'react'
import { roll as rollDice } from '@/lib/dice'
import { DIE_CONFIG, DIE_TYPES, type DieSides } from '@/lib/dnd5e'
import { DiceShape } from '@/components/dice/DiceShape'
import { calculateEncounterDifficulty, CR_OPTIONS, type CRKey, type Difficulty } from '@/lib/encounter'
import { PlaceCharactersPanel } from '@/components/table/PlaceCharactersPanel'

type ExternalRoll = {
  label: string
  formula: string
  result: number
}

type DMPanelProps = {
  encounterId: string
  round?: number
  onRoll: (roll: ExternalRoll) => void
  onGrantInspiration?: () => void
  sessionId?: string | null
  sessionType?: 'set_level' | 'caya' | null
  sessionStatus?: string | null
  xpAwardedAlready?: number | null
  gmWallet?: string | null
}

type AdvMode = 'normal' | 'adv' | 'dis'

const DIFF_STYLE: Record<Difficulty, { label: string; bar: string; badge: string }> = {
  trivial: { label: 'Trivial',  bar: 'bg-slate-600',  badge: 'bg-slate-700 text-slate-300' },
  easy:    { label: 'Easy',     bar: 'bg-emerald-500', badge: 'bg-emerald-900/60 text-emerald-300' },
  medium:  { label: 'Medium',   bar: 'bg-yellow-500',  badge: 'bg-yellow-900/60 text-yellow-300' },
  hard:    { label: 'Hard',     bar: 'bg-orange-500',  badge: 'bg-orange-900/60 text-orange-300' },
  deadly:  { label: 'DEADLY',   bar: 'bg-red-600',     badge: 'bg-red-900/60 text-red-300' },
}

export default function DMPanel({ encounterId, round, onRoll, onGrantInspiration, sessionId, sessionType, sessionStatus, xpAwardedAlready, gmWallet }: DMPanelProps) {
  const [advMode, setAdvMode] = useState<AdvMode>('normal')
  const [xpInput, setXpInput] = useState('')
  const [awardingXp, setAwardingXp] = useState(false)
  const [awardError, setAwardError] = useState<string | null>(null)
  const [awardSuccess, setAwardSuccess] = useState<number | null>(null)

  // Encounter difficulty calculator
  const [calcOpen, setCalcOpen] = useState(false)
  const [partyCount, setPartyCount] = useState(4)
  const [partyLevel, setPartyLevel] = useState(5)
  const [monsterCRs, setMonsterCRs] = useState<CRKey[]>(['1'])

  async function handleAwardXp() {
    const xp = parseInt(xpInput)
    if (!xp || xp <= 0 || !sessionId || !gmWallet) return
    setAwardingXp(true)
    setAwardError(null)
    try {
      const res = await fetch('/api/sessions/award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, xp_amount: xp, gm_wallet: gmWallet }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAwardError(json.error ?? 'Failed to award XP')
      } else {
        setAwardSuccess(xp)
        setXpInput('')
      }
    } catch (err: any) {
      setAwardError(err.message ?? 'Network error')
    } finally {
      setAwardingXp(false)
    }
  }

  // Custom roll picker state
  const [customSides, setCustomSides] = useState<DieSides>(20)
  const [customCount, setCustomCount] = useState(1)
  const [customMod, setCustomMod] = useState(0)

  function fmtMod(n: number) {
    return n >= 0 ? `+${n}` : `${n}`
  }

  function rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1
  }

  function handleQuickRoll(sides: DieSides) {
    const label = `GM d${sides}`
    let formula: string
    let result: number

    if (sides === 20 && advMode !== 'normal') {
      const d1 = rollDie(20)
      const d2 = rollDie(20)
      result = advMode === 'adv' ? Math.max(d1, d2) : Math.min(d1, d2)
      const modeLabel = advMode === 'adv' ? 'Advantage' : 'Disadvantage'
      formula = `2d20 (${modeLabel})`
      onRoll({ label: `GM d20 (${modeLabel})`, formula, result })
      return
    }

    result = rollDie(sides)
    formula = `1d${sides}`
    onRoll({ label, formula, result })
  }

  function handleCustomRoll() {
    const modStr = customMod !== 0 ? fmtMod(customMod) : ''
    let formula: string
    let result: number

    if (customSides === 20 && customCount === 1 && advMode !== 'normal') {
      const d1 = rollDie(20)
      const d2 = rollDie(20)
      const best = advMode === 'adv' ? Math.max(d1, d2) : Math.min(d1, d2)
      result = best + customMod
      const modeLabel = advMode === 'adv' ? 'Adv' : 'Dis'
      formula = `2d20kh1${modStr} (${modeLabel})`
    } else {
      const r = rollDice(`${customCount}d${customSides}${modStr}`)
      result = r.total
      formula = `${customCount}d${customSides}${modStr}`
    }

    onRoll({ label: `GM ${formula}`, formula, result })
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-100">
            GM Controls
          </h2>
          <p className="text-[10px] text-slate-400">
            Encounter: <span className="font-mono">{encounterId.slice(0, 8)}…</span>
          </p>
        </div>
        {round != null && (
          <div className="flex items-center gap-1 rounded-md border border-sky-700/60 bg-sky-950/60 px-2 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-400">Round</span>
            <span className="text-sm font-bold text-sky-200">{round}</span>
          </div>
        )}
      </header>

      {/* Place Characters */}
      {sessionId && (
        <section className="rounded-lg border border-sky-900/40 bg-slate-900/60 p-2">
          <p className="mb-2 text-xs font-semibold text-slate-100">Place Characters</p>
          <PlaceCharactersPanel sessionId={sessionId} encounterId={encounterId} />
        </section>
      )}

      {/* Grant Inspiration */}
      {onGrantInspiration && (
        <section className="rounded-lg border border-amber-900/40 bg-slate-900/60 p-2">
          <p className="mb-1.5 text-xs font-semibold text-slate-100">Inspiration</p>
          <button
            type="button"
            onClick={onGrantInspiration}
            className="w-full rounded-lg border border-amber-700/50 bg-amber-900/20 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-900/40"
          >
            ★ Grant Inspiration
          </button>
        </section>
      )}

      {/* Advantage mode toggle */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <p className="mb-1.5 text-xs font-semibold text-slate-100">d20 Mode</p>
        <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-0.5 gap-0.5">
          {(['normal', 'adv', 'dis'] as AdvMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => setAdvMode(mode)}
              className={`flex-1 rounded-md py-1 text-[11px] font-semibold transition ${
                advMode === mode
                  ? mode === 'adv'   ? 'bg-emerald-700/60 text-emerald-100'
                  : mode === 'dis'   ? 'bg-red-900/60 text-red-200'
                  : 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'normal' ? 'Normal' : mode === 'adv' ? '▲ Adv' : '▼ Dis'}
            </button>
          ))}
        </div>
      </section>

      {/* Quick GM rolls — die shape buttons */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <p className="mb-2 text-xs font-semibold text-slate-100">Quick Rolls</p>
        <div className="flex flex-wrap gap-1.5">
          {(DIE_TYPES as unknown as DieSides[]).map((sides) => {
            const cfg = DIE_CONFIG[sides]
            return (
              <button key={sides} type="button" onClick={() => handleQuickRoll(sides)}
                className="flex flex-col items-center gap-0.5 rounded-md border bg-slate-950 p-1.5 transition hover:scale-105 active:scale-95"
                style={{ borderColor: cfg.highlight + '55' }}
                title={`Roll ${sides === 20 && advMode !== 'normal' ? `d20 (${advMode})` : `1d${sides}`}`}
              >
                <DiceShape sides={sides} size={26} theme="icon" />
                <span className="text-[9px] font-semibold" style={{ color: cfg.highlight }}>
                  {sides === 20 && advMode === 'adv' ? '▲d20' : sides === 20 && advMode === 'dis' ? '▼d20' : `d${sides}`}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Custom roll builder */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <p className="mb-1.5 text-xs font-semibold text-slate-100">Custom Roll</p>

        {/* Die picker */}
        <div className="mb-2 flex flex-wrap gap-1">
          {(DIE_TYPES as unknown as DieSides[]).map((s) => {
            const cfg = DIE_CONFIG[s]
            const isSelected = customSides === s
            return (
              <button key={s} type="button" onClick={() => setCustomSides(s)}
                className="flex flex-col items-center rounded-md border p-1 transition"
                style={{
                  borderColor: isSelected ? cfg.highlight : cfg.highlight + '33',
                  background: isSelected ? cfg.color + '55' : 'transparent',
                  boxShadow: isSelected ? `0 0 8px ${cfg.glow}` : 'none',
                }}
              >
                <DiceShape sides={s} size={20} theme="icon" />
                <span className="text-[8px]" style={{ color: isSelected ? cfg.highlight : '#64748b' }}>d{s}</span>
              </button>
            )
          })}
        </div>

        {/* Qty + Mod */}
        <div className="mb-2 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Qty</span>
            <button type="button" onClick={() => setCustomCount(c => Math.max(1, c - 1))}
              className="h-5 w-5 rounded border border-slate-700 bg-slate-950 text-[11px] text-slate-200 hover:border-sky-500 leading-none">−</button>
            <span className="w-5 text-center text-[11px] font-bold text-slate-100">{customCount}</span>
            <button type="button" onClick={() => setCustomCount(c => Math.min(10, c + 1))}
              className="h-5 w-5 rounded border border-slate-700 bg-slate-950 text-[11px] text-slate-200 hover:border-sky-500 leading-none">+</button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Mod</span>
            <button type="button" onClick={() => setCustomMod(m => m - 1)}
              className="h-5 w-5 rounded border border-slate-700 bg-slate-950 text-[11px] text-slate-200 hover:border-sky-500 leading-none">−</button>
            <span className="w-8 text-center text-[11px] font-mono font-bold text-slate-100">{fmtMod(customMod)}</span>
            <button type="button" onClick={() => setCustomMod(m => m + 1)}
              className="h-5 w-5 rounded border border-slate-700 bg-slate-950 text-[11px] text-slate-200 hover:border-sky-500 leading-none">+</button>
          </div>
        </div>

        {/* Roll button */}
        {(() => {
          const cfg = DIE_CONFIG[customSides]
          const modStr = customMod !== 0 ? fmtMod(customMod) : ''
          const formula = `${customCount}d${customSides}${modStr}`
          return (
            <button type="button" onClick={handleCustomRoll}
              className="w-full rounded-lg border py-1.5 text-[11px] font-bold transition hover:opacity-90 active:scale-95"
              style={{
                borderColor: cfg.highlight + '88',
                background: cfg.color + '40',
                color: cfg.highlight,
                boxShadow: `0 0 10px ${cfg.glow.replace('0.8', '0.25')}`,
              }}
            >
              Roll {formula}
            </button>
          )
        })()}
      </section>

      {/* Encounter Difficulty Calculator */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/60">
        <button
          type="button"
          onClick={() => setCalcOpen((v) => !v)}
          className="flex w-full items-center justify-between px-2.5 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800/60 rounded-lg"
        >
          <span>⚔ Encounter Calculator</span>
          <span className="text-slate-400">{calcOpen ? '▲' : '▼'}</span>
        </button>

        {calcOpen && (() => {
          const partyLevels = Array.from({ length: partyCount }, () => partyLevel)
          const result = calculateEncounterDifficulty(partyLevels, monsterCRs)
          const { thresholds, adjustedXP, multiplier, difficulty } = result
          const ds = DIFF_STYLE[difficulty]
          const barPct = Math.min(100, thresholds.deadly > 0 ? (adjustedXP / (thresholds.deadly * 1.25)) * 100 : 0)

          return (
            <div className="border-t border-slate-800 px-2.5 pb-3 pt-2 space-y-2">
              {/* Party inputs */}
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-400 shrink-0">Party</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setPartyCount(c => Math.max(1, c - 1))} className="h-5 w-5 rounded border border-slate-700 bg-slate-950 text-[11px] leading-none hover:border-sky-500">−</button>
                  <span className="w-4 text-center font-bold text-slate-100">{partyCount}</span>
                  <button type="button" onClick={() => setPartyCount(c => Math.min(10, c + 1))} className="h-5 w-5 rounded border border-slate-700 bg-slate-950 text-[11px] leading-none hover:border-sky-500">+</button>
                </div>
                <span className="text-slate-500">@</span>
                <span className="text-slate-400 shrink-0">Lv</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setPartyLevel(l => Math.max(1, l - 1))} className="h-5 w-5 rounded border border-slate-700 bg-slate-950 text-[11px] leading-none hover:border-sky-500">−</button>
                  <span className="w-5 text-center font-bold text-slate-100">{partyLevel}</span>
                  <button type="button" onClick={() => setPartyLevel(l => Math.min(20, l + 1))} className="h-5 w-5 rounded border border-slate-700 bg-slate-950 text-[11px] leading-none hover:border-sky-500">+</button>
                </div>
              </div>

              {/* Monster CRs */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Monsters</span>
                  <button
                    type="button"
                    onClick={() => setMonsterCRs(prev => [...prev, '1'])}
                    className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-300 hover:border-sky-500"
                  >
                    + Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {monsterCRs.map((cr, i) => (
                    <div key={i} className="flex items-center gap-0.5">
                      <select
                        value={cr}
                        onChange={(e) => setMonsterCRs(prev => prev.map((v, j) => j === i ? e.target.value as CRKey : v))}
                        className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-200 focus:border-sky-500 focus:outline-none"
                      >
                        {CR_OPTIONS.map(c => <option key={c} value={c}>CR {c}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => setMonsterCRs(prev => prev.filter((_, j) => j !== i))}
                        className="rounded bg-slate-800 px-1 text-[10px] text-slate-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Result bar */}
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${ds.bar}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${ds.badge}`}>
                      {ds.label}
                    </span>
                    <span className="text-slate-400">
                      {adjustedXP.toLocaleString()} XP
                      {multiplier > 1 && <span className="text-slate-500"> (×{multiplier})</span>}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-0.5 text-[9px] text-slate-500 text-center">
                  {(['easy','medium','hard','deadly'] as const).map(d => (
                    <div key={d} className={`rounded px-1 py-0.5 ${difficulty === d ? DIFF_STYLE[d].badge : ''}`}>
                      <div className="capitalize">{d}</div>
                      <div className="font-mono text-slate-400">{thresholds[d].toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </section>

      {/* XP Award — only for CAYA sessions after completion */}
      {sessionType === 'caya' && sessionStatus === 'completed' && !xpAwardedAlready && !awardSuccess && (
        <section className="rounded-lg border border-amber-700/50 bg-amber-950/20 p-2">
          <p className="mb-1.5 text-xs font-semibold text-amber-200">Award Session XP</p>
          <p className="mb-2 text-[10px] text-slate-400">Awarded equally to all CAYA participants.</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              placeholder="XP amount"
              value={xpInput}
              onChange={(e) => setXpInput(e.target.value)}
              className="w-24 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAwardXp}
              disabled={awardingXp || !xpInput}
              className="flex-1 rounded-lg border border-amber-700/50 bg-amber-900/30 py-1.5 text-[11px] font-bold text-amber-300 hover:bg-amber-900/50 disabled:opacity-50"
            >
              {awardingXp ? 'Awarding…' : 'Award XP to All Players'}
            </button>
          </div>
          {awardError && <p className="mt-1.5 text-[10px] text-red-400">{awardError}</p>}
        </section>
      )}

      {/* XP success or already awarded */}
      {sessionType === 'caya' && sessionStatus === 'completed' && (xpAwardedAlready ?? awardSuccess) && (
        <section className="rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-2">
          <p className="text-xs font-semibold text-emerald-300">
            ✓ {xpAwardedAlready ?? awardSuccess} XP awarded to CAYA participants
          </p>
        </section>
      )}
    </div>
  )
}
