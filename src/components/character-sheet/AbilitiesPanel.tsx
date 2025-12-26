import type { Abilities } from '../../types/character'
import { abilityMod, formatMod } from './utils'

export function AbilitiesPanel({
  abilities,
  onRollAbilityCheck,
}: {
  abilities: Abilities
  onRollAbilityCheck: (abilityKey: keyof Abilities) => void
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Abilities
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(abilities) as (keyof Abilities)[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onRollAbilityCheck(k)}
            className="flex flex-col items-center rounded-lg bg-slate-900/80 px-2 py-1.5 text-xs hover:bg-slate-800"
          >
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              {k}
            </div>
            <div className="text-lg font-bold text-slate-50">{abilities[k]}</div>
            <div className="text-[10px] text-emerald-400">
              {formatMod(abilityMod(abilities[k]))}
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
