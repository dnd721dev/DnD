import type { Abilities } from '../../types/character'

export type SpellSlotsSummary = Record<string, number>

// Optional future use (JSONB). Do NOT require `id` because pack-seeded items won't have it.
export type InventoryItem = {
  key: string
  name: string
  qty: number
  kind?: 'weapon' | 'armor' | 'gear' | 'tool' | 'consumable' | 'treasure' | 'misc'
}

export type CharacterSheetData = {
  id: string
  wallet_address: string | null
  name: string
  race: string | null
  main_job: string | null
  subclass: string | null
  level: number | null
  alignment: string | null
  background: string | null

  // Core stats (stored, but we can also derive in calc)
  ac: number | null
  hp: number | null
  hit_points_current: number | null
  hit_points_max: number | null
  proficiency: number | null
  abilities: Abilities | null

  saving_throw_profs: string[] | null
  skill_proficiencies: Record<string, string> | null
  passive_perception: number | null

  // Spell fields
  spellcasting_ability: keyof Abilities | null
  spell_save_dc: number | null
  spell_attack_bonus: number | null
  spell_slots: SpellSlotsSummary | null
  spells_known: string[] | null
  spells_prepared: string[] | null

  // Traits
  racial_traits: string[] | null
  background_feature: string | null

  // Equipment
  equipment_pack: string | null

  /**
   * ✅ Canonical ownership list:
   * keys that exist in WEAPONS / ARMORS / GEAR (e.g. "longsword", "leather", "torch", "shield")
   */
  equipment_items: string[] | null

  // Equipped selections
  main_weapon_key: string | null
  armor_key: string | null

  /**
   * Optional JSONB inventory for later (stacking quantities).
   * Not required for equip enforcement right now.
   */
  inventory_items: InventoryItem[] | null

  // Notes/personality
  notes: string | null
  personality_traits: string | null
  ideals: string | null
  bonds: string | null
  flaws: string | null

  // NFT
  nft_contract: string | null
  nft_token_id: string | null
  avatar_url: string | null
}

export type RollEntry = { label: string; formula: string; result: number }
