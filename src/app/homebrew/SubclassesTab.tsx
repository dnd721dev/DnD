'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────────

const DND_CLASSES = [
  'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
  'Sorcerer', 'Warlock', 'Wizard',
]

/** Default archetype label per class — shown as placeholder / suggestion. */
const CLASS_ARCHETYPE_LABEL: Record<string, string> = {
  Artificer:  'Artificer Specialist',
  Barbarian:  'Primal Path',
  Bard:       'Bard College',
  Cleric:     'Divine Domain',
  Druid:      'Druid Circle',
  Fighter:    'Martial Archetype',
  Monk:       'Monastic Tradition',
  Paladin:    'Sacred Oath',
  Ranger:     'Ranger Conclave',
  Rogue:      'Roguish Archetype',
  Sorcerer:   'Sorcerous Origin',
  Warlock:    'Otherworldly Patron',
  Wizard:     'Arcane Tradition',
}

const LEVELS = Array.from({ length: 20 }, (_, i) => String(i + 1))

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeatureRow = {
  level: string
  name: string
  description: string
}

export type DbSubclass = {
  id: string
  creator_wallet: string
  name: string
  parent_class: string
  subclass_type: string | null
  description: string | null
  features: FeatureRow[] | null
  is_published: boolean
  created_at: string
  updated_at: string
}

type FormState = {
  name: string
  parentClass: string
  subclassType: string
  description: string
  features: FeatureRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultForm(): FormState {
  return {
    name: '',
    parentClass: '',
    subclassType: '',
    description: '',
    features: [{ level: '3', name: '', description: '' }],
  }
}

function dbToForm(sc: DbSubclass): FormState {
  return {
    name: sc.name,
    parentClass: sc.parent_class,
    subclassType: sc.subclass_type ?? '',
    description: sc.description ?? '',
    features: sc.features?.length
      ? sc.features.map((f) => ({ level: f.level, name: f.name, description: f.description }))
      : [{ level: '3', name: '', description: '' }],
  }
}

function walletShort(w: string) {
  return `${w.slice(0, 6)}…${w.slice(-4)}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
      {label}
    </span>
  )
}

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/80 p-4 ${className}`}>
      {children}
    </div>
  )
}

