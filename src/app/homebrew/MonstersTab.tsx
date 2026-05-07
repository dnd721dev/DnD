'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ALL_SRD_MONSTERS } from '@/lib/monstersData'
import type { Monster as SrdMonster } from '@/lib/monstersData/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CR_OPTIONS = [
  '0','1/8','1/4','1/2',
  '1','2','3','4','5','6','7','8','9','10',
  '11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30',
]

const CR_TO_XP: Record<string, number> = {
  '0':10,'1/8':25,'1/4':50,'1/2':100,
  '1':200,'2':450,'3':700,'4':1100,'5':1800,'6':2300,'7':2900,
  '8':3900,'9':5000,'10':5900,'11':7200,'12':8400,'13':10000,
  '14':11500,'15':13000,'16':15000,'17':18000,'18':20000,
  '19':22000,'20':25000,'21':33000,'22':41000,'23':50000,
  '24':62000,'25':75000,'26':90000,'27':105000,'28':120000,
  '29':135000,'30':155000,
}

function crToNum(cr: string): number {
  if (cr === '1/8') return 0.125
  if (cr === '1/4') return 0.25
  if (cr === '1/2') return 0.5
  return parseFloat(cr) || 0
}

function pbForCr(cr: string): number {
  const n = crToNum(cr)
  if (n <= 4)  return 2
  if (n <= 8)  return 3
  if (n <= 12) return 4
  if (n <= 16) return 5
  if (n <= 20) return 6
  if (n <= 24) return 7
  if (n <= 28) return 8
  return 9
}

const SIZES    = ['Tiny','Small','Medium','Large','Huge','Gargantuan']
const TYPES    = ['Aberration','Beast','Celestial','Construct','Dragon','Elemental','Fey','Fiend','Giant','Humanoid','Monstrosity','Ooze','Plant','Undead']
const ALIGNMENTS = [
  'Lawful Good','Neutral Good','Chaotic Good',
  'Lawful Neutral','True Neutral','Chaotic Neutral',
  'Lawful Evil','Neutral Evil','Chaotic Evil',
  'Unaligned','Any alignment',
]
const SKILLS_LIST = [
  'Acrobatics','Animal Handling','Arcana','Athletics','Deception',
  'History','Insight','Intimidation','Investigation','Medicine',
  'Nature','Perception','Performance','Persuasion','Religion',
  'Sleight of Hand','Stealth','Survival',
]
const CONDITIONS = [
  'Blinded','Charmed','Deafened','Exhaustion','Frightened',
  'Grappled','Incapacitated','Invisible','Paralyzed','Petrified',
  'Poisoned','Prone','Restrained','Stunned',
]
const DAMAGE_TYPES_ACTION = [
  'Acid','Bludgeoning','Cold','Fire','Force','Lightning','Necrotic',
  'Piercing','Poison','Psychic','Radiant','Slashing','Thunder',
]
const ATTACK_TYPES = [
  'None',
  'Melee Weapon Attack','Ranged Weapon Attack',
  'Melee Spell Attack','Ranged Spell Attack',
]
const RECHARGE_OPTIONS = ['None','Recharge 5-6','Recharge 4-6','Recharge 3-6','1/Day','2/Day','3/Day']

const ABILITY_KEYS = ['str','dex','con','int_score','wis','cha'] as const
const ABILITY_LABELS: Record<string, string> = {
  str:'STR', dex:'DEX', con:'CON', int_score:'INT', wis:'WIS', cha:'CHA',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AbilityKey = typeof ABILITY_KEYS[number]

type ActionRow = {
  name: string
  attackType: string
  attackBonus: string
  reachRange: string
  targets: string
  damageDice: string
  damageType: string
  description: string
  recharge: string
}

type TraitRow = { name: string; description: string }

type SavingThrowMap = Record<string, boolean>
type SkillRow = { name: string; bonus: string }

export type HomebrewMonster = {
  id: string
  creator_wallet: string
  name: string
  cr: string
  xp: number | null
  size: string | null
  type: string | null
  subtype: string | null
  alignment: string | null
  ac: number | null
  hp: number | null
  hit_dice: string | null
  speed: string | null
  str: number
  dex: number
  con: number
  int_score: number
  wis: number
  cha: number
  saving_throws: SavingThrowMap
  skills: SkillRow[]
  damage_resistances: string | null
  damage_immunities: string | null
  damage_vulnerabilities: string | null
  condition_immunities: string[]
  senses: string | null
  languages: string | null
  traits: TraitRow[]
  actions: ActionRow[]
  bonus_actions: ActionRow[]
  reactions: ActionRow[]
  legendary_actions: ActionRow[]
  legendary_action_count: number
  token_image_url: string | null
  description: string | null
  is_published: boolean
  created_at: string
}

function emptyAction(): ActionRow {
  return { name:'', attackType:'None', attackBonus:'', reachRange:'', targets:'one target', damageDice:'', damageType:'', description:'', recharge:'None' }
}
function emptyTrait(): TraitRow { return { name:'', description:'' } }

function modStr(score: number): string {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-medium text-slate-400">{children}</span>
}

function TInput({ value, onChange, placeholder, type = 'text', className = '', disabled = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string; disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`h-8 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500 disabled:opacity-40 ${className}`}
    />
  )
}

