'use client'

import type { SheetAction } from '@/lib/actions/types'
import { ALL_ACTIONS } from '@/lib/actions/registry'
import { canUseAction } from '@/lib/actions'

type Props = {
  classKey: string
  subclassKey?: string | null
  actionState: Record<string, any>
  resourceState: Record<string, number>
  onUseAction: (action: SheetAction) => void
}

function groupTitle(kind: 'always' | 'class' | 'subclass') {
  if (kind === 'always') return 'Core'
  if (kind === 'class') return 'Class'
  return 'Subclass'
}

export function ActionsPanel({ classKey, subclassKey, actionState, resourceState, onUseAction }: Props) {
  const normalizedClass = String(classKey || '').trim().toLowerCase()
  const normalizedSubclass = String(subclassKey || '').trim().toLowerCase()

  const visible = ALL_ACTIONS.filter((a) => {
    const g = a.gates
    if (g.kind === 'always') return true
    if (g.kind === 'class') return String(g.classKey).toLowerCase() === normalizedClass
    if (g.kind === 'subclass') return Boolean(normalizedSubclass) && String(g.subclassKey).toLowerCase() === normalizedSubclass
    return false
  })

  const groups: Array<{ kind: 'always' | 'class' | 'subclass'; items: SheetAction[] }> = [
    { kind: 'always', items: [] },
    { kind: 'class', items: [] },
    { kind: 'subclass', items: [] },
  ]

  for (const a of visible) {
    if (a.gates.kind === 'always') groups[0].items.push(a)
    else if (a.gates.kind === 'class') groups[1].items.push(a)
    else if (a.gates.kind === 'subclass') groups[2].items.push(a)
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="text-sm font-semibold text-slate-100">Actions</div>

      {groups.map((g) => {
        if (g.items.length === 0) return null

        return (
          <div key={g.kind} className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-300">{groupTitle(g.kind)}</div>

            <div className="grid gap-2">
              {g.items.map((action) => {
                const status = canUseAction({
                  action,
                  classKey: normalizedClass,
                  subclassKey: normalizedSubclass,
                  actionState,
                  resourceState,
                })

                const disabled = !status.ok
                const hint = status.ok ? action.description : status.reason || action.description

                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onUseAction(action)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      disabled
                        ? 'cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-500'
                        : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-500'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{action.name}</div>
                      <div className="text-[10px] text-slate-400">{action.category}</div>
                    </div>

                    {hint && <div className="mt-1 text-[11px] text-slate-400">{hint}</div>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
