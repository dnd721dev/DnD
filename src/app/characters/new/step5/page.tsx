'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadDraft, saveDraft } from '@/lib/characterDraft'
import type { CharacterDraft } from '../../../../types/characterDraft'
import { proficiencyForLevel, calcAC } from '@/lib/rules'

import { WEAPONS, WEAPON_MASTERY_CLASSES, WEAPON_MASTERY_SLOTS, WEAPON_MASTERY_TABLE, MASTERY_PROPERTY_SUMMARIES } from '@/lib/weapons'
import { ARMORS } from '@/lib/armor'
import { PACK_LIST, getPack, getGear, type PackKey } from '@/lib/equipment'
import { CLASS_STARTING_EQUIPMENT } from '@/lib/startingEquipment'

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

/**
 * -----------------------------
 * ✅ PROFICIENCY FILTER RULES
 * -----------------------------
 * We filter based on:
 * - weapon.group (expects "simple" or "martial" in your data)
 * - armor.category ("light" | "medium" | "heavy" | "shield")
 *
 * Rogues/Bards/etc have some special weapon exceptions in 5e.
 * We include a few common SRD-friendly exceptions by weapon KEY.
 */
function norm(v: any) {
  return String(v ?? '').trim().toLowerCase()
}

type WeaponObj = any
type ArmorObj = any

type ClassProfs = {
  weaponGroups: Array<'simple' | 'martial' | 'all'>
  extraWeaponKeys?: string[] // specific allowed weapons even if not in group
  armor: Array<'light' | 'medium' | 'heavy' | 'shields' | 'all' | 'none'>
}

const CLASS_PROFS: Record<string, ClassProfs> = {
  barbarian: { weaponGroups: ['simple', 'martial'], armor: ['light', 'medium', 'shields'] },
  bard: {
    weaponGroups: ['simple'],
    // SRD-ish bard extras (commonly allowed)
    extraWeaponKeys: ['rapier', 'longsword', 'shortsword', 'hand_crossbow'],
    armor: ['light'],
  },
  cleric: { weaponGroups: ['simple'], armor: ['light', 'medium', 'shields'] },
  druid: { weaponGroups: ['simple'], armor: ['light', 'medium', 'shields'] },
  fighter: { weaponGroups: ['all'], armor: ['all'] },
  monk: {
    weaponGroups: ['simple'],
    extraWeaponKeys: ['shortsword'],
    armor: ['none'],
  },
  paladin: { weaponGroups: ['all'], armor: ['all'] },
  ranger: { weaponGroups: ['simple', 'martial'], armor: ['light', 'medium', 'shields'] },
  rogue: {
    weaponGroups: ['simple'],
    // Rogue martial exceptions (common SRD)
    extraWeaponKeys: ['rapier', 'shortsword', 'longbow', 'hand_crossbow'],
    armor: ['light'],
  },
  sorcerer: { weaponGroups: ['simple'], armor: ['none'] },
  warlock: { weaponGroups: ['simple'], armor: ['light'] },
  wizard: { weaponGroups: ['simple'], armor: ['none'] },
}

function classCanUseWeapon(classKeyRaw: any, weapon: WeaponObj): boolean {
  const classKey = norm(classKeyRaw) || 'fighter'
  const prof = CLASS_PROFS[classKey] ?? CLASS_PROFS.fighter

  if (prof.weaponGroups.includes('all')) return true

  const wKey = norm(weapon?.key)
  if (prof.extraWeaponKeys?.some((k) => norm(k) === wKey)) return true

  const group = norm(weapon?.group)
  if (group.includes('simple')) return prof.weaponGroups.includes('simple')
  if (group.includes('martial')) return prof.weaponGroups.includes('martial')

  // If weapon data doesn't have a recognizable group, don't hide it (safe default)
  return true
}

function classCanUseArmor(classKeyRaw: any, armor: ArmorObj): boolean {
  const classKey = norm(classKeyRaw) || 'fighter'
  const prof = CLASS_PROFS[classKey] ?? CLASS_PROFS.fighter

  if (prof.armor.includes('all')) return true
  if (prof.armor.includes('none')) return false

  const cat = norm(armor?.category)

  // we already exclude shields in armorOptions, but keep this safe anyway
  if (cat.includes('shield')) return prof.armor.includes('shields')
  if (cat.includes('light')) return prof.armor.includes('light')
  if (cat.includes('medium')) return prof.armor.includes('medium')
  if (cat.includes('heavy')) return prof.armor.includes('heavy')

  // unknown category => don't hide
  return true
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
        for (let i = 0; i < it.quantity; i++) out.push(gear.key)
      }
    }
  }

  // Add chosen weapon/armor as owned keys too
  if (mainWeaponKey && (WEAPONS as any)[String(mainWeaponKey)]) out.push(String(mainWeaponKey))
  if (armorKey && (ARMORS as any)[String(armorKey)]) out.push(String(armorKey))

  return uniqStrings(out)
}