function TSelect({ value, onChange, options, placeholder = '— select —', className = '' }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; className?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`h-8 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-yellow-500 ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function TTextarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500 resize-none"
    />
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 border-b border-slate-700/60 pb-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-yellow-500/80">{children}</h4>
    </div>
  )
}

function ActionEditor({
  actions, onChange, label,
}: {
  actions: ActionRow[]
  onChange: (rows: ActionRow[]) => void
  label: string
}) {
  function update(i: number, field: keyof ActionRow, val: string) {
    onChange(actions.map((a, idx) => idx === i ? { ...a, [field]: val } : a))
  }
  return (
    <div>
      <SectionHeader>{label}</SectionHeader>
      <div className="space-y-3">
        {actions.map((a, i) => (
          <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <FieldLabel>Action Name</FieldLabel>
                <TInput value={a.name} onChange={v => update(i,'name',v)} placeholder="e.g. Scimitar" />
              </div>
              <button
                type="button"
                onClick={() => onChange(actions.filter((_,idx) => idx !== i))}
                className="mt-4 shrink-0 rounded p-1 text-slate-500 hover:text-red-400 text-sm"
              >✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div>
                <FieldLabel>Attack Type</FieldLabel>
                <TSelect value={a.attackType} onChange={v => update(i,'attackType',v)} options={ATTACK_TYPES} placeholder="" />
              </div>
              {a.attackType !== 'None' && (
                <div>
                  <FieldLabel>Attack Bonus</FieldLabel>
                  <TInput value={a.attackBonus} onChange={v => update(i,'attackBonus',v)} placeholder="+4" type="number" />
                </div>
              )}
              <div>
                <FieldLabel>Reach / Range</FieldLabel>
                <TInput value={a.reachRange} onChange={v => update(i,'reachRange',v)} placeholder="5 ft." />
              </div>
              <div>
                <FieldLabel>Targets</FieldLabel>
                <TInput value={a.targets} onChange={v => update(i,'targets',v)} placeholder="one target" />
              </div>
              <div>
                <FieldLabel>Damage Dice</FieldLabel>
                <TInput value={a.damageDice} onChange={v => update(i,'damageDice',v)} placeholder="1d6+2" />
              </div>
              <div>
                <FieldLabel>Damage Type</FieldLabel>
                <TSelect value={a.damageType} onChange={v => update(i,'damageType',v)} options={DAMAGE_TYPES_ACTION} />
              </div>
              <div>
                <FieldLabel>Recharge</FieldLabel>
                <TSelect value={a.recharge} onChange={v => update(i,'recharge',v)} options={RECHARGE_OPTIONS} placeholder="" />
              </div>
            </div>
            <div>
              <FieldLabel>Full Description (leave blank to auto-generate)</FieldLabel>
              <TTextarea value={a.description} onChange={v => update(i,'description',v)} placeholder="Auto-generated from fields above if left empty…" rows={2} />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...actions, emptyAction()])}
          className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
        >+ Add {label.replace(/s$/,'')}</button>
      </div>
    </div>
  )
}

// ─── Stat Block Preview ───────────────────────────────────────────────────────

function StatBlockPreview({ f }: { f: FormState }) {
  const abilities: [string, AbilityKey][] = [
    ['STR','str'],['DEX','dex'],['CON','con'],
    ['INT','int_score'],['WIS','wis'],['CHA','cha'],
  ]

  const xp = CR_TO_XP[f.cr]
  const pb = pbForCr(f.cr)

  function buildActionLine(a: ActionRow): string {
    if (a.description.trim()) return a.description
    const parts: string[] = []
    if (a.attackType !== 'None') {
      parts.push(`${a.attackType}: ${a.attackBonus ? `+${a.attackBonus}` : '+0'} to hit`)
      if (a.reachRange) parts.push(`${a.reachRange.includes('ft') ? 'reach' : 'range'} ${a.reachRange}`)
      if (a.targets)    parts.push(a.targets)
      if (a.damageDice || a.damageType) {
        parts.push(`Hit: ${a.damageDice || '?'}${a.damageType ? ` ${a.damageType.toLowerCase()}` : ''} damage`)
      }
    } else if (a.damageDice) {
      parts.push(`${a.damageDice}${a.damageType ? ` ${a.damageType.toLowerCase()}` : ''} damage`)
    }
    return parts.join(', ') + '.'
  }

  const activeSaves = (Object.entries(f.savingThrows) as [string,boolean][])
    .filter(([,v]) => v)
    .map(([k]) => {
      const score = Number(f.abilities[k as AbilityKey] ?? 10)
      const mod = Math.floor((score - 10) / 2)
      return `${k.replace('_score','').toUpperCase()} +${mod + pb}`
    })

  return (
    <div className="rounded-xl border-2 border-yellow-700/60 bg-[#1c1008] p-4 text-sm font-serif text-[#e8d5a3] space-y-2 min-w-0">
      {/* Name */}
      <div>
        <h2 className="text-xl font-bold text-yellow-300 leading-tight">{f.name || 'Unnamed Monster'}</h2>
        <p className="text-xs italic text-yellow-500/80">
          {[f.size, f.monsterType, f.subtype ? `(${f.subtype})` : null].filter(Boolean).join(' ')}
          {f.alignment ? `, ${f.alignment.toLowerCase()}` : ''}
        </p>
      </div>

      <div className="border-t border-yellow-700/40" />

      {/* Combat stats */}
      <div className="space-y-0.5 text-xs">
        <p><span className="font-semibold text-yellow-400">Armor Class</span> {f.ac || '—'}{f.armorNotes ? ` (${f.armorNotes})` : ''}</p>
        <p><span className="font-semibold text-yellow-400">Hit Points</span> {f.hp || '—'}{f.hitDice ? ` (${f.hitDice})` : ''}</p>
        <p><span className="font-semibold text-yellow-400">Speed</span> {f.speed || '—'}</p>
      </div>

      <div className="border-t border-yellow-700/40" />

      {/* Ability scores */}
      <div className="grid grid-cols-6 gap-1 text-center text-xs">
        {abilities.map(([lbl, key]) => (
          <div key={key}>
            <div className="font-bold text-yellow-400">{lbl}</div>
            <div>{f.abilities[key]} ({modStr(Number(f.abilities[key]))})</div>
          </div>
        ))}
      </div>

      <div className="border-t border-yellow-700/40" />

      {/* Proficiencies & traits */}
      <div className="space-y-0.5 text-xs">
        {activeSaves.length > 0 && (
          <p><span className="font-semibold text-yellow-400">Saving Throws</span> {activeSaves.join(', ')}</p>
        )}
        {f.skills.filter(s => s.name).length > 0 && (
          <p><span className="font-semibold text-yellow-400">Skills</span> {f.skills.filter(s=>s.name).map(s=>`${s.name} ${s.bonus ? `+${s.bonus}` : ''}`).join(', ')}</p>
        )}
        {f.damageVulnerabilities && <p><span className="font-semibold text-yellow-400">Damage Vulnerabilities</span> {f.damageVulnerabilities}</p>}
        {f.damageResistances && <p><span className="font-semibold text-yellow-400">Damage Resistances</span> {f.damageResistances}</p>}
        {f.damageImmunities && <p><span className="font-semibold text-yellow-400">Damage Immunities</span> {f.damageImmunities}</p>}
        {f.conditionImmunities.length > 0 && <p><span className="font-semibold text-yellow-400">Condition Immunities</span> {f.conditionImmunities.join(', ')}</p>}
        {f.senses && <p><span className="font-semibold text-yellow-400">Senses</span> {f.senses}</p>}
        {f.languages && <p><span className="font-semibold text-yellow-400">Languages</span> {f.languages}</p>}
        <p>
          <span className="font-semibold text-yellow-400">Challenge</span>{' '}
          {f.cr || '0'} ({xp ? xp.toLocaleString() : '0'} XP)
        </p>
        <p><span className="font-semibold text-yellow-400">Proficiency Bonus</span> +{pb}</p>
      </div>

      {/* Traits */}
      {f.traits.filter(t=>t.name).length > 0 && (
        <>
          <div className="border-t border-yellow-700/40" />
          <div className="space-y-1 text-xs">
            {f.traits.filter(t=>t.name).map((t,i) => (
              <p key={i}><span className="font-bold italic text-yellow-200">{t.name}.</span> {t.description}</p>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      {f.actions.filter(a=>a.name).length > 0 && (
        <>
          <div className="border-t border-yellow-700/40" />
          <h3 className="text-sm font-bold text-yellow-400">Actions</h3>
          <div className="space-y-1 text-xs">
            {f.actions.filter(a=>a.name).map((a,i) => (
              <p key={i}>
                <span className="font-bold italic text-yellow-200">
                  {a.name}{a.recharge !== 'None' ? ` (${a.recharge})` : ''}.
                </span>{' '}
                {buildActionLine(a)}
              </p>
            ))}
          </div>
        </>
      )}

      {/* Bonus actions */}
      {f.bonusActions.filter(a=>a.name).length > 0 && (
        <>
          <div className="border-t border-yellow-700/40" />
          <h3 className="text-sm font-bold text-yellow-400">Bonus Actions</h3>
          <div className="space-y-1 text-xs">
            {f.bonusActions.filter(a=>a.name).map((a,i) => (
              <p key={i}><span className="font-bold italic text-yellow-200">{a.name}.</span> {buildActionLine(a)}</p>
            ))}
          </div>
        </>
      )}

      {/* Reactions */}
      {f.reactions.filter(a=>a.name).length > 0 && (
        <>
          <div className="border-t border-yellow-700/40" />
          <h3 className="text-sm font-bold text-yellow-400">Reactions</h3>
          <div className="space-y-1 text-xs">
            {f.reactions.filter(a=>a.name).map((a,i) => (
              <p key={i}><span className="font-bold italic text-yellow-200">{a.name}.</span> {buildActionLine(a)}</p>
            ))}
          </div>
        </>
      )}

      {/* Legendary actions */}
      {f.legendaryActions.filter(a=>a.name).length > 0 && (
        <>
          <div className="border-t border-yellow-700/40" />
          <h3 className="text-sm font-bold text-yellow-400">Legendary Actions</h3>
          <p className="text-xs text-yellow-600 italic">Can take {f.legendaryActionCount} legendary actions per round.</p>
          <div className="space-y-1 text-xs">
            {f.legendaryActions.filter(a=>a.name).map((a,i) => (
              <p key={i}><span className="font-bold italic text-yellow-200">{a.name}.</span> {buildActionLine(a)}</p>
            ))}
          </div>
        </>
      )}

      {/* Description */}
      {f.description && (
        <>
          <div className="border-t border-yellow-700/40" />
          <p className="text-xs italic text-yellow-600/80">{f.description}</p>
        </>
      )}
    </div>
  )
}

// ─── Community Monster Card ───────────────────────────────────────────────────

function MonsterCard({
  monster, wallet, onEdit, onDelete, onAddToSession, hasActiveSession,
}: {
  monster: HomebrewMonster
  wallet: string | null
  onEdit: () => void
  onDelete: () => void
  onAddToSession: () => void
  hasActiveSession: boolean
}) {
  const isOwner = wallet && monster.creator_wallet === wallet.toLowerCase()
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
      {/* Token image strip */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-800">
        <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center">
          {monster.token_image_url ? (
            <img src={monster.token_image_url} alt={monster.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">👾</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-100 truncate">{monster.name}</span>
            <span className="shrink-0 rounded-full border border-amber-600/50 bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-300">CR {monster.cr}</span>
          </div>
          <div className="text-xs text-slate-400 truncate">
            {[monster.size, monster.type, monster.subtype ? `(${monster.subtype})` : null].filter(Boolean).join(' ')}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 px-3 py-2 text-xs text-slate-400">
        {monster.ac != null && <span>AC <span className="text-slate-200">{monster.ac}</span></span>}
        {monster.hp != null && <span>HP <span className="text-slate-200">{monster.hp}</span></span>}
        {monster.xp != null && <span>XP <span className="text-slate-200">{monster.xp.toLocaleString()}</span></span>}
        {monster.alignment && <span className="truncate text-slate-500">{monster.alignment}</span>}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 px-3 pb-3">
        {hasActiveSession && (
          <button
            type="button"
            onClick={onAddToSession}
            className="flex-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-600"
          >
            ⚔ Add to Session
          </button>
        )}
        {isOwner && (
          <>
            <button type="button" onClick={onEdit}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 hover:border-slate-500">
              Edit
            </button>
            <button type="button" onClick={onDelete}
              className="rounded-lg border border-red-800/50 px-3 py-1.5 text-[11px] text-red-400 hover:border-red-600">
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Form State ───────────────────────────────────────────────────────────────

type FormState = {
  name: string
  cr: string
  size: string
  monsterType: string
  subtype: string
  alignment: string
  ac: string
  hp: string
  armorNotes: string
  hitDice: string
  speed: string
  abilities: Record<AbilityKey, string>
  savingThrows: SavingThrowMap
  skills: SkillRow[]
  damageResistances: string
  damageImmunities: string
  damageVulnerabilities: string
  conditionImmunities: string[]
  senses: string
  languages: string
  traits: TraitRow[]
  actions: ActionRow[]
  bonusActions: ActionRow[]
  reactions: ActionRow[]
  legendaryActions: ActionRow[]
  legendaryActionCount: string
  tokenImageUrl: string
  description: string
}

function defaultForm(): FormState {
  return {
    name:'', cr:'1', size:'Medium', monsterType:'Humanoid', subtype:'', alignment:'',
    ac:'', hp:'', armorNotes:'', hitDice:'', speed:'30 ft.',
    abilities:{ str:'10', dex:'10', con:'10', int_score:'10', wis:'10', cha:'10' },
    savingThrows:{},
    skills:[],
    damageResistances:'', damageImmunities:'', damageVulnerabilities:'',
    conditionImmunities:[],
    senses:'', languages:'',
    traits:[],
    actions:[],
    bonusActions:[],
    reactions:[],
    legendaryActions:[],
    legendaryActionCount:'3',
    tokenImageUrl:'', description:'',
  }
}

function monsterToForm(m: HomebrewMonster): FormState {
  return {
    name: m.name,
    cr: m.cr,
    size: m.size ?? '',
    monsterType: m.type ?? '',
    subtype: m.subtype ?? '',
    alignment: m.alignment ?? '',
    ac: m.ac != null ? String(m.ac) : '',
    hp: m.hp != null ? String(m.hp) : '',
    armorNotes: '',
    hitDice: m.hit_dice ?? '',
    speed: m.speed ?? '',
    abilities: {
      str: String(m.str), dex: String(m.dex), con: String(m.con),
      int_score: String(m.int_score), wis: String(m.wis), cha: String(m.cha),
    },
    savingThrows: (m.saving_throws ?? {}) as SavingThrowMap,
    skills: Array.isArray(m.skills) ? m.skills : [],
    damageResistances: m.damage_resistances ?? '',
    damageImmunities: m.damage_immunities ?? '',
    damageVulnerabilities: m.damage_vulnerabilities ?? '',
    conditionImmunities: Array.isArray(m.condition_immunities) ? m.condition_immunities : [],
    senses: m.senses ?? '',
    languages: m.languages ?? '',
    traits: Array.isArray(m.traits) ? m.traits : [],
    actions: Array.isArray(m.actions) ? m.actions : [],
    bonusActions: Array.isArray(m.bonus_actions) ? m.bonus_actions : [],
    reactions: Array.isArray(m.reactions) ? m.reactions : [],
    legendaryActions: Array.isArray(m.legendary_actions) ? m.legendary_actions : [],
    legendaryActionCount: String(m.legendary_action_count ?? 3),
    tokenImageUrl: m.token_image_url ?? '',
    description: m.description ?? '',
  }
}

function formToPayload(f: FormState, wallet: string) {
  return {
    creator_wallet: wallet.toLowerCase(),
    name: f.name.trim(),
    cr: f.cr || '0',
    xp: CR_TO_XP[f.cr] ?? null,
    size: f.size || null,
    type: f.monsterType || null,
    subtype: f.subtype || null,
    alignment: f.alignment || null,
    ac: f.ac ? parseInt(f.ac, 10) : null,
    hp: f.hp ? parseInt(f.hp, 10) : null,
    hit_dice: f.hitDice || null,
    speed: f.speed || null,
    str: parseInt(f.abilities.str) || 10,
    dex: parseInt(f.abilities.dex) || 10,
    con: parseInt(f.abilities.con) || 10,
    int_score: parseInt(f.abilities.int_score) || 10,
    wis: parseInt(f.abilities.wis) || 10,
    cha: parseInt(f.abilities.cha) || 10,
    saving_throws: f.savingThrows,
    skills: f.skills.filter(s => s.name),
    damage_resistances: f.damageResistances || null,
    damage_immunities: f.damageImmunities || null,
    damage_vulnerabilities: f.damageVulnerabilities || null,
    condition_immunities: f.conditionImmunities,
    senses: f.senses || null,
    languages: f.languages || null,
    traits: f.traits.filter(t => t.name),
    actions: f.actions.filter(a => a.name),
    bonus_actions: f.bonusActions.filter(a => a.name),
    reactions: f.reactions.filter(a => a.name),
    legendary_actions: f.legendaryActions.filter(a => a.name),
    legendary_action_count: parseInt(f.legendaryActionCount) || 3,
    token_image_url: f.tokenImageUrl || null,
    description: f.description || null,
    is_published: true,
  }
}

// ─── SRD Import Modal ─────────────────────────────────────────────────────────

function SrdImportModal({ onImport, onClose }: {
  onImport: (m: SrdMonster) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    if (!q.trim()) return ALL_SRD_MONSTERS.slice(0, 20)
    const t = q.toLowerCase()
    return ALL_SRD_MONSTERS.filter(m => m.name.toLowerCase().includes(t)).slice(0, 30)
  }, [q])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <span className="font-semibold text-slate-200">Import from SRD</span>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>
        <div className="p-4">
          <input
            autoFocus
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-yellow-500"
            placeholder="Search monsters…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
          <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
            {results.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { onImport(m); onClose() }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-800"
              >
                <span className="text-slate-200">{m.name}</span>
                <span className="text-xs text-slate-500">CR {m.cr} • {m.type}</span>
              </button>
            ))}
            {results.length === 0 && <p className="text-xs text-slate-500 py-2">No monsters match.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MonstersTab({ wallet }: { wallet: string | null }) {
  const [monsters, setMonsters] = useState<HomebrewMonster[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [addToSessionStatus, setAddToSessionStatus] = useState<string | null>(null)

  // Filters
  const [filterSearch, setFilterSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCrMin, setFilterCrMin] = useState('')
  const [filterCrMax, setFilterCrMax] = useState('')

  const [form, setForm] = useState<FormState>(defaultForm)

  // Active session for "Add to Session"
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null)
  const [activeMapId, setActiveMapId] = useState<string | null>(null)

  // Load monsters via API
  async function loadMonsters() {
    setLoading(true)
    try {
      const res = await fetch('/api/homebrew/monsters', {
        headers: {
          ...(wallet ? { 'x-wallet-address': wallet.toLowerCase() } : {}),
        },
      })
      if (res.ok) {
        const json = await res.json()
        setMonsters((json.monsters ?? []) as HomebrewMonster[])
      }
    } catch {}
    setLoading(false)
  }

  // Poll for active session/encounter (simplified lookup)
  useEffect(() => {
    if (!wallet) return
    supabase
      .from('sessions')
      .select('id, encounters!inner(id, maps(id))')
      .eq('gm_wallet', wallet.toLowerCase())
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const enc = (data as any).encounters?.[0]
        if (enc) {
          setActiveEncounterId(enc.id ?? null)
          setActiveMapId(enc.maps?.[0]?.id ?? null)
        }
      })
  }, [wallet])

  useEffect(() => { loadMonsters() }, [wallet]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('homebrew_monsters_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homebrew_monsters' }, () => {
        loadMonsters()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function setAbility(key: AbilityKey, value: string) {
    setForm(prev => ({ ...prev, abilities: { ...prev.abilities, [key]: value } }))
  }

  function toggleSave(key: string) {
    setForm(prev => ({
      ...prev,
      savingThrows: { ...prev.savingThrows, [key]: !prev.savingThrows[key] },
    }))
  }

  function toggleCondition(c: string) {
    setForm(prev => ({
      ...prev,
      conditionImmunities: prev.conditionImmunities.includes(c)
        ? prev.conditionImmunities.filter(x => x !== c)
        : [...prev.conditionImmunities, c],
    }))
  }

  function addSkill() {
    setForm(prev => ({ ...prev, skills: [...prev.skills, { name: '', bonus: '' }] }))
  }
  function updateSkill(i: number, field: keyof SkillRow, val: string) {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.map((s, idx) => idx === i ? { ...s, [field]: val } : s),
    }))
  }
  function removeSkill(i: number) {
    setForm(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))
  }

  function importSrd(m: SrdMonster) {
    function crNum2Str(n: number): string {
      if (n === 0.125) return '1/8'
      if (n === 0.25)  return '1/4'
      if (n === 0.5)   return '1/2'
      return String(n)
    }
    setForm({
      ...defaultForm(),
      name: m.name + ' (homebrew)',
      cr: crNum2Str(m.cr),
      size: m.size,
      monsterType: m.type.charAt(0).toUpperCase() + m.type.slice(1),
      alignment: m.alignment,
      ac: String(m.armorClass),
      hp: String(m.hitPoints),
      hitDice: m.hitDice,
      speed: m.speed,
      abilities: {
        str: String(m.abilities.str),
        dex: String(m.abilities.dex),
        con: String(m.abilities.con),
        int_score: String(m.abilities.int),
        wis: String(m.abilities.wis),
        cha: String(m.abilities.cha),
      },
      senses: m.senses?.join(', ') ?? '',
      languages: m.languages?.join(', ') ?? '',
      traits: (m.traits ?? []).map(t => ({ name: t.name, description: t.description })),
      actions: (m.actions ?? []).map(a => ({
        ...emptyAction(),
        name: a.name,
        description: a.description,
        attackBonus: a.attackBonus != null ? String(a.attackBonus) : '',
        damageDice: a.damage?.split(' ')[0] ?? '',
        damageType: a.damage?.split(' ')[1] ?? '',
        attackType: a.type === 'attack' ? 'Melee Weapon Attack' : 'None',
      })),
      legendaryActions: (m.legendaryActions ?? []).map(a => ({
        ...emptyAction(), name: a.name, description: a.description,
      })),
      tokenImageUrl: m.tokenImage ?? '',
      ...({} as Partial<FormState>),
      bonusActions: [],
      reactions: [],
      legendaryActionCount: '3',
      savingThrows: {},
      skills: [],
      damageResistances: '',
      damageImmunities: '',
      damageVulnerabilities: '',
      conditionImmunities: [],
      armorNotes: '',
      description: '',
      subtype: '',
    })
    setShowForm(true)
    setEditingId(null)
  }

  async function handleSave() {
    if (!wallet || !form.name.trim()) return
    if (!form.ac || !form.hp) { setError('AC and HP are required'); return }
    setSaving(true)
    setError(null)

    const payload = formToPayload(form, wallet)
    const method = editingId ? 'PATCH' : 'POST'
    const body = editingId ? { ...payload, id: editingId } : payload

    const res = await fetch('/api/homebrew/monsters', {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(wallet ? { 'x-wallet-address': wallet.toLowerCase() } : {}),
      },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Save failed'); return }

    if (editingId) {
      setMonsters(prev => prev.map(m => m.id === editingId ? json.monster : m))
    } else {
      setMonsters(prev => [json.monster as HomebrewMonster, ...prev])
    }
    setForm(defaultForm())
    setEditingId(null)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (!wallet) return
    if (!window.confirm('Delete this homebrew monster?')) return
    const res = await fetch(`/api/homebrew/monsters?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-wallet-address': wallet.toLowerCase() },
    })
    if (res.ok) {
      setMonsters(prev => prev.filter(m => m.id !== id))
    }
  }

  async function handleAddToSession(monster: HomebrewMonster) {
    if (!wallet || !activeEncounterId) return
    setAddToSessionStatus('Placing token…')
    const { error } = await supabase.from('tokens').insert({
      encounter_id:         activeEncounterId,
      type:                 'monster',
      label:                monster.name.slice(0, 2).toUpperCase(),
      name:                 monster.name,
      hp:                   monster.hp ?? 10,
      current_hp:           monster.hp ?? 10,
      ac:                   monster.ac ?? 10,
      x:                    0,
      y:                    0,
      homebrew_monster_id:  monster.id,
      token_image_url:      monster.token_image_url ?? null,
      map_id:               activeMapId ?? null,
      resistances:          monster.damage_resistances
        ? monster.damage_resistances.split(',').map(s => s.trim().toLowerCase())
        : [],
      immunities: monster.damage_immunities
        ? monster.damage_immunities.split(',').map(s => s.trim().toLowerCase())
        : [],
      conditions: [],
    })
    if (error) {
      setAddToSessionStatus(`Error: ${error.message}`)
      setTimeout(() => setAddToSessionStatus(null), 4000)
    } else {
      setAddToSessionStatus(`✓ ${monster.name} added to session — go to the table to place it`)
      setTimeout(() => setAddToSessionStatus(null), 4000)
    }
  }

  // Filtered community list
  const filteredMonsters = useMemo(() => {
    return monsters.filter(m => {
      if (filterSearch && !m.name.toLowerCase().includes(filterSearch.toLowerCase())) return false
      if (filterType && m.type?.toLowerCase() !== filterType.toLowerCase()) return false
      if (filterCrMin && crToNum(m.cr) < crToNum(filterCrMin)) return false
      if (filterCrMax && crToNum(m.cr) > crToNum(filterCrMax)) return false
      return true
    })
  }, [monsters, filterSearch, filterType, filterCrMin, filterCrMax])

  const xp = CR_TO_XP[form.cr]
  const pb = pbForCr(form.cr)

  return (
    <div className="space-y-6">
      {/* Add to session status toast */}
      {addToSessionStatus && (
        <div className="rounded-lg border border-emerald-700/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-300">
          {addToSessionStatus}
        </div>
      )}

      {/* ── Create / Edit Form ─────────────────────────────────────────────── */}
      {wallet ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/80">
          {/* Form header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-200">
              {editingId ? 'Edit Monster' : 'Create Monster'}
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowImport(true)}
                className="rounded-lg border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-slate-500"
              >
                📥 Import from SRD
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(v => !v); if (editingId) { setEditingId(null); setForm(defaultForm()) } }}
                className="rounded-lg border border-slate-700 px-3 py-1 text-[11px] text-slate-300 hover:border-slate-500"
              >
                {showForm ? '▲ Hide Form' : '▼ Show Form'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-0">
              {/* Form fields */}
              <div className="p-4 space-y-6 min-w-0">

                {/* SECTION 1 — Basic Info */}
                <div>
                  <SectionHeader>1 — Basic Info</SectionHeader>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="col-span-2 sm:col-span-3">
                      <FieldLabel>Name *</FieldLabel>
                      <TInput value={form.name} onChange={v => setField('name', v)} placeholder="e.g. Shadow Drake" />
                    </div>
                    <div>
                      <FieldLabel>CR *</FieldLabel>
                      <TSelect value={form.cr} onChange={v => setField('cr', v)} options={CR_OPTIONS} placeholder="" />
                    </div>
                    <div>
                      <FieldLabel>XP (auto)</FieldLabel>
                      <TInput value={xp ? xp.toLocaleString() : '10'} onChange={() => {}} disabled />
                    </div>
                    <div>
                      <FieldLabel>Proficiency Bonus (auto)</FieldLabel>
                      <TInput value={`+${pb}`} onChange={() => {}} disabled />
                    </div>
                    <div>
                      <FieldLabel>Size</FieldLabel>
                      <TSelect value={form.size} onChange={v => setField('size', v)} options={SIZES} />
                    </div>
                    <div>
                      <FieldLabel>Type</FieldLabel>
                      <TSelect value={form.monsterType} onChange={v => setField('monsterType', v)} options={TYPES} />
                    </div>
                    <div>
                      <FieldLabel>Subtype</FieldLabel>
                      <TInput value={form.subtype} onChange={v => setField('subtype', v)} placeholder="e.g. goblinoid" />
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <FieldLabel>Alignment</FieldLabel>
                      <TSelect value={form.alignment} onChange={v => setField('alignment', v)} options={ALIGNMENTS} />
                    </div>
                  </div>
                </div>

                {/* SECTION 2 — Combat Stats */}
                <div>
                  <SectionHeader>2 — Combat Stats</SectionHeader>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <FieldLabel>AC *</FieldLabel>
                      <TInput value={form.ac} onChange={v => setField('ac', v)} type="number" placeholder="15" />
                    </div>
                    <div>
                      <FieldLabel>Armor notes</FieldLabel>
                      <TInput value={form.armorNotes} onChange={v => setField('armorNotes', v)} placeholder="natural armor" />
                    </div>
                    <div>
                      <FieldLabel>HP *</FieldLabel>
                      <TInput value={form.hp} onChange={v => setField('hp', v)} type="number" placeholder="52" />
                    </div>
                    <div>
                      <FieldLabel>Hit Dice</FieldLabel>
                      <TInput value={form.hitDice} onChange={v => setField('hitDice', v)} placeholder="5d8+10" />
                    </div>
                    <div className="col-span-2 sm:col-span-4">
                      <FieldLabel>Speed</FieldLabel>
                      <TInput value={form.speed} onChange={v => setField('speed', v)} placeholder="30 ft., fly 60 ft." />
                    </div>
                  </div>
                </div>

                {/* SECTION 3 — Ability Scores */}
                <div>
                  <SectionHeader>3 — Ability Scores</SectionHeader>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {ABILITY_KEYS.map(key => {
                      const score = parseInt(form.abilities[key]) || 10
                      const mod = Math.floor((score - 10) / 2)
                      return (
                        <div key={key} className="text-center">
                          <FieldLabel>{ABILITY_LABELS[key]}</FieldLabel>
                          <TInput
                            value={form.abilities[key]}
                            onChange={v => setAbility(key, v)}
                            type="number"
                            className="text-center"
                          />
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {mod >= 0 ? `+${mod}` : `${mod}`}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* SECTION 4 — Proficiencies & Traits */}
                <div>
                  <SectionHeader>4 — Proficiencies &amp; Traits</SectionHeader>

                  {/* Saving throws */}
                  <div className="mb-3">
                    <p className="mb-1.5 text-[11px] font-medium text-slate-400">Saving Throws (check = proficient)</p>
                    <div className="flex flex-wrap gap-2">
                      {(['str','dex','con','int_score','wis','cha'] as AbilityKey[]).map(key => {
                        const score = parseInt(form.abilities[key]) || 10
                        const mod = Math.floor((score - 10) / 2)
                        const total = mod + pb
                        const checked = !!form.savingThrows[key]
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleSave(key)}
                            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                              checked
                                ? 'border-yellow-600 bg-yellow-600/20 text-yellow-300'
                                : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500'
                            }`}
                          >
                            {ABILITY_LABELS[key]} {checked ? `+${total}` : modStr(score)}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="mb-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-[11px] font-medium text-slate-400">Skills</p>
                      <button type="button" onClick={addSkill} className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700">+ Add</button>
                    </div>
                    <div className="space-y-1.5">
                      {form.skills.map((s, i) => (
                        <div key={i} className="flex gap-2">
                          <div className="flex-1">
                            <TSelect value={s.name} onChange={v => updateSkill(i,'name',v)} options={SKILLS_LIST} placeholder="Select skill" />
                          </div>
                          <div className="w-24">
                            <TInput value={s.bonus} onChange={v => updateSkill(i,'bonus',v)} placeholder="+5" type="number" />
                          </div>
                          <button type="button" onClick={() => removeSkill(i)} className="text-slate-500 hover:text-red-400 text-sm px-1">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resistances / Immunities / Vulnerabilities */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
                    <div>
                      <FieldLabel>Damage Resistances</FieldLabel>
                      <TInput value={form.damageResistances} onChange={v => setField('damageResistances', v)} placeholder="fire, cold" />
                    </div>
                    <div>
                      <FieldLabel>Damage Immunities</FieldLabel>
                      <TInput value={form.damageImmunities} onChange={v => setField('damageImmunities', v)} placeholder="poison, necrotic" />
                    </div>
                    <div>
                      <FieldLabel>Damage Vulnerabilities</FieldLabel>
                      <TInput value={form.damageVulnerabilities} onChange={v => setField('damageVulnerabilities', v)} placeholder="thunder" />
                    </div>
                  </div>

                  {/* Condition immunities */}
                  <div className="mb-3">
                    <p className="mb-1.5 text-[11px] font-medium text-slate-400">Condition Immunities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CONDITIONS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCondition(c)}
                          className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                            form.conditionImmunities.includes(c)
                              ? 'border-red-600/60 bg-red-900/30 text-red-300'
                              : 'border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >{c}</button>
                      ))}
                    </div>
                  </div>

                  {/* Senses & Languages */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Senses</FieldLabel>
                      <TInput value={form.senses} onChange={v => setField('senses', v)} placeholder="Darkvision 60 ft., passive Perception 12" />
                    </div>
                    <div>
                      <FieldLabel>Languages</FieldLabel>
                      <TInput value={form.languages} onChange={v => setField('languages', v)} placeholder="Common, Goblin" />
                    </div>
                  </div>
                </div>

                {/* SECTION 5 — Special Traits */}
                <div>
                  <SectionHeader>5 — Special Traits</SectionHeader>
                  <div className="space-y-2">
                    {form.traits.map((t, i) => (
                      <div key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <FieldLabel>Trait Name</FieldLabel>
                            <TInput value={t.name} onChange={v => setForm(p => ({ ...p, traits: p.traits.map((x,xi) => xi===i?{...x,name:v}:x) }))} placeholder="Nimble Escape" />
                          </div>
                          <button type="button" onClick={() => setForm(p => ({ ...p, traits: p.traits.filter((_,xi)=>xi!==i) }))} className="mt-4 text-slate-500 hover:text-red-400 text-sm">✕</button>
                        </div>
                        <div>
                          <FieldLabel>Description</FieldLabel>
                          <TTextarea value={t.description} onChange={v => setForm(p => ({ ...p, traits: p.traits.map((x,xi) => xi===i?{...x,description:v}:x) }))} placeholder="The creature can…" rows={2} />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => setForm(p => ({ ...p, traits: [...p.traits, emptyTrait()] }))}
                      className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-700">
                      + Add Trait
                    </button>
                  </div>
                </div>

                {/* SECTION 6–8 — Actions */}
                <ActionEditor label="Actions" actions={form.actions} onChange={v => setField('actions', v)} />
                <ActionEditor label="Bonus Actions" actions={form.bonusActions} onChange={v => setField('bonusActions', v)} />
                <ActionEditor label="Reactions" actions={form.reactions} onChange={v => setField('reactions', v)} />

                {/* SECTION 9 — Legendary Actions */}
                <div>
                  <SectionHeader>9 — Legendary Actions</SectionHeader>
                  <div className="mb-3 flex items-center gap-3">
                    <FieldLabel>Legendary Actions per Round</FieldLabel>
                    <div className="w-20">
                      <TInput value={form.legendaryActionCount} onChange={v => setField('legendaryActionCount', v)} type="number" />
                    </div>
                  </div>
                  <ActionEditor label="Legendary Actions" actions={form.legendaryActions} onChange={v => setField('legendaryActions', v)} />
                </div>

                {/* SECTION 10 — Image & Flavor */}
                <div>
                  <SectionHeader>10 — Image &amp; Flavor</SectionHeader>
                  <div className="space-y-3">
                    <div>
                      <FieldLabel>Token Image URL</FieldLabel>
                      <TInput value={form.tokenImageUrl} onChange={v => setField('tokenImageUrl', v)} placeholder="https://…" />
                    </div>
                    <div>
                      <FieldLabel>Description / Lore</FieldLabel>
                      <TTextarea value={form.description} onChange={v => setField('description', v)} placeholder="GM-facing flavor text, lore notes…" rows={3} />
                    </div>
                  </div>
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !form.name.trim()}
                    className="rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : editingId ? 'Update Monster' : 'Save Monster'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={() => { setEditingId(null); setForm(defaultForm()); setShowForm(false) }}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500">
                      Cancel Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Live preview (right column on desktop) */}
              <div className="hidden lg:block border-l border-slate-800 p-4 overflow-y-auto max-h-[calc(100vh-200px)] sticky top-0">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Live Preview</p>
                <StatBlockPreview f={form} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="text-sm text-amber-400">Connect your wallet to create homebrew content.</p>
        </div>
      )}

      {/* Mobile preview (below form) */}
      {showForm && wallet && (
        <div className="lg:hidden rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Stat Block Preview</p>
          <StatBlockPreview f={form} />
        </div>
      )}

      {/* ── Community Monsters ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-200">
            Community Monsters <span className="text-slate-500">({filteredMonsters.length})</span>
          </h3>
          {activeEncounterId && (
            <span className="rounded-full border border-emerald-700/50 bg-emerald-900/20 px-2.5 py-0.5 text-[11px] text-emerald-400">
              ⚔ Session active — Add to Session available
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            className="h-8 flex-1 min-w-[160px] rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-yellow-500"
            placeholder="Search by name…"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
          />
          <select
            className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-yellow-500"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="h-8 w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-yellow-500"
            value={filterCrMin}
            onChange={e => setFilterCrMin(e.target.value)}
          >
            <option value="">CR min</option>
            {CR_OPTIONS.map(cr => <option key={cr} value={cr}>CR {cr}</option>)}
          </select>
          <select
            className="h-8 w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 text-sm text-slate-100 outline-none focus:border-yellow-500"
            value={filterCrMax}
            onChange={e => setFilterCrMax(e.target.value)}
          >
            <option value="">CR max</option>
            {CR_OPTIONS.map(cr => <option key={cr} value={cr}>CR {cr}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : filteredMonsters.length === 0 ? (
          <p className="text-xs text-slate-500">
            {monsters.length === 0 ? 'No homebrew monsters yet. Create one above!' : 'No monsters match your filters.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMonsters.map(m => (
              <MonsterCard
                key={m.id}
                monster={m}
                wallet={wallet}
                hasActiveSession={Boolean(activeEncounterId)}
                onEdit={() => { setForm(monsterToForm(m)); setEditingId(m.id); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                onDelete={() => handleDelete(m.id)}
                onAddToSession={() => handleAddToSession(m)}
              />
            ))}
          </div>
        )}
      </div>

      {/* SRD Import Modal */}
      {showImport && (
        <SrdImportModal onImport={importSrd} onClose={() => setShowImport(false)} />
      )}
    </div>
  )
}
