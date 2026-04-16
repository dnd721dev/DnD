'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'

type HomebrewTab = 'monsters' | 'weapons' | 'armor' | 'items' | 'subclasses'

const TABS: { key: HomebrewTab; label: string; emoji: string }[] = [
  { key: 'monsters',   label: 'Monsters',   emoji: '👾' },
  { key: 'weapons',    label: 'Weapons',    emoji: '⚔️' },
  { key: 'armor',      label: 'Armor',      emoji: '🛡️' },
  { key: 'items',      label: 'Items',      emoji: '🎒' },
  { key: 'subclasses', label: 'Subclasses', emoji: '📖' },
]

const WEAPON_CATEGORIES = ['simple', 'martial']
const WEAPON_GROUPS = ['melee', 'ranged']
const WEAPON_PROPERTIES = ['ammunition', 'finesse', 'heavy', 'light', 'loading', 'reach', 'thrown', 'two-handed', 'versatile']
const DAMAGE_TYPES = ['bludgeoning', 'piercing', 'slashing', 'fire', 'cold', 'lightning', 'acid', 'poison', 'radiant', 'necrotic', 'psychic', 'force', 'thunder', 'magical']

const ARMOR_CATEGORIES = ['light', 'medium', 'heavy', 'shield']

const ITEM_CATEGORIES = ['consumable', 'gear', 'treasure', 'misc', 'magic']
const ITEM_RARITIES = ['common', 'uncommon', 'rare', 'very rare', 'legendary']

const DND_CLASSES = [
  'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
  'Sorcerer', 'Warlock', 'Wizard',
]

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
      {label}
    </span>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
      {children}
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text', placeholder, step }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  step?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
      />
    </label>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-yellow-500"
      >
        <option value="">— select —</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
}

// ─── MONSTERS TAB ─────────────────────────────────────────────────────────────

type DbMonster = {
  id: string
  name: string
  cr: number | null
  armor_class: number | null
  hit_points: number | null
  owner_wallet: string | null
}

