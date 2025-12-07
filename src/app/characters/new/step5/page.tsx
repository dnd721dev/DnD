'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { proficiencyForLevel } from '@/lib/rules'

// Local option sets — you can later sync these keys with your real libs.
type WeaponOption = {
  key: string
  name: string
  damage: string
  range: string
  notes?: string
}

type ArmorOption = {
  key: string
  name: string
  ac: number
  category: 'light' | 'medium' | 'heavy' | 'shield'
  notes?: string
}

type PackOption = {
  key: string
  name: string
  description: string
}

const WEAPON_OPTIONS: WeaponOption[] = [
  { key: 'longsword', name: 'Longsword', damage: '1d8 slashing', range: 'Melee', notes: 'Versatile (1d10)' },
  { key: 'shortsword', name: 'Shortsword', damage: '1d6 piercing', range: 'Melee', notes: 'Finesse, light' },
  { key: 'greatsword', name: 'Greatsword', damage: '2d6 slashing', range: 'Melee', notes: 'Heavy, two-handed' },
  { key: 'longbow', name: 'Longbow', damage: '1d8 piercing', range: '150/600', notes: 'Heavy, two-handed, ranged' },
  { key: 'dagger', name: 'Dagger', damage: '1d4 piercing', range: '20/60', notes: 'Finesse, light, thrown' },
]

const ARMOR_OPTIONS: ArmorOption[] = [
  { key: 'leather', name: 'Leather Armor', ac: 11, category: 'light', notes: '+ Dex modifier' },
  { key: 'studded_leather', name: 'Studded Leather', ac: 12, category: 'light', notes: '+ Dex modifier' },
  { key: 'chain_shirt', name: 'Chain Shirt', ac: 13, category: 'medium', notes: '+ Dex (max +2)' },
  { key: 'half_plate', name: 'Half Plate', ac: 15, category: 'medium', notes: '+ Dex (max +2), disadvantage on Stealth' },
  { key: 'chain_mail', name: 'Chain Mail', ac: 16, category: 'heavy', notes: 'Str 13, disadvantage on Stealth' },
  { key: 'shield', name: 'Shield', ac: 2, category: 'shield', notes: 'Bonus to AC when wielded' },
]

const PACK_OPTIONS: PackOption[] = [
  {
    key: 'dungeoneer_pack',
    name: "Dungeoneer's Pack",
    description: 'Backpack, crowbar, hammer, pitons, torches, rations, waterskin, rope.',
  },
  {
    key: 'explorer_pack',
    name: "Explorer's Pack",
    description: 'Backpack, bedroll, mess kit, tinderbox, torches, rations, waterskin, rope.',
  },
  {
    key: 'scholar_pack',
    name: "Scholar's Pack",
    description: 'Backpack, book of lore, ink, ink pen, parchment, bag of sand, small knife.',
  },
]

