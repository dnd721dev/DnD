'use client'

import { ALL_ACTIONS, canUseAction, type SheetAction } from '@/lib/actions'
import type { ActionGate } from '@/lib/actions/types'
import { getFeatureById, formatActionType, formatRecharge } from '@/lib/classFeatures'

type Props = {
  classKey: string
  subclassKey?: string | null
  actionState: Record<string, any>
  resourceState: Record<string, number>
  onUseAction: (action: SheetAction) => void
  sneakArmed?: boolean
  onToggleSneakArm?: () => void
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
  sneakArmed,
  onToggleSneakArm,
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

  const isRogue = normalizedClass === 'rogue'

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-100">Actions</div>
        {isRogue && onToggleSneakArm && (
          <button
            type="button"
            onClick={onToggleSneakArm}
            className={`rounded-md px-3 py-1 text-[11px] font-semibold transition ${
              sneakArmed
                ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-500/50 hover:bg-amber-500/35'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {sneakArmed ? '🗡 Sneak Armed' : 'Arm Sneak Attack'}
          </button>
        )}
      </div>

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
                // Prefer rich class-feature text when an action cross-references it.
                const feature = action.featureId ? getFeatureById(action.featureId) : null
                const richDesc = feature?.shortDescription ?? action.description
                const hint = status.ok ? richDesc : status.reason || richDesc
                const fullTitle = feature?.fullDescription ?? feature?.shortDescription ?? action.description ?? action.name

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
                    title={disabled ? (status.reason ?? 'Unavailable') : fullTitle}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{action.name}</div>
                      <div className="text-[10px] text-slate-400">{action.category}</div>
                    </div>

                    {/* Badge row — action type / recharge — from the linked feature. */}
                    {feature && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded bg-sky-900/40 border border-sky-700/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-sky-200">
                          ⏱ {formatActionType(feature.type)}
                        </span>
                        {feature.uses && (
                          <span className="rounded bg-violet-900/40 border border-violet-700/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-200">
                            🔁 {formatRecharge(feature.uses.recharge)}
                          </span>
                        )}
                        {feature.source === 'phb-2024' && (
                          <span className="rounded bg-emerald-900/40 border border-emerald-700/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-200" title="2024 PHB ruleset">
                            2024
                          </span>
                        )}
                      </div>
                    )}

                    {hint && <div className="mt-1 text-[11px] text-slate-400">{hint}</div>}
                    {feature?.scalingNotes && !disabled && (
                      <div className="mt-1 text-[10px] italic text-slate-500">{feature.scalingNotes}</div>
                    )}
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
