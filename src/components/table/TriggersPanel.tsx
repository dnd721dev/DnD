'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Trigger = {
  id: string
  name: string
  save_type: string
  dc: number
  tile_x: number
  tile_y: number
  map_id: string | null
  description: string | null
  trigger_type: string | null
  damage_dice: string | null
  damage_type: string | null
  condition_applied: string | null
  is_active: boolean
  is_hidden: boolean
  created_at: string
}

type TriggerForm = {
  name: string
  triggerType: string
  saveType: string
  dc: number
  damageDice: string
  damageType: string
  conditionApplied: string
  description: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SAVE_TYPES  = ['DEX', 'STR', 'CON', 'INT', 'WIS', 'CHA'] as const
const TRIGGER_TYPES = [
  { value: 'trap',           label: 'Trap' },
  { value: 'explosion',      label: 'Explosion' },
  { value: 'pit',            label: 'Pit' },
  { value: 'pressure_plate', label: 'Pressure Plate' },
  { value: 'magic_rune',     label: 'Magic Rune' },
  { value: 'poison_gas',     label: 'Poison Gas' },
  { value: 'custom',         label: 'Custom' },
]
const DAMAGE_TYPES = [
  'piercing','fire','poison','bludgeoning','psychic',
  'necrotic','radiant','thunder','cold','lightning','acid','force',
]
const CONDITIONS = [
  'None','Poisoned','Stunned','Frightened','Blinded',
  'Prone','Paralyzed','Restrained','Incapacitated',
]

const BLANK_FORM: TriggerForm = {
  name: '', triggerType: 'trap', saveType: 'DEX', dc: 15,
  damageDice: '', damageType: 'piercing', conditionApplied: 'None', description: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TriggersPanel({
  sessionId,
  gmWallet,
  mapId,
  onFireTrigger,
}: {
  sessionId: string
  gmWallet: string
  mapId?: string | null
  onFireTrigger?: (trigger: Trigger) => void
}) {
  const [triggers, setTriggers]           = useState<Trigger[]>([])
  const [loading, setLoading]             = useState(false)
  const [err, setErr]                     = useState<string | null>(null)
  const [saving, setSaving]               = useState(false)

  // Placement flow
  const [waitingForTile, setWaitingForTile] = useState(false)
  const [pendingTile, setPendingTile]       = useState<{ tileX: number; tileY: number } | null>(null)

  // Modal (create or edit)
  const [modalOpen, setModalOpen]   = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState<TriggerForm>(BLANK_FORM)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchTriggers = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const params = new URLSearchParams({ sessionId, gmWallet })
      if (mapId) params.set('mapId', mapId)
      const res  = await fetch(`/api/triggers?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      const list: Trigger[] = json.triggers ?? []
      setTriggers(list)
      // Broadcast to MapBoard so trigger icons update
      window.dispatchEvent(new CustomEvent('dnd721-triggers-updated', { detail: list }))
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [sessionId, gmWallet, mapId])

  useEffect(() => { void fetchTriggers() }, [fetchTriggers])

  // ── Map tile selection ─────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onTileSelected = (e: Event) => {
      const { tileX, tileY } = (e as CustomEvent<{ tileX: number; tileY: number }>).detail
      setPendingTile({ tileX, tileY })
      setWaitingForTile(false)
      setEditingId(null)
      setForm(BLANK_FORM)
      setModalOpen(true)
    }

    const onTriggerEdit = (e: Event) => {
      const trigger = (e as CustomEvent<{ trigger: Trigger }>).detail.trigger
      setEditingId(trigger.id)
      setForm({
        name:             trigger.name,
        triggerType:      trigger.trigger_type     ?? 'custom',
        saveType:         trigger.save_type,
        dc:               trigger.dc,
        damageDice:       trigger.damage_dice       ?? '',
        damageType:       trigger.damage_type       ?? 'piercing',
        conditionApplied: trigger.condition_applied ?? 'None',
        description:      trigger.description       ?? '',
      })
      setPendingTile({ tileX: trigger.tile_x, tileY: trigger.tile_y })
      setWaitingForTile(false)
      setModalOpen(true)
    }

    window.addEventListener('dnd721-trigger-tile-selected', onTileSelected)
    window.addEventListener('dnd721-trigger-edit',          onTriggerEdit)
    return () => {
      window.removeEventListener('dnd721-trigger-tile-selected', onTileSelected)
      window.removeEventListener('dnd721-trigger-edit',          onTriggerEdit)
    }
  }, [])

  // ── Actions ────────────────────────────────────────────────────────────────

  function handleAddTrigger() {
    if (waitingForTile) {
      // Cancel
      setWaitingForTile(false)
      window.dispatchEvent(new CustomEvent('dnd721-trigger-placement-cancel'))
    } else {
      setWaitingForTile(true)
      window.dispatchEvent(new CustomEvent('dnd721-place-trigger'))
    }
  }

  function handleModalClose() {
    setModalOpen(false)
    setPendingTile(null)
    setEditingId(null)
    setForm(BLANK_FORM)
  }

  async function handleSave() {
    if (!form.name.trim() || !pendingTile) return
    setSaving(true)
    setErr(null)
    try {
      if (editingId) {
        // PATCH existing trigger
        const res  = await fetch('/api/triggers', {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId, sessionId, gmWallet,
            isActive: triggers.find(t => t.id === editingId)?.is_active ?? true,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update')
      } else {
        // POST new trigger
        const res = await fetch('/api/triggers', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            gmWallet,
            mapId:            mapId ?? null,
            tileX:            pendingTile.tileX,
            tileY:            pendingTile.tileY,
            name:             form.name.trim() || 'Trap',
            saveType:         form.saveType,
            dc:               form.dc,
            triggerType:      form.triggerType,
            damageDice:       form.damageDice    || undefined,
            damageType:       form.damageType    !== 'None' ? form.damageType    : undefined,
            conditionApplied: form.conditionApplied !== 'None' ? form.conditionApplied : undefined,
            description:      form.description   || undefined,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create')
      }
      handleModalClose()
      void fetchTriggers()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const params = new URLSearchParams({ id, sessionId, gmWallet })
      await fetch(`/api/triggers?${params}`, { method: 'DELETE' })
      handleModalClose()
      void fetchTriggers()
    } catch { /* ignore */ }
  }

  async function toggleActive(trigger: Trigger) {
    try {
      await fetch('/api/triggers', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trigger.id, sessionId, gmWallet, isActive: !trigger.is_active }),
      })
      void fetchTriggers()
    } catch { /* ignore */ }
  }

  function fireTrigger(trigger: Trigger) {
    window.dispatchEvent(new CustomEvent('dnd721-trigger-tripped', { detail: { trigger } }))
    onFireTrigger?.(trigger)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleModalClose() }}
        >
          <div className="w-full max-w-md rounded-xl border border-orange-800/50 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-orange-200">
                {editingId ? 'Edit Trigger' : 'Place Trigger'}
                {pendingTile && (
                  <span className="ml-2 text-[10px] font-normal text-slate-400">
                    tile ({pendingTile.tileX}, {pendingTile.tileY})
                  </span>
                )}
              </h3>
              <button onClick={handleModalClose} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Type + Label row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Type</label>
                  <select
                    value={form.triggerType}
                    onChange={(e) => setForm(f => ({ ...f, triggerType: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
                  >
                    {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Label</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Spike trap…"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Save + DC row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Perception DC</label>
                  <input
                    type="number" min={1} max={30}
                    value={form.dc}
                    onChange={(e) => setForm(f => ({ ...f, dc: parseInt(e.target.value) || 15 }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Save Type</label>
                  <select
                    value={form.saveType}
                    onChange={(e) => setForm(f => ({ ...f, saveType: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
                  >
                    {SAVE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Damage row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Damage Dice</label>
                  <input
                    value={form.damageDice}
                    onChange={(e) => setForm(f => ({ ...f, damageDice: e.target.value }))}
                    placeholder="2d6"
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Damage Type</label>
                  <select
                    value={form.damageType}
                    onChange={(e) => setForm(f => ({ ...f, damageType: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
                  >
                    {DAMAGE_TYPES.map(d => <option key={d} className="capitalize">{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">Condition on Fail</label>
                <select
                  value={form.conditionApplied}
                  onChange={(e) => setForm(f => ({ ...f, conditionApplied: e.target.value }))}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
                >
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5">DM Notes (optional)</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="The floor creaks ominously…"
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>

              {err && <div className="rounded bg-red-900/30 border border-red-700/40 px-2 py-1.5 text-red-300">{err}</div>}

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  className="flex-1 rounded-lg bg-orange-600/25 border border-orange-700/50 py-1.5 text-[11px] font-semibold text-orange-200 hover:bg-orange-600/40 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : editingId ? 'Update Trigger' : 'Place Trigger'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingId)}
                    className="rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-950/60"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel ──────────────────────────────────────────────────────────── */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-100">Environmental Triggers</span>
          <button
            type="button"
            onClick={handleAddTrigger}
            className={`rounded-md border px-2 py-1 text-[10px] transition ${
              waitingForTile
                ? 'border-orange-500/80 bg-orange-900/40 text-orange-200'
                : 'border-orange-700/60 bg-orange-900/20 text-orange-300 hover:bg-orange-900/40'
            }`}
          >
            {waitingForTile ? '✕ Cancel' : '+ Add Trigger'}
          </button>
        </div>

        {waitingForTile && (
          <div className="rounded-md border border-orange-700/40 bg-orange-950/20 px-2 py-2 text-[10px] text-orange-300">
            ☠ Click any tile on the map to place a trigger there.
          </div>
        )}

        {err && !modalOpen && (
          <div className="rounded-md bg-red-900/30 border border-red-700/40 px-2 py-1.5 text-red-300">{err}</div>
        )}

        {loading && <div className="py-2 text-center text-[10px] text-slate-500">Loading…</div>}

        {!loading && triggers.length === 0 && (
          <div className="rounded-md bg-slate-900/60 px-2 py-3 text-center text-[10px] text-slate-500">
            No triggers placed yet. Click "+ Add Trigger" then click a map tile.
          </div>
        )}

        <div className="space-y-1.5">
          {triggers.map((t) => (
            <div
              key={t.id}
              className={`rounded-lg border p-2.5 ${
                t.is_active
                  ? 'border-orange-800/50 bg-orange-950/20'
                  : 'border-slate-800/50 bg-slate-900/30 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100 truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {t.save_type} DC {t.dc}
                    {t.damage_dice && ` · ${t.damage_dice} ${t.damage_type ?? ''}`}
                    {t.condition_applied && t.condition_applied !== 'None' && ` · ${t.condition_applied}`}
                    {' · '}Tile ({t.tile_x}, {t.tile_y})
                  </div>
                  {t.description && (
                    <div className="text-[10px] text-slate-500 mt-0.5 italic">{t.description}</div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => fireTrigger(t)}
                    disabled={!t.is_active}
                    className="rounded-md bg-red-700/30 border border-red-700/50 px-2 py-0.5 text-[10px] font-bold text-red-300 hover:bg-red-700/50 disabled:opacity-30"
                  >
                    Fire!
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(t)}
                    className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                  >
                    {t.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(t.id)
                      setForm({
                        name:             t.name,
                        triggerType:      t.trigger_type     ?? 'custom',
                        saveType:         t.save_type,
                        dc:               t.dc,
                        damageDice:       t.damage_dice       ?? '',
                        damageType:       t.damage_type       ?? 'piercing',
                        conditionApplied: t.condition_applied ?? 'None',
                        description:      t.description       ?? '',
                      })
                      setPendingTile({ tileX: t.tile_x, tileY: t.tile_y })
                      setModalOpen(true)
                    }}
                    className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400 hover:text-slate-200"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
