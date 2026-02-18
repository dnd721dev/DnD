'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CharacterSheetData, InventoryItem } from './types'

import { WEAPONS, type Weapon } from '@/lib/weapons'
import { ARMORS, type Armor } from '@/lib/armor'
import { GEAR, type GearItem } from '@/lib/equipment'

function norm(raw: string) {
  return (raw ?? '').trim().toLowerCase()
}

/**
 * TS sometimes loses the value type when libs are typed with key unions.
 * This helper forces Object.values() to return a typed array.
 */
function valuesOf<T>(obj: Record<string, T>): T[] {
  return Object.values(obj)
}

function parseInventory(raw: any): InventoryItem[] {
  if (!Array.isArray(raw)) return []
  const out: InventoryItem[] = []
  for (const it of raw) {
    const key = norm(it?.key ?? '')
    const name = String(it?.name ?? key ?? '').trim()
    const qty = Number(it?.qty ?? 0)
    if (!key) continue

    out.push({
      // InventoryItem in your types allows optional key/name fields in some versions,
      // but we always store these 3.
      key,
      name: name || key,
      qty: Number.isFinite(qty) ? qty : 0,
      category: it?.category,
    } as any)
  }
  return out
}

function inventoryToOwnedKeys(inv: InventoryItem[]): Set<string> {
  const s = new Set<string>()
  for (const it of inv) {
    const k = norm((it as any).key ?? '')
    const qty = Number((it as any).qty ?? 0)
    if (k && qty > 0) s.add(k)
  }
  return s
}

type LibItemKind = 'weapon' | 'armor' | 'gear'
type LibOption = { key: string; name: string; kind: LibItemKind }

function buildLibOptions(): LibOption[] {
  const out: LibOption[] = []

  // ✅ weapons
  for (const w of valuesOf<Weapon>(WEAPONS as unknown as Record<string, Weapon>)) {
    if (!w?.key || !w?.name) continue
    out.push({ key: norm(w.key), name: w.name, kind: 'weapon' })
  }

  // ✅ armors (excluding shield; shield treated as gear/checkbox)
  for (const a of valuesOf<Armor>(ARMORS as unknown as Record<string, Armor>)) {
    if (!a?.key || !a?.name) continue
    if (String(a.category).toLowerCase() === 'shield') continue
    out.push({ key: norm(a.key), name: a.name, kind: 'armor' })
  }

  // ✅ gear
  for (const g of valuesOf<GearItem>(GEAR as unknown as Record<string, GearItem>)) {
    if (!g?.key || !g?.name) continue
    out.push({ key: norm(g.key), name: g.name, kind: 'gear' })
  }

  // ensure shield exists in add list even if it isn't in GEAR
  if (!out.some((x) => x.key === 'shield')) {
    out.push({ key: 'shield', name: 'Shield', kind: 'gear' })
  }

  out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
    return a.name.localeCompare(b.name)
  })

  return out
}

function getNiceNameForKey(key: string): string {
  const k = norm(key)

  const w = (WEAPONS as unknown as Record<string, Weapon>)[k]
  if (w?.name) return w.name

  const a = (ARMORS as unknown as Record<string, Armor>)[k]
  if (a?.name) return a.name

  const g = (GEAR as unknown as Record<string, GearItem>)[k]
  if (g?.name) return g.name

  if (k === 'shield') return 'Shield'
  return key
}

function buildEquipmentItems(nextShieldEquipped: boolean): string[] | null {
  if (!nextShieldEquipped) return null
  return ['shield']
}