export default function NewCharacterStep5Page() {
  const router = useRouter()
  const [draft, setDraft] = useState<CharacterDraft | null>(null)
  const [ready, setReady] = useState(false)

  // ✅ Always keep base lists available
  const allWeapons = useMemo(() => {
    return Object.values(WEAPONS).slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const allArmors = useMemo(() => {
    // If your ARMORS ever includes shield, exclude it here (we treat shield separately later)
    return Object.values(ARMORS)
      .filter((a: any) => a.category !== 'shield')
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const packOptions = useMemo(() => {
    return PACK_LIST.slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  // ✅ Filtered options based on class
  const weaponOptions = useMemo(() => {
    const classKey = draft?.classKey ?? 'fighter'
    return allWeapons.filter((w) => classCanUseWeapon(classKey, w))
  }, [allWeapons, draft?.classKey])

  const armorOptions = useMemo(() => {
    const classKey = draft?.classKey ?? 'fighter'
    return allArmors.filter((a) => classCanUseArmor(classKey, a))
  }, [allArmors, draft?.classKey])

  useEffect(() => {
    const existing = loadDraft()

    const level = existing.level ?? 1
    const proficiencyBonus = existing.proficiencyBonus ?? proficiencyForLevel(level)
    const classKey = existing.classKey ?? 'fighter'

    // Determine starting equipment choice (default to Option A for new characters)
    const choice = existing.startingEquipmentChoice ?? 'A'

    // Class starting kit (Option A defaults)
    const kit = CLASS_STARTING_EQUIPMENT[classKey.toLowerCase()]

    const classWeaponOptions = allWeapons.filter((w) => classCanUseWeapon(classKey, w))
    const classArmorOptions = allArmors.filter((a) => classCanUseArmor(classKey, a))

    // When Option A, seed from kit defaults if the player hasn't customized yet
    const kitWeaponKey = kit?.defaultWeaponKey ?? classWeaponOptions[0]?.key ?? (allWeapons[0]?.key ?? 'club')
    const kitArmorKey = kit?.defaultArmorKey ?? classArmorOptions[0]?.key ?? ''
    const kitPackKey = normalizePackKey(kit?.defaultPackKey ?? null) ?? packOptions[0]?.key ?? 'dungeoneers'

    const savedWeapon = existing.mainWeaponKey ?? (choice === 'A' ? kitWeaponKey : classWeaponOptions[0]?.key ?? 'club')
    const savedArmor  = existing.armorKey  ?? (choice === 'A' ? kitArmorKey  : classArmorOptions[0]?.key ?? '')
    const savedPack   = normalizePackKey(existing.packKey ?? (choice === 'A' ? kitPackKey : packOptions[0]?.key)) ?? 'dungeoneers'

    const safeWeaponKey =
      classWeaponOptions.some((w) => w.key === savedWeapon) ? savedWeapon : kitWeaponKey
    const safeArmorKey =
      choice === 'A' && kit?.defaultArmorKey === null
        ? ''  // explicitly unarmored
        : classArmorOptions.some((a) => a.key === savedArmor) ? savedArmor : classArmorOptions[0]?.key ?? ''

    const equipmentItems = buildOwnedEquipmentKeys({
      packKey: savedPack as any,
      mainWeaponKey: safeWeaponKey,
      armorKey: safeArmorKey,
    })

    const merged: CharacterDraft = {
      ...existing,
      level,
      proficiencyBonus,
      startingEquipmentChoice: choice,
      startingGold: existing.startingGold ?? (choice === 'B' ? (kit?.optionBGold ?? 50) : undefined),
      mainWeaponKey: safeWeaponKey,
      armorKey: safeArmorKey,
      packKey: savedPack,
      equipmentItems,
    }

    setDraft(merged)
    saveDraft(merged)
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWeapons, allArmors, packOptions])

  function updateDraft(update: Partial<CharacterDraft>) {
    setDraft((prev) => {
      const current: CharacterDraft = prev ?? { level: 1, proficiencyBonus: proficiencyForLevel(1) }
      const next: CharacterDraft = { ...current, ...update }

      // ✅ If class changed earlier, force weapon/armor to remain valid in THIS step
      const classKey = next.classKey ?? 'fighter'

      const allowedWeapons = allWeapons.filter((w) => classCanUseWeapon(classKey, w))
      const allowedArmors = allArmors.filter((a) => classCanUseArmor(classKey, a))

      if (next.mainWeaponKey && !allowedWeapons.some((w) => w.key === next.mainWeaponKey)) {
        next.mainWeaponKey = allowedWeapons[0]?.key ?? next.mainWeaponKey
      }
      if (next.armorKey && !allowedArmors.some((a) => a.key === next.armorKey)) {
        // For unarmored classes allowedArmors is empty — fall to null, not back to old key.
        next.armorKey = allowedArmors[0]?.key ?? null
      }

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

  // null when no armor is selected (unarmored class or explicit "No armor")
  const currentArmor = draft.armorKey
    ? (armorOptions.find((a) => a.key === draft.armorKey) ?? null)
    : null

  const currentPack =
    packOptions.find((p) => p.key === draft.packKey) ?? packOptions[0]

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg md:text-xl font-semibold text-white">Step 5 — Equipment</h2>
        <p className="text-xs md:text-sm text-slate-400">
          Choose your main weapon, armor, and adventuring pack. These dropdowns only show gear your class can use.
        </p>
      </div>

      {/* Option A / Option B toggle */}
      {(() => {
        const classKey = String(draft.classKey ?? 'fighter').toLowerCase()
        const kit = CLASS_STARTING_EQUIPMENT[classKey]
        const choice = draft.startingEquipmentChoice ?? 'A'

        function applyOptionA() {
          if (!kit) { updateDraft({ startingEquipmentChoice: 'A', startingGold: undefined }); return }
          updateDraft({
            startingEquipmentChoice: 'A',
            startingGold: undefined,
            mainWeaponKey: kit.defaultWeaponKey,
            armorKey: kit.defaultArmorKey,
            packKey: kit.defaultPackKey,
          })
        }

        function applyOptionB() {
          const gold = kit?.optionBGold ?? 50
          updateDraft({ startingEquipmentChoice: 'B', startingGold: gold })
        }

        return (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-200">Starting Equipment Method</div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Option A */}
              <button
                type="button"
                onClick={applyOptionA}
                className={`flex-1 rounded-lg border px-4 py-3 text-left text-xs transition ${
                  choice === 'A'
                    ? 'border-cyan-500 bg-cyan-900/20 text-slate-100'
                    : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="font-semibold text-sm mb-1">
                  {choice === 'A' ? '✦' : '○'} Option A — Class Kit
                </div>
                {kit
                  ? <p className="text-[11px] text-slate-400">{kit.optionALabel}</p>
                  : <p className="text-[11px] text-slate-500 italic">No kit defined for this class.</p>
                }
              </button>

              {/* Option B */}
              <button
                type="button"
                onClick={applyOptionB}
                className={`flex-1 rounded-lg border px-4 py-3 text-left text-xs transition ${
                  choice === 'B'
                    ? 'border-amber-500 bg-amber-900/20 text-slate-100'
                    : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="font-semibold text-sm mb-1">
                  {choice === 'B' ? '✦' : '○'} Option B — Starting Gold
                </div>
                <p className="text-[11px] text-slate-400">
                  Start with{' '}
                  <span className={`font-semibold ${choice === 'B' ? 'text-amber-300' : 'text-slate-300'}`}>
                    {kit?.optionBGold ?? 50} gp
                  </span>{' '}
                  and purchase your own gear between sessions.
                </p>
              </button>
            </div>

            {choice === 'B' && (
              <div className="rounded-md border border-amber-700/30 bg-amber-900/10 px-3 py-2 text-[11px] text-amber-200/80">
                💰 Starting gold recorded: <span className="font-semibold">{draft.startingGold ?? kit?.optionBGold ?? 50} gp</span>.
                You can still customize your weapon, armor, and pack below for your character sheet — they won't affect your gold total.
              </div>
            )}
          </div>
        )
      })()}

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
                <span className="font-semibold">Damage:</span> {currentWeapon.damageDice} {currentWeapon.damageType}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold">Group:</span> {currentWeapon.group}
              </p>
              <p className="text-slate-300">
                <span className="font-semibold">Category:</span> {currentWeapon.category}
              </p>
              {currentWeapon.range ? (
                <p className="text-slate-300">
                  <span className="font-semibold">Range:</span> {currentWeapon.range.normal}/{currentWeapon.range.long}
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
            value={draft.armorKey ?? ''}
            onChange={(e) => updateDraft({ armorKey: e.target.value || null })}
          >
            <option value="">No armor (Unarmored)</option>
            {armorOptions.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>

          {(() => {
            const dexScore = (draft.baseAbilities?.dex ?? 10) + (draft.abilityBonuses?.dex ?? 0)
            const conScore = (draft.baseAbilities?.con ?? 10) + (draft.abilityBonuses?.con ?? 0)
            const wisScore = (draft.baseAbilities?.wis ?? 10) + (draft.abilityBonuses?.wis ?? 0)
            const computedAC = calcAC(
              draft.armorKey ?? null,
              dexScore,
              draft.acOverride ?? null,
              false,
              { classKey: draft.classKey ?? 'fighter', conScore, wisScore },
            )
            const dexMod = Math.floor((dexScore - 10) / 2)
            const dexLabel = dexMod >= 0 ? `+${dexMod}` : String(dexMod)
            return (
              <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs space-y-1">
                {currentArmor ? (
                  <>
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
                  </>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Unarmored — AC = 10 + DEX
                    {String(draft.classKey ?? '').toLowerCase() === 'barbarian' ? ' + CON' : ''}
                    {String(draft.classKey ?? '').toLowerCase() === 'monk' ? ' + WIS' : ''}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 rounded-md border border-cyan-700/40 bg-cyan-900/20 px-2 py-1.5">
                  <div className="text-[11px] text-cyan-300 font-semibold">Computed AC: {computedAC}</div>
                  <div className="text-[11px] text-slate-500">(DEX {dexLabel})</div>
                </div>
              </div>
            )
          })()}
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

      {/* Weapon Mastery (2024 rules — barbarian/fighter/paladin/ranger only) */}
      {WEAPON_MASTERY_CLASSES.has(String(draft.classKey ?? '').toLowerCase()) && (() => {
        const classKey = String(draft.classKey ?? '').toLowerCase()
        const slots = WEAPON_MASTERY_SLOTS[classKey] ?? 2
        const chosen: string[] = draft.weaponMasteries ?? []

        // All weapons the class is proficient with that have a mastery property
        const eligibleWeapons = Object.values(WEAPONS).filter(
          (w) => classCanUseWeapon(classKey, w) && WEAPON_MASTERY_TABLE[w.key]
        ).sort((a, b) => a.name.localeCompare(b.name))

        function toggleMastery(weaponKey: string) {
          const isSelected = chosen.includes(weaponKey)
          let next: string[]
          if (isSelected) {
            next = chosen.filter((k) => k !== weaponKey)
          } else if (chosen.length < slots) {
            next = [...chosen, weaponKey]
          } else {
            // Replace the last selection
            next = [...chosen.slice(0, slots - 1), weaponKey]
          }
          updateDraft({ weaponMasteries: next })
        }

        return (
          <div className="rounded-xl border border-amber-700/40 bg-amber-900/10 p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold text-amber-200">Weapon Mastery</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Choose {slots} weapon{slots !== 1 ? 's' : ''} to apply your mastery property to.
                You can swap your selections after each long rest.
                ({chosen.length}/{slots} selected)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {eligibleWeapons.map((w) => {
                const mastery = WEAPON_MASTERY_TABLE[w.key]!
                const selected = chosen.includes(w.key)
                const atMax = !selected && chosen.length >= slots
                return (
                  <button
                    key={w.key}
                    type="button"
                    disabled={atMax}
                    onClick={() => toggleMastery(w.key)}
                    title={MASTERY_PROPERTY_SUMMARIES[mastery]}
                    className={`flex items-center gap-1 rounded-full border px-3 py-0.5 text-[11px] transition ${
                      selected
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200 font-semibold'
                        : atMax
                        ? 'border-slate-700 text-slate-600 cursor-not-allowed'
                        : 'border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-200'
                    }`}
                  >
                    {w.name}
                    <span className={`text-[10px] ${selected ? 'text-amber-400' : 'text-slate-500'}`}>
                      · {mastery}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

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
          Next: Personality &amp; Save <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}
