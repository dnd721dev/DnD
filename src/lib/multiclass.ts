// src/lib/multiclass.ts
// Wave 6 — Multiclass helpers.
//
// Convention: characters store their PRIMARY class in `main_job` /
// `subclass` / `level` (existing columns) and optional SECONDARY class in
// `secondary_class` / `secondary_subclass` / `secondary_level` (migration
// 031). Total character level = level + (secondary_level ?? 0).
//
// All downstream code that needs to enumerate a character's classes should
// go through `getAllClasses(c)` so that adding a tertiary class later only
// requires updating this module.

import type { ClassKey } from '@/lib/subclasses'
import type { MulticlassEntry } from '@/lib/spellcastingProgression'

/**
 * Minimal shape we need to read multiclass data off a character row.
 * Compatible with `CharacterSheetData` (which uses the same column names).
 */
export type MulticlassCharacterRow = {
  main_job?: string | null
  subclass?: string | null
  level?: number | null
  secondary_class?: string | null
  secondary_subclass?: string | null
  secondary_level?: number | null
}

/**
 * Returns the primary class entry (always defined for any character that
 * has a `main_job`).
 */
export function getPrimaryClass(c: MulticlassCharacterRow): MulticlassEntry | null {
  if (!c.main_job) return null
  return {
    classKey: c.main_job.toLowerCase() as ClassKey,
    level: Math.max(1, Number(c.level ?? 1)),
    subclassKey: c.subclass ?? null,
  }
}

/**
 * Returns every class entry a character has (primary + secondary if
 * present). For single-class characters this is a one-element array.
 *
 * Secondary entries with `secondary_level <= 0` are treated as absent.
 */
export function getAllClasses(c: MulticlassCharacterRow): MulticlassEntry[] {
  const out: MulticlassEntry[] = []
  const primary = getPrimaryClass(c)
  if (primary) out.push(primary)
  const secLevel = Number(c.secondary_level ?? 0)
  if (c.secondary_class && secLevel > 0) {
    out.push({
      classKey: c.secondary_class.toLowerCase() as ClassKey,
      level: secLevel,
      subclassKey: c.secondary_subclass ?? null,
    })
  }
  return out
}

/**
 * Total character level — sum of every class's level.
 * Determines proficiency bonus, ASI cadence, etc.
 */
export function getTotalLevel(c: MulticlassCharacterRow): number {
  return getAllClasses(c).reduce((acc, e) => acc + e.level, 0) || Number(c.level ?? 1)
}

/**
 * Returns the class level for a specific class within a multiclass character.
 * Returns 0 if the character does not have that class.
 *
 * Useful for class-feature gating (e.g. "your Sneak Attack die scales by
 * your Rogue level, not your total level").
 */
export function getClassLevel(c: MulticlassCharacterRow, classKey: ClassKey): number {
  for (const entry of getAllClasses(c)) {
    if (entry.classKey === classKey) return entry.level
  }
  return 0
}

/**
 * True if the character has more than one class.
 */
export function isMulticlassed(c: MulticlassCharacterRow): boolean {
  return getAllClasses(c).length > 1
}
