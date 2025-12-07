'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { loadDraft, saveDraft, clearDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { RACE_LIST, getRace, type RaceKey } from '@/lib/races'
import { proficiencyForLevel } from '@/lib/rules'
import { supabase } from '@/lib/supabase'

type Abilities = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

const DEFAULT_ABILITIES: Abilities = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
}

const DEFAULT_BONUSES: Abilities = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

export default function NewCharacterStep6Page() {
  const router = useRouter()
  const { address } = useAccount()

  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load + normalize draft
  useEffect(() => {
    const existing = loadDraft()

    const level = existing.level ?? 1
    const baseAbilities: Abilities = {
      ...DEFAULT_ABILITIES,
      ...(existing.baseAbilities ?? {}),
    }
    const abilityBonuses: Abilities = {
      ...DEFAULT_BONUSES,
      ...(existing.abilityBonuses ?? {}),
    }
    const proficiencyBonus =
      existing.proficiencyBonus ?? proficiencyForLevel(level)

    const merged: CharacterDraft = {
      ...existing,
      level,
      baseAbilities,
      abilityBonuses,
      proficiencyBonus,
      personalityTraits: existing.personalityTraits ?? '',
      ideals: existing.ideals ?? '',
      bonds: existing.bonds ?? '',
      flaws: existing.flaws ?? '',
      notes: existing.notes ?? '',
    }

    setDraft(merged)
    saveDraft(merged)
    setReady(true)
  }, [])

  function updateDraft(update: Partial<CharacterDraft>) {
    setDraft((prev) => {
      const current: CharacterDraft =
        prev ?? {
          baseAbilities: DEFAULT_ABILITIES,
          abilityBonuses: DEFAULT_BONUSES,
          level: 1,
          proficiencyBonus: proficiencyForLevel(1),
        }

      const next: CharacterDraft = {
        ...current,
        ...update,
      }
      saveDraft(next)
      return next
    })
  }

  function handleBack() {
    if (draft) saveDraft(draft)
    router.push('/characters/new/step5')
  }

  // Final abilities for derived stuff like passive perception
  const finalAbilities: Abilities | null = useMemo(() => {
    if (!draft) return null

    const base = draft.baseAbilities
    const bonuses = draft.abilityBonuses
    if (!base || !bonuses) return null

    const raceKey = (draft.raceKey as RaceKey) ?? (RACE_LIST[0]?.key as RaceKey)
    const race = getRace(raceKey)

    const racialBonuses: Partial<Abilities> = {}
    if (race?.abilityBonuses) {
      for (const [k, v] of Object.entries(race.abilityBonuses)) {
        racialBonuses[k as keyof Abilities] = v
      }
    }

    const out: Abilities = { ...base }
    ;(Object.keys(bonuses) as (keyof Abilities)[]).forEach((k) => {
      out[k] += bonuses[k]
    })
    ;(Object.keys(racialBonuses) as (keyof Abilities)[]).forEach((k) => {
      out[k] += racialBonuses[k] ?? 0
    })

    return out
  }, [draft])

  const passivePerception = useMemo(() => {
    if (!finalAbilities) return 10
    const wisMod = abilityMod(finalAbilities.wis)
    return 10 + wisMod
  }, [finalAbilities])

  async function handleSave() {
    if (!draft) {
      setError('No character data found in draft.')
      return
    }

    if (!address) {
      setError('Connect your wallet before saving your character.')
      return
    }

    if (!draft.name || draft.name.trim().length === 0) {
      setError('Please give your character a name.')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const level = draft.level ?? 1
      const proficiencyBonus =
        draft.proficiencyBonus ?? proficiencyForLevel(level)

      const raceKey = (draft.raceKey as RaceKey) ?? (RACE_LIST[0]?.key as RaceKey)
      const race = getRace(raceKey)

      // ✅ Store a FLAT abilities object in the DB
      const abilitiesPayload: Abilities =
        finalAbilities ??
        (draft.baseAbilities as Abilities | null) ??
        DEFAULT_ABILITIES

      const payload: Record<string, any> = {
        // identity
        wallet_address: address,
        name: draft.name,
        level,
        class_key: draft.classKey ?? 'fighter',
        subclass_key: draft.subclassKey ?? null,
        race_key: raceKey,
        background_key: draft.backgroundKey ?? 'soldier',
        alignment: draft.alignment ?? null,

        // core stats
        proficiency_bonus: proficiencyBonus,
        abilities: abilitiesPayload,
        saving_throws: draft.savingThrows ?? {},
        skill_proficiencies: draft.skillProficiencies ?? {},
        passive_perception: passivePerception,

        // combat-ish fields
        hp: draft.maxHp ?? 0,
        armor_class: draft.armorClass ?? 10,

        // equipment
        main_weapon_key: draft.mainWeaponKey ?? null,
        armor_key: draft.armorKey ?? null,
        equipment_pack: draft.packKey ?? null,

        // spells
        known_spells: draft.knownSpells ?? [],
        prepared_spells: draft.preparedSpells ?? [],

        // NFT
        nft_contract: draft.nft_contract ?? null,
        nft_token_id: draft.nft_token_id ?? null,
        avatar_url: draft.avatar_url ?? null,

        // personality
        personality_traits: draft.personalityTraits ?? '',
        ideals: draft.ideals ?? '',
        bonds: draft.bonds ?? '',
        flaws: draft.flaws ?? '',
        notes: draft.notes ?? '',
      }

      const { data, error: insertError } = await supabase
        .from('characters')
        .insert(payload)
        .select()
        .single()

      if (insertError) {
        console.error(insertError)
        setError(insertError.message || 'Failed to save character.')
        setSaving(false)
        return
      }

      clearDraft()
      setSaving(false)

      if (data?.id) {
        router.push(`/characters/${data.id}`)
      } else {
        router.push('/characters')
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Unexpected error saving character.')
      setSaving(false)
    }
  }

  if (!ready || !draft) {
    return (
      <div className="text-sm text-slate-300">
        Loading final step…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="space-y-1">
        <h2 className="text-lg md:text-xl font-semibold text-white">
          Step 6 — Personality & Final Save
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Lock in who your character is, then save them to your DND721 roster on-chain-linked via your wallet.
        </p>
      </div>

      {/* Personality grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-3 text-xs">
          {/* Personality Traits */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">
              Personality Traits
            </label>
            <textarea
              rows={4}
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              value={draft.personalityTraits ?? ''}
              onChange={(e) =>
                updateDraft({ personalityTraits: e.target.value })
              }
            />
            <p className="text-[11px] text-slate-500">
              Little quirks, habits, and behaviors that define how they act.
            </p>
          </div>

          {/* Ideals */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">
              Ideals
            </label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              value={draft.ideals ?? ''}
              onChange={(e) => updateDraft({ ideals: e.target.value })}
            />
            <p className="text-[11px] text-slate-500">
              What they believe in, fight for, or will never compromise on.
            </p>
          </div>

          {/* Bonds */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">
              Bonds
            </label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              value={draft.bonds ?? ''}
              onChange={(e) => updateDraft({ bonds: e.target.value })}
            />
            <p className="text-[11px] text-slate-500">
              People, places, or oaths they’re tied to.
            </p>
          </div>

          {/* Flaws */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">
              Flaws
            </label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              value={draft.flaws ?? ''}
              onChange={(e) => updateDraft({ flaws: e.target.value })}
            />
            <p className="text-[11px] text-slate-500">
              The cracks in their armor that make them interesting.
            </p>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3 text-xs">
          {/* Notes */}
          <div className="space-y-1 h-full">
            <label className="font-semibold text-slate-300">
              Notes
            </label>
            <textarea
              rows={18}
              className="w-full h-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              value={draft.notes ?? ''}
              onChange={(e) => updateDraft({ notes: e.target.value })}
            />
            <p className="text-[11px] text-slate-500">
              Backstory details, secrets, DM hooks, or anything you want to remember at the table.
            </p>
          </div>
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div className="rounded-md border border-red-500 bg-red-900/50 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs md:text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
          disabled={saving}
        >
          ← Back to Equipment
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs md:text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(16,185,129,0.55)] transition disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving Character…' : 'Save Character to DND721'}
        </button>
      </div>
    </div>
  )
}