function MonstersTab({ wallet }: { wallet: string | null }) {
  const [monsters, setMonsters] = useState<DbMonster[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [cr, setCr] = useState('0')
  const [hp, setHp] = useState('')
  const [ac, setAc] = useState('')

  useEffect(() => {
    supabase
      .from('monsters')
      .select('id, name, cr, armor_class, hit_points, owner_wallet')
      .order('name')
      .then(({ data, error }) => {
        setLoading(false)
        if (!error) setMonsters((data ?? []) as DbMonster[])
      })
  }, [])

  async function handleSave() {
    if (!name.trim() || !wallet) return
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('monsters')
      .insert({
        name: name.trim(),
        cr: parseFloat(cr) || 0,
        hit_points: hp ? parseInt(hp, 10) : null,
        armor_class: ac ? parseInt(ac, 10) : null,
        owner_wallet: wallet.toLowerCase(),
      })
      .select('id, name, cr, armor_class, hit_points, owner_wallet')
      .limit(1)
      .maybeSingle()
    setSaving(false)
    if (error) { setError(error.message); return }
    setMonsters((prev) => [data as DbMonster, ...prev])
    setName(''); setCr('0'); setHp(''); setAc('')
  }

  return (
    <div className="space-y-4">
      {wallet ? (
        <SectionCard>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Create Monster</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-2">
              <InputField label="Name *" value={name} onChange={setName} placeholder="e.g. Shadow Drake" />
            </div>
            <InputField label="CR" value={cr} onChange={setCr} type="number" step="0.25" />
            <InputField label="HP" value={hp} onChange={setHp} type="number" placeholder="optional" />
            <InputField label="AC" value={ac} onChange={setAc} type="number" placeholder="optional" />
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Monster'}
          </button>
        </SectionCard>
      ) : (
        <SectionCard>
          <p className="text-sm text-amber-400">Connect your wallet to create homebrew content.</p>
        </SectionCard>
      )}

      <SectionCard>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          Community Monsters <span className="text-slate-500">({monsters.length})</span>
        </h3>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {monsters.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                <span className="font-medium text-slate-200">{m.name}</span>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {m.cr != null && <span>CR {m.cr}</span>}
                  {m.armor_class != null && <span>AC {m.armor_class}</span>}
                  {m.hit_points != null && <span>HP {m.hit_points}</span>}
                </div>
              </div>
            ))}
            {monsters.length === 0 && <p className="text-xs text-slate-500">No homebrew monsters yet.</p>}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── WEAPONS TAB ──────────────────────────────────────────────────────────────

type DbWeapon = {
  id: string
  name: string
  category: string | null
  weapon_group: string | null
  damage_dice: string | null
  damage_type: string | null
  properties: string[] | null
  notes: string | null
  creator_wallet: string
}

function WeaponsTab({ wallet }: { wallet: string | null }) {
  const [weapons, setWeapons] = useState<DbWeapon[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [group, setGroup] = useState('')
  const [damageDice, setDamageDice] = useState('')
  const [damageType, setDamageType] = useState('')
  const [selectedProps, setSelectedProps] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    supabase
      .from('homebrew_weapons')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        setLoading(false)
        if (!error) setWeapons((data ?? []) as DbWeapon[])
      })
  }, [])

  function toggleProp(prop: string) {
    setSelectedProps((prev) =>
      prev.includes(prop) ? prev.filter((p) => p !== prop) : [...prev, prop]
    )
  }

  async function handleSave() {
    if (!name.trim() || !wallet) return
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('homebrew_weapons')
      .insert({
        creator_wallet: wallet.toLowerCase(),
        name: name.trim(),
        category: category || null,
        weapon_group: group || null,
        damage_dice: damageDice || null,
        damage_type: damageType || null,
        properties: selectedProps.length ? selectedProps : null,
        notes: notes || null,
      })
      .select('*')
      .limit(1)
      .maybeSingle()
    setSaving(false)
    if (error) { setError(error.message); return }
    setWeapons((prev) => [data as DbWeapon, ...prev])
    setName(''); setCategory(''); setGroup(''); setDamageDice(''); setDamageType(''); setSelectedProps([]); setNotes('')
  }

  return (
    <div className="space-y-4">
      {wallet ? (
        <SectionCard>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Create Weapon</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-3">
              <InputField label="Name *" value={name} onChange={setName} placeholder="e.g. Shadowfang Blade" />
            </div>
            <SelectField label="Category" value={category} onChange={setCategory} options={WEAPON_CATEGORIES} />
            <SelectField label="Group" value={group} onChange={setGroup} options={WEAPON_GROUPS} />
            <InputField label="Damage Dice" value={damageDice} onChange={setDamageDice} placeholder="e.g. 1d8" />
            <SelectField label="Damage Type" value={damageType} onChange={setDamageType} options={DAMAGE_TYPES} />
          </div>
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium text-slate-400">Properties</p>
            <div className="flex flex-wrap gap-2">
              {WEAPON_PROPERTIES.map((prop) => (
                <button
                  key={prop}
                  type="button"
                  onClick={() => toggleProp(prop)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                    selectedProps.includes(prop)
                      ? 'border-yellow-600 bg-yellow-600/20 text-yellow-300'
                      : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {prop}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Special rules, lore, etc."
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500 resize-none"
              />
            </label>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Weapon'}
          </button>
        </SectionCard>
      ) : (
        <SectionCard>
          <p className="text-sm text-amber-400">Connect your wallet to create homebrew content.</p>
        </SectionCard>
      )}

      <SectionCard>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          Community Weapons <span className="text-slate-500">({weapons.length})</span>
        </h3>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {weapons.map((w) => (
              <div key={w.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-slate-200">{w.name}</div>
                  {(w.damage_dice || w.damage_type) && (
                    <div className="text-xs text-slate-400">{[w.damage_dice, w.damage_type].filter(Boolean).join(' ')}</div>
                  )}
                  {w.properties && w.properties.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {w.properties.map((p) => (
                        <Badge key={p} label={p} color="bg-slate-800 text-slate-300" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                  {w.category && <span>{w.category}</span>}
                  {w.weapon_group && <span>{w.weapon_group}</span>}
                </div>
              </div>
            ))}
            {weapons.length === 0 && <p className="text-xs text-slate-500">No homebrew weapons yet.</p>}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── ARMOR TAB ────────────────────────────────────────────────────────────────

type DbArmor = {
  id: string
  name: string
  category: string | null
  base_ac: number | null
  dex_cap: number | null
  str_requirement: number | null
  stealth_disadvantage: boolean
  notes: string | null
  creator_wallet: string
}

function ArmorTab({ wallet }: { wallet: string | null }) {
  const [armors, setArmors] = useState<DbArmor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [baseAc, setBaseAc] = useState('')
  const [dexCap, setDexCap] = useState('')
  const [strReq, setStrReq] = useState('')
  const [stealthDis, setStealthDis] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    supabase
      .from('homebrew_armor')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        setLoading(false)
        if (!error) setArmors((data ?? []) as DbArmor[])
      })
  }, [])

  async function handleSave() {
    if (!name.trim() || !wallet) return
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('homebrew_armor')
      .insert({
        creator_wallet: wallet.toLowerCase(),
        name: name.trim(),
        category: category || null,
        base_ac: baseAc ? parseInt(baseAc, 10) : null,
        dex_cap: dexCap ? parseInt(dexCap, 10) : null,
        str_requirement: strReq ? parseInt(strReq, 10) : null,
        stealth_disadvantage: stealthDis,
        notes: notes || null,
      })
      .select('*')
      .limit(1)
      .maybeSingle()
    setSaving(false)
    if (error) { setError(error.message); return }
    setArmors((prev) => [data as DbArmor, ...prev])
    setName(''); setCategory(''); setBaseAc(''); setDexCap(''); setStrReq(''); setStealthDis(false); setNotes('')
  }

  return (
    <div className="space-y-4">
      {wallet ? (
        <SectionCard>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Create Armor</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <InputField label="Name *" value={name} onChange={setName} placeholder="e.g. Shadowweave Mail" />
            </div>
            <SelectField label="Category" value={category} onChange={setCategory} options={ARMOR_CATEGORIES} />
            <InputField label="Base AC" value={baseAc} onChange={setBaseAc} type="number" placeholder="e.g. 14" />
            <InputField label="Dex Cap" value={dexCap} onChange={setDexCap} type="number" placeholder="null = no cap" />
            <InputField label="Str Requirement" value={strReq} onChange={setStrReq} type="number" placeholder="optional" />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={stealthDis}
              onChange={(e) => setStealthDis(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-yellow-500"
            />
            Stealth Disadvantage
          </label>
          <div className="mt-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Special properties, lore, etc."
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500 resize-none"
              />
            </label>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Armor'}
          </button>
        </SectionCard>
      ) : (
        <SectionCard>
          <p className="text-sm text-amber-400">Connect your wallet to create homebrew content.</p>
        </SectionCard>
      )}

      <SectionCard>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          Community Armor <span className="text-slate-500">({armors.length})</span>
        </h3>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {armors.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-slate-200">{a.name}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    {a.category && <span>{a.category}</span>}
                    {a.base_ac != null && <span>AC {a.base_ac}</span>}
                    {a.dex_cap != null && <span>Dex cap +{a.dex_cap}</span>}
                    {a.str_requirement != null && <span>Str {a.str_requirement}</span>}
                    {a.stealth_disadvantage && <Badge label="Stealth Disadv." color="bg-red-900/50 text-red-300" />}
                  </div>
                </div>
              </div>
            ))}
            {armors.length === 0 && <p className="text-xs text-slate-500">No homebrew armor yet.</p>}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── ITEMS TAB ────────────────────────────────────────────────────────────────

type DbItem = {
  id: string
  name: string
  category: string | null
  rarity: string | null
  description: string | null
  weight: number | null
  cost_gp: string | null
  creator_wallet: string
}

const RARITY_COLORS: Record<string, string> = {
  common: 'bg-slate-700 text-slate-300',
  uncommon: 'bg-green-900/60 text-green-300',
  rare: 'bg-blue-900/60 text-blue-300',
  'very rare': 'bg-purple-900/60 text-purple-300',
  legendary: 'bg-amber-900/60 text-amber-300',
}

function ItemsTab({ wallet }: { wallet: string | null }) {
  const [items, setItems] = useState<DbItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [rarity, setRarity] = useState('')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState('')
  const [costGp, setCostGp] = useState('')

  useEffect(() => {
    supabase
      .from('homebrew_items')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        setLoading(false)
        if (!error) setItems((data ?? []) as DbItem[])
      })
  }, [])

  async function handleSave() {
    if (!name.trim() || !wallet) return
    setSaving(true)
    setError(null)
    const { data, error } = await supabase
      .from('homebrew_items')
      .insert({
        creator_wallet: wallet.toLowerCase(),
        name: name.trim(),
        category: category || null,
        rarity: rarity || null,
        description: description || null,
        weight: weight ? parseFloat(weight) : null,
        cost_gp: costGp || null,
      })
      .select('*')
      .limit(1)
      .maybeSingle()
    setSaving(false)
    if (error) { setError(error.message); return }
    setItems((prev) => [data as DbItem, ...prev])
    setName(''); setCategory(''); setRarity(''); setDescription(''); setWeight(''); setCostGp('')
  }

  return (
    <div className="space-y-4">
      {wallet ? (
        <SectionCard>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Create Item</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <InputField label="Name *" value={name} onChange={setName} placeholder="e.g. Potion of Shadow Step" />
            </div>
            <SelectField label="Category" value={category} onChange={setCategory} options={ITEM_CATEGORIES} />
            <SelectField label="Rarity" value={rarity} onChange={setRarity} options={ITEM_RARITIES} />
            <InputField label="Weight (lb)" value={weight} onChange={setWeight} type="number" step="0.1" placeholder="optional" />
            <InputField label="Cost (gp)" value={costGp} onChange={setCostGp} placeholder="e.g. 50 gp" />
          </div>
          <div className="mt-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What does this item do?"
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500 resize-none"
              />
            </label>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Item'}
          </button>
        </SectionCard>
      ) : (
        <SectionCard>
          <p className="text-sm text-amber-400">Connect your wallet to create homebrew content.</p>
        </SectionCard>
      )}

      <SectionCard>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          Community Items <span className="text-slate-500">({items.length})</span>
        </h3>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-200">{item.name}</span>
                  <div className="flex items-center gap-2">
                    {item.rarity && (
                      <Badge label={item.rarity} color={RARITY_COLORS[item.rarity] ?? 'bg-slate-700 text-slate-300'} />
                    )}
                    {item.category && <span className="text-xs text-slate-500">{item.category}</span>}
                  </div>
                </div>
                {item.description && (
                  <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                )}
              </div>
            ))}
            {items.length === 0 && <p className="text-xs text-slate-500">No homebrew items yet.</p>}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── SUBCLASSES TAB ───────────────────────────────────────────────────────────

type FeatureRow = { level: string; name: string; description: string }

type DbSubclass = {
  id: string
  name: string
  parent_class: string
  subclass_type: string | null
  description: string | null
  features: FeatureRow[] | null
  creator_wallet: string
}

function SubclassesTab({ wallet }: { wallet: string | null }) {
  const [subclasses, setSubclasses] = useState<DbSubclass[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [parentClass, setParentClass] = useState('')
  const [subclassType, setSubclassType] = useState('')
  const [description, setDescription] = useState('')
  const [features, setFeatures] = useState<FeatureRow[]>([{ level: '3', name: '', description: '' }])

  useEffect(() => {
    supabase
      .from('homebrew_subclasses')
      .select('*')
      .order('parent_class')
      .then(({ data, error }) => {
        setLoading(false)
        if (!error) setSubclasses((data ?? []) as DbSubclass[])
      })
  }, [])

  function addFeature() {
    setFeatures((prev) => [...prev, { level: '', name: '', description: '' }])
  }

  function updateFeature(i: number, field: keyof FeatureRow, value: string) {
    setFeatures((prev) => prev.map((f, idx) => idx === i ? { ...f, [field]: value } : f))
  }

  function removeFeature(i: number) {
    setFeatures((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!name.trim() || !parentClass || !wallet) return
    setSaving(true)
    setError(null)
    const cleanFeatures = features.filter((f) => f.name.trim())
    const { data, error } = await supabase
      .from('homebrew_subclasses')
      .insert({
        creator_wallet: wallet.toLowerCase(),
        name: name.trim(),
        parent_class: parentClass,
        subclass_type: subclassType || null,
        description: description || null,
        features: cleanFeatures.length ? cleanFeatures : null,
      })
      .select('*')
      .limit(1)
      .maybeSingle()
    setSaving(false)
    if (error) { setError(error.message); return }
    setSubclasses((prev) => [data as DbSubclass, ...prev])
    setName(''); setParentClass(''); setSubclassType(''); setDescription('')
    setFeatures([{ level: '3', name: '', description: '' }])
  }

  return (
    <div className="space-y-4">
      {wallet ? (
        <SectionCard>
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Create Subclass</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <InputField label="Name *" value={name} onChange={setName} placeholder="e.g. Way of the Void" />
            </div>
            <SelectField label="Parent Class *" value={parentClass} onChange={setParentClass} options={DND_CLASSES} />
            <InputField label="Subclass Type" value={subclassType} onChange={setSubclassType} placeholder="e.g. Monastic Tradition" />
          </div>
          <div className="mt-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-400">Description / Flavor</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Lore, theme, and overview of this subclass…"
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500 resize-none"
              />
            </label>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">Features</span>
              <button
                type="button"
                onClick={addFeature}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700"
              >
                + Add Feature
              </button>
            </div>
            <div className="space-y-2">
              {features.map((f, i) => (
                <div key={i} className="flex gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                  <div className="w-14 shrink-0">
                    <InputField label="Lvl" value={f.level} onChange={(v) => updateFeature(i, 'level', v)} type="number" />
                  </div>
                  <div className="flex-1">
                    <InputField label="Name" value={f.name} onChange={(v) => updateFeature(i, 'name', v)} placeholder="Feature name" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    className="mt-4 shrink-0 self-start rounded p-1 text-slate-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {features.map((f, i) =>
                f.name.trim() ? (
                  <div key={`desc-${i}`} className="px-1">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-slate-500">{f.name} — Description</span>
                      <textarea
                        value={f.description}
                        onChange={(e) => updateFeature(i, 'description', e.target.value)}
                        rows={2}
                        placeholder="What does this feature do?"
                        className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500 resize-none"
                      />
                    </label>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim() || !parentClass}
            className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Subclass'}
          </button>
        </SectionCard>
      ) : (
        <SectionCard>
          <p className="text-sm text-amber-400">Connect your wallet to create homebrew content.</p>
        </SectionCard>
      )}

      <SectionCard>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">
          Community Subclasses <span className="text-slate-500">({subclasses.length})</span>
        </h3>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {subclasses.map((sc) => (
              <div key={sc.id} className="rounded-lg border border-slate-800 bg-slate-950/60">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === sc.id ? null : sc.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm text-left"
                >
                  <div>
                    <span className="font-medium text-slate-200">{sc.name}</span>
                    {sc.subclass_type && <span className="ml-2 text-xs text-slate-500">{sc.subclass_type}</span>}
                  </div>
                  <Badge label={sc.parent_class} color="bg-indigo-900/60 text-indigo-300" />
                </button>
                {expandedId === sc.id && (
                  <div className="border-t border-slate-800 px-3 pb-3 pt-2 text-xs text-slate-400">
                    {sc.description && <p className="mb-2">{sc.description}</p>}
                    {sc.features && sc.features.length > 0 && (
                      <div className="space-y-1">
                        {sc.features.map((f, i) => (
                          <div key={i}>
                            <span className="font-semibold text-slate-300">
                              Lvl {f.level}: {f.name}.{' '}
                            </span>
                            {f.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {subclasses.length === 0 && <p className="text-xs text-slate-500">No homebrew subclasses yet.</p>}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function HomebrewPage() {
  const { address } = useAccount()
  const [activeTab, setActiveTab] = useState<HomebrewTab>('monsters')

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Homebrew Workshop</h1>
        <p className="mt-1 text-sm text-slate-400">
          Create custom monsters, weapons, armor, items, and subclasses — shared with the whole community.
        </p>
      </div>

      {/* Tab Bar */}
      <div className="mb-6 flex gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-gradient-to-b from-yellow-500/80 to-amber-600/90 text-slate-950 shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <span>{tab.emoji}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'monsters'   && <MonstersTab   wallet={address ?? null} />}
      {activeTab === 'weapons'    && <WeaponsTab    wallet={address ?? null} />}
      {activeTab === 'armor'      && <ArmorTab      wallet={address ?? null} />}
      {activeTab === 'items'      && <ItemsTab      wallet={address ?? null} />}
      {activeTab === 'subclasses' && <SubclassesTab wallet={address ?? null} />}
    </div>
  )
}