export function EquipmentPanel({
  c,
  onSaved,
}: {
  c: CharacterSheetData
  onSaved: (patch: Partial<CharacterSheetData>) => void
}) {
  // -------------------------
  // Inventory as truth for OWNERSHIP
  // -------------------------
  const invFromDB = useMemo(() => parseInventory((c as any).inventory_items), [c])
  const [inventoryDraft, setInventoryDraft] = useState<InventoryItem[]>(invFromDB)

  useEffect(() => setInventoryDraft(invFromDB), [invFromDB])

  const ownedKeys = useMemo(() => inventoryToOwnedKeys(inventoryDraft), [inventoryDraft])

  const inventoryWeaponOptions = useMemo(() => {
    const list: { key: string; label: string }[] = []
    for (const k of ownedKeys) {
      const w = (WEAPONS as any)[k]
      if (!w?.name) continue
      list.push({ key: k, label: w.name })
    }
    return list.sort((a, b) => a.label.localeCompare(b.label))
  }, [ownedKeys])

  const inventoryArmorOptions = useMemo(() => {
    const list: { key: string; label: string }[] = []
    for (const k of ownedKeys) {
      const a = (ARMORS as any)[k]
      if (!a?.name) continue
      if (String(a.category).toLowerCase() === 'shield') continue
      list.push({ key: k, label: a.name })
    }
    return list.sort((a, b) => a.label.localeCompare(b.label))
  }, [ownedKeys])

  const shieldOwned = useMemo(() => ownedKeys.has('shield'), [ownedKeys])

  // -------------------------
  // Equipped values (from DB)
  // -------------------------
  const equippedWeaponFromDB = useMemo(() => norm((c as any).main_weapon_key ?? ''), [c])
  const equippedArmorFromDB = useMemo(() => norm((c as any).armor_key ?? ''), [c])

  const shieldEquippedFromDB = useMemo(() => {
    const items = Array.isArray((c as any).equipment_items) ? (c as any).equipment_items : []
    return items.map((x: any) => norm(String(x))).includes('shield')
  }, [c])

  // enforce ownership
  const enforcedWeapon = useMemo(() => {
    if (!equippedWeaponFromDB) return ''
    return ownedKeys.has(equippedWeaponFromDB) ? equippedWeaponFromDB : ''
  }, [equippedWeaponFromDB, ownedKeys])

  const enforcedArmor = useMemo(() => {
    if (!equippedArmorFromDB) return ''
    if (equippedArmorFromDB === 'shield') return ''
    return ownedKeys.has(equippedArmorFromDB) ? equippedArmorFromDB : ''
  }, [equippedArmorFromDB, ownedKeys])

  const enforcedShieldEquipped = useMemo(() => {
    return shieldOwned ? shieldEquippedFromDB : false
  }, [shieldOwned, shieldEquippedFromDB])

  const [weaponKey, setWeaponKey] = useState<string>(enforcedWeapon)
  const [armorKey, setArmorKey] = useState<string>(enforcedArmor)
  const [shieldEquipped, setShieldEquipped] = useState<boolean>(enforcedShieldEquipped)

  const [status, setStatus] = useState<string>('')

  useEffect(() => setWeaponKey(enforcedWeapon), [enforcedWeapon])
  useEffect(() => setArmorKey(enforcedArmor), [enforcedArmor])
  useEffect(() => setShieldEquipped(enforcedShieldEquipped), [enforcedShieldEquipped])

  // -------------------------
  // Inventory manager UI
  // -------------------------
  const allLibOptions = useMemo(() => buildLibOptions(), [])
  const [addKind, setAddKind] = useState<LibItemKind>('weapon')
  const addOptions = useMemo(() => allLibOptions.filter((x) => x.kind === addKind), [allLibOptions, addKind])
  const [addKey, setAddKey] = useState<string>(() => addOptions[0]?.key ?? 'club')

  useEffect(() => {
    setAddKey(addOptions[0]?.key ?? '')
  }, [addKind, addOptions])

  function upsertInventoryItem(key: string, delta: number) {
    const k = norm(key)
    if (!k) return

    setInventoryDraft((prev) => {
      const next = [...prev]
      const idx = next.findIndex((x: any) => norm(x.key ?? '') === k)
      if (idx === -1) {
        const qty = Math.max(0, delta)
        if (qty === 0) return prev
        next.push({ key: k, name: getNiceNameForKey(k), qty } as any)
      } else {
        const cur: any = next[idx]
        const qty = Math.max(0, Number(cur.qty ?? 0) + delta)
        if (qty === 0) next.splice(idx, 1)
        else next[idx] = { ...cur, key: k, name: cur.name || getNiceNameForKey(k), qty }
      }
      next.sort((a: any, b: any) => String(a.name ?? a.key).localeCompare(String(b.name ?? b.key)))
      return next
    })
  }

  function setInventoryQty(key: string, qty: number) {
    const k = norm(key)
    const q = Math.max(0, Math.floor(Number(qty) || 0))
    if (!k) return

    setInventoryDraft((prev) => {
      const next = [...prev]
      const idx = next.findIndex((x: any) => norm(x.key ?? '') === k)
      if (idx === -1) {
        if (q === 0) return prev
        next.push({ key: k, name: getNiceNameForKey(k), qty: q } as any)
      } else {
        if (q === 0) next.splice(idx, 1)
        else next[idx] = { ...(next[idx] as any), key: k, qty: q, name: (next[idx] as any).name || getNiceNameForKey(k) }
      }
      next.sort((a: any, b: any) => String(a.name ?? a.key).localeCompare(String(b.name ?? b.key)))
      return next
    })
  }

  // -------------------------
  // Autosave (equipment + inventory)
  // -------------------------
  const timerRef = useRef<number | null>(null)
  const lastSentRef = useRef<string>('')

  function scheduleSave(next: {
    weaponKey: string
    armorKey: string
    shieldEquipped: boolean
    inventory: InventoryItem[]
  }) {
    const owned = inventoryToOwnedKeys(next.inventory)

    const safeWeapon = next.weaponKey && owned.has(norm(next.weaponKey)) ? norm(next.weaponKey) : ''
    const safeArmor = next.armorKey && owned.has(norm(next.armorKey)) ? norm(next.armorKey) : ''
    const safeShieldEquipped = next.shieldEquipped && owned.has('shield') ? true : false

    const patch: Partial<CharacterSheetData> = {
      main_weapon_key: safeWeapon || null,
      armor_key: safeArmor || null,
      equipment_items: buildEquipmentItems(safeShieldEquipped),
      inventory_items: next.inventory.length ? (next.inventory as any) : null,
    }

    const sig = JSON.stringify(patch)
    if (sig === lastSentRef.current) return

    if (timerRef.current) window.clearTimeout(timerRef.current)
    setStatus('Saving…')

    timerRef.current = window.setTimeout(async () => {
      lastSentRef.current = sig
      const { error } = await supabase.from('characters').update(patch as any).eq('id', (c as any).id)

      if (error) {
        console.error(error)
        setStatus(`Save failed: ${error.message}`)
        return
      }

      setStatus('Saved!')
      onSaved(patch)
      window.setTimeout(() => setStatus(''), 900)
    }, 350)
  }

  const didInit = useRef(false)
  useEffect(() => {
    if (!didInit.current) {
      didInit.current = true
      return
    }
    scheduleSave({
      weaponKey,
      armorKey,
      shieldEquipped,
      inventory: inventoryDraft,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weaponKey, armorKey, shieldEquipped, inventoryDraft])

  function onChangeWeapon(next: string) {
    const k = norm(next)
    const allowed = k && ownedKeys.has(k) ? k : ''
    setWeaponKey(allowed)
  }

  function onChangeArmor(next: string) {
    const k = norm(next)
    const allowed = k && ownedKeys.has(k) ? k : ''
    setArmorKey(allowed)
  }

  function onToggleShield(next: boolean) {
    const allowed = next && shieldOwned ? true : false
    setShieldEquipped(allowed)
  }

  const shieldLabel = useMemo(() => ((GEAR as any)?.shield?.name as string) ?? 'Shield', [])

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Equipment</h2>
        <div className="text-[11px] text-slate-500">{status}</div>
      </div>

      {/* Equip controls */}
      <div className="space-y-3 text-xs">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Main Weapon</div>
          <select
            value={weaponKey}
            onChange={(e) => onChangeWeapon(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
          >
            <option value="">Unarmed / None</option>
            {inventoryWeaponOptions.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>
          {inventoryWeaponOptions.length === 0 && (
            <div className="mt-1 text-[10px] text-slate-500">No weapons in inventory yet.</div>
          )}
        </div>

        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Armor</div>
          <select
            value={armorKey}
            onChange={(e) => onChangeArmor(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
          >
            <option value="">No armor</option>
            {inventoryArmorOptions.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
          {inventoryArmorOptions.length === 0 && (
            <div className="mt-1 text-[10px] text-slate-500">No armor in inventory yet.</div>
          )}
        </div>

        <label className="flex items-center gap-2 rounded-md bg-slate-900/60 px-2 py-2">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={shieldEquipped}
            disabled={!shieldOwned}
            onChange={(e) => onToggleShield(e.target.checked)}
          />
          <span className="text-[12px] text-slate-100">{shieldLabel} equipped (+2 AC)</span>
          {!shieldOwned ? <span className="ml-auto text-[10px] text-slate-500">Not owned</span> : null}
        </label>

        {/* Inventory Manager */}
        <div className="mt-3 border-t border-slate-800 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[10px] font-semibold uppercase text-slate-400">Inventory</h3>
            <div className="text-[10px] text-slate-500">Owned items drive equip dropdowns</div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px,1fr,100px]">
            <select
              value={addKind}
              onChange={(e) => setAddKind(e.target.value as LibItemKind)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
            >
              <option value="weapon">Weapon</option>
              <option value="armor">Armor</option>
              <option value="gear">Gear</option>
            </select>

            <select
              value={addKey}
              onChange={(e) => setAddKey(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
            >
              {addOptions.map((o) => (
                <option key={`${o.kind}:${o.key}`} value={o.key}>
                  {o.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                if (!addKey) return
                upsertInventoryItem(addKey, 1)
              }}
              className="rounded-md bg-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-900 hover:bg-white"
            >
              + Add
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {inventoryDraft.length === 0 ? (
              <div className="text-[11px] text-slate-500">No inventory items yet.</div>
            ) : (
              inventoryDraft.map((it: any) => (
                <div
                  key={String(it.key)}
                  className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/40 px-2 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] text-slate-100">
                      {String(it.name || getNiceNameForKey(it.key))}
                    </div>
                    <div className="text-[10px] text-slate-500">{String(it.key)}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => upsertInventoryItem(it.key, -1)}
                    className="h-8 w-8 rounded-md border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>

                  <input
                    value={String(it.qty ?? 0)}
                    onChange={(e) => setInventoryQty(it.key, Number(e.target.value))}
                    className="h-8 w-14 rounded-md border border-slate-700 bg-slate-950 px-2 text-center text-[12px] text-slate-100"
                    inputMode="numeric"
                  />

                  <button
                    type="button"
                    onClick={() => upsertInventoryItem(it.key, 1)}
                    className="h-8 w-8 rounded-md border border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
