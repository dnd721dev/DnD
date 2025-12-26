import type { CharacterSheetData } from './types'

export function TraitsFeaturesPanel({ c }: { c: CharacterSheetData }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Traits & Features
      </h2>
      <div className="space-y-2">
        {c.racial_traits && c.racial_traits.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Racial Traits
            </div>
            <ul className="ml-4 list-disc space-y-1">
              {c.racial_traits.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
        )}
        {c.background_feature && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Background Feature
            </div>
            <p className="text-slate-200">{c.background_feature}</p>
          </div>
        )}
        {(!c.racial_traits || c.racial_traits.length === 0) && !c.background_feature && (
          <p className="text-slate-500">No traits or features recorded.</p>
        )}
      </div>
    </section>
  )
}
