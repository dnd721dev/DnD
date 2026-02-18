import type { Armor } from '@/lib/armor'
import type { Weapon } from '@/lib/weapons'
import { ARMORS } from '@/lib/armor'
import { WEAPONS } from '@/lib/weapons'

export type ArmorInfo = Armor
export type WeaponInfo = Weapon

export const ARMOR_DB: Record<string, ArmorInfo> = ARMORS
export const WEAPON_DB: Record<string, WeaponInfo> = WEAPONS
