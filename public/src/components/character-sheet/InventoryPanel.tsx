'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CharacterSheetData, InventoryItem } from './types'
import { ARMOR_DB, WEAPON_DB } from './equipment-db'

type AddMode = 'weapon' | 'armor' | 'shield' | 'custom'

// Your InventoryItem uses `kind`, not `category`
type ItemKind = NonNullable<InventoryItem['kind']>

const KIND_BY_MODE: Record<AddMode, ItemKind> = {
  weapon: 'weapon',
  armor: 'armor',
  shield: 'armor', // treat shield as armor in inventory kind
  custom: 'misc',
}

function rowIdFor(it: InventoryItem) {
  // stable id for UI operations (remove/change qty)
  return `${String(it.key ?? '')}::${String(it.name ?? '')}::${String(it.kind ?? '')}`
}

// ✅ FIX: safe string compare when name might be undefined
function safeCompare(a: unknown, b: unknown) {
  return String(a ?? '').localeCompare(String(b ?? ''))
}

function norm(raw: unknown) {
  return String(raw ?? '').trim().toLowerCase()
}

export function InventoryPanel({
  c,
  onSaved,
}: {
  c: CharacterSheetData
  onSaved: (patch: Partial<CharacterSheetData>) => void
}) {
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const items = useMemo<InventoryItem[]>(
    () => (Array.isArray(c.inventory_items) ? (c.inventory_items as InventoryItem[]) : []),
    [c.inventory_items],
  )

  const weaponOptions = useMemo(() => {
    return Object.values(WEAPON_DB)
      .slice()
      .sort((a, b) => safeCompare((a as any).name, (b as any).name))
  }, [])

  const armorOptions = useMemo(() => {
    return Object.values(ARMOR_DB)
      .filter((a) => (a as any).category !== 'shield')
      .slice()
      .sort((a, b) => safeCompare((a as any).name, (b as any).name))
  }, [])

  const [mode, setMode] = useState<AddMode>('weapon')
  const [weaponKey, setWeaponKey] = useState<string>(String((weaponOptions[0] as any)?.key ?? ''))
  const [armorKey, setArmorKey] = useState<string>(String((armorOptions[0] as any)?.key ?? ''))
  const [qty, setQty] = useState(1)

  // Custom
  const [customName, setCustomName] = useState('')
  const [customKey, setCustomKey] = useState('')
  const [customKind, setCustomKind] = useState<ItemKind>('misc')

  async function saveInventory(next: InventoryItem[]) {
    setSaving(true)
    setStatus('')

    const patch: Partial<CharacterSheetData> = { inventory_items: next }

    const { error } = await supabase.from('characters').update(patch as any).eq('id', c.id)

    if (error) {
      console.error(error)
      setStatus(`Save failed: ${error.message}`)
      setSaving(false)
      return
    }

    setStatus('Saved!')
    setSaving(false)
    onSaved(patch)
    setTimeout(() => setStatus(''), 1200)
  }

  // ✅ FIX: accept possibly-undefined key (this was your TS error)
  function itemExistsByKey(k?: string) {
    const keyLower = norm(k)
    if (!keyLower) return false
    return items.some((it) => norm(it.key) === keyLower)
  }

  async function addFromLib() {
    const q = Math.max(1, Number(qty) || 1)

    let newItem: InventoryItem | null = null

    if (mode === 'weapon') {
      if (!weaponKey || !(WEAPON_DB as any)[weaponKey]) return
      const w = (WEAPON_DB as any)[weaponKey]
      newItem = {
        key: String(w.key ?? weaponKey),
        name: String(w.name ?? weaponKey),
        qty: q,
        kind: 'weapon',
      }
    }

    if (mode === 'armor') {
      if (!armorKey || !(ARMOR_DB as any)[armorKey]) return
      const a = (ARMOR_DB as any)[armorKey]
      newItem = {
        key: String(a.key ?? armorKey),
        name: String(a.name ?? armorKey),
        qty: q,
        kind: 'armor',
      }
    }

    if (mode === 'shield') {
      // Keep key stable so stacking works
      newItem = {
        key: 'shield',
        name: 'Shield',
        qty: q,
        kind: 'armor',
      }
    }

    if (!newItem) return

    // If same key already exists, just increase qty instead of duplicating
    if (itemExistsByKey(newItem.key)) {
      const next = items.map((it) => {
        if (norm(it.key) === norm(newItem!.key)) {
          return { ...it, qty: (it.qty ?? 0) + q }
        }
        return it
      })
      await saveInventory(next)
      return
    }

    await saveInventory([newItem, ...items])
  }

  async function addCustom() {
    const q = Math.max(1, Number(qty) || 1)
    const name = customName.trim()
    const key = customKey.trim()

    if (!name && !key) {
      setStatus('Enter a name or key.')
      setTimeout(() => setStatus(''), 1200)
      return
    }

    // Always produce a key
    const finalKey = key || name.toLowerCase().replace(/\s+/g, '_') || `item_${Date.now()}`

    const newItem: InventoryItem = {
      key: finalKey,
      name: name || finalKey,
      qty: q,
      kind: customKind,
    }

    // stack by key if it already exists
    if (itemExistsByKey(newItem.key)) {
      const next = items.map((it) => {
        if (norm(it.key) === norm(newItem.key)) {
          return { ...it, qty: (it.qty ?? 0) + q }
        }
        return it
      })
      await saveInventory(next)
    } else {
      await saveInventory([newItem, ...items])
    }

    setCustomName('')
    setCustomKey('')
    setCustomKind('misc')
  }

  async function removeItem(rowId: string) {
    await saveInventory(items.filter((it) => rowIdFor(it) !== rowId))
  }

  async function changeQty(rowId: string, nextQty: number) {
    const next = items.map((it) =>
      rowIdFor(it) === rowId ? { ...it, qty: Math.max(0, nextQty) } : it,
    )
    await saveInventory(next.filter((it) => (it.qty ?? 0) > 0))
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Inventory</h2>
        <div className="text-[11px] text-slate-500">{status}</div>
      </div>

      {/* Add section */}
      <div className="mb-3 space-y-2 rounded-lg bg-slate-900/50 p-2 text-xs">
        <div className="grid grid-cols-3 gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as AddMode)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
          >
            <option value="weapon">Add Weapon (from lib)</option>
            <option value="armor">Add Armor (from lib)</option>
            <option value="shield">Add Shield (from lib)</option>
            <option value="custom">Add Custom Item</option>
          </select>

          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />

          {mode !== 'custom' ? (
            <button
              type="button"
              disabled={saving}
              onClick={addFromLib}
              className="rounded-md bg-emerald-600/25 px-3 py-2 text-[12px] font-semibold text-emerald-100 hover:bg-emerald-600/35 disabled:opacity-60"
            >
              Add
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={addCustom}
              className="rounded-md bg-emerald-600/25 px-3 py-2 text-[12px] font-semibold text-emerald-100 hover:bg-emerald-600/35 disabled:opacity-60"
            >
              Add
            </button>
          )}
        </div>

        {mode === 'weapon' && (
          <select
            value={weaponKey}
            onChange={(e) => setWeaponKey(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
          >
            {weaponOptions.map((w: any) => (
              <option key={String(w.key)} value={String(w.key)}>
                {String(w.name ?? w.key)} ({String(w.damageDice ?? '—')})
              </option>
            ))}
          </select>
        )}

        {mode === 'armor' && (
          <select
            value={armorKey}
            onChange={(e) => setArmorKey(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
          >
            {armorOptions.map((a: any) => (
              <option key={String(a.key)} value={String(a.key)}>
                {String(a.name ?? a.key)} (AC {String(a.baseAc ?? '—')}
                {a.dexCap === null ? ' + Dex' : a.dexCap === 0 ? '' : ` + Dex(max ${a.dexCap})`})
              </option>
            ))}
          </select>
        )}

        {mode === 'shield' && (
          <div className="rounded-md bg-slate-900/60 px-2 py-2 text-[11px] text-slate-300">
            Adds a Shield item (key: <span className="font-mono">shield</span>)
          </div>
        )}

        {mode === 'custom' && (
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
                placeholder="Item name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
                placeholder="Optional key"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
              />
            </div>

            <select
              value={customKind}
              onChange={(e) => setCustomKind(e.target.value as ItemKind)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
            >
              <option value="gear">gear</option>
              <option value="tool">tool</option>
              <option value="consumable">consumable</option>
              <option value="treasure">treasure</option>
              <option value="misc">misc</option>
              <option value="weapon">weapon</option>
              <option value="armor">armor</option>
            </select>

            <div className="text-[10px] text-slate-500">
              (Shield items are stored as kind <span className="font-mono">armor</span> with key{' '}
              <span className="font-mono">shield</span>)
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-2 text-xs">
        {items.length === 0 && (
          <div className="rounded-md bg-slate-900/40 p-2 text-[11px] text-slate-500">
            No inventory items yet.
          </div>
        )}

        {items.map((it) => {
          const rid = rowIdFor(it)
          return (
            <div
              key={rid}
              className="flex items-center justify-between gap-2 rounded-md bg-slate-900/70 px-2 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-slate-100">
                  {String(it.name ?? it.key ?? 'Item')}
                  {it.kind ? (
                    <span className="ml-2 text-[10px] font-normal text-slate-400">
                      ({it.kind})
                    </span>
                  ) : null}
                </div>
                {it.key ? (
                  <div className="text-[10px] text-slate-500">
                    key: <span className="font-mono">{String(it.key)}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  className="w-16 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[12px] text-slate-100"
                  value={it.qty ?? 1}
                  onChange={(e) => changeQty(rid, Number(e.target.value))}
                  disabled={saving}
                />

                <button
                  type="button"
                  onClick={() => removeItem(rid)}
                  disabled={saving}
                  className="rounded-md bg-red-600/20 px-2 py-1 text-[11px] text-red-200 hover:bg-red-600/30 disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
