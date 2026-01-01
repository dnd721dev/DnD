import type { ActionGate, SheetAction } from './types'

function evalGate(g: ActionGate, ctx: { classKey?: string | null; subclassKey?: string | null }): boolean {
  if (g.kind === 'always') return true
  if (g.kind === 'class') return (ctx.classKey ?? '').toLowerCase() === g.classKey.toLowerCase()
  if (g.kind === 'subclass') return (ctx.subclassKey ?? '').toLowerCase() === g.subclassKey.toLowerCase()
  if (g.kind === 'anyOf') return g.gates.some((x) => evalGate(x, ctx))
  return false
}

export function canUseAction(params: {
  action: SheetAction
  classKey?: string | null
  subclassKey?: string | null
  actionState?: Record<string, any>
  resourceState?: Record<string, any>
}) {
  const { action, classKey, subclassKey, actionState, resourceState } = params

  const gateOk = evalGate(action.gates, { classKey, subclassKey })
  if (!gateOk) return { ok: false as const, reason: 'Not available for this character.' }

  const cost = action.cost
  if (cost.type === 'none') return { ok: true as const }

  if (cost.type === 'perTurnFlag') {
    const used = Boolean(actionState?.[cost.flag])
    return used ? { ok: false as const, reason: 'Already used this turn.' } : { ok: true as const }
  }

  if (cost.type === 'perRestFlag') {
    const used = Boolean(actionState?.[cost.flag])
    return used ? { ok: false as const, reason: `Already used (refresh on ${cost.rest} rest).` } : { ok: true as const }
  }

  if (cost.type === 'resource') {
    const have = Number(resourceState?.[cost.key] ?? 0)
    return have >= cost.amount ? { ok: true as const } : { ok: false as const, reason: `Not enough ${cost.key}.` }
  }

  return { ok: false as const, reason: 'Unknown cost.' }
}
