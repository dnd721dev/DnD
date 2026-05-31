// src/components/table/hud/WidgetPicker.tsx
// Title-bar popover to show/hide and reorder the panel's tabs. Edits the
// hud layout's tabOrder/hiddenTabs (persisted per user+role).

'use client'

import { useState } from 'react'
import { applyTabPrefs, type TabMeta } from './tabPrefs'

interface WidgetPickerProps {
  meta: TabMeta[]
  tabOrder: string[]
  hiddenTabs: string[]
  onTabOrder: (keys: string[]) => void
  onHiddenTabs: (keys: string[]) => void
}

export function WidgetPicker({ meta, tabOrder, hiddenTabs, onTabOrder, onHiddenTabs }: WidgetPickerProps) {
  const [open, setOpen] = useState(false)
  // Current ordered list (covers new tabs); used as the editing baseline.
  const ordered = applyTabPrefs(meta, tabOrder, []) // order only, keep all visible for editing
  const hiddenSet = new Set(hiddenTabs)

  function move(key: string, dir: -1 | 1) {
    const keys = ordered.map((t) => t.key)
    const i = keys.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= keys.length) return
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
    onTabOrder(keys)
  }

  function toggle(key: string) {
    const next = new Set(hiddenSet)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    // Never allow hiding every tab.
    if (next.size >= meta.length) return
    onHiddenTabs([...next])
  }

  return (
    <div className="relative" data-no-drag>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Customize panel tabs"
        className="grid h-11 w-11 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        ⚙
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-10 w-56 rounded-md border border-slate-700 bg-slate-900 p-2 shadow-xl">
          <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tabs</p>
          <ul className="space-y-0.5">
            {ordered.map((t, idx) => {
              const isHidden = hiddenSet.has(t.key)
              return (
                <li key={t.key} className="flex items-center gap-1 rounded px-1 py-1 hover:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => toggle(t.key)}
                    className={`flex-1 truncate text-left text-xs ${isHidden ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                    title={isHidden ? 'Show tab' : 'Hide tab'}
                  >
                    {isHidden ? '☐' : '☑'} {t.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => move(t.key, -1)}
                    disabled={idx === 0}
                    className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-700 disabled:opacity-30"
                    title="Move up"
                  >▲</button>
                  <button
                    type="button"
                    onClick={() => move(t.key, 1)}
                    disabled={idx === ordered.length - 1}
                    className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-700 disabled:opacity-30"
                    title="Move down"
                  >▼</button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
