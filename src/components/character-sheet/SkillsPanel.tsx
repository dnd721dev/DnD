import type { Abilities } from '../../types/character'
import type { CharacterSheetData } from './types'
import { ALL_SKILLS, skillDisplay } from './skills'
import { formatMod } from './utils'

export function SkillsPanel({
  c,
  abilities,
  profBonus,
  passivePerception,
}: {
  c: CharacterSheetData
  abilities: Abilities
  profBonus: number
  passivePerception: number
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Skills
        </h2>
        <div className="text-[10px] text-slate-500">
          Passive Perception: {passivePerception}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 text-xs">
        {ALL_SKILLS.map((s) => {
          const info = skillDisplay(s.key, c, abilities, profBonus)
          return (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-md bg-slate-900/80 px-2 py-1"
            >
              <div className="flex items-center gap-1">
                {info.mark && (
                  <span className="text-[10px] text-emerald-400">{info.mark}</span>
                )}
                <span className="text-[11px] text-slate-100">{info.label}</span>
                <span className="text-[9px] text-slate-500">
                  ({(info.ability ?? '?').toUpperCase()})
                </span>
              </div>
              <span className="font-mono text-slate-50">{formatMod(info.total)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
