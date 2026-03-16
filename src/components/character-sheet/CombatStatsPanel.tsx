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
  onAttack,
  onDamage,
}: {
  d: DerivedStats
  onAttack: () => void
  onDamage: () => void
}) {
  const visionLine =
    d.darkvisionFt > 0
      ? `Normal ${d.visionFt} ft • Darkvision ${d.darkvisionFt} ft`
      : `Normal ${d.visionFt} ft`

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

        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-[10px] uppercase text-slate-400">Initiative</div>
          <div className="text-xl font-bold text-slate-50">{formatMod(d.initiative)}</div>
        </div>

        {/* HP with bar */}
        <div className="rounded-lg bg-slate-900/80 p-2 col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase text-slate-400">Hit Points</div>
            <div className="text-[10px] text-slate-400 tabular-nums">
              {d.hpCurrent} / {d.hpMax}
            </div>
          </div>
          <HpBar current={d.hpCurrent} max={d.hpMax} />
        </div>

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
