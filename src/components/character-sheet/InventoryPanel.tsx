'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CharacterSheetData, InventoryItem } from './types'
import { ARMOR_DB, WEAPON_DB } from './equipment-db'

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

type AddMode = 'weapon' | 'armor' | 'shield' | 'custom'

const CATEGORY_BY_MODE: Record<AddMode, InventoryItem['category']> = {
  weapon: 'weapon',
  armor: 'armor',
  shield: 'shield',
  custom: 'gear',
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
    () => (Array.isArray(c.inventory_items) ? (c.inventory_items as any) : []),
    [c.inventory_items],
  )

  const weaponOptions = useMemo(() => {
    return Object.values(WEAPON_DB).slice().sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const armorOptions = useMemo(() => {
    return Object.values(ARMOR_DB)
      .filter((a) => a.category !== 'shield')
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const [mode, setMode] = useState<AddMode>('weapon')
  const [weaponKey, setWeaponKey] = useState<string>(weaponOptions[0]?.key ?? '')
  const [armorKey, setArmorKey] = useState<string>(armorOptions[0]?.key ?? '')
  const [qty, setQty] = useState(1)

  // Custom fallback
  const [customName, setCustomName] = useState('')
  const [customKey, setCustomKey] = useState('')
  const [customCategory, setCustomCategory] = useState<NonNullable<InventoryItem['category']>>('gear')

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

  function itemExistsByKey(k: string) {
    const keyLower = (k ?? '').toLowerCase()
    return items.some((it) => String(it.key ?? '').toLowerCase() === keyLower)
  }

  async function addFromLib() {
    const q = Math.max(1, Number(qty) || 1)

    let newItem: InventoryItem | null = null

    if (mode === 'weapon') {
      if (!weaponKey || !WEAPON_DB[weaponKey]) return
      const w = WEAPON_DB[weaponKey]
      newItem = {
        id: uid(),
        key: w.key,
        name: w.name,
        qty: q,
        category: 'weapon',
      }
    }

    if (mode === 'armor') {
      if (!armorKey || !ARMOR_DB[armorKey]) return
      const a = ARMOR_DB[armorKey]
      newItem = {
        id: uid(),
        key: a.key,
        name: a.name,
        qty: q,
        category: 'armor',
      }
    }

    if (mode === 'shield') {
      newItem = {
        id: uid(),
        key: 'shield',
        name: 'Shield',
        qty: q,
        category: 'shield',
      }
    }

    if (!newItem) return

    // If same key already exists, just increase qty instead of duplicating
    if (newItem.key && itemExistsByKey(newItem.key)) {
      const next = items.map((it) => {
        if (String(it.key ?? '').toLowerCase() === String(newItem!.key).toLowerCase()) {
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
    const key = customKey.trim() || null
    if (!name && !key) {
      setStatus('Enter a name or key.')
      setTimeout(() => setStatus(''), 1200)
      return
    }

    const newItem: InventoryItem = {
      id: uid(),
      key,
      name: name || String(key),
      qty: q,
      category: customCategory,
    }

    await saveInventory([newItem, ...items])
    setCustomName('')
    setCustomKey('')
    setCustomCategory('gear')
  }

  async function removeItem(itemId: string) {
    await saveInventory(items.filter((it) => it.id !== itemId))
  }

  async function changeQty(itemId: string, nextQty: number) {
    const next = items.map((it) => (it.id === itemId ? { ...it, qty: Math.max(0, nextQty) } : it))
    await saveInventory(next.filter((it) => (it.qty ?? 0) > 0))
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Inventory</h2>
        <div className="text-[11px] text-slate-500">{status}</div>
      </div>

      {/* Add section (from libs + custom) */}
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
            {weaponOptions.map((w) => (
              <option key={w.key} value={w.key}>
                {w.name} ({w.damageDice})
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
            {armorOptions.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name} (AC {a.baseAc}
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
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value as any)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-[12px] text-slate-100"
            >
              <option value="gear">gear</option>
              <option value="consumable">consumable</option>
              <option value="treasure">treasure</option>
              <option value="misc">misc</option>
              <option value="weapon">weapon</option>
              <option value="armor">armor</option>
              <option value="shield">shield</option>
            </select>
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

        {items.map((it) => (
          <div
            key={it.id}
            className="flex items-center justify-between gap-2 rounded-md bg-slate-900/70 px-2 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-[12px] font-semibold text-slate-100">
                {it.name}
                {it.category ? (
                  <span className="ml-2 text-[10px] font-normal text-slate-400">({it.category})</span>
                ) : null}
              </div>
              {it.key ? (
                <div className="text-[10px] text-slate-500">
                  key: <span className="font-mono">{it.key}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                className="w-16 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[12px] text-slate-100"
                value={it.qty ?? 1}
                onChange={(e) => changeQty(it.id, Number(e.target.value))}
                disabled={saving}
              />

              <button
                type="button"
                onClick={() => removeItem(it.id)}
                disabled={saving}
                className="rounded-md bg-red-600/20 px-2 py-1 text-[11px] text-red-200 hover:bg-red-600/30 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
