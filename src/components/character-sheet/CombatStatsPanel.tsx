'use client'

import { useState } from 'react'
import type { DerivedStats } from './calc'
import { formatMod } from './utils'

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0
  const color =
    pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="mt-1.5 h-2 w-full rounded-full bg-slate-700/60">
      <div
        className={`h-2 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function CombatStatsPanel({
  d,
  tempHp,
  onAttack,
  onDamage,
  onAdjustHp,
  onSetTempHp,
  concentratingOn,
  onEndConcentration,
  deathSaves,
  onAdjustDeathSave,
}: {
  d: DerivedStats
  tempHp: number
  onAttack: () => void
  onDamage: () => void
  onAdjustHp: (delta: number) => void
  onSetTempHp: (val: number) => void
  /** Name of the spell the character is concentrating on (null = not concentrating). */
  concentratingOn?: string | null
  /** Called when the player clicks the chip to drop concentration. */
  onEndConcentration?: () => void
  /** Current death save counts when hpCurrent === 0. */
  deathSaves?: { s: number; f: number } | null
  /** Toggle a success / failure pip. kind = 's' | 'f', delta = +1/-1. */
  onAdjustDeathSave?: (kind: 's' | 'f', delta: 1 | -1) => void
}) {
  const [hpInput, setHpInput] = useState('')
  const [tempInput, setTempInput] = useState('')

  const visionLine =
    d.darkvisionFt > 0
      ? `Normal ${d.visionFt} ft • Darkvision ${d.darkvisionFt} ft`
      : `Normal ${d.visionFt} ft`

  function applyDamage() {
    const n = parseInt(hpInput, 10)
    if (!isNaN(n) && n > 0) { onAdjustHp(-n); setHpInput('') }
  }
  function applyHeal() {
    const n = parseInt(hpInput, 10)
    if (!isNaN(n) && n > 0) { onAdjustHp(n); setHpInput('') }
  }
  function applyTempHp() {
    const n = parseInt(tempInput, 10)
    if (!isNaN(n) && n >= 0) { onSetTempHp(n); setTempInput('') }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Combat
      </h2>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* AC — shield style */}
        <div className="rounded-lg bg-slate-900/80 p-2 flex items-center gap-3">
          <div className="relative flex h-12 w-10 items-center justify-center">
            <svg viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 h-full w-full">
              <path
                d="M20 2L4 8v14c0 10 7 18.5 16 22 9-3.5 16-12 16-22V8L20 2z"
                fill="rgba(30,41,59,0.9)"
                stroke="rgba(148,163,184,0.4)"
                strokeWidth="1.5"
              />
            </svg>
            <span className="relative z-10 text-lg font-black text-slate-50 leading-none mt-1">
              {d.ac}
            </span>
          </div>
          <div>
            <div className="text-[10px] uppercase text-slate-400">Armor Class</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {d.armorName ?? 'Unarmored'}
              {d.shieldEquipped ? ' + Shield' : ''}
            </div>
          </div>
        </div>

        <div
          className="rounded-lg bg-slate-900/80 p-2"
          title={d.initiativeBonusSources?.length ? d.initiativeBonusSources.join(' · ') : undefined}
        >
          <div className="text-[10px] uppercase text-slate-400">Initiative</div>
          <div className="text-xl font-bold text-slate-50">{formatMod(d.initiative)}</div>
          {d.initiativeBonusSources && d.initiativeBonusSources.length > 1 && (
            <div className="mt-0.5 text-[9px] text-slate-500 truncate">
              {d.initiativeBonusSources.slice(1).join(' · ')}
            </div>
          )}
        </div>

        {/* HP with bar + temp HP */}
        <div className="rounded-lg bg-slate-900/80 p-2 col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase text-slate-400">Hit Points</div>
            <div className="flex items-center gap-2">
              {tempHp > 0 && (
                <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-teal-300">
                  +{tempHp} temp
                </span>
              )}
              <div className="text-[10px] text-slate-400 tabular-nums">
                {d.hpCurrent} / {d.hpMax}
              </div>
            </div>
          </div>
          <HpBar current={d.hpCurrent} max={d.hpMax} />

          {/* HP adjustment */}
          <div className="mt-2 flex gap-1">
            <input
              type="number"
              min={0}
              placeholder="Amount"
              value={hpInput}
              onChange={(e) => setHpInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyHeal() }}
              className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder-slate-500 focus:border-amber-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={applyHeal}
              className="rounded-md bg-emerald-600/20 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-600/30"
            >
              Heal
            </button>
            <button
              type="button"
              onClick={applyDamage}
              className="rounded-md bg-red-600/20 px-2 py-1 text-[11px] text-red-200 hover:bg-red-600/30"
            >
              Dmg
            </button>
            <div className="ml-auto flex gap-1">
              <input
                type="number"
                min={0}
                placeholder="Temp"
                value={tempInput}
                onChange={(e) => setTempInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyTempHp() }}
                className="w-14 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-teal-200 placeholder-slate-500 focus:border-teal-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={applyTempHp}
                className="rounded-md bg-teal-600/20 px-2 py-1 text-[11px] text-teal-200 hover:bg-teal-600/30"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* Wave AC5: concentration chip — only when actually concentrating. */}
        {concentratingOn && (
          <div className="col-span-2 rounded-lg border border-cyan-700/50 bg-cyan-950/30 px-2 py-1.5 text-[11px] text-cyan-100 flex items-center justify-between gap-2">
            <span>
              <span className="mr-1.5 font-semibold uppercase tracking-wide text-cyan-300">⊙ Concentrating</span>
              on <span className="font-semibold text-cyan-200">{concentratingOn}</span>
            </span>
            {onEndConcentration && (
              <button
                type="button"
                onClick={onEndConcentration}
                className="rounded border border-cyan-700/60 bg-cyan-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-900/60"
              >
                End
              </button>
            )}
          </div>
        )}

        {/* Wave AC5: death save tracker at 0 HP. */}
        {d.hpCurrent === 0 && deathSaves && onAdjustDeathSave && (
          <div className="col-span-2 rounded-lg border border-red-700/50 bg-red-950/30 p-2 text-[11px] text-red-100">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wide text-red-300">☠ Death Saves</span>
              <span className="text-[10px] text-red-300/70">{deathSaves.s}/3 successes · {deathSaves.f}/3 failures</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-emerald-300">Success:</span>
                {[1, 2, 3].map((i) => (
                  <button
                    key={`s${i}`}
                    type="button"
                    onClick={() => onAdjustDeathSave('s', i <= deathSaves.s ? -1 : 1)}
                    className={`h-3.5 w-3.5 rounded-full border ${i <= deathSaves.s ? 'border-emerald-500 bg-emerald-500/80' : 'border-emerald-700/50 bg-transparent'}`}
                    aria-label={`success ${i}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-red-300">Failure:</span>
                {[1, 2, 3].map((i) => (
                  <button
                    key={`f${i}`}
                    type="button"
                    onClick={() => onAdjustDeathSave('f', i <= deathSaves.f ? -1 : 1)}
                    className={`h-3.5 w-3.5 rounded-full border ${i <= deathSaves.f ? 'border-red-500 bg-red-500/80' : 'border-red-700/50 bg-transparent'}`}
                    aria-label={`failure ${i}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wave AC5: resistances/vulnerabilities/immunities (subclass effects populate these). */}
        {((d.flags?.resistances?.length ?? 0) > 0 || (d.flags?.vulnerabilities?.length ?? 0) > 0 || (d.flags?.immunities?.length ?? 0) > 0) && (
          <div className="col-span-2 space-y-1 rounded-lg bg-slate-900/80 p-2">
            {(d.flags?.resistances?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] uppercase text-slate-400">Resist:</span>
                {d.flags.resistances.map((t: string) => (
                  <span key={t} className="rounded bg-emerald-900/40 border border-emerald-700/40 px-1.5 py-0.5 text-[10px] text-emerald-200">{t}</span>
                ))}
              </div>
            )}
            {(d.flags?.vulnerabilities?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] uppercase text-slate-400">Vuln:</span>
                {d.flags.vulnerabilities.map((t: string) => (
                  <span key={t} className="rounded bg-rose-900/40 border border-rose-700/40 px-1.5 py-0.5 text-[10px] text-rose-200">{t}</span>
                ))}
              </div>
            )}
            {(d.flags?.immunities?.length ?? 0) > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] uppercase text-slate-400">Immune:</span>
                {d.flags.immunities.map((t: string) => (
                  <span key={t} className="rounded bg-violet-900/40 border border-violet-700/40 px-1.5 py-0.5 text-[10px] text-violet-200">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-[10px] uppercase text-slate-400">Prof Bonus</div>
          <div className="text-xl font-bold text-slate-50">{formatMod(d.profBonus)}</div>
        </div>

        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-[10px] uppercase text-slate-400">Speed</div>
          <div className="text-xl font-bold text-slate-50">{d.speedFt} ft</div>
        </div>

        <div className="rounded-lg bg-slate-900/80 p-2 col-span-2">
          <div className="text-[10px] uppercase text-slate-400">Vision</div>
          <div className="text-sm font-semibold text-slate-50">{visionLine}</div>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-slate-900/80 p-2 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase text-slate-400">Main Weapon</div>
            <div className="font-semibold text-slate-100">
              {d.weaponName ?? 'Unarmed'}
              <span className="ml-2 font-mono text-slate-300">({d.attackFormula})</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Damage: <span className="font-mono">{d.damageFormula}</span>
              {d.damageType ? ` (${d.damageType})` : ''}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAttack}
              className="rounded-md bg-emerald-600/20 px-3 py-1 text-emerald-200 hover:bg-emerald-600/30"
            >
              Attack
            </button>
            <button
              type="button"
              onClick={onDamage}
              className="rounded-md bg-blue-600/20 px-3 py-1 text-blue-200 hover:bg-blue-600/30"
            >
              Damage
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
