'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { proficiencyForLevel } from '@/lib/rules'

import { WEAPONS } from '@/lib/weapons'
import { ARMORS } from '@/lib/armor'
import { PACK_LIST, getPack, getGear, type PackKey } from '@/lib/equipment'

function uniqStrings(arr: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const v of arr) {
    const s = String(v).trim()
    if (!s) continue
    const k = s.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(s)
  }
  return out
}

function normalizePackKey(raw: string | null | undefined): PackKey | null {
  const k = String(raw ?? '').trim()
  if (!k) return null

  // exact match
  const exact = PACK_LIST.find((p) => p.key === k)
  if (exact) return exact.key

  // allow legacy keys like "dungeoneer_pack"
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

function buildOwnedEquipmentKeys(args: {
  packKey: PackKey | null
  mainWeaponKey: string | null
  armorKey: string | null
}): string[] {
  const { packKey, mainWeaponKey, armorKey } = args

  const out: string[] = []

  // Pack contents => ONLY valid gear keys (skips placeholder keys like candle/chest10/ballOfSand)
  if (packKey) {
    const pack = getPack(packKey)
    if (pack?.items?.length) {
      for (const it of pack.items) {
        if ((it.quantity ?? 0) <= 0) continue
        const gear = getGear(it.item as any)
        if (!gear) continue
        // If quantity>1, include duplicates for now; Step 6 will uniq anyway
        for (let i = 0; i < it.quantity; i++) out.push(gear.key)
      }
    }
  }

  // Add chosen weapon/armor as owned keys too (so sheet dropdowns can show them immediately)
  if (mainWeaponKey && (WEAPONS as any)[String(mainWeaponKey)]) out.push(String(mainWeaponKey))
  if (armorKey && (ARMORS as any)[String(armorKey)]) out.push(String(armorKey))

  return uniqStrings(out)
}

export default function NewCharacterStep5Page() {
  const router = useRouter()
  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [ready, setReady] = useState(false)

  const weaponOptions = useMemo(() => {
    return Object.values(WEAPONS).slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const armorOptions = useMemo(() => {
    // If your ARMORS ever includes shield, exclude it here (we treat shield as gear)
    return Object.values(ARMORS)
      .filter((a: any) => a.category !== 'shield')
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const packOptions = useMemo(() => {
    return PACK_LIST.slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  useEffect(() => {
    const existing = loadDraft()

    const level = existing.level ?? 1
    const proficiencyBonus = existing.proficiencyBonus ?? proficiencyForLevel(level)

    const defaultWeaponKey = weaponOptions[0]?.key ?? 'club'
    const defaultArmorKey = armorOptions[0]?.key ?? 'padded'
    const defaultPackKey = packOptions[0]?.key ?? 'dungeoneers'

    const packKey = normalizePackKey(existing.packKey ?? defaultPackKey) ?? defaultPackKey

    const mainWeaponKey = existing.mainWeaponKey ?? defaultWeaponKey
    const armorKey = existing.armorKey ?? defaultArmorKey

    const equipmentItems = buildOwnedEquipmentKeys({
      packKey: packKey as any,
      mainWeaponKey,
      armorKey,
    })

    const merged: CharacterDraft = {
      ...existing,
      level,
      proficiencyBonus,
      mainWeaponKey,
      armorKey,
      packKey,
      // ✅ canonical owned list (keys)
      equipmentItems,
    }

    setDraft(merged)
    saveDraft(merged)
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateDraft(update: Partial<CharacterDraft>) {
    setDraft((prev) => {
      const current: CharacterDraft = prev ?? { level: 1, proficiencyBonus: proficiencyForLevel(1) }
      const next: CharacterDraft = { ...current, ...update }

      // ✅ recompute owned items whenever weapon/armor/pack changes
      const packKey = normalizePackKey(next.packKey ?? null)
      const equipmentItems = buildOwnedEquipmentKeys({
        packKey,
        mainWeaponKey: next.mainWeaponKey ?? null,
        armorKey: next.armorKey ?? null,
      })

      next.equipmentItems = equipmentItems

      saveDraft(next)
      return next
    })
  }

  function handleBack() {
    if (draft) saveDraft(draft)
    router.push('/characters/new/step4')
  }

  function handleNext() {
    if (draft) saveDraft(draft)
    router.push('/characters/new/step6')
  }

  if (!ready || !draft) {
    return <div className="text-sm text-slate-300">Loading equipment…</div>
  }

  const currentWeapon =
    weaponOptions.find((w) => w.key === draft.mainWeaponKey) ?? weaponOptions[0]

  const currentArmor =
    armorOptions.find((a) => a.key === draft.armorKey) ?? armorOptions[0]

  const currentPack =
    packOptions.find((p) => p.key === draft.packKey) ?? packOptions[0]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg md:text-xl font-semibold text-white">Step 5 — Equipment</h2>
        <p className="text-xs md:text-sm text-slate-400">
          Choose your main weapon, armor, and adventuring pack. This step also seeds your owned item
          keys (used for equip enforcement on the character sheet).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weapon */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300">Main Weapon</h3>

          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.mainWeaponKey ?? weaponOptions[0]?.key}
            onChange={(e) => updateDraft({ mainWeaponKey: e.target.value })}
          >
            {weaponOptions.map((w) => (
              <option key={w.key} value={w.key}>
                {w.name}
              </option>
            ))}
          </select>

          {currentWeapon ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs space-y-1">
              <p className="text-slate-300">
                <span className="font-semibold">Damage:</span> {currentWeapon.damageDice}{' '}
                {currentWeapon.damageType}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold">Group:</span> {currentWeapon.group}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold">Category:</span> {currentWeapon.category}
              </p>
              {currentWeapon.range ? (
                <p className="text-slate-300">
                  <span className="font-semibold">Range:</span> {currentWeapon.range.normal}/
                  {currentWeapon.range.long}
                </p>
              ) : null}
              {currentWeapon.properties?.length ? (
                <p className="text-[11px] text-slate-500">Props: {currentWeapon.properties.join(', ')}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Armor */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300">Armor</h3>

          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.armorKey ?? armorOptions[0]?.key}
            onChange={(e) => updateDraft({ armorKey: e.target.value })}
          >
            {armorOptions.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>

          {currentArmor ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs space-y-1">
              <p className="text-slate-300">
                <span className="font-semibold">Base AC:</span> {currentArmor.baseAc}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold">Dex:</span>{' '}
                {currentArmor.dexCap === null
                  ? '+Dex (no cap)'
                  : currentArmor.dexCap === 0
                    ? 'No Dex'
                    : `+Dex (max ${currentArmor.dexCap})`}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold">Category:</span> {currentArmor.category}
              </p>
              {currentArmor.strengthRequirement != null ? (
                <p className="text-[11px] text-slate-500">Str req: {currentArmor.strengthRequirement}</p>
              ) : null}
              {currentArmor.disadvantageOnStealth ? (
                <p className="text-[11px] text-slate-500">Disadvantage on Stealth</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Pack */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-300">Adventuring Pack</h3>

          <select
            className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
            value={draft.packKey ?? packOptions[0]?.key}
            onChange={(e) => updateDraft({ packKey: e.target.value })}
          >
            {packOptions.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name}
              </option>
            ))}
          </select>

          {currentPack ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs space-y-1">
              <p className="text-slate-300">
                <span className="font-semibold">About:</span>
              </p>
              <p className="text-[11px] text-slate-400">{currentPack.description}</p>

              <p className="text-[11px] text-slate-500 mt-2">
                Owned keys seeded: {(draft.equipmentItems ?? []).length} items.
              </p>
            </div>
          ) : null}
        </div>
      </div>

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
          Next: Personality & Save <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}