export default function NewCharacterStep5Page() {
  const router = useRouter()
  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const existing = loadDraft()

    const level = existing.level ?? 1
    const proficiencyBonus =
      existing.proficiencyBonus ?? proficiencyForLevel(level)

    // sensible defaults
    const mainWeaponKey =
      existing.mainWeaponKey ?? WEAPON_OPTIONS[0]?.key ?? 'longsword'
    const armorKey =
      existing.armorKey ?? ARMOR_OPTIONS[0]?.key ?? 'leather'
    const packKey =
      existing.packKey ?? PACK_OPTIONS[0]?.key ?? 'dungeoneer_pack'

    const merged: CharacterDraft = {
      ...existing,
      level,
      proficiencyBonus,
      mainWeaponKey,
      armorKey,
      packKey,
    }

    setDraft(merged)
    saveDraft(merged)
    setReady(true)
  }, [])

  function updateDraft(update: Partial<CharacterDraft>) {
    setDraft((prev) => {
      const current: CharacterDraft =
        prev ?? {
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
    // Even if Step 4 skipped, going "back" to step4 is fine; it will auto-redirect if needed.
    router.push('/characters/new/step4')
  }

  function handleNext() {
    if (draft) saveDraft(draft)
    router.push('/characters/new/step6')
  }

  if (!ready || !draft) {
    return (
      <div className="text-sm text-slate-300">
        Loading equipment…
      </div>
    )
  }

  const currentWeapon =
    WEAPON_OPTIONS.find((w) => w.key === draft.mainWeaponKey) ??
    WEAPON_OPTIONS[0]

  const currentArmor =
    ARMOR_OPTIONS.find((a) => a.key === draft.armorKey) ??
    ARMOR_OPTIONS[0]

  const currentPack =
    PACK_OPTIONS.find((p) => p.key === draft.packKey) ??
    PACK_OPTIONS[0]

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="space-y-1">
        <h2 className="text-lg md:text-xl font-semibold text-white">
          Step 5 — Equipment
        </h2>
        <p className="text-xs md:text-sm text-slate-400">
          Choose your main weapon, armor, and adventuring pack. These keys will be used later to drive your attacks and AC on the character sheet.
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weapon column */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300">
            Main Weapon
          </h3>

          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.mainWeaponKey ?? WEAPON_OPTIONS[0]?.key}
            onChange={(e) =>
              updateDraft({
                mainWeaponKey: e.target.value,
              })
            }
          >
            {WEAPON_OPTIONS.map((w) => (
              <option key={w.key} value={w.key}>
                {w.name}
              </option>
            ))}
          </select>

          {currentWeapon && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs space-y-1">
              <p className="text-slate-300">
                <span className="font-semibold">Damage:</span>{' '}
                {currentWeapon.damage}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold">Range:</span>{' '}
                {currentWeapon.range}
              </p>
              {currentWeapon.notes && (
                <p className="text-[11px] text-slate-500">
                  {currentWeapon.notes}
                </p>
              )}
              <p className="text-[11px] text-slate-500 mt-2">
                Your exact attack bonus will be calculated on the character sheet using your ability scores and proficiency.
              </p>
            </div>
          )}
        </div>

        {/* Armor column */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300">
            Armor
          </h3>

          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.armorKey ?? ARMOR_OPTIONS[0]?.key}
            onChange={(e) =>
              updateDraft({
                armorKey: e.target.value,
              })
            }
          >
            {ARMOR_OPTIONS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>

          {currentArmor && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs space-y-1">
              <p className="text-slate-300">
                <span className="font-semibold">Base AC:</span>{' '}
                {currentArmor.category === 'shield'
                  ? `+${currentArmor.ac} (shield bonus)`
                  : `${currentArmor.ac}`}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold">Category:</span>{' '}
                {currentArmor.category.charAt(0).toUpperCase() +
                  currentArmor.category.slice(1)}
              </p>
              {currentArmor.notes && (
                <p className="text-[11px] text-slate-500">
                  {currentArmor.notes}
                </p>
              )}

              <p className="text-[11px] text-slate-500 mt-2">
                Final AC will be computed on the sheet page based on armor, shield, and Dexterity.
              </p>
            </div>
          )}
        </div>

        {/* Pack column */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300">
            Adventuring Pack
          </h3>

          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.packKey ?? PACK_OPTIONS[0]?.key}
            onChange={(e) =>
              updateDraft({
                packKey: e.target.value,
              })
            }
          >
            {PACK_OPTIONS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>

          {currentPack && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs space-y-1">
              <p className="text-slate-300">
                <span className="font-semibold">Contents:</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {currentPack.description}
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                Packs are mostly for flavor and quick gear assumptions at the table.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
        <button
          type="button"
          onClick={handleBack}
          className="text-xs md:text-sm text-slate-400 hover:text-slate-200 underline-offset-4 hover:underline"
        >
          ← Back to Spellcasting
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs md:text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.55)] transition"
        >
          Next: Personality & Save
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}
