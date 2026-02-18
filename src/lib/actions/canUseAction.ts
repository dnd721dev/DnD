import type { SheetAction, ActionGate } from './types'

function normKey(v: unknown) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

function gatePasses(g: ActionGate, classKey: string, subclassKey: string): boolean {
  switch (g.kind) {
    case 'always':
      return true
    case 'class':
      return normKey(g.classKey) === normKey(classKey)
    case 'subclass':
      return normKey(g.subclassKey) === normKey(subclassKey)
    case 'and':
      return g.all.every((x) => gatePasses(x, classKey, subclassKey))
    case 'or':
      return g.any.some((x) => gatePasses(x, classKey, subclassKey))
    default:
      return false
  }
}

export function canUseAction(args: {
  action: SheetAction
  classKey: string
  subclassKey: string
  actionState: Record<string, any>
  resourceState: Record<string, number>
}): { ok: boolean; reason?: string } {
  const { action, classKey, subclassKey, actionState, resourceState } = args

  if (!gatePasses(action.gates, classKey, subclassKey)) {
    return { ok: false, reason: 'Not available to your class/subclass.' }
  }

  const cost = action.cost

  if (cost.type === 'none') return { ok: true }

  if (cost.type === 'resource') {
    const have = Number(resourceState?.[cost.key] ?? 0)
    if (have < cost.amount) return { ok: false, reason: `Not enough ${cost.key}.` }
    return { ok: true }
  }

  if (cost.type === 'perTurnFlag') {
    if (Boolean(actionState?.[cost.flag])) return { ok: false, reason: 'Already used this turn.' }
    return { ok: true }
  }

  if (cost.type === 'perRestFlag') {
    if (Boolean(actionState?.[cost.flag])) {
      return { ok: false, reason: `Already used since last ${cost.rest.replace('_', ' ')} rest.` }
    }
    return { ok: true }
  }

  return { ok: false, reason: 'Unknown cost.' }
}
