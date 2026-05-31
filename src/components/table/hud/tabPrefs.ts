// src/components/table/hud/tabPrefs.ts
// Apply user tab preferences (order + hidden) to a tab list. Used by the
// sidebars (to render) and the WidgetPicker (to edit), so customization works
// identically for GM and Player.

export interface TabMeta { key: string; label: string }

/**
 * Returns the tabs ordered by `order` (unknown/new keys appended in their
 * original order) and with `hidden` keys removed. Always returns at least one
 * tab (falls back to the full list if everything would be hidden).
 */
export function applyTabPrefs<T extends TabMeta>(
  tabs: T[],
  order: string[] | undefined,
  hidden: string[] | undefined,
): T[] {
  const hiddenSet = new Set(hidden ?? [])
  const byKey = new Map(tabs.map((t) => [t.key, t]))

  const ordered: T[] = []
  const seen = new Set<string>()
  for (const key of order ?? []) {
    const t = byKey.get(key)
    if (t && !seen.has(key)) { ordered.push(t); seen.add(key) }
  }
  // Append any tabs not covered by `order` (e.g. newly added tabs).
  for (const t of tabs) {
    if (!seen.has(t.key)) { ordered.push(t); seen.add(t.key) }
  }

  const visible = ordered.filter((t) => !hiddenSet.has(t.key))
  return visible.length > 0 ? visible : tabs
}
