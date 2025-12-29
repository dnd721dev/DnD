'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { loadDraft, saveDraft, clearDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { RACE_LIST, getRace, type RaceKey } from '@/lib/races'
import { proficiencyForLevel } from '@/lib/rules'
import { supabase } from '@/lib/supabase'

import type { Abilities } from '../../../../types/character'
import { WEAPONS } from '@/lib/weapons'
import { ARMORS } from '@/lib/armor'
import { getPack, getGear, type PackKey } from '@/lib/equipment'

// ✅ NEW: for HP calc
import type { ClassKey } from '@/lib/subclasses'

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

function norm(raw: any) {
  return String(raw ?? '').trim().toLowerCase()
}

function makeId() {
  return `inv_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function normalizePackKey(raw: string | null | undefined): PackKey | null {
  const k = String(raw ?? '').trim()
  if (!k) return null

  const exact = getPack(k as any)
  if (exact) return exact.key

  const lower = k.toLowerCase()
  if (lower.includes('burgl')) return 'burglars'
  if (lower.includes('diplo')) return 'diplomats'
  if (lower.includes('dungeon')) return 'dungeoneers'
  if (lower.includes('entertain')) return 'entertainers'
  if (lower.includes('explorer')) return 'explorers'
  if (lower.includes('priest')) return 'priests'
  if (lower.includes('scholar')) return 'scholars'

  return null
}

type InventoryItem = {
  id: string
  key?: string | null
  name: string
  qty: number
  category?: 'weapon' | 'armor' | 'shield' | 'gear' | 'consumable' | 'treasure' | 'misc'
}

function buildInventoryFromDraft(draft: CharacterDraft): InventoryItem[] {
  const counts = new Map<string, { name: string; category: InventoryItem['category']; qty: number }>()

  const packKey = normalizePackKey(draft.packKey ?? null)
  if (packKey) {
    const pack = getPack(packKey)
    if (pack?.items?.length) {
      for (const it of pack.items) {
        const q = Number(it.quantity ?? 0)
        if (q <= 0) continue
        const gear = getGear(it.item as any)
        if (!gear) continue

        const key = String(gear.key)
        const prev = counts.get(key)
        if (prev) prev.qty += q
        else counts.set(key, { name: gear.name, category: 'gear', qty: q })
      }
    }
  }

  const wKey = norm(draft.mainWeaponKey ?? '')
  const w = (WEAPONS as any)[wKey]
  if (w && w.key) {
    const key = String(w.key)
    const prev = counts.get(key)
    if (prev) prev.qty += 1
    else counts.set(key, { name: w.name ?? key, category: 'weapon', qty: 1 })
  }

  const aKey = norm(draft.armorKey ?? '')
  const a = (ARMORS as any)[aKey]
  if (a && a.key && a.category !== 'shield') {
    const key = String(a.key)
    const prev = counts.get(key)
    if (prev) prev.qty += 1
    else counts.set(key, { name: a.name ?? key, category: 'armor', qty: 1 })
  }

  const out: InventoryItem[] = []
  for (const [key, v] of counts.entries()) {
    out.push({
      id: makeId(),
      key,
      name: v.name,
      qty: v.qty,
      category: v.category ?? 'misc',
    })
  }

  out.sort((a, b) => (a.category ?? '').localeCompare(b.category ?? '') || a.name.localeCompare(b.name))
  return out
}

// ✅ NEW: class hit die + HP calc (kept local so you can paste one file)
function hitDieForClass(classKeyRaw: string | null | undefined): number {
  const k = String(classKeyRaw ?? 'fighter').toLowerCase()
  switch (k) {
    case 'barbarian':
      return 12
    case 'fighter':
    case 'paladin':
    case 'ranger':
      return 10
    case 'sorcerer':
    case 'wizard':
      return 6
    case 'bard':
    case 'cleric':
    case 'druid':
    case 'monk':
    case 'rogue':
    case 'warlock':
    case 'artificer':
    default:
      return 8
  }
}

function averageHpPerLevel(hitDie: number): number {
  // d6=4, d8=5, d10=6, d12=7
  return Math.floor(hitDie / 2) + 1
}

function calcMaxHp(args: { classKey: ClassKey | string; level: number; conScore: number }): number {
  const level = Math.max(1, Math.min(20, Math.floor(args.level || 1)))
  const hitDie = hitDieForClass(String(args.classKey))
  const conMod = abilityMod(args.conScore)

  // Level 1: max hit die + CON
  const level1 = hitDie + conMod
  if (level === 1) return Math.max(1, level1)

  // Later levels: average + CON each level
  const perLevel = averageHpPerLevel(hitDie) + conMod
  const laterLevels = (level - 1) * perLevel

  return Math.max(1, level1 + laterLevels)
}

export default function NewCharacterStep6Page() {
  const router = useRouter()
  const { address } = useAccount()

  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    const proficiencyBonus = existing.proficiencyBonus ?? proficiencyForLevel(level)

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

    merged.equipmentItems = Array.isArray(existing.equipmentItems) ? existing.equipmentItems : merged.equipmentItems
    merged.inventoryItems = buildInventoryFromDraft(merged)

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

      const next: CharacterDraft = { ...current, ...update }
      next.inventoryItems = buildInventoryFromDraft(next)

      saveDraft(next)
      return next
    })
  }

  function handleBack() {
    if (draft) saveDraft(draft)
    router.push('/characters/new/step5')
  }

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

    const walletLower = address.toLowerCase()

    try {
      setSaving(true)
      setError(null)

      // ✅ PRE-CHECK: make sure profile mapping exists (prevents vague RLS errors)
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('wallet_address, user_id')
        .eq('wallet_address', walletLower)
        .maybeSingle()

      if (profErr) {
        console.error(profErr)
        setError(profErr.message || 'Failed to verify profile.')
        setSaving(false)
        return
      }

      if (!prof) {
        setError('Profile not linked yet. Disconnect + reconnect your wallet and try again.')
        setSaving(false)
        return
      }

      const level = draft.level ?? 1
      const proficiencyBonus = draft.proficiencyBonus ?? proficiencyForLevel(level)
      const raceKey = (draft.raceKey as RaceKey) ?? (RACE_LIST[0]?.key as RaceKey)

      const abilitiesPayload: Abilities =
        finalAbilities ?? (draft.baseAbilities as Abilities | null) ?? DEFAULT_ABILITIES

      // ✅ NEW: compute HP from class + level + CON
      const classKey = (String(draft.classKey ?? 'fighter').toLowerCase() as ClassKey)
      const computedMaxHp = calcMaxHp({
        classKey,
        level,
        conScore: abilitiesPayload.con,
      })

      const computedCurrentHp =
        typeof (draft as any).currentHp === 'number' && Number.isFinite((draft as any).currentHp)
          ? Math.max(0, Math.min((draft as any).currentHp, computedMaxHp))
          : computedMaxHp

      const inventory_items = buildInventoryFromDraft(draft)
      const equipment_items: string[] | null = null

      const payload: Record<string, any> = {
        // ✅ identity
        wallet_address: walletLower,
        name: draft.name.trim(),
        level,
        race: raceKey ?? null,

        // class/background
        main_job: draft.classKey ?? 'fighter',
        subclass: draft.subclassKey ?? null,
        background: draft.backgroundKey ?? 'soldier',
        alignment: draft.alignment ?? null,

        // core stats
        proficiency: proficiencyBonus,
        abilities: abilitiesPayload,
        saving_throw_profs: draft.savingThrows
          ? Object.entries(draft.savingThrows)
              .filter(([, v]) => !!v)
              .map(([k]) => k)
          : [],
        skill_proficiencies: draft.skillProficiencies ?? {},
        passive_perception: passivePerception,

        // combat-ish fields
        hp: computedMaxHp,
        hit_points_current: computedCurrentHp,
        hit_points_max: computedMaxHp,
        ac: draft.armorClass ?? 10,

        // equipment keys
        main_weapon_key: draft.mainWeaponKey ?? null,
        armor_key: draft.armorKey ?? null,
        equipment_pack: draft.packKey ?? null,
        equipment_items,

        // inventory
        inventory_items,

        // spells
        spells_known: draft.knownSpells ?? [],
        spells_prepared: draft.preparedSpells ?? [],

        // NFT
        nft_contract: (draft as any).nft_contract ?? null,
        nft_token_id: (draft as any).nft_token_id ?? null,
        avatar_url: (draft as any).avatar_url ?? null,

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
        .limit(1)
        .maybeSingle()

      if (insertError) {
        console.error(insertError)
        setError(insertError.message || 'Failed to save character.')
        setSaving(false)
        return
      }

      clearDraft()
      setSaving(false)

      if (data?.id) router.push(`/characters/${data.id}`)
      else router.push('/characters')
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Unexpected error saving character.')
      setSaving(false)
    }
  }

  if (!ready || !draft) {
    return <div className="text-sm text-slate-300">Loading final step…</div>
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg md:text-xl font-semibold text-white">Step 6 — Personality & Final Save</h2>
        <p className="text-xs md:text-sm text-slate-400">
          Lock in who your character is, then save them to your DND721 roster.
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
        Inventory to save: <span className="font-semibold">{draft.inventoryItems?.length ?? 0}</span> items
        <span className="text-slate-500"> (from your pack + chosen weapon/armor)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Personality Traits</label>
            <textarea
              rows={4}
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              value={draft.personalityTraits ?? ''}
              onChange={(e) => updateDraft({ personalityTraits: e.target.value })}
            />
            <p className="text-[11px] text-slate-500">Little quirks, habits, and behaviors that define how they act.</p>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Ideals</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              value={draft.ideals ?? ''}
              onChange={(e) => updateDraft({ ideals: e.target.value })}
            />
            <p className="text-[11px] text-slate-500">What they believe in, fight for, or will never compromise on.</p>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Bonds</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              value={draft.bonds ?? ''}
              onChange={(e) => updateDraft({ bonds: e.target.value })}
            />
            <p className="text-[11px] text-slate-500">People, places, or oaths they’re tied to.</p>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-300">Flaws</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
              value={draft.flaws ?? ''}
              onChange={(e) => updateDraft({ flaws: e.target.value })}
            />
            <p className="text-[11px] text-slate-500">The cracks in their armor that make them interesting.</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-1 h-full">
            <label className="font-semibold text-slate-300">Notes</label>
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

      {error && (
        <div className="rounded-md border border-red-500 bg-red-900/50 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

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
