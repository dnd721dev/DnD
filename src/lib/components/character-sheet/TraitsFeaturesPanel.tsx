import type { CharacterSheetData } from './types'

import { RACES } from '@/lib/races'
import { BACKGROUNDS } from '@/lib/backgrounds'
import { FEATURES } from '@/lib/features'

function normKey(v: any) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export function TraitsFeaturesPanel({ c }: { c: CharacterSheetData }) {
  const raceKey = normKey(c.race)
  const bgKey = normKey(c.background)
  const classKey = normKey(c.main_job)
  const subclassKey = normKey(c.subclass)
  const level = Number(c.level ?? 1)

  const raceFromLib = (RACES as any)[raceKey] ?? null
  const bgFromLib = (BACKGROUNDS as any)[bgKey] ?? null

  // Fallback to DB fields if you ever set them (but prefer libs)
  const racialTraitsFallback =
    (c.racial_traits ?? []).filter(Boolean).map(String) as string[]
  const backgroundFeatureFallback = c.background_feature ? String(c.background_feature) : null

  const classFeatures = Object.values(FEATURES).filter((f: any) => {
    if (f.sourceType !== 'class') return false
    if (!f.class) return false
    return String(f.class).toLowerCase() === classKey && Number(f.level) <= level
  })

  const subclassFeatures = Object.values(FEATURES).filter((f: any) => {
    if (f.sourceType !== 'subclass') return false
    if (!f.subclass) return false
    return String(f.subclass).toLowerCase() === subclassKey && Number(f.level) <= level
  })

  const hasAnything =
    (raceFromLib?.traits?.length ?? 0) > 0 ||
    racialTraitsFallback.length > 0 ||
    Boolean(bgFromLib?.feature) ||
    Boolean(backgroundFeatureFallback) ||
    classFeatures.length > 0 ||
    subclassFeatures.length > 0

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Traits & Features
      </h2>

      <div className="space-y-3">
        {/* RACE TRAITS (from lib) */}
        {raceFromLib?.traits?.length ? (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Racial Traits ({raceFromLib.name})
            </div>
            <ul className="mt-1 space-y-1">
              {raceFromLib.traits.map((t: any) => (
                <li
                  key={t.key ?? t.name}
                  className="rounded-lg bg-slate-900/60 px-2 py-1"
                >
                  <div className="text-[11px] font-semibold text-slate-100">{t.name}</div>
                  <div className="text-[11px] text-slate-300">{t.summary}</div>
                </li>
              ))}
            </ul>
          </div>
        ) : racialTraitsFallback.length ? (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Racial Traits
            </div>
            <ul className="ml-4 list-disc space-y-1">
              {racialTraitsFallback.map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* BACKGROUND FEATURE (from lib) */}
        {bgFromLib?.feature ? (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Background Feature ({bgFromLib.name})
            </div>
            <div className="mt-1 rounded-lg bg-slate-900/60 px-2 py-1">
              <div className="text-[11px] font-semibold text-slate-100">
                {bgFromLib.feature.name}
              </div>
              <div className="text-[11px] text-slate-300">{bgFromLib.feature.summary}</div>
            </div>
          </div>
        ) : backgroundFeatureFallback ? (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Background Feature
            </div>
            <p className="text-slate-200">{backgroundFeatureFallback}</p>
          </div>
        ) : null}

        {/* CLASS FEATURES (from lib) */}
        {classFeatures.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Class Features ({c.main_job ?? 'Class'}) • Level {level}
            </div>
            <ul className="mt-1 space-y-1">
              {classFeatures
                .sort((a: any, b: any) => Number(a.level) - Number(b.level))
                .map((f: any) => (
                  <li
                    key={f.key}
                    className="rounded-lg bg-slate-900/60 px-2 py-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-slate-100">{f.name}</div>
                      <div className="text-[10px] text-slate-500">Lv {f.level}</div>
                    </div>
                    <div className="text-[11px] text-slate-300">{f.summary}</div>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* SUBCLASS FEATURES (from lib) */}
        {subclassFeatures.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Subclass Features ({c.subclass ?? 'Subclass'}) • Level {level}
            </div>
            <ul className="mt-1 space-y-1">
              {subclassFeatures
                .sort((a: any, b: any) => Number(a.level) - Number(b.level))
                .map((f: any) => (
                  <li
                    key={f.key}
                    className="rounded-lg bg-slate-900/60 px-2 py-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold text-slate-100">{f.name}</div>
                      <div className="text-[10px] text-slate-500">Lv {f.level}</div>
                    </div>
                    <div className="text-[11px] text-slate-300">{f.summary}</div>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {!hasAnything && (
          <p className="text-slate-500">
            No traits or features recorded. (This panel pulls from libs using race/background/class keys.)
          </p>
        )}
      </div>
    </section>
  )
}
