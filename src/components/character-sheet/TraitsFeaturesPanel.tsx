import type { CharacterSheetData } from './types'

import { RACES } from '@/lib/races'
import { BACKGROUNDS } from '@/lib/backgrounds'
import { FEATURES } from '@/lib/features'
import { getAllFeaturesUpToLevel, formatActionType, type ClassFeatureDetail } from '@/lib/classFeatures'
import type { ClassKey, SubclassKey } from '@/lib/subclasses'

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

  const legacyClassFeatures = Object.values(FEATURES).filter((f: any) => {
    if (f.sourceType !== 'class') return false
    if (!f.class) return false
    return String(f.class).toLowerCase() === classKey && Number(f.level) <= level
  })

  const legacySubclassFeatures = Object.values(FEATURES).filter((f: any) => {
    if (f.sourceType !== 'subclass') return false
    if (!f.subclass) return false
    return String(f.subclass).toLowerCase() === subclassKey && Number(f.level) <= level
  })

  // Pull the richly-detailed entries from the new unified library, and de-dupe
  // them against the legacy FEATURES entries by name so we don't show a feature
  // twice. The new entries are preferred — they carry shortDescription,
  // fullDescription, action-type, source edition, etc.
  const detailedFeatures: ClassFeatureDetail[] = getAllFeaturesUpToLevel(
    classKey as ClassKey,
    (subclassKey || null) as SubclassKey | null,
    level,
  )
  const detailedNames = new Set(detailedFeatures.map((f) => f.name.toLowerCase()))
  const classFeatures = legacyClassFeatures.filter((f: any) => !detailedNames.has(String(f.name).toLowerCase()))
  const subclassFeatures = legacySubclassFeatures.filter((f: any) => !detailedNames.has(String(f.name).toLowerCase()))
  const detailedClass = detailedFeatures.filter((f) => !f.subclassKey)
  const detailedSubclass = detailedFeatures.filter((f) => Boolean(f.subclassKey))

  // Languages: auto from race lib + any stored on sheet
  const autoLanguages: string[] = raceFromLib?.languages ?? []
  const sheetLanguages: string[] = (c.languages ?? []).filter(Boolean).map(String)
  const allLanguages = [...new Set([...autoLanguages, ...sheetLanguages])]

  // Tool proficiencies: from bg lib first, then stored on sheet
  const bgToolProfs: string[] = bgFromLib?.toolProficiencies ?? []
  const sheetToolProfs: string[] = (c.tool_proficiencies ?? []).filter(Boolean).map(String)
  const allToolProfs = [...new Set([...bgToolProfs, ...sheetToolProfs])]

  // Feats
  const feats: string[] = (c.feats ?? []).filter(Boolean).map(String)

  const hasAnything =
    (raceFromLib?.traits?.length ?? 0) > 0 ||
    racialTraitsFallback.length > 0 ||
    Boolean(bgFromLib?.feature) ||
    Boolean(backgroundFeatureFallback) ||
    classFeatures.length > 0 ||
    subclassFeatures.length > 0 ||
    detailedClass.length > 0 ||
    detailedSubclass.length > 0 ||
    allLanguages.length > 0 ||
    allToolProfs.length > 0 ||
    feats.length > 0

  return (
    <section className="rounded-xl border border-amber-900/40 bg-gradient-to-b from-stone-950/80 to-slate-950/90 p-3 text-xs text-slate-200">
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

        {/* CLASS FEATURES — DETAILED (2024 PHB rules text) */}
        {detailedClass.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Class Features ({c.main_job ?? 'Class'}) • Level {level}
            </div>
            <ul className="mt-1 space-y-1">
              {detailedClass
                .sort((a, b) => a.levelGained - b.levelGained)
                .map((f) => (
                  <li
                    key={f.id}
                    className="rounded-lg bg-slate-900/60 px-2 py-1.5"
                    title={f.fullDescription ?? f.shortDescription}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="text-[11px] font-semibold text-slate-100">{f.name}</div>
                        <span className="rounded bg-sky-900/40 border border-sky-700/40 px-1 py-0.5 text-[9px] font-semibold uppercase text-sky-200">
                          {formatActionType(f.type)}
                        </span>
                        {f.source === 'phb-2024' && (
                          <span className="rounded bg-emerald-900/40 border border-emerald-700/40 px-1 py-0.5 text-[9px] font-semibold text-emerald-200">
                            2024
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">Lv {f.levelGained}</div>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-300">{f.shortDescription}</div>
                    {f.scalingNotes && (
                      <div className="mt-0.5 text-[10px] italic text-slate-500">{f.scalingNotes}</div>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* SUBCLASS FEATURES — DETAILED (2024 PHB rules text) */}
        {detailedSubclass.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Subclass Features ({c.subclass ?? 'Subclass'}) • Level {level}
            </div>
            <ul className="mt-1 space-y-1">
              {detailedSubclass
                .sort((a, b) => a.levelGained - b.levelGained)
                .map((f) => (
                  <li
                    key={f.id}
                    className="rounded-lg bg-slate-900/60 px-2 py-1.5"
                    title={f.fullDescription ?? f.shortDescription}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="text-[11px] font-semibold text-slate-100">{f.name}</div>
                        <span className="rounded bg-sky-900/40 border border-sky-700/40 px-1 py-0.5 text-[9px] font-semibold uppercase text-sky-200">
                          {formatActionType(f.type)}
                        </span>
                        {f.source === 'phb-2024' && (
                          <span className="rounded bg-emerald-900/40 border border-emerald-700/40 px-1 py-0.5 text-[9px] font-semibold text-emerald-200">
                            2024
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">Lv {f.levelGained}</div>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-300">{f.shortDescription}</div>
                    {f.scalingNotes && (
                      <div className="mt-0.5 text-[10px] italic text-slate-500">{f.scalingNotes}</div>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* CLASS FEATURES (from legacy lib — only entries not in the detailed lib) */}
        {classFeatures.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Additional Class Features ({c.main_job ?? 'Class'}) • Level {level}
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

        {/* SUBCLASS FEATURES (legacy lib — only entries not in detailed lib) */}
        {subclassFeatures.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">
              Additional Subclass Features ({c.subclass ?? 'Subclass'}) • Level {level}
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

        {/* LANGUAGES */}
        {allLanguages.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Languages</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {allLanguages.map((lang) => (
                <span
                  key={lang}
                  className="rounded-full border border-slate-600 bg-slate-900/60 px-2 py-0.5 text-[11px] capitalize text-slate-300"
                >
                  {lang.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* TOOL PROFICIENCIES */}
        {allToolProfs.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Tool Proficiencies</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {allToolProfs.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full border border-amber-700/40 bg-amber-900/20 px-2 py-0.5 text-[11px] text-amber-200"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* FEATS */}
        {feats.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase text-slate-400">Feats</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {feats.map((feat) => (
                <span
                  key={feat}
                  className="rounded-full border border-violet-700/50 bg-violet-900/20 px-2 py-0.5 text-[11px] text-violet-200"
                >
                  {feat}
                </span>
              ))}
            </div>
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