function InputField({
  label, value, onChange, placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-400">
        {label}{required && <span className="ml-0.5 text-amber-400">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
      />
    </label>
  )
}

function SelectField({
  label, value, onChange, options, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-yellow-500"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

// ── Preview Panel ─────────────────────────────────────────────────────────────

function SubclassPreview({ form }: { form: FormState }) {
  const sortedFeatures = useMemo(
    () => [...form.features]
      .filter((f) => f.name.trim())
      .sort((a, b) => Number(a.level) - Number(b.level)),
    [form.features],
  )

  const hasContent = form.name.trim() || form.parentClass || sortedFeatures.length > 0

  if (!hasContent) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
        <div>
          <div className="mb-2 text-2xl">📖</div>
          <p className="text-[11px] text-slate-500">Fill in the form to see a live preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-amber-800/40 bg-slate-950 overflow-hidden shadow-lg shadow-amber-900/10">
      {/* Header */}
      <div className="bg-gradient-to-b from-amber-900/50 to-slate-900/80 px-4 py-3 border-b border-amber-800/30">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold tracking-wide text-amber-100 uppercase">
              {form.name || 'Untitled Subclass'}
            </h3>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-amber-300/80">
              {form.parentClass && <span>{form.parentClass}</span>}
              {form.parentClass && form.subclassType && <span className="text-amber-700">·</span>}
              {form.subclassType && <span>{form.subclassType}</span>}
            </div>
          </div>
          <span className="shrink-0 rounded bg-amber-600/20 border border-amber-600/40 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-400 uppercase">
            Homebrew
          </span>
        </div>
      </div>

      {/* Description */}
      {form.description.trim() && (
        <div className="px-4 py-3 border-b border-slate-800/60">
          <p className="text-[11px] italic leading-relaxed text-slate-300">{form.description}</p>
        </div>
      )}

      {/* Features */}
      {sortedFeatures.length > 0 && (
        <div className="divide-y divide-slate-800/60">
          {sortedFeatures.map((f, i) => (
            <div key={i} className="px-4 py-2.5">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-slate-400 uppercase">
                  Level {f.level}
                </span>
                <span className="text-[12px] font-semibold text-slate-100">{f.name}</span>
              </div>
              {f.description.trim() && (
                <p className="text-[11px] leading-relaxed text-slate-400">{f.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {sortedFeatures.length === 0 && (
        <div className="px-4 py-3 text-[11px] italic text-slate-600">
          Add features to see them here…
        </div>
      )}
    </div>
  )
}

// ── Feature Editor ────────────────────────────────────────────────────────────

function FeatureEditor({
  features,
  onChange,
}: {
  features: FeatureRow[]
  onChange: (features: FeatureRow[]) => void
}) {
  function update(i: number, field: keyof FeatureRow, value: string) {
    onChange(features.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)))
  }

  function add() {
    onChange([...features, { level: '', name: '', description: '' }])
  }

  function remove(i: number) {
    onChange(features.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Features</span>
        <button
          type="button"
          onClick={add}
          className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700 transition"
        >
          + Add Feature
        </button>
      </div>

      <div className="space-y-2">
        {features.map((f, i) => (
          <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            {/* Level + Name row */}
            <div className="flex items-end gap-2">
              <div className="w-20 shrink-0">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-slate-500">Level</span>
                  <select
                    value={f.level}
                    onChange={(e) => update(i, 'level', e.target.value)}
                    className="h-7 rounded border border-slate-700 bg-slate-900 px-1 text-xs text-slate-100 outline-none focus:border-yellow-500"
                  >
                    <option value="">—</option>
                    {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex-1">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-slate-500">Feature Name</span>
                  <input
                    type="text"
                    value={f.name}
                    onChange={(e) => update(i, 'name', e.target.value)}
                    placeholder="e.g. Void Step"
                    className="h-7 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="mb-0.5 shrink-0 rounded p-1 text-slate-600 hover:text-red-400 transition"
                title="Remove feature"
              >
                ✕
              </button>
            </div>

            {/* Description always visible */}
            <div className="mt-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-slate-500">
                  Description
                  {f.name.trim() && <span className="ml-1 text-slate-600">— {f.name}</span>}
                </span>
                <textarea
                  value={f.description}
                  onChange={(e) => update(i, 'description', e.target.value)}
                  rows={2}
                  placeholder="What does this feature do?"
                  className="resize-none rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Community Card ────────────────────────────────────────────────────────────

function SubclassCard({
  sc,
  isOwner,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  sc: DbSubclass
  isOwner: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const featureCount = sc.features?.filter((f) => f.name.trim()).length ?? 0

  return (
    <div className={`rounded-xl border transition ${isOwner ? 'border-amber-800/50 bg-amber-950/10' : 'border-slate-800 bg-slate-900/60'}`}>
      {/* Card header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full rounded-t-xl px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-100 text-sm">{sc.name}</span>
              {isOwner && (
                <span className="rounded bg-amber-600/20 border border-amber-600/30 px-1 py-0.5 text-[9px] font-bold tracking-wide text-amber-400 uppercase">
                  yours
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
              {sc.subclass_type && <span>{sc.subclass_type}</span>}
              {sc.subclass_type && <span>·</span>}
              <span>{featureCount} feature{featureCount !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{walletShort(sc.creator_wallet)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Badge label={sc.parent_class} color="bg-indigo-900/60 text-indigo-300" />
            <span className="text-[10px] text-slate-600">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-slate-800/60 px-4 pb-4 pt-3">
          {sc.description && (
            <p className="mb-3 text-[11px] italic leading-relaxed text-slate-400">{sc.description}</p>
          )}

          {sc.features && sc.features.length > 0 && (
            <div className="space-y-2">
              {[...sc.features]
                .filter((f) => f.name.trim())
                .sort((a, b) => Number(a.level) - Number(b.level))
                .map((f, idx) => (
                  <div key={idx} className="rounded-lg bg-slate-950/60 border border-slate-800/60 px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        Level {f.level}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-200">{f.name}</span>
                    </div>
                    {f.description && (
                      <p className="text-[11px] leading-relaxed text-slate-400">{f.description}</p>
                    )}
                  </div>
                ))}
            </div>
          )}

          {isOwner && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                ✏️ Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg bg-red-900/30 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-900/50 transition"
              >
                🗑 Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function SubclassesTab({ wallet }: { wallet: string | null }) {
  const formTopRef = useRef<HTMLDivElement>(null)

  // ── form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>(defaultForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  // ── community state ────────────────────────────────────────────────────────
  const [subclasses, setSubclasses] = useState<DbSubclass[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── fetch on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    const headers: HeadersInit = wallet
      ? { 'x-wallet-address': wallet }
      : {}

    fetch('/api/homebrew/subclasses', { headers })
      .then((r) => r.json())
      .then((json) => {
        setSubclasses(json.subclasses ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [wallet])

  // ── form helpers ───────────────────────────────────────────────────────────
  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function startEdit(sc: DbSubclass) {
    setForm(dbToForm(sc))
    setEditingId(sc.id)
    setShowForm(true)
    setSaveErr(null)
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() {
    setForm(defaultForm())
    setEditingId(null)
    setSaveErr(null)
  }

  // ── save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!wallet || !form.name.trim() || !form.parentClass) return
    setSaving(true)
    setSaveErr(null)

    const cleanFeatures = form.features.filter((f) => f.name.trim())

    const body = {
      ...(editingId ? { id: editingId } : {}),
      name:          form.name.trim(),
      parent_class:  form.parentClass,
      subclass_type: form.subclassType || null,
      description:   form.description  || null,
      features:      cleanFeatures,
    }

    try {
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch('/api/homebrew/subclasses', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': wallet,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (!res.ok) {
        setSaveErr(json.error ?? 'Failed to save subclass')
        return
      }

      const saved: DbSubclass = json.subclass

      if (editingId) {
        setSubclasses((prev) => prev.map((s) => (s.id === editingId ? saved : s)))
      } else {
        setSubclasses((prev) => [saved, ...prev])
      }

      setForm(defaultForm())
      setEditingId(null)
    } catch (e: any) {
      setSaveErr(e?.message ?? 'Network error')
    } finally {
      setSaving(false)
    }
  }

  // ── delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(sc: DbSubclass) {
    if (!wallet) return
    if (!window.confirm(`Delete "${sc.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`/api/homebrew/subclasses?id=${sc.id}`, {
        method: 'DELETE',
        headers: { 'x-wallet-address': wallet },
      })
      if (!res.ok) {
        const json = await res.json()
        alert(json.error ?? 'Failed to delete')
        return
      }
      setSubclasses((prev) => prev.filter((s) => s.id !== sc.id))
      if (editingId === sc.id) cancelEdit()
    } catch (e: any) {
      alert(e?.message ?? 'Network error')
    }
  }

  // ── filtered community list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = subclasses
    if (filterClass !== 'all') {
      list = list.filter((s) => s.parent_class === filterClass)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.subclass_type ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [subclasses, filterClass, search])

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" ref={formTopRef}>

      {/* ── Form + Preview (side-by-side on desktop) ─────────────────────── */}
      {wallet ? (
        <div>
          {/* Form header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              {editingId ? 'Edit Subclass' : 'Create Subclass'}
            </h2>
            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowForm((v) => !v)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
              >
                {showForm ? 'Hide Form' : 'Show Form'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="grid gap-4 lg:grid-cols-5">
              {/* ── Form (3/5) ───────────────────────────────────────────── */}
              <div className="lg:col-span-3 space-y-4">
                {/* Basic info */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Basic Info
                  </h3>
                  <div className="space-y-3">
                    <InputField
                      label="Subclass Name"
                      required
                      value={form.name}
                      onChange={(v) => setField('name', v)}
                      placeholder="e.g. Way of the Void"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField
                        label="Parent Class"
                        value={form.parentClass}
                        onChange={(v) => setField('parentClass', v)}
                        options={DND_CLASSES}
                        placeholder="Choose class…"
                      />
                      <InputField
                        label="Archetype Label"
                        value={form.subclassType}
                        onChange={(v) => setField('subclassType', v)}
                        placeholder={
                          form.parentClass
                            ? CLASS_ARCHETYPE_LABEL[form.parentClass] ?? 'e.g. Arcane Tradition'
                            : 'e.g. Monastic Tradition'
                        }
                      />
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-slate-400">Description / Flavor</span>
                      <textarea
                        value={form.description}
                        onChange={(e) => setField('description', e.target.value)}
                        rows={4}
                        placeholder="Lore, theme, and overview of this subclass…"
                        className="resize-none rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
                      />
                    </label>
                  </div>
                </div>

                {/* Features */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <FeatureEditor
                    features={form.features}
                    onChange={(f) => setField('features', f)}
                  />
                </div>

                {/* Save button */}
                <div>
                  {saveErr && (
                    <p className="mb-2 text-xs text-red-400">{saveErr}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !form.name.trim() || !form.parentClass}
                    className="w-full rounded-lg bg-gradient-to-b from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {saving ? 'Saving…' : editingId ? 'Update Subclass' : 'Save Subclass'}
                  </button>
                </div>
              </div>

              {/* ── Preview (2/5) ─────────────────────────────────────────── */}
              <div className="lg:col-span-2">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Live Preview
                </div>
                <SubclassPreview form={form} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 text-center">
          <p className="text-sm text-amber-400">Connect your wallet to create homebrew subclasses.</p>
        </div>
      )}

      {/* ── Community Subclasses ──────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Community Subclasses
            <span className="ml-2 text-slate-500">({subclasses.length})</span>
          </h2>
        </div>

        {/* Search + filter */}
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subclasses…"
            className="flex-1 h-8 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
          />
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100 outline-none focus:border-yellow-500"
          >
            <option value="all">All classes</option>
            {DND_CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-500">
            {subclasses.length === 0
              ? 'No homebrew subclasses yet — be the first to create one!'
              : 'No subclasses match your search.'}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((sc) => (
              <SubclassCard
                key={sc.id}
                sc={sc}
                isOwner={wallet?.toLowerCase() === sc.creator_wallet}
                isExpanded={expandedId === sc.id}
                onToggleExpand={() => setExpandedId(expandedId === sc.id ? null : sc.id)}
                onEdit={() => startEdit(sc)}
                onDelete={() => handleDelete(sc)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
