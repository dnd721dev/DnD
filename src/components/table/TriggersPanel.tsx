'use client'

import { useCallback, useEffect, useState } from 'react'

type Trigger = {
  id: string
  name: string
  save_type: string
  dc: number
  tile_x: number
  tile_y: number
  map_id: string | null
  description: string | null
  is_active: boolean
  is_hidden: boolean
  created_at: string
}

const SAVE_TYPES = ['DEX', 'STR', 'CON', 'INT', 'WIS', 'CHA'] as const

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
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Create form state
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    saveType: 'DEX' as typeof SAVE_TYPES[number],
    dc: 15,
    tileX: 0,
    tileY: 0,
    description: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchTriggers = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const params = new URLSearchParams({ sessionId, gmWallet })
      if (mapId) params.set('mapId', mapId)
      const res = await fetch(`/api/triggers?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setTriggers(json.triggers ?? [])
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }, [sessionId, gmWallet, mapId])

  useEffect(() => { void fetchTriggers() }, [fetchTriggers])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch('/api/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          gmWallet,
          mapId: mapId ?? null,
          tileX: form.tileX,
          tileY: form.tileY,
          name: form.name || 'Trap',
          saveType: form.saveType,
          dc: form.dc,
          description: form.description || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create')
      setCreating(false)
      setForm({ name: '', saveType: 'DEX', dc: 15, tileX: 0, tileY: 0, description: '' })
      void fetchTriggers()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(trigger: Trigger) {
    try {
      await fetch('/api/triggers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: trigger.id, sessionId, gmWallet, isActive: !trigger.is_active }),
      })
      void fetchTriggers()
    } catch { /* ignore */ }
  }

  async function deleteTrigger(trigger: Trigger) {
    try {
      const params = new URLSearchParams({ id: trigger.id, sessionId, gmWallet })
      await fetch(`/api/triggers?${params}`, { method: 'DELETE' })
      void fetchTriggers()
    } catch { /* ignore */ }
  }

  function fireTrigger(trigger: Trigger) {
    // Broadcast to all players via a window event (TableClient should relay via session_messages)
    window.dispatchEvent(new CustomEvent('dnd721-trigger-tripped', { detail: { trigger } }))
    onFireTrigger?.(trigger)
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-100">Environmental Triggers</span>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-md border border-orange-700/60 bg-orange-900/20 px-2 py-1 text-[10px] text-orange-300 hover:bg-orange-900/40"
        >
          {creating ? '✕ Cancel' : '+ New Trigger'}
        </button>
      </div>

      {err && <div className="rounded-md bg-red-900/30 border border-red-700/40 px-2 py-1.5 text-red-300">{err}</div>}

      {/* Create form */}
      {creating && (
        <form onSubmit={handleCreate} className="rounded-lg border border-orange-800/40 bg-orange-950/20 p-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-400 mb-0.5">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Tripwire, Pressure Plate…"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Save Type</label>
              <select
                value={form.saveType}
                onChange={(e) => setForm((f) => ({ ...f, saveType: e.target.value as any }))}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
              >
                {SAVE_TYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">DC</label>
              <input
                type="number"
                min={1}
                max={30}
                value={form.dc}
                onChange={(e) => setForm((f) => ({ ...f, dc: parseInt(e.target.value) || 15 }))}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Tile X</label>
              <input
                type="number"
                value={form.tileX}
                onChange={(e) => setForm((f) => ({ ...f, tileX: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-0.5">Tile Y</label>
              <input
                type="number"
                value={form.tileY}
                onChange={(e) => setForm((f) => ({ ...f, tileY: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-400 mb-0.5">Description (optional)</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="The floor creaks ominously…"
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-orange-600/25 border border-orange-700/50 py-1.5 text-[11px] font-semibold text-orange-200 hover:bg-orange-600/40 disabled:opacity-50"
          >
            {saving ? 'Placing…' : 'Place Trigger'}
          </button>
        </form>
      )}

      {/* Trigger list */}
      {loading && <div className="text-center text-[10px] text-slate-500 py-2">Loading…</div>}

      {!loading && triggers.length === 0 && (
        <div className="rounded-md bg-slate-900/60 px-2 py-3 text-center text-[10px] text-slate-500">
          No triggers placed yet. Click "+ New Trigger" to set one up.
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
                  {t.save_type} Save DC {t.dc} · Tile ({t.tile_x}, {t.tile_y})
                </div>
                {t.description && (
                  <div className="text-[10px] text-slate-500 mt-0.5 italic">{t.description}</div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {/* Fire Now */}
                <button
                  type="button"
                  onClick={() => fireTrigger(t)}
                  disabled={!t.is_active}
                  className="rounded-md bg-red-700/30 border border-red-700/50 px-2 py-0.5 text-[10px] font-bold text-red-300 hover:bg-red-700/50 disabled:opacity-30"
                >
                  Fire!
                </button>
                {/* Toggle active */}
                <button
                  type="button"
                  onClick={() => toggleActive(t)}
                  className="rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                >
                  {t.is_active ? 'Disable' : 'Enable'}
                </button>
                {/* Delete */}
                <button
                  type="button"
                  onClick={() => deleteTrigger(t)}
                  className="rounded-md border border-slate-700 px-2 py-0.5 text-[10px] text-slate-500 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
