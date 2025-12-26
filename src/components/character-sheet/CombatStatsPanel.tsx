import type { DerivedStats } from './calc'
import { formatMod } from './utils'

export function CombatStatsPanel({
  d,
  onAttack,
  onDamage,
}: {
  d: DerivedStats
  onAttack: () => void
  onDamage: () => void
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Combat
      </h2>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-[10px] uppercase text-slate-400">Armor Class</div>
          <div className="text-xl font-bold text-slate-50">{d.ac}</div>
          <div className="text-[10px] text-slate-500">
            {d.armorName ?? 'Unarmored'}
            {d.shieldEquipped ? ' + Shield' : ''}
          </div>
        </div>

        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-[10px] uppercase text-slate-400">Initiative</div>
          <div className="text-xl font-bold text-slate-50">{formatMod(d.initiative)}</div>
        </div>

        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-[10px] uppercase text-slate-400">HP</div>
          <div className="text-xl font-bold text-slate-50">
            {d.hpCurrent}/{d.hpMax}
          </div>
        </div>

        <div className="rounded-lg bg-slate-900/80 p-2">
          <div className="text-[10px] uppercase text-slate-400">Prof Bonus</div>
          <div className="text-xl font-bold text-slate-50">{formatMod(d.profBonus)}</div>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-slate-900/80 p-2 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase text-slate-400">Main Weapon</div>
            <div className="font-semibold text-slate-100">
              {d.weaponName ?? 'Unarmed'}
              <span className="ml-2 font-mono text-slate-300">
                ({d.attackFormula})
              </span>
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
