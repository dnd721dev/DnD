'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { SubclassEffect, ArmorProf, WeaponProf, SkillKey, Die, SpellListKey } from '@/lib/subclassRules'

// ── Constants ──────────────────────────────────────────────────────────────────

const DND_CLASSES = [
  'Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid',
  'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue',
  'Sorcerer', 'Warlock', 'Wizard',
]

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

const ALL_SKILLS: SkillKey[] = [
  'acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception',
  'history', 'insight', 'intimidation', 'investigation', 'medicine',
  'nature', 'perception', 'performance', 'persuasion', 'religion',
  'sleight_of_hand', 'stealth', 'survival',
]
const SKILL_LABEL: Record<SkillKey, string> = {
  acrobatics: 'Acrobatics', animal_handling: 'Animal Handling', arcana: 'Arcana',
  athletics: 'Athletics', deception: 'Deception', history: 'History',
  insight: 'Insight', intimidation: 'Intimidation', investigation: 'Investigation',
  medicine: 'Medicine', nature: 'Nature', perception: 'Perception',
  performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion',
  sleight_of_hand: 'Sleight of Hand', stealth: 'Stealth', survival: 'Survival',
}

const DIES: Die[] = ['d4', 'd6', 'd8', 'd10', 'd12']
const SPELL_LISTS: SpellListKey[] = ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'warlock', 'wizard']
const RECHARGES = ['short_rest', 'long_rest', 'dawn', 'special'] as const

