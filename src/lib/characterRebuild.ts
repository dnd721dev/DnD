// src/lib/characterRebuild.ts
// Reopen an existing (non-CAYA) character in the 6-step builder.
//
// The builder RE-DERIVES ability scores (base + background bonus + ASI), so a
// clean round-trip needs the raw build inputs, not the final numbers. From now
// on the builder stores that snapshot in `characters.action_state.build_draft`
// (see step6). This helper prefers that snapshot; for characters created before
// edit support it falls back to a best-effort reconstruction from columns —
// with background/ASI bonuses left empty so the stored final scores pass
// through unchanged instead of being applied a second time.

import type { CharacterDraft } from '../types/characterDraft'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/** Build a builder draft that will UPDATE `row` on save (never a new row). */
export function hydrateRebuildDraft(row: any): CharacterDraft {
  const id = String(row?.id ?? '')

  // ── Snapshot path — perfect round-trip for characters built with edit support.
  const snapshot = row?.action_state?.build_draft as CharacterDraft | undefined
  if (snapshot && typeof snapshot === 'object') {
    return {
      ...snapshot,
      editingId: id,
      rebuildLegacy: false,
      is_caya: false,
      // Keep the live name/avatar authoritative in case they were renamed after
      // the snapshot was taken.
      name: row?.name ?? snapshot.name,
      avatar_url: row?.avatar_url ?? snapshot.avatar_url ?? null,
    }
  }

  // ── Legacy path — reconstruct from columns (abilities re-verified by player).
  const abilities = (row?.abilities ?? {}) as Partial<Record<AbilityKey, number>>
  const baseAbilities = {
    str: Number(abilities.str ?? 10),
    dex: Number(abilities.dex ?? 10),
    con: Number(abilities.con ?? 10),
    int: Number(abilities.int ?? 10),
    wis: Number(abilities.wis ?? 10),
    cha: Number(abilities.cha ?? 10),
  }

  // saving_throw_profs is a text[] of ability keys → boolean map.
  const saveArr: string[] = Array.isArray(row?.saving_throw_profs) ? row.saving_throw_profs : []
  const savingThrows = ABILITY_KEYS.reduce((acc, k) => {
    acc[k] = saveArr.map((s) => String(s).toLowerCase()).includes(k)
    return acc
  }, {} as Record<AbilityKey, boolean>)

  return {
    editingId: id,
    rebuildLegacy: true,
    is_caya: false,

    name: row?.name ?? '',
    level: Number(row?.level ?? 1),
    classKey: row?.main_job ?? 'fighter',
    subclassKey: row?.subclass ?? null,
    backgroundKey: row?.background ?? 'soldier',
    raceKey: row?.race ?? undefined,
    alignment: row?.alignment ?? '',

    secondaryClass: row?.secondary_class ?? null,
    secondarySubclass: row?.secondary_subclass ?? null,
    secondaryLevel: Number(row?.secondary_level ?? 0),

    // Final scores are treated as the base with NO bonuses re-applied, so the
    // numbers round-trip unchanged. The player can re-pick ASIs/feats in step 3.
    baseAbilities,
    backgroundAsi: {},
    asiChoices: [],

    savingThrows,
    skillProficiencies: (row?.skill_proficiencies ?? {}) as CharacterDraft['skillProficiencies'],

    knownSpells: row?.spells_known ?? [],
    preparedSpells: row?.spells_prepared ?? [],
    wildcardSpells: row?.wildcard_spells ?? [],
    mysticArcanum: row?.mystic_arcanum ?? {},
    warlockInvocations: row?.warlock_invocations ?? [],
    racialCantripChoice: undefined,

    mainWeaponKey: row?.main_weapon_key ?? null,
    armorKey: row?.armor_key ?? null,
    packKey: row?.equipment_pack ?? null,
    equipmentItems: row?.equipment_items ?? [],
    inventoryItems: row?.inventory_items ?? [],
    startingEquipmentChoice: row?.starting_equipment_choice ?? 'A',
    startingGold: row?.starting_gold ?? undefined,

    languages: row?.languages ?? [],
    toolProficiencies: row?.tool_proficiencies ?? [],
    originFeat: row?.origin_feat ?? undefined,

    nft_contract: row?.nft_contract ?? null,
    nft_token_id: row?.nft_token_id ?? null,
    avatar_url: row?.avatar_url ?? null,

    personalityTraits: row?.personality_traits ?? '',
    ideals: row?.ideals ?? '',
    bonds: row?.bonds ?? '',
    flaws: row?.flaws ?? '',
    notes: row?.notes ?? '',
  }
}
