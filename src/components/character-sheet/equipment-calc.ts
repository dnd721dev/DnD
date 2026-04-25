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

// ✅ FIX: allow undefined/null so TypeScript is happy everywhere
function norm(raw: string | undefined | null) {
  return String(raw ?? '').trim().toLowerCase()
}

function parseInventory(raw: any): InventoryItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((it: any) => ({
      // ✅ always a string (normalized)
      key: norm(it?.key),
      name: String(it?.name ?? '').trim(),
      // ✅ support qty or quantity
      qty: Number(it?.qty ?? it?.quantity ?? 0),
      kind: it?.kind,
    }))
    .filter((it: any) => Boolean(it.key))
}

function inventoryHas(inv: InventoryItem[], key: string) {
  const k = norm(key)
  // ✅ FIX: it.key might be undefined in the type, norm can handle it now
  return inv.some((it) => norm(it.key) === k && Number((it as any).qty ?? (it as any).quantity ?? 0) > 0)
}

function shieldEquippedFlag(c: CharacterSheetData) {
  const items = Array.isArray(c.equipment_items) ? c.equipment_items : []
  return items.map((x) => norm(String(x))).includes('shield')
}

export function computeArmorClass(c: CharacterSheetData, abilities: Abilities): ArmorResult {
  const dexMod = abilityMod(abilities.dex)

  const inv = parseInventory((c as any).inventory_items)
  const ownsShield = inventoryHas(inv, 'shield')
  const shieldEquipped = ownsShield && shieldEquippedFlag(c)

  const armorKey = norm((c as any).armor_key)
  const armor = (ARMORS as any)[armorKey]

  // No armor (or invalid armor)
  if (!armor) {
    const classKey = norm((c as any).main_job ?? '')
    const conMod = abilityMod(abilities.con)
    const wisMod = abilityMod(abilities.wis)

    // Unarmored Defense: Barbarian = 10+DEX+CON, Monk = 10+DEX+WIS, everyone else = 10+DEX
    let base = 10 + dexMod
    if (classKey === 'barbarian') base = 10 + dexMod + conMod
    else if (classKey === 'monk')  base = 10 + dexMod + wisMod

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
  const key = norm((c as any).main_weapon_key)
  const weapon = (WEAPONS as any)[key]

  // Unarmed fallback
  if (!weapon) {
    const strMod = abilityMod(abilities.str)
    const dexMod = abilityMod(abilities.dex)
    const classKey = norm((c as any).main_job ?? '')
    const level   = Math.max(1, Number((c as any).level ?? 1))

    // Monk Martial Arts: use higher of STR/DEX; damage die scales by level
    let unarmedAbility: keyof Abilities = 'str'
    let unarmedMod = strMod
    if (classKey === 'monk' && dexMod > strMod) {
      unarmedAbility = 'dex'
      unarmedMod = dexMod
    }

    let damageDie = '1'
    if (classKey === 'monk') {
      if (level >= 17) damageDie = 'd10'
      else if (level >= 11) damageDie = 'd8'
      else if (level >= 5)  damageDie = 'd6'
      else                  damageDie = 'd4'
    }

    const proficient = true
    const attackBonus = unarmedMod + profBonus
    return {
      weaponName: null,
      attackAbility: unarmedAbility,
      proficient,
      attackBonus,
      damageFormula: `${damageDie}+${unarmedMod}`,
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
