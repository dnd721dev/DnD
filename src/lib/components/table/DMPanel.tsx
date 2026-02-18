'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type ExternalRoll = {
  label: string
  formula: string
  result: number
}

type DMPanelProps = {
  encounterId: string
  onRoll: (roll: ExternalRoll) => void
}

/**
 * DMPanel
 *
 * Pure GM tools panel:
 * - Start Turns (RPC start_turns)
 * - Quick GM rolls (d20, advantage, disadvantage, damage dice)
 * - Round tracker + notes
 */
export default function DMPanel({ encounterId, onRoll }: DMPanelProps) {
  const [round, setRound] = useState(1)
  const [gmNotes, setGmNotes] = useState('')

  // Start Turns UI state
  const [startBusy, setStartBusy] = useState(false)
  const [startMsg, setStartMsg] = useState<string | null>(null)

  async function handleStartTurns() {
    if (!encounterId) return
    setStartBusy(true)
    setStartMsg(null)

    try {
      const { error } = await supabase.rpc('start_turns', { p_encounter_id: encounterId })

      if (error) {
        const m = (error as any)?.message || 'Failed to start turns.'
        setStartMsg(m)
        console.error('start_turns RPC failed:', error)
        return
      }

      setStartMsg('✅ Turns started')
    } catch (e) {
      console.error('start_turns exception:', e)
      setStartMsg('Failed to start turns.')
    } finally {
      setStartBusy(false)
      setTimeout(() => setStartMsg(null), 2500)
    }
  }

  // Simple dice roller helpers
  function rollDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1
  }

  function handleQuickRoll(label: string, formula: string, sides: number) {
    const result = rollDie(sides)
    onRoll({ label, formula, result })
  }

  function handleAdvantage() {
    const d1 = rollDie(20)
    const d2 = rollDie(20)
    const result = Math.max(d1, d2)
    onRoll({
      label: 'GM d20 (Advantage)',
      formula: '2d20 (take highest)',
      result,
    })
  }

  function handleDisadvantage() {
    const d1 = rollDie(20)
    const d2 = rollDie(20)
    const result = Math.min(d1, d2)
    onRoll({
      label: 'GM d20 (Disadvantage)',
      formula: '2d20 (take lowest)',
      result,
    })
  }

  function handleCustomRoll(formula: string) {
    // VERY simple parser, supports "XdY" (e.g. 2d6, 3d8)
    const match = formula.toLowerCase().match(/^(\d+)d(\d+)$/)
    if (!match) {
      alert('Use format like "2d6" or "3d8".')
      return
    }

    const count = parseInt(match[1], 10)
    const sides = parseInt(match[2], 10)

    if (!Number.isFinite(count) || !Number.isFinite(sides) || count <= 0 || sides <= 0) return

    let total = 0
    for (let i = 0; i < count; i += 1) {
      total += rollDie(sides)
    }

    onRoll({
      label: `GM roll (${formula})`,
      formula,
      result: total,
    })
  }

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-slate-100">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-100">GM Controls</h2>
          <p className="text-[10px] text-slate-400">
            Encounter ID: <span className="font-mono">{encounterId.slice(0, 8)}…</span>
          </p>
        </div>
      </header>

      {/* Start Turns */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-100">Turn System</p>
            <p className="text-[10px] text-slate-400">Starts the round/turn tracker for this encounter.</p>
          </div>

          <button
            type="button"
            onClick={handleStartTurns}
            disabled={startBusy}
            className="h-8 rounded-md bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {startBusy ? 'Starting…' : 'Start Turns'}
          </button>
        </div>

        {startMsg && <div className="mt-2 text-[11px] text-slate-200">{startMsg}</div>}
      </section>

      {/* Round tracker */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-100">Round Tracker</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRound((r) => Math.max(1, r - 1))}
              className="h-6 w-6 rounded-md border border-slate-700 bg-slate-900 text-xs hover:border-sky-500"
            >
              -
            </button>
            <span className="min-w-[2rem] text-center text-sm font-bold">{round}</span>
            <button
              type="button"
              onClick={() => setRound((r) => r + 1)}
              className="h-6 w-6 rounded-md border border-slate-700 bg-slate-900 text-xs hover:border-sky-500"
            >
              +
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400">Use this to keep track of combat rounds or major scene beats.</p>
      </section>

      {/* Quick GM rolls */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <p className="mb-2 text-xs font-semibold text-slate-100">Quick GM Rolls</p>

        <div className="mb-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickRoll('GM d20', '1d20', 20)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] hover:border-sky-500"
          >
            d20
          </button>
          <button
            type="button"
            onClick={handleAdvantage}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] hover:border-sky-500"
          >
            d20 Adv
          </button>
          <button
            type="button"
            onClick={handleDisadvantage}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] hover:border-sky-500"
          >
            d20 Dis
          </button>
          <button
            type="button"
            onClick={() => handleQuickRoll('GM d12', '1d12', 12)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] hover:border-sky-500"
          >
            d12
          </button>
          <button
            type="button"
            onClick={() => handleQuickRoll('GM d10', '1d10', 10)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] hover:border-sky-500"
          >
            d10
          </button>
          <button
            type="button"
            onClick={() => handleQuickRoll('GM d8', '1d8', 8)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] hover:border-sky-500"
          >
            d8
          </button>
          <button
            type="button"
            onClick={() => handleQuickRoll('GM d6', '1d6', 6)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] hover:border-sky-500"
          >
            d6
          </button>
          <button
            type="button"
            onClick={() => handleQuickRoll('GM d4', '1d4', 4)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] hover:border-sky-500"
          >
            d4
          </button>
        </div>

        <CustomRollInput onRoll={handleCustomRoll} />
      </section>

      {/* GM notes */}
      <section className="flex flex-1 flex-col rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        <p className="mb-1 text-xs font-semibold text-slate-100">GM Notes (local)</p>
        <textarea
          value={gmNotes}
          onChange={(e) => setGmNotes(e.target.value)}
          placeholder="Scene reminders, monster tactics, secret DCs…"
          className="min-h-[80px] flex-1 resize-none rounded-md border border-slate-700 bg-slate-950 p-2 text-[11px] text-slate-100 outline-none focus:border-sky-500"
        />
        <p className="mt-1 text-[10px] text-slate-500">
          These notes are only stored in your browser for now (not saved to the database yet).
        </p>
      </section>
    </div>
  )
}

type CustomRollInputProps = {
  onRoll: (formula: string) => void
}

function CustomRollInput({ onRoll }: CustomRollInputProps) {
  const [formula, setFormula] = useState('2d6')

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <input
        type="text"
        value={formula}
        onChange={(e) => setFormula(e.target.value)}
        placeholder="2d6"
        className="h-8 flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 text-[11px] outline-none focus:border-sky-500"
      />
      <button
        type="button"
        onClick={() => onRoll(formula)}
        className="h-8 rounded-md bg-sky-600 px-3 text-[11px] font-semibold text-white hover:bg-sky-500"
      >
        Roll
      </button>
    </div>
  )
}
