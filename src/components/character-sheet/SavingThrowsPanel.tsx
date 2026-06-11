import type { Abilities } from '../../types/character'
import { abilityMod, formatMod } from './utils'

export function SavingThrowsPanel({
  abilities,
  savingThrowSet,
  profBonus,
  onRollSavingThrow,
  storedProfsEmpty,
  onSyncFromClass,
}: {
  abilities: Abilities
  savingThrowSet: Set<string>
  profBonus: number
  onRollSavingThrow: (abilityKey: keyof Abilities) => void
  /** When true, the row's saving_throw_profs column was empty and the displayed
   *  set was derived from CLASS_DATA as a fallback. Surfacing this lets us
   *  offer the player a one-click "save these back to my row" sync. */
  storedProfsEmpty?: boolean
  /** Persist the currently-displayed saving throw set into the character row. */
  onSyncFromClass?: () => void
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Saving Throws
      </h2>
      <div className="space-y-1 text-xs">
        {(Object.keys(abilities) as (keyof Abilities)[]).map((k) => {
          const base = abilityMod(abilities[k])
          const hasProf = savingThrowSet.has(k.toLowerCase())
          const total = base + (hasProf ? profBonus : 0)
          return (
            <button
              key={k}
              type="button"
              onClick={() => onRollSavingThrow(k)}
              className="flex w-full items-center justify-between rounded-md bg-slate-900/80 px-2 py-1 hover:bg-slate-800"
            >
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded border border-slate-500">
                  {hasProf && (
                    <span className="block h-3 w-3 rounded bg-emerald-500/80" />
                  )}
                </span>
                <span className="font-semibold uppercase text-slate-100">{k}</span>
              </span>
              <span className="font-mono text-slate-50">{formatMod(total)}</span>
            </button>
          )
        })}
        <div className="mt-2 text-[10px] text-slate-500">
          Proficiency bonus: {formatMod(profBonus)}
        </div>
        {storedProfsEmpty && savingThrowSet.size > 0 && onSyncFromClass && (
          <div className="mt-2 flex items-center justify-between rounded-md border border-amber-700/50 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200">
            <span>Saves shown were derived from your class.</span>
            <button
              type="button"
              onClick={onSyncFromClass}
              className="rounded border border-amber-600/60 bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-900/60"
              title="Save these proficiencies to your character row"
            >
              Sync from class
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
