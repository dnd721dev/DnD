export type RestKind = 'short' | 'long'

export type ActionGate =
  | { kind: 'always' }
  | { kind: 'class'; classKey: string }
  | { kind: 'subclass'; subclassKey: string }
  | { kind: 'and'; all: ActionGate[] }
  | { kind: 'or'; any: ActionGate[] }

export type ActionCost =
  | { type: 'none' }
  | { type: 'resource'; key: string; amount: number }
  | { type: 'perTurnFlag'; flag: string }
  | { type: 'perRestFlag'; flag: string; rest: RestKind }

export type ActionEffect =
  | { type: 'setFlag'; flag: string; value: boolean }
  | { type: 'rollAttack' }
  | { type: 'rollDamage' }
  | { type: 'rollFormula'; label: string; formula: string }
  | { type: 'logNote'; text: string }

export type SheetAction = {
  id: string
  name: string
  category: 'Core' | 'Class' | 'Subclass' | 'DND721'
  description?: string

  gates: ActionGate
  cost: ActionCost

  // optional: if present, clicking also performs these
  effects?: ActionEffect[]
}
