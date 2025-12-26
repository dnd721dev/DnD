import type { CharacterSheetData } from './types'

export function PersonalityNotesPanel({ c }: { c: CharacterSheetData }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Personality & Notes
      </h2>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Personality Traits
            </div>
            <p className="whitespace-pre-wrap text-slate-200">
              {c.personality_traits || '—'}
            </p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Ideals
            </div>
            <p className="whitespace-pre-wrap text-slate-200">{c.ideals || '—'}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Bonds
            </div>
            <p className="whitespace-pre-wrap text-slate-200">{c.bonds || '—'}</p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Flaws
            </div>
            <p className="whitespace-pre-wrap text-slate-200">{c.flaws || '—'}</p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] font-semibold uppercase text-slate-400">Notes</div>
        <p className="whitespace-pre-wrap text-slate-200">{c.notes || '—'}</p>
      </div>
    </section>
  )
}
