'use client'

import { ALL_ACTIONS, canUseAction, type SheetAction } from '@/lib/actions'
import type { ActionGate } from '@/lib/actions/types'

type Props = {
  classKey: string
  subclassKey?: string | null
  actionState: Record<string, any>
  resourceState: Record<string, number>
  onUseAction: (action: SheetAction) => void
}

function normKey(v: unknown) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function gateVisible(g: ActionGate, classKey: string, subclassKey: string): boolean {
  switch (g.kind) {
    case 'always':
      return true
    case 'class':
      return normKey(g.classKey) === normKey(classKey)
    case 'subclass':
      return Boolean(normKey(subclassKey)) && normKey(g.subclassKey) === normKey(subclassKey)
    case 'and':
      return g.all.every((x) => gateVisible(x, classKey, subclassKey))
    case 'or':
      return g.any.some((x) => gateVisible(x, classKey, subclassKey))
    default:
      return false
  }
}

function groupTitle(kind: 'always' | 'class' | 'subclass') {
  if (kind === 'always') return 'Core'
  if (kind === 'class') return 'Class'
  return 'Subclass'
}

export function ActionsPanel({
  classKey,
  subclassKey,
  actionState,
  resourceState,
  onUseAction,
}: Props) {
  const normalizedClass = normKey(classKey)
  const normalizedSubclass = normKey(subclassKey)

  const visible = ALL_ACTIONS.filter((a) => gateVisible(a.gates as ActionGate, normalizedClass, normalizedSubclass))

  const groups: Array<{ kind: 'always' | 'class' | 'subclass'; items: SheetAction[] }> = [
    { kind: 'always', items: [] },
    { kind: 'class', items: [] },
    { kind: 'subclass', items: [] },
  ]

  for (const a of visible) {
    const g = a.gates as ActionGate
    if (g.kind === 'always') groups[0].items.push(a)
    else if (g.kind === 'class') groups[1].items.push(a)
    else groups[2].items.push(a) // subclass and any composite gates default here
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
                    title={disabled ? (status.reason ?? 'Unavailable') : action.description ?? action.name}
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
