'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CharacterSheetData, InventoryItem } from './types'

import { WEAPONS, type Weapon } from '@/lib/weapons'
import { ARMORS, type Armor } from '@/lib/armor'
import { GEAR, type GearItem } from '@/lib/equipment'
import { computeArmorClass } from './equipment-calc'
import type { Abilities } from '../../types/character'

function norm(raw: string) {
  return (raw ?? '').trim().toLowerCase()
}

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
    out.push({ key, name: name || key, qty: Number.isFinite(qty) ? qty : 0, category: it?.category } as any)
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

type LibItemKind = 'weapon' | 'armor' | 'gear' | 'custom'
type LibOption = { key: string; name: string; kind: LibItemKind }

function buildLibOptions(): LibOption[] {
  const out: LibOption[] = []
  for (const w of valuesOf<Weapon>(WEAPONS as unknown as Record<string, Weapon>)) {
    if (!w?.key || !w?.name) continue
    out.push({ key: norm(w.key), name: w.name, kind: 'weapon' })
  }
  for (const a of valuesOf<Armor>(ARMORS as unknown as Record<string, Armor>)) {
    if (!a?.key || !a?.name) continue
    if (String(a.category).toLowerCase() === 'shield') continue
    out.push({ key: norm(a.key), name: a.name, kind: 'armor' })
  }
  for (const g of valuesOf<GearItem>(GEAR as unknown as Record<string, GearItem>)) {
    if (!g?.key || !g?.name) continue
    out.push({ key: norm(g.key), name: g.name, kind: 'gear' })
  }
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

const SELECT_CLS =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100 focus:border-indigo-600 focus:outline-none'

export function EquipmentPanel({
  c,
  onSaved,
}: {
  c: CharacterSheetData
  onSaved: (patch: Partial<CharacterSheetData>) => void
}) {
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

  const equippedWeaponFromDB = useMemo(() => norm((c as any).main_weapon_key ?? ''), [c])
  const equippedArmorFromDB = useMemo(() => norm((c as any).armor_key ?? ''), [c])
  const shieldEquippedFromDB = useMemo(() => {
    const items = Array.isArray((c as any).equipment_items) ? (c as any).equipment_items : []
    return items.map((x: any) => norm(String(x))).includes('shield')
  }, [c])

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

  // Add item state
  const allLibOptions = useMemo(() => buildLibOptions(), [])
  const [addKind, setAddKind] = useState<LibItemKind>('weapon')
  const addOptions = useMemo(
    () => allLibOptions.filter((x) => x.kind === addKind && x.kind !== 'custom'),
    [allLibOptions, addKind],
  )
  const [addKey, setAddKey] = useState<string>(() => addOptions[0]?.key ?? 'club')
  const [customName, setCustomName] = useState<string>('')
  const [customItemKind, setCustomItemKind] = useState<string>('misc')

  useEffect(() => {
    setAddKey(addOptions[0]?.key ?? '')
  }, [addKind, addOptions])

  function upsertInventoryItem(key: string, delta: number, nameOverride?: string) {
    const k = norm(key)
    if (!k) return
    setInventoryDraft((prev) => {
      const next = [...prev]
      const idx = next.findIndex((x: any) => norm(x.key ?? '') === k)
      if (idx === -1) {
        const qty = Math.max(0, delta)
        if (qty === 0) return prev
        next.push({ key: k, name: nameOverride || getNiceNameForKey(k), qty } as any)
      } else {
        const cur: any = next[idx]
        const qty = Math.max(0, Number(cur.qty ?? 0) + delta)
        if (qty === 0) next.splice(idx, 1)
        else next[idx] = { ...cur, key: k, name: cur.name || nameOverride || getNiceNameForKey(k), qty }
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

  function addCustomItem() {
    const name = customName.trim()
    if (!name) return
    const key = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    upsertInventoryItem(key || `item_${Date.now()}`, 1, name)
    setCustomName('')
  }

  // Autosave
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

    // Derive the new AC so PlayerSidebar's cached armor_class field stays in sync
    const abilities: Abilities = (c as any).abilities ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    const simulatedC = {
      ...c,
      armor_key: safeArmor || null,
      equipment_items: buildEquipmentItems(safeShieldEquipped),
      inventory_items: next.inventory,
    }
    const { ac } = computeArmorClass(simulatedC as any, abilities)

    const patch: Partial<CharacterSheetData> = {
      main_weapon_key: safeWeapon || null,
      armor_key: safeArmor || null,
      equipment_items: buildEquipmentItems(safeShieldEquipped),
      inventory_items: next.inventory.length ? (next.inventory as any) : null,
      armor_class: ac,
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
    if (!didInit.current) { didInit.current = true; return }
    scheduleSave({ weaponKey, armorKey, shieldEquipped, inventory: inventoryDraft })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weaponKey, armorKey, shieldEquipped, inventoryDraft])

  function onChangeWeapon(next: string) {
    const k = norm(next)
    setWeaponKey(k && ownedKeys.has(k) ? k : '')
  }
  function onChangeArmor(next: string) {
    const k = norm(next)
    setArmorKey(k && ownedKeys.has(k) ? k : '')
  }
  function onToggleShield(next: boolean) {
    setShieldEquipped(next && shieldOwned ? true : false)
  }

  const shieldLabel = useMemo(() => ((GEAR as any)?.shield?.name as string) ?? 'Shield', [])

  return (
    <section className="rounded-xl border border-indigo-900/40 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-indigo-400">Equipment</h2>
        <div className="text-[11px] text-slate-500">{status}</div>
      </div>

      <div className="space-y-3 text-xs">
        {/* Main Weapon */}
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Main Weapon</div>
          <select value={weaponKey} onChange={(e) => onChangeWeapon(e.target.value)} className={SELECT_CLS}>
            <option value="">Unarmed / None</option>
            {inventoryWeaponOptions.map((w) => (
              <option key={w.key} value={w.key}>{w.label}</option>
            ))}
          </select>
          {inventoryWeaponOptions.length === 0 && (
            <div className="mt-1 text-[10px] text-slate-500">No weapons in inventory yet.</div>
          )}
        </div>

        {/* Armor */}
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase text-slate-400">Armor</div>
          <select value={armorKey} onChange={(e) => onChangeArmor(e.target.value)} className={SELECT_CLS}>
            <option value="">No armor</option>
            {inventoryArmorOptions.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>
          {inventoryArmorOptions.length === 0 && (
            <div className="mt-1 text-[10px] text-slate-500">No armor in inventory yet.</div>
          )}
        </div>

        {/* Shield */}
        <label className={`flex items-center gap-2 rounded-md px-2 py-2 border transition ${
          shieldEquipped
            ? 'border-indigo-700/50 bg-indigo-950/20'
            : 'border-slate-800 bg-slate-900/60'
        }`}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-indigo-500"
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
            <h3 className="text-[10px] font-semibold uppercase text-indigo-400">Inventory</h3>
            <div className="text-[10px] text-slate-500">Owned items drive equip dropdowns</div>
          </div>

          {/* Add controls */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[120px,1fr,100px]">
              <select
                value={addKind}
                onChange={(e) => setAddKind(e.target.value as LibItemKind)}
                className={SELECT_CLS}
              >
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
                <option value="gear">Gear</option>
                <option value="custom">Custom</option>
              </select>

              {addKind !== 'custom' ? (
                <select value={addKey} onChange={(e) => setAddKey(e.target.value)} className={SELECT_CLS}>
                  {addOptions.map((o) => (
                    <option key={`${o.kind}:${o.key}`} value={o.key}>{o.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  placeholder="Item name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem() }}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100 placeholder-slate-500 focus:border-indigo-600 focus:outline-none"
                />
              )}

              <button
                type="button"
                onClick={() => {
                  if (addKind === 'custom') {
                    addCustomItem()
                  } else if (addKey) {
                    upsertInventoryItem(addKey, 1)
                  }
                }}
                className="rounded-md bg-indigo-600/30 px-3 py-2 text-[12px] font-semibold text-indigo-100 hover:bg-indigo-600/50 transition"
              >
                + Add
              </button>
            </div>

            {addKind === 'custom' && (
              <select
                value={customItemKind}
                onChange={(e) => setCustomItemKind(e.target.value)}
                className={SELECT_CLS}
              >
                <option value="gear">Gear</option>
                <option value="consumable">Consumable</option>
                <option value="tool">Tool</option>
                <option value="treasure">Treasure</option>
                <option value="misc">Misc</option>
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
              </select>
            )}
          </div>

          {/* Inventory list */}
          <div className="mt-3 space-y-2">
            {inventoryDraft.length === 0 ? (
              <div className="text-[11px] text-slate-500">No inventory items yet.</div>
            ) : (
              inventoryDraft.map((it: any) => {
                const isEquipped =
                  norm(it.key) === norm(weaponKey) ||
                  norm(it.key) === norm(armorKey) ||
                  (norm(it.key) === 'shield' && shieldEquipped)
                return (
                  <div
                    key={String(it.key)}
                    className={`flex items-center gap-2 rounded-md border px-2 py-2 transition ${
                      isEquipped
                        ? 'border-indigo-700/50 bg-indigo-950/20'
                        : 'border-slate-800 bg-slate-900/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-slate-100">
                        {String(it.name || getNiceNameForKey(it.key))}
                        {isEquipped && (
                          <span className="ml-1.5 text-[10px] text-indigo-400">equipped</span>
                        )}
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
                )
              })
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
