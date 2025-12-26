import type { Abilities } from '../../types/character'
import type { CharacterSheetData, InventoryItem } from './types'
import { abilityMod } from './utils'
import { ARMORS } from '@/lib/armor'
import { WEAPONS } from '@/lib/weapons'
import { isProficientWithMainWeapon } from './proficiency-rules'

export type ArmorResult = {
  ac: number
  armorName: string | null
  shieldEquipped: boolean
}

function norm(raw: string) {
  return (raw ?? '').trim().toLowerCase()
}

function parseInventory(raw: any): InventoryItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((it: any) => ({
      key: norm(it?.key ?? ''),
      name: String(it?.name ?? '').trim(),
      qty: Number(it?.qty ?? 0),
      kind: it?.kind,
    }))
    .filter((it: any) => it.key)
}

function inventoryHas(inv: InventoryItem[], key: string) {
  const k = norm(key)
  return inv.some((it) => norm(it.key) === k && (it.qty ?? 0) > 0)
}

function shieldEquippedFlag(c: CharacterSheetData) {
  const items = Array.isArray(c.equipment_items) ? c.equipment_items : []
  return items.map((x) => norm(String(x))).includes('shield')
}

export function computeArmorClass(c: CharacterSheetData, abilities: Abilities): ArmorResult {
  const dexMod = abilityMod(abilities.dex)

  const inv = parseInventory(c.inventory_items)
  const ownsShield = inventoryHas(inv, 'shield')
  const shieldEquipped = ownsShield && shieldEquippedFlag(c)

  const armorKey = norm(c.armor_key ?? '')
  const armor = (ARMORS as any)[armorKey]

  // No armor (or invalid armor)
  if (!armor) {
    const base = 10 + dexMod
    const ac = base + (shieldEquipped ? 2 : 0)
    return { ac: Math.max(10, ac), armorName: null, shieldEquipped }
  }

  // base AC from armor rules
  let ac = Number(armor.baseAc ?? 10)

  // Dex rules
  const dexCap = armor.dexCap
  if (dexCap === null) {
    ac += dexMod
  } else if (typeof dexCap === 'number') {
    if (dexCap > 0) ac += Math.min(dexMod, dexCap)
    // dexCap === 0 => no dex
  }

  if (shieldEquipped) ac += 2

  return { ac, armorName: armor.name ?? null, shieldEquipped }
}

export type AttackResult = {
  weaponName: string | null
  attackAbility: keyof Abilities
  attackBonus: number
  damageFormula: string
  damageType: string | null
  attackFormula: string
  proficient: boolean
}

export function computeMainAttack(
  c: CharacterSheetData,
  abilities: Abilities,
  profBonus: number,
): AttackResult {
  const key = norm(c.main_weapon_key ?? '')
  const weapon = (WEAPONS as any)[key]

  // Unarmed fallback
  if (!weapon) {
    const strMod = abilityMod(abilities.str)
    const proficient = true
    const attackBonus = strMod + profBonus
    return {
      weaponName: null,
      attackAbility: 'str',
      proficient,
      attackBonus,
      damageFormula: `1+${strMod}`,
      damageType: null,
      attackFormula: `1d20+${attackBonus}`,
    }
  }

  const strMod = abilityMod(abilities.str)
  const dexMod = abilityMod(abilities.dex)

  // Your lib shape: group melee/ranged and properties[] includes 'finesse'
  const props: string[] = Array.isArray(weapon.properties) ? weapon.properties : []
  const finesse = props.includes('finesse')
  const ranged = String(weapon.group ?? '').toLowerCase() === 'ranged'

  let ability: keyof Abilities = 'str'
  if (ranged) ability = 'dex'
  else if (finesse) ability = dexMod >= strMod ? 'dex' : 'str'

  const mod = ability === 'dex' ? dexMod : strMod

  // ✅ Real proficiency check (your existing helper)
  const proficient = isProficientWithMainWeapon(c)
  const attackBonus = mod + (proficient ? profBonus : 0)

  const damageDice = String(weapon.damageDice ?? '1')
  const damageFormula = `${damageDice}+${mod}`

  return {
    weaponName: weapon.name ?? null,
    attackAbility: ability,
    proficient,
    attackBonus,
    damageFormula,
    damageType: weapon.damageType ?? null,
    attackFormula: `1d20+${attackBonus}`,
  }
}
