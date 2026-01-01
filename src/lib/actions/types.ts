export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type ActionGate =
  | { kind: 'always' }
  | { kind: 'class'; classKey: string }
  | { kind: 'subclass'; subclassKey: string }
  | { kind: 'anyOf'; gates: ActionGate[] }

export type ActionCost =
  | { type: 'none' }
  | { type: 'perTurnFlag'; flag: string }
  | { type: 'perRestFlag'; flag: string; rest: 'short' | 'long' | 'any' }
  | { type: 'resource'; key: string; amount: number } // resource_state[key] -= amount

export type ActionEffect =
  | { type: 'none' }
  | { type: 'setFlag'; flag: string; value: boolean }
  | { type: 'spendResource'; key: string; amount: number }
  | { type: 'healSelf'; dice: string; bonusAbility?: AbilityKey } // optional future hook
  | { type: 'note'; text: string } // just logs a note to dice log later

export type SheetAction = {
  id: string
  name: string
  category: 'Core' | 'Class' | 'Subclass' | 'DND721'
  gates: ActionGate
  cost: ActionCost
  effects?: ActionEffect[]
  description?: string
}
