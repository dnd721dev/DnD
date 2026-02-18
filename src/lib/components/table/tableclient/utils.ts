import type { CharacterSummary } from './types'

export function formatDateTime(value: string | null) {
  if (!value) return 'TBD'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

export function getAbilityScore(
  char: CharacterSummary | null,
  key: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
): number {
  if (!char || !char.abilities) return 10
  const raw = char.abilities[key]
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const parsed = parseInt(raw, 10)
    if (!Number.isNaN(parsed)) return parsed
  }
  return 10
}

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function parseMaybeNumber(value: any): number | null {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

export function getCharacterMaxHP(char: CharacterSummary | null): number | null {
  if (!char) return null

  const direct = parseMaybeNumber((char as any).hp)
  if (direct !== null) return direct

  const maxHp = parseMaybeNumber((char as any).max_hp)
  if (maxHp !== null) return maxHp

  const alt = parseMaybeNumber((char as any).hit_points)
  if (alt !== null) return alt

  return null
}

export function getCharacterAC(char: CharacterSummary | null): number | null {
  if (!char) return null

  const ac = parseMaybeNumber((char as any).ac)
  if (ac !== null) return ac

  const armor = parseMaybeNumber((char as any).armor_class)
  if (armor !== null) return armor

  return null
}

export function buildRollerName(params: {
  selectedCharacter: CharacterSummary | null
  address: string | undefined
}): string {
  const { selectedCharacter, address } = params
  if (
    selectedCharacter?.name &&
    String(selectedCharacter.name).trim().length > 0
  ) {
    return String(selectedCharacter.name)
  }
  if (address) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`
  }
  return 'Unknown'
}