/** Human-friendly labels for effect types */
const EFFECT_LABELS: Record<string, string> = {
  resource_add:            '🎲 Resource (Ki, Dice, etc.)',
  gain_armor_proficiency:  '🛡 Armor Proficiency',
  gain_weapon_proficiency: '⚔️ Weapon Proficiency',
  gain_skill_proficiency:  '📚 Skill Proficiency',
  expanded_spell_list:     '📜 Expanded Spell List',
  add_cantrip:             '✨ Bonus Cantrips',
  ac_bonus:                '🔰 AC Bonus',
  hp_bonus_per_level:      '❤️ HP Bonus per Level',
  crit_range_set:          '🎯 Improved Critical',
  flag:                    '⚙️ Special Rule (Flag)',
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type FeatureRow = {
  level: string
  name: string
  description: string
  effects?: SubclassEffect[]
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
  return { name: '', parentClass: '', subclassType: '', description: '',
    features: [{ level: '3', name: '', description: '', effects: [] }] }
}

function dbToForm(sc: DbSubclass): FormState {
  return {
    name: sc.name,
    parentClass: sc.parent_class,
    subclassType: sc.subclass_type ?? '',
    description: sc.description ?? '',
    features: sc.features?.length
      ? sc.features.map((f) => ({
          level: f.level,
          name: f.name,
          description: f.description,
          effects: f.effects ?? [],
        }))
      : [{ level: '3', name: '', description: '', effects: [] }],
  }
}

function walletShort(w: string) { return `${w.slice(0, 6)}…${w.slice(-4)}` }

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function summariseEffect(e: SubclassEffect): string {
  switch (e.type) {
    case 'resource_add':           return `${e.name} (${e.die ?? '—'}, ${e.recharge.replace('_', ' ')})`
    case 'gain_armor_proficiency': return e.armor.join(', ')
    case 'gain_weapon_proficiency':return e.weapons.join(', ')
    case 'gain_skill_proficiency': return e.skills.map(s => SKILL_LABEL[s] ?? s).join(', ') + (e.choose ? ` (choose ${e.choose})` : '')
    case 'expanded_spell_list':    return `${e.spellList} list — ${e.alwaysPrepared.map(ap => `${ap.spells.length} L${ap.level} spells`).join(', ')}`
    case 'add_cantrip':            return `${e.choose} ${e.spellList} cantrip${e.choose !== 1 ? 's' : ''}`
    case 'ac_bonus':               return `+${e.amount} AC${e.condition ? ` (${e.condition})` : ''}`
    case 'hp_bonus_per_level':     return `+${e.amount} HP/level`
    case 'crit_range_set':         return `Crit on ${e.range}+${e.weaponAttacksOnly ? ' (weapons)' : ''}`
    case 'flag':                   return `${e.key}${e.note ? ` — ${e.note}` : ''}`
    default:                       return '?'
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${color}`}>
      {label}
    </span>
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
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
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
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-yellow-500">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}

// ── Effect Editor (per-effect inline form) ────────────────────────────────────

type PendingEffect = { type: string; [k: string]: any }

function blankFor(type: string): PendingEffect {
  switch (type) {
    case 'resource_add':            return { type, name: '', key: '', die: 'd6', recharge: 'short_rest', note: '', scaling: [] }
    case 'gain_armor_proficiency':  return { type, armor: [] }
    case 'gain_weapon_proficiency': return { type, weapons: [] }
    case 'gain_skill_proficiency':  return { type, skills: [], choose: '' }
    case 'expanded_spell_list':     return { type, spellList: 'wizard', spellsByLevel: [{ level: '1', spells: '' }] }
    case 'add_cantrip':             return { type, spellList: 'wizard', choose: '1' }
    case 'ac_bonus':                return { type, amount: '1', condition: '' }
    case 'hp_bonus_per_level':      return { type, amount: '1', note: '' }
    case 'crit_range_set':          return { type, range: '19', weaponAttacksOnly: false }
    case 'flag':                    return { type, key: '', value: 'true', note: '' }
    default:                        return { type }
  }
}

function pendingToEffect(p: PendingEffect): SubclassEffect | null {
  switch (p.type) {
    case 'resource_add': {
      if (!p.name?.trim() || !p.key?.trim()) return null
      const scalingRows: Array<{ level: number; value: number }> = (p.scaling ?? [])
        .filter((r: any) => r.level && r.value)
        .map((r: any) => ({ level: Number(r.level), value: Number(r.value) }))
      return {
        type: 'resource_add',
        key: p.key.trim(),
        name: p.name.trim(),
        die: p.die as Die || undefined,
        recharge: p.recharge as any,
        note: p.note?.trim() || undefined,
        scaling: scalingRows.length ? { byLevel: scalingRows } : undefined,
      }
    }
    case 'gain_armor_proficiency': {
      if (!p.armor?.length) return null
      return { type: 'gain_armor_proficiency', armor: p.armor as ArmorProf[] }
    }
    case 'gain_weapon_proficiency': {
      if (!p.weapons?.length) return null
      return { type: 'gain_weapon_proficiency', weapons: p.weapons as WeaponProf[] }
    }
    case 'gain_skill_proficiency': {
      if (!p.skills?.length) return null
      return { type: 'gain_skill_proficiency', skills: p.skills as SkillKey[], choose: p.choose ? Number(p.choose) : undefined }
    }
    case 'expanded_spell_list': {
      const rows = (p.spellsByLevel ?? []).filter((r: any) => r.spells?.trim())
      if (!rows.length) return null
      return {
        type: 'expanded_spell_list',
        spellList: p.spellList as SpellListKey,
        alwaysPrepared: rows.map((r: any) => ({
          level: Number(r.level) || 1,
          spells: String(r.spells).split(',').map((s: string) => s.trim()).filter(Boolean),
        })),
      }
    }
    case 'add_cantrip':
      return { type: 'add_cantrip', spellList: p.spellList as SpellListKey, choose: Number(p.choose) || 1 }
    case 'ac_bonus': {
      const amt = Number(p.amount)
      if (!amt) return null
      return { type: 'ac_bonus', amount: amt, condition: p.condition?.trim() || undefined }
    }
    case 'hp_bonus_per_level': {
      const amt = Number(p.amount)
      if (!amt) return null
      return { type: 'hp_bonus_per_level', amount: amt, note: p.note?.trim() || undefined }
    }
    case 'crit_range_set':
      return { type: 'crit_range_set', range: Number(p.range) as 19 | 18 | 20, weaponAttacksOnly: p.weaponAttacksOnly ?? false }
    case 'flag': {
      if (!p.key?.trim()) return null
      let value: string | number | boolean = p.value?.trim()
      if (value === 'true') value = true
      else if (value === 'false') value = false
      else if (!isNaN(Number(value)) && value !== '') value = Number(value)
      return { type: 'flag', key: p.key.trim(), value, note: p.note?.trim() || undefined }
    }
    default: return null
  }
}

function EffectForm({ pending, onChange }: { pending: PendingEffect; onChange: (p: PendingEffect) => void }) {
  function set(k: string, v: any) { onChange({ ...pending, [k]: v }) }

  function toggleArmor(a: ArmorProf) {
    const cur: ArmorProf[] = pending.armor ?? []
    onChange({ ...pending, armor: cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a] })
  }
  function toggleWeapon(w: WeaponProf) {
    const cur: WeaponProf[] = pending.weapons ?? []
    onChange({ ...pending, weapons: cur.includes(w) ? cur.filter(x => x !== w) : [...cur, w] })
  }
  function toggleSkill(s: SkillKey) {
    const cur: SkillKey[] = pending.skills ?? []
    onChange({ ...pending, skills: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] })
  }

  const rowCls = 'grid grid-cols-2 gap-2'
  const inputCls = 'h-7 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-yellow-500'
  const labelCls = 'flex flex-col gap-0.5'
  const spanCls  = 'text-[10px] text-slate-500'

  switch (pending.type) {
    case 'resource_add':
      return (
        <div className="space-y-2">
          <div className={rowCls}>
            <label className={labelCls}>
              <span className={spanCls}>Resource Name *</span>
              <input className={inputCls} value={pending.name} onChange={e => {
                const name = e.target.value
                const key = pending.key || slugify(name)
                onChange({ ...pending, name, key })
              }} placeholder="e.g. Ki Points" />
            </label>
            <label className={labelCls}>
              <span className={spanCls}>Key (unique ID) *</span>
              <input className={inputCls} value={pending.key} onChange={e => set('key', slugify(e.target.value))} placeholder="e.g. ki_points" />
            </label>
          </div>
          <div className={rowCls}>
            <label className={labelCls}>
              <span className={spanCls}>Die (optional)</span>
              <select className={inputCls} value={pending.die} onChange={e => set('die', e.target.value)}>
                <option value="">None</option>
                {DIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className={labelCls}>
              <span className={spanCls}>Recharge on</span>
              <select className={inputCls} value={pending.recharge} onChange={e => set('recharge', e.target.value)}>
                {RECHARGES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </label>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className={spanCls}>Amount by Level (if it scales)</span>
              <button type="button" onClick={() => set('scaling', [...(pending.scaling ?? []), { level: '', value: '' }])}
                className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700">
                + Row
              </button>
            </div>
            {(pending.scaling ?? []).map((row: any, i: number) => (
              <div key={i} className="mb-1 flex items-center gap-2">
                <label className={labelCls}>
                  <span className={spanCls}>Level</span>
                  <input type="number" className={`${inputCls} w-16`} value={row.level}
                    onChange={e => set('scaling', (pending.scaling ?? []).map((r: any, j: number) => j === i ? { ...r, level: e.target.value } : r))} />
                </label>
                <label className={labelCls}>
                  <span className={spanCls}>Amount</span>
                  <input type="number" className={`${inputCls} w-16`} value={row.value}
                    onChange={e => set('scaling', (pending.scaling ?? []).map((r: any, j: number) => j === i ? { ...r, value: e.target.value } : r))} />
                </label>
                <button type="button" onClick={() => set('scaling', (pending.scaling ?? []).filter((_: any, j: number) => j !== i))}
                  className="mt-4 text-slate-600 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
          <label className={labelCls}>
            <span className={spanCls}>Note (optional)</span>
            <input className={inputCls} value={pending.note} onChange={e => set('note', e.target.value)} placeholder="e.g. Regain all on short rest" />
          </label>
        </div>
      )

    case 'gain_armor_proficiency':
      return (
        <div className="flex flex-wrap gap-3">
          {(['light', 'medium', 'heavy', 'shields'] as ArmorProf[]).map(a => (
            <label key={a} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" className="h-3.5 w-3.5 accent-amber-500"
                checked={(pending.armor ?? []).includes(a)} onChange={() => toggleArmor(a)} />
              <span className="text-xs capitalize text-slate-300">{a}</span>
            </label>
          ))}
        </div>
      )

    case 'gain_weapon_proficiency':
      return (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-3">
            {(['simple', 'martial'] as WeaponProf[]).map(w => (
              <label key={w} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" className="h-3.5 w-3.5 accent-amber-500"
                  checked={(pending.weapons ?? []).includes(w)} onChange={() => toggleWeapon(w)} />
                <span className="text-xs capitalize text-slate-300">{w} weapons</span>
              </label>
            ))}
          </div>
        </div>
      )

    case 'gain_skill_proficiency':
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {ALL_SKILLS.map(s => (
              <label key={s} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" className="h-3 w-3 accent-amber-500"
                  checked={(pending.skills ?? []).includes(s)} onChange={() => toggleSkill(s)} />
                <span className="text-[10px] text-slate-300">{SKILL_LABEL[s]}</span>
              </label>
            ))}
          </div>
          <label className={labelCls}>
            <span className={spanCls}>Choose N (leave blank = all selected are granted)</span>
            <input type="number" className={`${inputCls} w-20`} value={pending.choose} onChange={e => set('choose', e.target.value)} placeholder="e.g. 2" />
          </label>
        </div>
      )

    case 'expanded_spell_list':
      return (
        <div className="space-y-2">
          <label className={labelCls}>
            <span className={spanCls}>Spell list source</span>
            <select className={inputCls} value={pending.spellList} onChange={e => set('spellList', e.target.value)}>
              {SPELL_LISTS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className={spanCls}>Spells (by spell level, comma-separated names)</span>
              <button type="button" onClick={() => set('spellsByLevel', [...(pending.spellsByLevel ?? []), { level: '1', spells: '' }])}
                className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700">
                + Level Row
              </button>
            </div>
            {(pending.spellsByLevel ?? []).map((row: any, i: number) => (
              <div key={i} className="mb-1.5 flex items-end gap-2">
                <label className={labelCls}>
                  <span className={spanCls}>Spell Lvl</span>
                  <select className={`${inputCls} w-20`} value={row.level}
                    onChange={e => set('spellsByLevel', (pending.spellsByLevel ?? []).map((r: any, j: number) => j === i ? { ...r, level: e.target.value } : r))}>
                    {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <label className={`${labelCls} flex-1`}>
                  <span className={spanCls}>Spells (comma-separated)</span>
                  <input className={inputCls} value={row.spells}
                    onChange={e => set('spellsByLevel', (pending.spellsByLevel ?? []).map((r: any, j: number) => j === i ? { ...r, spells: e.target.value } : r))}
                    placeholder="e.g. Cure Wounds, Bless" />
                </label>
                <button type="button" onClick={() => set('spellsByLevel', (pending.spellsByLevel ?? []).filter((_: any, j: number) => j !== i))}
                  className="mb-1 text-slate-600 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>
      )

    case 'add_cantrip':
      return (
        <div className={rowCls}>
          <label className={labelCls}>
            <span className={spanCls}>Spell list</span>
            <select className={inputCls} value={pending.spellList} onChange={e => set('spellList', e.target.value)}>
              {SPELL_LISTS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className={labelCls}>
            <span className={spanCls}>Number to choose</span>
            <input type="number" className={inputCls} value={pending.choose} onChange={e => set('choose', e.target.value)} min={1} />
          </label>
        </div>
      )

    case 'ac_bonus':
      return (
        <div className={rowCls}>
          <label className={labelCls}>
            <span className={spanCls}>Bonus amount</span>
            <input type="number" className={inputCls} value={pending.amount} onChange={e => set('amount', e.target.value)} />
          </label>
          <label className={labelCls}>
            <span className={spanCls}>Condition (optional)</span>
            <input className={inputCls} value={pending.condition} onChange={e => set('condition', e.target.value)} placeholder="e.g. while unarmored" />
          </label>
        </div>
      )

    case 'hp_bonus_per_level':
      return (
        <div className={rowCls}>
          <label className={labelCls}>
            <span className={spanCls}>Bonus HP per level</span>
            <input type="number" className={inputCls} value={pending.amount} onChange={e => set('amount', e.target.value)} min={1} />
          </label>
          <label className={labelCls}>
            <span className={spanCls}>Note (optional)</span>
            <input className={inputCls} value={pending.note} onChange={e => set('note', e.target.value)} />
          </label>
        </div>
      )

    case 'crit_range_set':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <label className={labelCls}>
            <span className={spanCls}>Crit on a roll of</span>
            <select className={`${inputCls} w-20`} value={pending.range} onChange={e => set('range', e.target.value)}>
              <option value="19">19–20</option>
              <option value="18">18–20</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer mt-4">
            <input type="checkbox" className="h-3.5 w-3.5 accent-amber-500"
              checked={pending.weaponAttacksOnly} onChange={e => set('weaponAttacksOnly', e.target.checked)} />
            <span className="text-xs text-slate-300">Weapon attacks only</span>
          </label>
        </div>
      )

    case 'flag':
      return (
        <div className="space-y-2">
          <div className={rowCls}>
            <label className={labelCls}>
              <span className={spanCls}>Flag key *</span>
              <input className={inputCls} value={pending.key} onChange={e => set('key', slugify(e.target.value))} placeholder="e.g. second_wind" />
            </label>
            <label className={labelCls}>
              <span className={spanCls}>Value (true/false/number)</span>
              <input className={inputCls} value={pending.value} onChange={e => set('value', e.target.value)} placeholder="true" />
            </label>
          </div>
          <label className={labelCls}>
            <span className={spanCls}>Note (describes what this flag enables)</span>
            <input className={inputCls} value={pending.note} onChange={e => set('note', e.target.value)} placeholder="e.g. Enables Second Wind button in sheet" />
          </label>
        </div>
      )

    default:
      return <p className="text-[11px] text-slate-500">Select an effect type above.</p>
  }
}

// ── Per-feature effect list + inline add ───────────────────────────────────────

function EffectSection({
  effects,
  onChange,
}: {
  effects: SubclassEffect[]
  onChange: (effects: SubclassEffect[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [pending, setPending] = useState<PendingEffect>({ type: '' })

  function startAdd() { setPending({ type: '' }); setAdding(true) }
  function cancelAdd() { setAdding(false); setPending({ type: '' }) }

  function confirmAdd() {
    if (!pending.type) return
    const eff = pendingToEffect(pending)
    if (!eff) return
    onChange([...effects, eff])
    setAdding(false)
    setPending({ type: '' })
  }

  function removeEffect(i: number) {
    onChange(effects.filter((_, idx) => idx !== i))
  }

  return (
    <div className="mt-2 border-t border-slate-800/60 pt-2">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Mechanical Effects
        </span>
        {!adding && (
          <button type="button" onClick={startAdd}
            className="rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-slate-700 transition">
            + Add Effect
          </button>
        )}
      </div>

      {/* Existing effects */}
      {effects.length > 0 && (
        <div className="mb-2 space-y-1">
          {effects.map((e, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded bg-slate-800/60 px-2 py-1.5">
              <div className="min-w-0">
                <span className="text-[10px] font-semibold text-amber-400">{EFFECT_LABELS[e.type] ?? e.type}</span>
                <span className="ml-1.5 text-[10px] text-slate-400">{summariseEffect(e)}</span>
              </div>
              <button type="button" onClick={() => removeEffect(i)}
                className="shrink-0 text-[10px] text-slate-600 hover:text-red-400 transition">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Inline add form */}
      {adding && (
        <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-3">
          <label className="mb-2 flex flex-col gap-1">
            <span className="text-[10px] font-medium text-slate-400">Effect type</span>
            <select
              value={pending.type}
              onChange={e => setPending(blankFor(e.target.value))}
              className="h-7 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-yellow-500"
            >
              <option value="">Choose effect type…</option>
              {Object.entries(EFFECT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>

          {pending.type && (
            <div className="mt-2">
              <EffectForm pending={pending} onChange={setPending} />
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button type="button" onClick={confirmAdd} disabled={!pending.type}
              className="rounded bg-amber-600/80 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-500 disabled:opacity-40 transition">
              ✓ Add
            </button>
            <button type="button" onClick={cancelAdd}
              className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-700 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {effects.length === 0 && !adding && (
        <p className="text-[10px] italic text-slate-600">No effects yet — add one to make this feature mechanically active.</p>
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
  function update<K extends keyof FeatureRow>(i: number, field: K, value: FeatureRow[K]) {
    onChange(features.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)))
  }
  function add() { onChange([...features, { level: '', name: '', description: '', effects: [] }]) }
  function remove(i: number) { onChange(features.filter((_, idx) => idx !== i)) }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Features</span>
        <button type="button" onClick={add}
          className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700 transition">
          + Add Feature
        </button>
      </div>
      <div className="space-y-3">
        {features.map((f, i) => (
          <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            {/* Level + Name row */}
            <div className="flex items-end gap-2">
              <div className="w-20 shrink-0">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-slate-500">Level</span>
                  <select value={f.level} onChange={e => update(i, 'level', e.target.value)}
                    className="h-7 rounded border border-slate-700 bg-slate-900 px-1 text-xs text-slate-100 outline-none focus:border-yellow-500">
                    <option value="">—</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex-1">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-slate-500">Feature Name</span>
                  <input type="text" value={f.name} onChange={e => update(i, 'name', e.target.value)}
                    placeholder="e.g. Void Step"
                    className="h-7 rounded border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500" />
                </label>
              </div>
              <button type="button" onClick={() => remove(i)}
                className="mb-0.5 shrink-0 rounded p-1 text-slate-600 hover:text-red-400 transition" title="Remove feature">✕</button>
            </div>
            {/* Description */}
            <div className="mt-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium text-slate-500">
                  Description{f.name.trim() && <span className="ml-1 text-slate-600">— {f.name}</span>}
                </span>
                <textarea value={f.description} onChange={e => update(i, 'description', e.target.value)}
                  rows={2} placeholder="What does this feature do?"
                  className="resize-none rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500" />
              </label>
            </div>
            {/* Effect builder */}
            <EffectSection
              effects={f.effects ?? []}
              onChange={effs => update(i, 'effects', effs)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Preview Panel ─────────────────────────────────────────────────────────────

function SubclassPreview({ form }: { form: FormState }) {
  const sortedFeatures = useMemo(
    () => [...form.features]
      .filter(f => f.name.trim())
      .sort((a, b) => Number(a.level) - Number(b.level)),
    [form.features],
  )
  const hasContent = form.name.trim() || form.parentClass || sortedFeatures.length > 0
  if (!hasContent) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center">
        <div><div className="mb-2 text-2xl">📖</div><p className="text-[11px] text-slate-500">Fill in the form to see a live preview</p></div>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-amber-800/40 bg-slate-950 overflow-hidden shadow-lg shadow-amber-900/10">
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
          <span className="shrink-0 rounded bg-amber-600/20 border border-amber-600/40 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-400 uppercase">Homebrew</span>
        </div>
      </div>
      {form.description.trim() && (
        <div className="px-4 py-3 border-b border-slate-800/60">
          <p className="text-[11px] italic leading-relaxed text-slate-300">{form.description}</p>
        </div>
      )}
      {sortedFeatures.length > 0 ? (
        <div className="divide-y divide-slate-800/60">
          {sortedFeatures.map((f, i) => (
            <div key={i} className="px-4 py-2.5">
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-slate-400 uppercase">Level {f.level}</span>
                <span className="text-[12px] font-semibold text-slate-100">{f.name}</span>
              </div>
              {f.description.trim() && <p className="text-[11px] leading-relaxed text-slate-400">{f.description}</p>}
              {(f.effects?.length ?? 0) > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {(f.effects ?? []).map((e, ei) => (
                    <span key={ei} className="rounded bg-amber-900/30 border border-amber-800/40 px-1.5 py-0.5 text-[9px] text-amber-300">
                      {EFFECT_LABELS[e.type] ?? e.type}: {summariseEffect(e)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-3 text-[11px] italic text-slate-600">Add features to see them here…</div>
      )}
    </div>
  )
}

// ── Community Card ────────────────────────────────────────────────────────────

function SubclassCard({
  sc, isOwner, isExpanded, onToggleExpand, onEdit, onDelete,
}: {
  sc: DbSubclass; isOwner: boolean; isExpanded: boolean
  onToggleExpand: () => void; onEdit: () => void; onDelete: () => void
}) {
  const featureCount = sc.features?.filter(f => f.name.trim()).length ?? 0
  const effectCount = sc.features?.reduce((sum, f) => sum + (f.effects?.length ?? 0), 0) ?? 0
  return (
    <div className={`rounded-xl border transition ${isOwner ? 'border-amber-800/50 bg-amber-950/10' : 'border-slate-800 bg-slate-900/60'}`}>
      <button type="button" onClick={onToggleExpand} className="w-full rounded-t-xl px-4 py-3 text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-100 text-sm">{sc.name}</span>
              {isOwner && <span className="rounded bg-amber-600/20 border border-amber-600/30 px-1 py-0.5 text-[9px] font-bold tracking-wide text-amber-400 uppercase">yours</span>}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
              {sc.subclass_type && <span>{sc.subclass_type}</span>}
              {sc.subclass_type && <span>·</span>}
              <span>{featureCount} feature{featureCount !== 1 ? 's' : ''}</span>
              {effectCount > 0 && <><span>·</span><span className="text-amber-500/70">{effectCount} effect{effectCount !== 1 ? 's' : ''}</span></>}
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
      {isExpanded && (
        <div className="border-t border-slate-800/60 px-4 pb-4 pt-3">
          {sc.description && <p className="mb-3 text-[11px] italic leading-relaxed text-slate-400">{sc.description}</p>}
          {sc.features && sc.features.length > 0 && (
            <div className="space-y-2">
              {[...sc.features].filter(f => f.name.trim()).sort((a, b) => Number(a.level) - Number(b.level)).map((f, idx) => (
                <div key={idx} className="rounded-lg bg-slate-950/60 border border-slate-800/60 px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Level {f.level}</span>
                    <span className="text-[11px] font-semibold text-slate-200">{f.name}</span>
                  </div>
                  {f.description && <p className="text-[11px] leading-relaxed text-slate-400">{f.description}</p>}
                  {(f.effects?.length ?? 0) > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(f.effects ?? []).map((e, ei) => (
                        <span key={ei} className="rounded bg-amber-900/30 border border-amber-700/30 px-1.5 py-0.5 text-[9px] text-amber-300">
                          {EFFECT_LABELS[e.type] ?? e.type}: {summariseEffect(e)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {isOwner && (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={onEdit} className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 transition">✏️ Edit</button>
              <button type="button" onClick={onDelete} className="rounded-lg bg-red-900/30 px-3 py-1.5 text-[11px] font-semibold text-red-300 hover:bg-red-900/50 transition">🗑 Delete</button>
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
  const [form, setForm] = useState<FormState>(defaultForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [subclasses, setSubclasses] = useState<DbSubclass[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const headers: HeadersInit = wallet ? { 'x-wallet-address': wallet } : {}
    fetch('/api/homebrew/subclasses', { headers })
      .then(r => r.json())
      .then(json => setSubclasses(json.subclasses ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [wallet])

  function setField<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function startEdit(sc: DbSubclass) {
    setForm(dbToForm(sc))
    setEditingId(sc.id)
    setShowForm(true)
    setSaveErr(null)
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function cancelEdit() { setForm(defaultForm()); setEditingId(null); setSaveErr(null) }

  async function handleSave() {
    if (!wallet || !form.name.trim() || !form.parentClass) return
    setSaving(true); setSaveErr(null)
    const cleanFeatures = form.features.filter(f => f.name.trim()).map(f => ({
      level: f.level, name: f.name, description: f.description, effects: f.effects ?? [],
    }))
    const body = {
      ...(editingId ? { id: editingId } : {}),
      name: form.name.trim(), parent_class: form.parentClass,
      subclass_type: form.subclassType || null,
      description: form.description || null,
      features: cleanFeatures,
    }
    try {
      const res = await fetch('/api/homebrew/subclasses', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': wallet },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setSaveErr(json.error ?? 'Failed to save'); return }
      const saved: DbSubclass = json.subclass
      if (editingId) {
        setSubclasses(prev => prev.map(s => s.id === editingId ? saved : s))
      } else {
        setSubclasses(prev => [saved, ...prev])
      }
      setForm(defaultForm()); setEditingId(null)
    } catch (e: any) {
      setSaveErr(e?.message ?? 'Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(sc: DbSubclass) {
    if (!wallet || !window.confirm(`Delete "${sc.name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/homebrew/subclasses?id=${sc.id}`, {
        method: 'DELETE', headers: { 'x-wallet-address': wallet },
      })
      if (!res.ok) { alert((await res.json()).error ?? 'Failed to delete'); return }
      setSubclasses(prev => prev.filter(s => s.id !== sc.id))
      if (editingId === sc.id) cancelEdit()
    } catch (e: any) { alert(e?.message ?? 'Network error') }
  }

  const filtered = useMemo(() => {
    let list = subclasses
    if (filterClass !== 'all') list = list.filter(s => s.parent_class === filterClass)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || (s.subclass_type ?? '').toLowerCase().includes(q))
    }
    return list
  }, [subclasses, filterClass, search])

  return (
    <div className="space-y-6" ref={formTopRef}>
      {wallet ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">{editingId ? 'Edit Subclass' : 'Create Subclass'}</h2>
            <div className="flex gap-2">
              {editingId && (
                <button type="button" onClick={cancelEdit}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition">
                  Cancel Edit
                </button>
              )}
              <button type="button" onClick={() => setShowForm(v => !v)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition">
                {showForm ? 'Hide Form' : 'Show Form'}
              </button>
            </div>
          </div>
          {showForm && (
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Basic Info</h3>
                  <div className="space-y-3">
                    <InputField label="Subclass Name" required value={form.name} onChange={v => setField('name', v)} placeholder="e.g. Way of the Void" />
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField label="Parent Class" value={form.parentClass} onChange={v => setField('parentClass', v)} options={DND_CLASSES} placeholder="Choose class…" />
                      <InputField label="Archetype Label" value={form.subclassType} onChange={v => setField('subclassType', v)}
                        placeholder={form.parentClass ? CLASS_ARCHETYPE_LABEL[form.parentClass] ?? 'e.g. Arcane Tradition' : 'e.g. Monastic Tradition'} />
                    </div>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] font-medium text-slate-400">Description / Flavor</span>
                      <textarea value={form.description} onChange={e => setField('description', e.target.value)}
                        rows={4} placeholder="Lore, theme, and overview of this subclass…"
                        className="resize-none rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500" />
                    </label>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                  <FeatureEditor features={form.features} onChange={f => setField('features', f)} />
                </div>
                <div>
                  {saveErr && <p className="mb-2 text-xs text-red-400">{saveErr}</p>}
                  <button type="button" onClick={handleSave} disabled={saving || !form.name.trim() || !form.parentClass}
                    className="w-full rounded-lg bg-gradient-to-b from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition">
                    {saving ? 'Saving…' : editingId ? 'Update Subclass' : 'Save Subclass'}
                  </button>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Live Preview</div>
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

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Community Subclasses <span className="ml-2 text-slate-500">({subclasses.length})</span>
          </h2>
        </div>
        <div className="mb-3 flex gap-2">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subclasses…"
            className="flex-1 h-8 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500" />
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100 outline-none focus:border-yellow-500">
            <option value="all">All classes</option>
            {DND_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-slate-500">{subclasses.length === 0 ? 'No homebrew subclasses yet — be the first!' : 'No subclasses match your search.'}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(sc => (
              <SubclassCard key={sc.id} sc={sc}
                isOwner={wallet?.toLowerCase() === sc.creator_wallet}
                isExpanded={expandedId === sc.id}
                onToggleExpand={() => setExpandedId(expandedId === sc.id ? null : sc.id)}
                onEdit={() => startEdit(sc)}
                onDelete={() => handleDelete(sc)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
