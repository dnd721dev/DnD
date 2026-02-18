export type RollEntry = {
  label: string
  formula: string
  result: number
}

export type InventoryItem = {
  id?: string
  key?: string
  name?: string
  type?: string
  qty?: number
  quantity?: number
  equipped?: boolean
  attuned?: boolean
  notes?: string
  [k: string]: any
}

export type SpellSlotsSummary = Record<string, number>

export type CharacterSheetData = {
  id: string

  name?: string | null
  wallet_address?: string | null

  level?: number | null
  main_job?: string | null
  subclass?: string | null
  race?: string | null
  background?: string | null
  alignment?: string | null

  abilities?: {
    str: number
    dex: number
    con: number
    int: number
    wis: number
    cha: number
  } | null

  hit_points_max?: number | null
  hit_points_current?: number | null
  armor_class?: number | null

  // ✅ NEW: movement + vision authority for VTT rules
  speed_ft?: number | null
  vision_ft?: number | null
  darkvision_ft?: number | null

  saving_throw_profs?: string[] | null

  spellcasting_ability?: string | null
  spell_save_dc?: number | null
  spell_attack_bonus?: number | null
  spell_slots?: SpellSlotsSummary | null
  spells_known?: string[] | null
  spells_prepared?: string[] | null

  // ✅ persistent sheet state
  resource_state?: Record<string, number> | null
  action_state?: Record<string, any> | null

  [key: string]: any
}
