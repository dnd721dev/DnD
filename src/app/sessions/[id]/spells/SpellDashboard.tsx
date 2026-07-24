'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SRD_SPELLS, type SrdSpell } from '@/lib/srdspells'
import {
  buildSlotData,
  expendSlot,
  restoreSlot,
  initializeSpellSlots,
  type SpellSlotData,
} from '@/lib/spellSlots'
import {
  categorizeSpell,
  scaleDamageForSlot,
  scaleHealForSlot,
  scaleCantripDamage,
  getHealDice,
  isSpellcaster,
  getSpellcastingAbility,
  getCastingAbilityForSpell,
  profBonus,
  abilityModifier,
} from '@/lib/spellCategories'
import {
  longRestSlots,
  shortRestSlots,
  expendMysticArcanum,
} from '@/lib/spellSlots'
import { getDomainSpells, getMysticArcanumLevels } from '@/lib/spellcastingProgression'
import { hasRitualCasting } from '@/lib/invocations'
import { PartySlotsPanel } from '@/components/spells/PartySlotsPanel'

/**
 * Effect 1: Agonizing Blast — when a Warlock has this invocation, Eldritch
 * Blast adds CHA mod to each beam. Parses a damage string like "3d10" into
 * `count` and `die`, then appends `+count*chaMod` if positive.
 *
 * Examples:
 *   ("1d10", 4, true) -> "1d10+4"
 *   ("3d10", 4, true) -> "3d10+12"
 *   ("3d10", 0, true) -> "3d10"  (no bonus if mod is 0)
 *   ("3d10", 4, false) -> "3d10" (invocation not selected)
 */
function applyAgonizingBlast(damage: string, chaMod: number, hasAgonizingBlast: boolean): string {
  if (!hasAgonizingBlast || chaMod <= 0) return damage
  const m = damage.match(/^(\d+)(d\d+)(.*)$/)
  if (!m) return damage
  const count = parseInt(m[1], 10)
  const die = m[2]
  const rest = m[3] ?? ''
  const totalBonus = count * chaMod
  // If the damage already has a +N suffix, add to it
  const restNum = rest.match(/^([+-]\d+)(.*)$/)
  if (restNum) {
    const existing = parseInt(restNum[1], 10)
    const newBonus = existing + totalBonus
    const sign = newBonus >= 0 ? '+' : ''
    return `${count}${die}${sign}${newBonus}${restNum[2] ?? ''}`
  }
  return `${count}${die}+${totalBonus}${rest}`
}
import {
  getRacialResources,
  expendRacialResource,
  restoreRacialResource,
  type RacialResource,
} from '@/lib/racialResources'

// Heuristic: SRD doesn't tag spells with a "summon" category, so match on the
// common summon-spell naming patterns (Conjure X, Summon X, Find Familiar/Steed).
function isSummonSpell(spell: SrdSpell): boolean {
  return /^(conjure|summon)\b/i.test(spell.name) || /^find (familiar|steed|greater steed)$/i.test(spell.name)
}

// ── Types ──────────────────────────────────────────────────────────────────────

type CharRow = {
  id: string
  name: string
  level: number
  main_job: string | null
  subclass: string | null
  /** Wave 6K: multiclass — secondary class fields for per-spell casting ability */
  secondary_class: string | null
  secondary_subclass: string | null
  secondary_level: number | null
  race: string | null
  abilities: Record<string, number> | null
  spell_slots: Record<string, number> | null
  resource_state: Record<string, any> | null
  /** Wave 5: holds concentrating_on (spell name) + active_conditions array */
  action_state: Record<string, any> | null
  spells_prepared: string[] | null
  /** Cantrips + (for known-casters) all known spells live here, separate from
   *  spells_prepared which only holds prepared leveled spells. */
  spells_known: string[] | null
  spell_save_dc: number | null
  spell_attack_bonus: number | null
  hit_points_current: number | null
  hit_points_max: number | null
  /** Wave 3: Warlock Mystic Arcanum picks { "6": "Eyebite", "7": null, ... } */
  mystic_arcanum: Record<string, string | null> | null
  /** Wave 4: Warlock Eldritch Invocations (string[] of invocation keys) */
  warlock_invocations: string[] | null
  wallet_address: string
}

type Token = {
  id: string
  label: string
  type: string
  hp: number | null
  current_hp: number | null
  ac: number | null
  owner_wallet: string | null
  map_id: string | null
  hidden: boolean | null
  x: number | null
  y: number | null
}

type PendingRoll = {
  spellName: string
  result: number
  notation: string
  type: 'damage' | 'heal'
  targetTokenId: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtMod(n: number) {
  return n >= 0 ? `+${n}` : `${n}`
}

function hpPct(token: Token): number {
  // Audit Wave 3E: defensively coerce both values to finite positive numbers
  // before division. Old code could NaN-out the bar when both `hp` and
  // `current_hp` were null (rare but observed when a monster token shipped
  // without HP set), since `null ?? 1` is 1 but `null/null * 100` is NaN.
  const max = Math.max(1, Number(token.hp ?? token.current_hp ?? 1))
  const cur = Number(token.current_hp ?? max)
  if (!Number.isFinite(cur)) return 0
  return Math.round(Math.max(0, Math.min(100, (cur / max) * 100)))
}

function hpColor(pct: number) {
  if (pct >= 60) return 'bg-emerald-500'
  if (pct >= 30) return 'bg-amber-500'
  return 'bg-red-500'
}

// ── Spell-slot pip row ─────────────────────────────────────────────────────────

function SlotRow({
  level,
  data,
  onSpend,
  onRestore,
}: {
  level: string
  data: { max: number; used: number }
  onSpend: (level: string) => void
  onRestore: (level: string) => void
}) {
  const available = data.max - data.used
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 shrink-0 text-[10px] text-slate-500">L{level}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: data.max }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 w-2.5 rounded-full border transition-colors ${
              i < available
                ? 'border-violet-400/60 bg-violet-500/60'
                : 'border-slate-700 bg-slate-900'
            }`}
          />
        ))}
      </div>
      <span className="ml-auto text-[10px] tabular-nums text-slate-400">
        {available}/{data.max}
      </span>
      <button
        type="button"
        onClick={() => onSpend(level)}
        disabled={available === 0}
        className="rounded px-1 py-0.5 text-[9px] text-violet-300 bg-violet-900/30 hover:bg-violet-900/50 disabled:opacity-30 transition"
        title="Use slot"
      >
        Use
      </button>
      <button
        type="button"
        onClick={() => onRestore(level)}
        disabled={data.used === 0}
        className="rounded px-1 py-0.5 text-[9px] text-slate-400 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition"
        title="Restore slot"
      >
        +
      </button>
    </div>
  )
}

// ── Party health panel ─────────────────────────────────────────────────────────

function PartyHealthPanel({ tokens }: { tokens: Token[] }) {
  if (tokens.length === 0) return null
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Party HP
      </div>
      <div className="space-y-1.5">
        {tokens.map(t => {
          const pct = hpPct(t)
          const cur = t.current_hp ?? t.hp ?? 0
          const max = t.hp ?? cur
          return (
            <div key={t.id}>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span className="truncate max-w-[100px]">{t.label}</span>
                <span className="tabular-nums">{cur}/{max}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-800">
                <div
                  className={`h-1.5 rounded-full transition-all ${hpColor(pct)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Combat spell card ──────────────────────────────────────────────────────────

function CombatSpellCard({
  spell,
  slots,
  targets,
  spellAttackBonus,
  spellSaveDC,
  charLevel,
  isDomain,
  ritualEligible,
  agonizingBlast,
  chaMod,
  onRoll,
  onRitualCast,
  pending,
  onApply,
  onClearPending,
  onApplyExtra,
}: {
  spell: SrdSpell
  slots: SpellSlotData
  targets: Token[]
  spellAttackBonus: number
  spellSaveDC: number
  charLevel: number
  isDomain: boolean
  ritualEligible: boolean
  /** Effect 1: when true and spell is Eldritch Blast, add chaMod per beam */
  agonizingBlast: boolean
  /** Effect 1: CHA modifier to apply with Agonizing Blast */
  chaMod: number
  onRoll: (spell: SrdSpell, slotLevel: number, targetId: string, rollType: 'attack' | 'save' | 'damage') => void
  onRitualCast: (spell: SrdSpell, targetId: string) => void
  pending: PendingRoll | null
  onApply: () => void
  onClearPending: () => void
  /** Apply the same pending damage amount to additional targets beyond the
   *  primary one — for AOE / multi-target spells (Fireball, Magic Missile, …). */
  onApplyExtra: (tokenIds: string[], amount: number) => void
}) {
  const isCantrip = spell.level === 0
  const [selectedTarget, setSelectedTarget] = useState(targets[0]?.id ?? '')
  const [selectedSlot, setSelectedSlot] = useState(spell.level)
  // Multi-target spells (AOE saves, Magic Missile, Scorching Ray, …) — extra
  // targets checked here get the same pending damage applied alongside the
  // primary target when "Apply Dmg" is clicked.
  const isMultiTarget = /\bcreatures\b|\btargets\b|\beach\b/i.test(spell.targets ?? '') || /^(two|three|four|five)\b/i.test(spell.targets ?? '')
  const [extraTargets, setExtraTargets] = useState<Set<string>>(new Set())

  const slotsAtLevel = slots[String(selectedSlot)]
  const hasSlots = isCantrip || (slotsAtLevel ? slotsAtLevel.used < slotsAtLevel.max : false)

  // Magic audit section B: cantrip damage scales with character level (not slot level).
  // 5e cantrips gain extra dice at character levels 5, 11, and 17. Previously the dashboard
  // showed raw cantrip damage (e.g. Fire Bolt always rolled 1d10 regardless of level).
  const baseScaledDmg = isCantrip
    ? scaleCantripDamage(spell.damage ?? '1d6', charLevel)
    : scaleDamageForSlot(spell, selectedSlot)

  // Effect 1: Agonizing Blast adds CHA per beam to Eldritch Blast.
  const scaledDmg = (agonizingBlast && spell.name === 'Eldritch Blast')
    ? applyAgonizingBlast(baseScaledDmg, chaMod, true)
    : baseScaledDmg

  const isConc = spell.duration.toLowerCase().includes('concentration')
  const isBonusAction = spell.castingTime.toLowerCase().includes('bonus')
  const isRitual = spell.castingTime.toLowerCase().includes('ritual')
  const hasSave = !!spell.saveAbility
  const hasAtk = !!spell.attackRoll

  // Update default target when targets list changes
  useEffect(() => {
    if (targets.length > 0 && !targets.find(t => t.id === selectedTarget)) {
      setSelectedTarget(targets[0].id)
    }
  }, [targets, selectedTarget])

  return (
    <div
      className={`rounded-lg border p-3 transition-opacity ${
        !hasSlots && !isCantrip
          ? 'opacity-40 border-slate-800 bg-slate-900/30'
          : 'border-slate-700 bg-slate-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center flex-wrap gap-1 min-w-0">
          <span className="text-sm font-semibold text-slate-100 truncate">{spell.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCantrip ? 'bg-slate-800 text-slate-400' : 'bg-blue-950/60 text-blue-400'}`}>
            {isCantrip ? 'Cantrip' : `L${spell.level}`}
          </span>
          {isBonusAction && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400">BA</span>}
          {isConc && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400">Conc.</span>}
          {isRitual && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Ritual</span>}
          {isDomain && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/40 text-amber-300"
              title="Always prepared — domain/oath/circle spell"
            >
              Domain
            </span>
          )}
        </div>

        {/* Upcast selector */}
        {!isCantrip && Object.keys(slots).some(l => parseInt(l) >= spell.level) && (
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(parseInt(e.target.value))}
            className="shrink-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-blue-400"
          >
            {Object.entries(slots)
              .filter(([l]) => parseInt(l) >= spell.level)
              .map(([l, s]) => (
                <option key={l} value={l} disabled={s.used >= s.max}>
                  L{l} · {scaleDamageForSlot(spell, parseInt(l))}{s.used >= s.max ? ' ✗' : ''}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Dice + save info */}
      <div className="text-[10px] text-slate-500 mb-2.5">
        {hasSave ? `${spell.saveAbility!.toUpperCase()} save DC ${spellSaveDC}` : hasAtk ? `Spell attack ${fmtMod(spellAttackBonus)}` : 'No roll'}
        {scaledDmg && ` · ${scaledDmg}`}
        {spell.range ? ` · ${spell.range}` : ''}
      </div>

      {/* Target + buttons */}
      <div className="flex gap-1.5 items-center">
        <select
          value={selectedTarget}
          onChange={e => setSelectedTarget(e.target.value)}
          className="flex-1 min-w-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300"
        >
          {targets.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}{t.ac != null ? ` (AC ${t.ac})` : ''}
            </option>
          ))}
          {targets.length === 0 && <option value="">No tokens on map</option>}
        </select>

        {hasSave ? (
          <button
            type="button"
            onClick={() => onRoll(spell, selectedSlot, selectedTarget, 'save')}
            disabled={!hasSlots || !selectedTarget}
            className="shrink-0 text-[10px] px-2.5 py-1.5 bg-red-950/60 border border-red-500/30 text-red-400 rounded hover:bg-red-900/60 disabled:opacity-40 whitespace-nowrap"
          >
            DC {spellSaveDC}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRoll(spell, selectedSlot, selectedTarget, 'attack')}
            disabled={!hasSlots || !selectedTarget}
            className="shrink-0 text-[10px] px-2.5 py-1.5 bg-red-950/60 border border-red-500/30 text-red-400 rounded hover:bg-red-900/60 disabled:opacity-40 whitespace-nowrap"
          >
            Atk {fmtMod(spellAttackBonus)}
          </button>
        )}

        <button
          type="button"
          onClick={() => onRoll(spell, selectedSlot, selectedTarget, 'damage')}
          disabled={!selectedTarget}
          className="shrink-0 text-[10px] px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700 whitespace-nowrap"
        >
          {scaledDmg}
        </button>
      </div>

      {/* Multi-target: also apply the same damage to other tokens caught in the AOE / spread */}
      {isMultiTarget && targets.length > 1 && (
        <div className="mt-2 rounded border border-slate-800 bg-slate-950/50 p-1.5">
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">Also hit</p>
          <div className="flex flex-wrap gap-1.5">
            {targets.filter(t => t.id !== selectedTarget).map(t => {
              const checked = extraTargets.has(t.id)
              return (
                <label key={t.id} className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${checked ? 'bg-red-900/40 text-red-200' : 'bg-slate-800 text-slate-400'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setExtraTargets(prev => {
                        const next = new Set(prev)
                        if (next.has(t.id)) next.delete(t.id); else next.add(t.id)
                        return next
                      })
                    }}
                  />
                  {t.label}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Magic audit section G: ritual cast — skips slot cost, +10 min cast time.
          Only shown when the spell is a ritual AND the caster's class supports
          ritual casting (Bard / Cleric / Druid / Wizard in V1). */}
      {isRitual && ritualEligible && !isCantrip && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => onRitualCast(spell, selectedTarget)}
            disabled={!selectedTarget}
            className="w-full text-[10px] px-2 py-1.5 bg-indigo-950/40 border border-indigo-700/40 text-indigo-300 rounded hover:bg-indigo-900/50 disabled:opacity-40 whitespace-nowrap"
            title="Cast as a ritual: no slot consumed, but casting time +10 minutes"
          >
            ✦ Cast as Ritual <span className="text-indigo-500">(no slot, +10 min)</span>
          </button>
        </div>
      )}

      {/* Pending result */}
      {pending && (
        <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-300">
            {pending.notation} ={' '}
            <span className="text-white font-bold">{pending.result}</span>
            <span className="text-slate-500 ml-1">dmg</span>
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => {
                onApply()
                if (extraTargets.size > 0) onApplyExtra(Array.from(extraTargets), pending.result)
                setExtraTargets(new Set())
              }}
              className="text-[10px] px-2 py-1 bg-red-800/80 text-red-200 rounded hover:bg-red-700 whitespace-nowrap"
            >
              Apply Dmg{extraTargets.size > 0 ? ` (+${extraTargets.size})` : ''}
            </button>
            <button
              onClick={onClearPending}
              className="text-[10px] px-1.5 py-1 bg-slate-700 text-slate-400 rounded hover:bg-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Healing spell card ─────────────────────────────────────────────────────────

function HealingSpellCard({
  spell,
  slots,
  targets,
  spellAbilityMod,
  isDomain,
  ritualEligible,
  onRoll,
  onRitualCast,
  pending,
  onApply,
  onClearPending,
}: {
  spell: SrdSpell
  slots: SpellSlotData
  targets: Token[]
  spellAbilityMod: number
  isDomain: boolean
  ritualEligible: boolean
  onRoll: (spell: SrdSpell, slotLevel: number, targetId: string, rollType: 'heal') => void
  onRitualCast: (spell: SrdSpell, targetId: string) => void
  pending: PendingRoll | null
  onApply: () => void
  onClearPending: () => void
}) {
  const isCantrip = spell.level === 0
  const isRitual = spell.castingTime.toLowerCase().includes('ritual')
  // Sort targets lowest HP% first
  const sortedTargets = [...targets].sort((a, b) => hpPct(a) - hpPct(b))

  const [selectedTarget, setSelectedTarget] = useState(sortedTargets[0]?.id ?? '')
  const [selectedSlot, setSelectedSlot] = useState(spell.level)

  const slotsAtLevel = slots[String(selectedSlot)]
  const hasSlots = isCantrip || (slotsAtLevel ? slotsAtLevel.used < slotsAtLevel.max : false)

  const healDice = scaleHealForSlot(spell, selectedSlot)

  const isBonusAction = spell.castingTime.toLowerCase().includes('bonus')

  const targetToken = targets.find(t => t.id === selectedTarget)
  const potentialHeal = pending?.result ?? 0
  const curHP = targetToken?.current_hp ?? targetToken?.hp ?? 0
  const maxHP = targetToken?.hp ?? curHP
  const newHP = Math.min(maxHP, curHP + potentialHeal)
  const actualHeal = newHP - curHP

  useEffect(() => {
    if (sortedTargets.length > 0 && !sortedTargets.find(t => t.id === selectedTarget)) {
      setSelectedTarget(sortedTargets[0].id)
    }
  }, [sortedTargets, selectedTarget])

  return (
    <div
      className={`rounded-lg border p-3 transition-opacity ${
        !hasSlots && !isCantrip
          ? 'opacity-40 border-slate-800 bg-slate-900/30'
          : 'border-slate-700 bg-slate-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center flex-wrap gap-1 min-w-0">
          <span className="text-sm font-semibold text-slate-100 truncate">{spell.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCantrip ? 'bg-slate-800 text-slate-400' : 'bg-green-950/60 text-green-400'}`}>
            {isCantrip ? 'Cantrip' : `L${spell.level}`}
          </span>
          {isBonusAction && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400">BA</span>}
          {isRitual && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Ritual</span>}
          {isDomain && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/40 text-amber-300"
              title="Always prepared — domain/oath/circle spell"
            >
              Domain
            </span>
          )}
        </div>

        {/* Upcast selector */}
        {!isCantrip && Object.keys(slots).some(l => parseInt(l) >= spell.level) && (
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(parseInt(e.target.value))}
            className="shrink-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-green-400"
          >
            {Object.entries(slots)
              .filter(([l]) => parseInt(l) >= spell.level)
              .map(([l, s]) => (
                <option key={l} value={l} disabled={s.used >= s.max}>
                  L{l} · {scaleHealForSlot(spell, parseInt(l))}{s.used >= s.max ? ' ✗' : ''}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Info row */}
      <div className="text-[10px] text-slate-500 mb-2.5">
        {healDice}{spellAbilityMod !== 0 ? fmtMod(spellAbilityMod) : ''}
        {' '}healing · {spell.range?.toLowerCase().includes('touch') ? 'Touch' : spell.range}
        {isBonusAction ? ' · Bonus action' : ' · Action'}
      </div>

      {/* Target + Roll */}
      <div className="flex gap-1.5 items-center">
        <select
          value={selectedTarget}
          onChange={e => setSelectedTarget(e.target.value)}
          className="flex-1 min-w-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300"
        >
          {sortedTargets.map(t => {
            const pct = hpPct(t)
            return (
              <option key={t.id} value={t.id}>
                {pct < 30 ? '⚠ ' : ''}{t.label} — {t.current_hp ?? t.hp ?? 0}/{t.hp ?? '?'} HP
              </option>
            )
          })}
          {sortedTargets.length === 0 && <option value="">No party tokens</option>}
        </select>

        <button
          type="button"
          onClick={() => onRoll(spell, selectedSlot, selectedTarget, 'heal')}
          disabled={!hasSlots || !selectedTarget}
          className="shrink-0 text-[10px] px-2.5 py-1.5 bg-green-950/60 border border-green-500/30 text-green-400 rounded hover:bg-green-900/60 disabled:opacity-40 whitespace-nowrap"
        >
          {healDice}{spellAbilityMod !== 0 ? fmtMod(spellAbilityMod) : ''}
        </button>
      </div>

      {/* Magic audit section G: ritual cast for healing rituals.
          Rare in practice (Healing rituals are essentially nonexistent in SRD)
          but we surface it for completeness when one is present. */}
      {isRitual && ritualEligible && !isCantrip && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => onRitualCast(spell, selectedTarget)}
            disabled={!selectedTarget}
            className="w-full text-[10px] px-2 py-1.5 bg-indigo-950/40 border border-indigo-700/40 text-indigo-300 rounded hover:bg-indigo-900/50 disabled:opacity-40 whitespace-nowrap"
            title="Cast as a ritual: no slot consumed, but casting time +10 minutes"
          >
            ✦ Cast as Ritual <span className="text-indigo-500">(no slot, +10 min)</span>
          </button>
        </div>
      )}

      {/* Pending heal */}
      {pending && targetToken && (
        <div className="mt-2 p-2 bg-slate-800 rounded border border-slate-700 flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-300">
            {pending.notation} ={' '}
            <span className="text-green-400 font-bold">+{actualHeal} HP</span>
            <span className="text-slate-500 ml-1">({curHP} → {newHP})</span>
          </span>
          <div className="flex gap-1">
            <button
              onClick={onApply}
              className="text-[10px] px-2 py-1 bg-green-900/80 text-green-200 rounded hover:bg-green-800 whitespace-nowrap"
            >
              Apply to {targetToken.label}
            </button>
            <button
              onClick={onClearPending}
              className="text-[10px] px-1.5 py-1 bg-slate-700 text-slate-400 rounded hover:bg-slate-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Support / buff / control spell card ──────────────────────────────────────────
// For spells that aren't damage or healing (Guidance, Shield, Shield of Faith,
// Bless, Hold Person, …). Pure buffs get a "Cast" button (log + spend slot);
// save-based control spells reuse the normal save-roll handler.

function SupportSpellCard({
  spell,
  slots,
  targets,
  spellSaveDC,
  isDomain,
  onRoll,
  onSupportCast,
}: {
  spell: SrdSpell
  slots: SpellSlotData
  targets: Token[]
  spellSaveDC: number
  isDomain: boolean
  onRoll: (spell: SrdSpell, slotLevel: number, targetId: string, rollType: 'save') => void
  onSupportCast: (spell: SrdSpell, slotLevel: number, targetId: string) => void
}) {
  const isCantrip = spell.level === 0
  const [selectedTarget, setSelectedTarget] = useState(targets[0]?.id ?? '')
  const [selectedSlot, setSelectedSlot] = useState(spell.level)

  const slotsAtLevel = slots[String(selectedSlot)]
  const hasSlots = isCantrip || (slotsAtLevel ? slotsAtLevel.used < slotsAtLevel.max : false)

  const isConc = spell.duration.toLowerCase().includes('concentration')
  const isBonusAction = spell.castingTime.toLowerCase().includes('bonus')
  const isRitual = spell.castingTime.toLowerCase().includes('ritual')
  const hasSave = !!spell.saveAbility

  useEffect(() => {
    if (targets.length > 0 && !targets.find(t => t.id === selectedTarget)) {
      setSelectedTarget(targets[0].id)
    }
  }, [targets, selectedTarget])

  return (
    <div
      className={`rounded-lg border p-3 transition-opacity ${
        !hasSlots && !isCantrip
          ? 'opacity-40 border-slate-800 bg-slate-900/30'
          : 'border-slate-700 bg-slate-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center flex-wrap gap-1 min-w-0">
          <span className="text-sm font-semibold text-slate-100 truncate">{spell.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isCantrip ? 'bg-slate-800 text-slate-400' : 'bg-indigo-950/60 text-indigo-400'}`}>
            {isCantrip ? 'Cantrip' : `L${spell.level}`}
          </span>
          {isBonusAction && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400">BA</span>}
          {isConc && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-400">Conc.</span>}
          {isRitual && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">Ritual</span>}
          {isDomain && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/40 text-amber-300"
              title="Always prepared — domain/oath/circle spell"
            >
              Domain
            </span>
          )}
        </div>

        {/* Upcast selector (leveled spells) */}
        {!isCantrip && Object.keys(slots).some(l => parseInt(l) >= spell.level) && (
          <select
            value={selectedSlot}
            onChange={e => setSelectedSlot(parseInt(e.target.value))}
            className="shrink-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-indigo-400"
          >
            {Object.entries(slots)
              .filter(([l]) => parseInt(l) >= spell.level)
              .map(([l, s]) => (
                <option key={l} value={l} disabled={s.used >= s.max}>
                  L{l}{s.used >= s.max ? ' ✗' : ''}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* Info row */}
      <div className="text-[10px] text-slate-500 mb-2.5">
        {hasSave ? `${spell.saveAbility!.toUpperCase()} save DC ${spellSaveDC}` : 'Buff — no roll'}
        {spell.range ? ` · ${spell.range}` : ''}
        {spell.duration ? ` · ${spell.duration}` : ''}
      </div>

      {/* Target + action */}
      <div className="flex gap-1.5 items-center">
        <select
          value={selectedTarget}
          onChange={e => setSelectedTarget(e.target.value)}
          className="flex-1 min-w-0 text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-slate-300"
        >
          {targets.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}{t.ac != null ? ` (AC ${t.ac})` : ''}
            </option>
          ))}
          {targets.length === 0 && <option value="">No tokens on map</option>}
        </select>

        {hasSave ? (
          <button
            type="button"
            onClick={() => onRoll(spell, selectedSlot, selectedTarget, 'save')}
            disabled={!hasSlots || !selectedTarget}
            className="shrink-0 text-[10px] px-2.5 py-1.5 bg-red-950/60 border border-red-500/30 text-red-400 rounded hover:bg-red-900/60 disabled:opacity-40 whitespace-nowrap"
          >
            DC {spellSaveDC}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSupportCast(spell, selectedSlot, selectedTarget)}
            disabled={!hasSlots}
            className="shrink-0 text-[10px] px-2.5 py-1.5 bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 rounded hover:bg-indigo-900/60 disabled:opacity-40 whitespace-nowrap"
          >
            Cast
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function SpellDashboard({ sessionId }: { sessionId: string }) {
  const [myChar, setMyChar] = useState<CharRow | null>(null)
  const [slots, setSlots] = useState<SpellSlotData>({})
  const [tokens, setTokens] = useState<Token[]>([])
  const [encounterId, setEncounterId] = useState<string | null>(null)
  const [sessionTitle, setSessionTitle] = useState('')
  const [isGm, setIsGm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [pending, setPending] = useState<PendingRoll | null>(null)
  const [combatFilter, setCombatFilter] = useState<string>('all')
  const [healFilter, setHealFilter] = useState<string>('all')
  const [supportFilter, setSupportFilter] = useState<string>('all')

  const wallet = useMemo(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('dnd721_wallet')?.toLowerCase() ?? null
  }, [])

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!wallet) { setLoading(false); setError('Connect your wallet to use the spell dashboard.'); return }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, wallet])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Session + GM check
      const { data: session } = await supabase
        .from('sessions')
        .select('title, gm_wallet, current_map_id, campaign_id')
        .eq('id', sessionId)
        .maybeSingle()

      if (!session) { setError('Session not found.'); setLoading(false); return }
      setSessionTitle(session.title ?? 'Session')
      const gm = (session.gm_wallet ?? '').toLowerCase() === wallet
      setIsGm(gm)

      // A player may be pinned to a different map than the session default
      // (see TableClient's "Party Maps" override) — honor that per-player
      // override so targeting matches what the player actually sees.
      let effectiveMapId = (session as any).current_map_id ?? null
      if (!gm) {
        const { data: sp } = await supabase
          .from('session_players')
          .select('current_map_id')
          .eq('session_id', sessionId)
          .eq('wallet_address', wallet)
          .maybeSingle()
        if ((sp as any)?.current_map_id) effectiveMapId = (sp as any).current_map_id
      }

      // Encounter (tokens live here)
      const { data: enc } = await supabase
        .from('encounters')
        .select('id')
        .eq('session_id', sessionId)
        .limit(1)
        .maybeSingle()
      const eid = (enc as any)?.id ?? null
      setEncounterId(eid)

      // Tokens — scoped to the map the player is actually on (PC tokens with
      // map_id null are visible everywhere), and hidden tokens are excluded
      // for non-GM players so they can't target monsters they can't see.
      if (eid) {
        let q = supabase
          .from('tokens')
          .select('id, label, type, hp, current_hp, ac, owner_wallet, map_id, hidden, x, y')
          .eq('encounter_id', eid)
        if (effectiveMapId) q = (q as any).or(`map_id.eq.${effectiveMapId},map_id.is.null`)
        const { data: toks } = await q
        const visible = gm ? (toks ?? []) : (toks ?? []).filter((t: any) => !t.hidden)
        setTokens(visible as Token[])
      }

      // My character — resolve for THIS session, mirroring the table's logic,
      // so the dashboard always shows the character the player is actually
      // playing right now (not their most recently touched character):
      //   1. session_players.character_id — the session-scoped binding written
      //      by the join/invite flow.
      //   2. campaign_character_selections via the session's campaign — the
      //      "Campaign Character" pick the live table locks players to.
      //   3. token at this encounter whose owner_wallet matches.
      //   4. any character owned by the wallet (solo-testing fallback only).
      let charId: string | null = null

      const { data: spRow } = await supabase
        .from('session_players')
        .select('character_id')
        .eq('session_id', sessionId)
        .eq('wallet_address', wallet)
        .maybeSingle()
      charId = (spRow as any)?.character_id ?? null

      if (!charId && (session as any).campaign_id) {
        const { data: sel } = await supabase
          .from('campaign_character_selections')
          .select('character_id')
          .eq('campaign_id', (session as any).campaign_id)
          .eq('wallet_address', wallet)
          .maybeSingle()
        charId = (sel as any)?.character_id ?? null
      }

      if (!charId && eid) {
        const { data: tokForChar } = await supabase
          .from('tokens')
          .select('character_id')
          .eq('encounter_id', eid)
          .eq('owner_wallet', wallet)
          .not('character_id', 'is', null)
          .limit(1)
          .maybeSingle()
        charId = (tokForChar as any)?.character_id ?? null
      }

      if (!charId) {
        const { data: charByWallet } = await supabase
          .from('characters')
          .select('id, is_caya, updated_at')
          .eq('wallet_address', wallet)
          .order('is_caya', { ascending: false })
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        charId = (charByWallet as any)?.id ?? null
      }

      if (!charId) {
        // True observer / DM with no characters — no character to load.
        setLoading(false)
        return
      }

      const { data: char } = await supabase
        .from('characters')
        .select('id, name, level, main_job, subclass, secondary_class, secondary_subclass, secondary_level, race, abilities, spell_slots, resource_state, action_state, spells_prepared, spells_known, spell_save_dc, spell_attack_bonus, hit_points_current, hit_points_max, mystic_arcanum, warlock_invocations, wallet_address')
        .eq('id', charId)
        .maybeSingle()

      if (!char) { setLoading(false); return }
      setMyChar(char as CharRow)

      // Build or initialise spell slots
      let spellSlotsMax = (char as any).spell_slots as Record<string, number> | null
      if (!spellSlotsMax || Object.keys(spellSlotsMax).length === 0) {
        spellSlotsMax = initializeSpellSlots(char.main_job ?? '', char.level ?? 1)
        if (Object.keys(spellSlotsMax).length > 0) {
          await supabase
            .from('characters')
            .update({ spell_slots: spellSlotsMax })
            .eq('id', char.id)
        }
      }
      setSlots(buildSlotData(spellSlotsMax, (char as any).resource_state))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  // ── Realtime: slots + tokens ──────────────────────────────────────────────────
  useEffect(() => {
    if (!myChar?.id) return

    const charCh = supabase
      .channel(`spell-dash-char-${myChar.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'characters', filter: `id=eq.${myChar.id}` },
        (payload: any) => {
          const r = payload.new
          setSlots(buildSlotData(r.spell_slots, r.resource_state))
          // Wave 2 + 5: keep myChar.resource_state and action_state fresh so
          // racial counters AND concentration chip update via realtime.
          setMyChar(prev => prev ? {
            ...prev,
            resource_state: r.resource_state ?? {},
            action_state: r.action_state ?? {},
          } : prev)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(charCh) }
  }, [myChar?.id])

  useEffect(() => {
    if (!encounterId) return

    const tokCh = supabase
      .channel(`spell-dash-tokens-${encounterId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tokens', filter: `encounter_id=eq.${encounterId}` },
        (payload: any) => {
          setTokens(prev => prev.map(t => t.id === payload.new.id ? (payload.new as Token) : t))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(tokCh) }
  }, [encounterId])

  // ── Derived spell lists ───────────────────────────────────────────────────────
  // The castable list is the UNION of spells_prepared (prepared leveled spells)
  // and spells_known (cantrips for everyone + all known spells for known-casters
  // like Sorcerer/Bard/Warlock/Ranger). Reading only spells_prepared previously
  // hid every cantrip from the dashboard.
  const preparedNames = useMemo(
    () => new Set([...(myChar?.spells_prepared ?? []), ...(myChar?.spells_known ?? [])]),
    [myChar?.spells_prepared, myChar?.spells_known],
  )

  // Magic audit section C.3: tag domain/oath/circle spells in the dashboard
  // so players can see at a glance which spells are "always prepared" and
  // don't need to be re-prepared after a long rest.
  const domainSet = useMemo(() => {
    if (!myChar?.subclass) return new Set<string>()
    // Probe up to spell level 9; getDomainSpells caps at the data's own range.
    return new Set(getDomainSpells(myChar.subclass, 9))
  }, [myChar?.subclass])

  // Wave 2: racial innate spell daily-use resources (Tiefling Hellish Rebuke,
  // Drow Faerie Fire/Darkness, etc.). Stored counts live in resource_state.
  const racialResources: RacialResource[] = useMemo(() => {
    return getRacialResources(myChar?.race ?? null, myChar?.level ?? 1)
  }, [myChar?.race, myChar?.level])

  const racialUsed = useMemo(() => {
    const rs = myChar?.resource_state ?? {}
    const out: Record<string, number> = {}
    for (const r of racialResources) {
      out[r.key] = Number((rs as any)[r.key] ?? 0)
    }
    return out
  }, [racialResources, myChar?.resource_state])

  const handleRacialUse = useCallback(async (resource: RacialResource) => {
    if (!myChar) return
    await expendRacialResource(supabase, myChar.id, resource.key, resource.max)
    // Realtime subscription on characters will refresh resource_state shortly,
    // but optimistically nudge the local state via a re-fetch.
    const { data: row } = await supabase
      .from('characters')
      .select('resource_state')
      .eq('id', myChar.id)
      .maybeSingle()
    if (row && myChar) {
      setMyChar({ ...myChar, resource_state: (row as any).resource_state ?? {} })
    }
  }, [myChar])

  const handleRacialRestore = useCallback(async (resource: RacialResource) => {
    if (!myChar) return
    await restoreRacialResource(supabase, myChar.id, resource.key)
    const { data: row } = await supabase
      .from('characters')
      .select('resource_state')
      .eq('id', myChar.id)
      .maybeSingle()
    if (row && myChar) {
      setMyChar({ ...myChar, resource_state: (row as any).resource_state ?? {} })
    }
  }, [myChar])

  // Wave 3: Mystic Arcanum panel — Warlock 11+ has 1-per-day high-level spells
  // that bypass pact slots. Picks are stored on the character; usage in
  // resource_state.mystic_arcanum_used_<level>.
  const arcanumEntries = useMemo(() => {
    if (!myChar) return []
    const levels = getMysticArcanumLevels(myChar.main_job, myChar.level)
    const picks = myChar.mystic_arcanum ?? {}
    const rs = myChar.resource_state ?? {}
    return levels.map(lvl => {
      const spellName = picks[String(lvl)] ?? null
      const used = Number((rs as any)[`mystic_arcanum_used_${lvl}`] ?? 0)
      return { level: lvl, spellName, used }
    })
  }, [myChar])

  const handleArcanumCast = useCallback(async (arcanumLevel: number, spellName: string | null) => {
    if (!myChar || !spellName) return
    const ok = await expendMysticArcanum(supabase, myChar.id, arcanumLevel)
    if (!ok) return
    // Log the cast in session_rolls so the GM sees what happened.
    await supabase.from('session_rolls').insert({
      session_id: sessionId,
      roll_type: 'custom',
      label: `✦ ${myChar.name} casts ${spellName} (Mystic Arcanum, ${arcanumLevel}th-level)`,
      formula: '—',
      result_total: 0,
      roller_name: myChar.name,
      roller_wallet: wallet,
    })
    const { data: row } = await supabase
      .from('characters')
      .select('resource_state')
      .eq('id', myChar.id)
      .maybeSingle()
    if (row && myChar) {
      setMyChar({ ...myChar, resource_state: (row as any).resource_state ?? {} })
    }
  }, [myChar, sessionId, wallet])

  const preparedSpells = useMemo(
    () => SRD_SPELLS.filter(s => preparedNames.has(s.name)),
    [preparedNames],
  )

  const combatSpells = useMemo(
    () => preparedSpells.filter(s => categorizeSpell(s) === 'combat'),
    [preparedSpells],
  )

  const healingSpells = useMemo(
    () => preparedSpells.filter(s => categorizeSpell(s) === 'healing'),
    [preparedSpells],
  )

  // Support / buff / control spells — everything that isn't damage or healing
  // (Guidance, Shield, Shield of Faith, Bless, Hold Person, …). Previously these
  // categorized as 'utility' and were never rendered anywhere.
  const supportSpells = useMemo(
    () => preparedSpells.filter(s => categorizeSpell(s) === 'utility'),
    [preparedSpells],
  )

  const filteredCombat = useMemo(
    () => combatFilter === 'all' ? combatSpells : combatSpells.filter(s => String(s.level) === combatFilter),
    [combatSpells, combatFilter],
  )

  const filteredHeal = useMemo(
    () => healFilter === 'all' ? healingSpells : healingSpells.filter(s => String(s.level) === healFilter),
    [healingSpells, healFilter],
  )

  const filteredSupport = useMemo(
    () => supportFilter === 'all' ? supportSpells : supportSpells.filter(s => String(s.level) === supportFilter),
    [supportSpells, supportFilter],
  )

  // ── Derived caster stats ──────────────────────────────────────────────────────
  // Wave 6K: single-class default values (primary class's ability). Multiclass
  // characters compute per-spell values via getSpellStats(spell) below.
  const { spellAttackBonus, spellSaveDC, spellAbilityMod } = useMemo(() => {
    if (!myChar?.abilities || !myChar.main_job) {
      return { spellAttackBonus: 0, spellSaveDC: 8, spellAbilityMod: 0 }
    }
    const abilKey = getSpellcastingAbility(myChar.main_job)
    const score = Number((myChar.abilities as any)?.[abilKey] ?? 10)
    const mod = abilityModifier(score)
    const pb = profBonus(myChar.level ?? 1)
    // Prefer server-computed values if present
    const atk = myChar.spell_attack_bonus ?? (mod + pb)
    const dc = myChar.spell_save_dc ?? (8 + mod + pb)
    return { spellAttackBonus: atk, spellSaveDC: dc, spellAbilityMod: mod }
  }, [myChar])

  /**
   * Wave 6K — per-spell DC / attack / ability mod. For single-class
   * characters this just returns the derived defaults. Multiclass characters
   * use each spell's own class ability (WIS for Cleric spells, INT for
   * Wizard spells, etc.).
   *
   * Total proficiency bonus is always based on TOTAL character level
   * (level + secondary_level).
   */
  const getSpellStats = useCallback((spell: SrdSpell): {
    dc: number, attackBonus: number, mod: number
  } => {
    if (!myChar?.abilities || !myChar.main_job) {
      return { dc: spellSaveDC, attackBonus: spellAttackBonus, mod: spellAbilityMod }
    }
    const isMulticlass = !!myChar.secondary_class && (myChar.secondary_level ?? 0) > 0
    if (!isMulticlass) {
      return { dc: spellSaveDC, attackBonus: spellAttackBonus, mod: spellAbilityMod }
    }
    const abilKey = getCastingAbilityForSpell({
      primaryClass: myChar.main_job,
      secondaryClass: myChar.secondary_class,
      primarySubclass: myChar.subclass,
      secondarySubclass: myChar.secondary_subclass,
      abilities: myChar.abilities as any,
    }, spell)
    const score = Number((myChar.abilities as any)?.[abilKey] ?? 10)
    const mod = abilityModifier(score)
    const totalLevel = (myChar.level ?? 1) + (myChar.secondary_level ?? 0)
    const pb = profBonus(totalLevel)
    return { dc: 8 + pb + mod, attackBonus: pb + mod, mod }
  }, [myChar, spellSaveDC, spellAttackBonus, spellAbilityMod])

  // PC tokens for healing, all tokens for combat
  const pcTokens = useMemo(() => tokens.filter(t => t.type === 'pc'), [tokens])
  // Combat targets = every token EXCEPT the caster's own (you don't target
  // yourself with attack/save offensive spells). Matched by owner_wallet.
  const allTargets = useMemo(
    () => tokens.filter(t => !(wallet && t.owner_wallet?.toLowerCase() === wallet)),
    [tokens, wallet],
  )
  const myToken = useMemo(
    () => tokens.find(t => wallet && t.owner_wallet?.toLowerCase() === wallet) ?? null,
    [tokens, wallet],
  )
  // Self-only buffs (Blade Ward, Shield, Mage Armor, …) target the caster's
  // own token, which allTargets deliberately excludes — bug: self-targeting
  // support spells had no valid option in the target dropdown.
  const supportTargetsFor = useCallback((spell: SrdSpell) => {
    const isSelfOnly = spell.range?.toLowerCase() === 'self' || spell.targets?.toLowerCase().includes('self')
    if (isSelfOnly) return myToken ? [myToken] : []
    return allTargets
  }, [allTargets, myToken])

  // ── Wave 5: Concentration tracking ───────────────────────────────────────
  // Declared BEFORE handleRoll so the useCallback dep array can reference
  // requireConcentrationConfirmation without hitting "used before declaration"
  // under Next.js's strict build (tsc --noEmit alone permits this).
  //
  // The currently-concentrated spell is stored in action_state.concentrating_on.
  // Casting a new concentration spell auto-drops the previous one. The chip
  // in the sidebar lets the player release manually.
  const concentratingOn: string | null = useMemo(() => {
    const v = myChar?.action_state?.concentrating_on
    return typeof v === 'string' && v.length > 0 ? v : null
  }, [myChar?.action_state])

  /**
   * Set or clear the concentration target on the character. Also keeps
   * active_conditions in sync so the existing condition UI shows the badge.
   */
  const setConcentration = useCallback(async (spellName: string | null) => {
    if (!myChar) return
    const { data: row } = await supabase
      .from('characters')
      .select('action_state')
      .eq('id', myChar.id)
      .maybeSingle()
    const current = ((row as any)?.action_state ?? {}) as Record<string, any>
    const activeConditions: string[] = Array.isArray(current.active_conditions) ? current.active_conditions : []
    const nextConditions = spellName
      ? Array.from(new Set([...activeConditions, 'concentration']))
      : activeConditions.filter(c => c !== 'concentration')
    const next = {
      ...current,
      concentrating_on: spellName,
      active_conditions: nextConditions,
    }
    await supabase
      .from('characters')
      .update({ action_state: next })
      .eq('id', myChar.id)
    setMyChar(prev => prev ? { ...prev, action_state: next } : prev)
  }, [myChar])

  /**
   * Called whenever the player initiates a cast (any of attack/save/damage/heal/
   * ritual). If the spell is a concentration spell and there's an existing
   * concentration, confirm the drop. Returns true to proceed, false to cancel.
   */
  const requireConcentrationConfirmation = useCallback((spell: SrdSpell): boolean => {
    const isConc = spell.duration.toLowerCase().includes('concentration')
    if (!isConc) return true
    if (concentratingOn && concentratingOn !== spell.name) {
      const ok = window.confirm(
        `You're already concentrating on ${concentratingOn}. Casting ${spell.name} will drop it. Continue?`,
      )
      if (!ok) return false
    }
    void setConcentration(spell.name)
    return true
  }, [concentratingOn, setConcentration])

  // Effect 1: Agonizing Blast — Warlock invocation that adds CHA mod to each
  // Eldritch Blast beam. Declared BEFORE handleRoll for the same TDZ reason
  // as requireConcentrationConfirmation above.
  const hasAgonizingBlast = useMemo(() => {
    const invs = (myChar?.warlock_invocations ?? []) as string[]
    return invs.includes('agonizing_blast')
  }, [myChar?.warlock_invocations])

  const chaMod = useMemo(() => {
    const score = Number((myChar?.abilities as any)?.cha ?? 10)
    return abilityModifier(score)
  }, [myChar?.abilities])

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleRoll = useCallback(async (
    spell: SrdSpell,
    slotLevel: number,
    targetId: string,
    rollType: 'attack' | 'save' | 'damage' | 'heal',
  ) => {
    if (!myChar) return
    // Wave 5: concentration auto-drop check. Skip for damage-only rolls so the
    // caster can iterate damage without re-rolling concentration prompts.
    if (rollType !== 'damage' && !requireConcentrationConfirmation(spell)) return

    let notation: string
    let label: string

    // Wave 6K: per-spell stats for multiclass characters.
    const stats = getSpellStats(spell)

    switch (rollType) {
      case 'attack':
        notation = `1d20${stats.attackBonus >= 0 ? '+' : ''}${stats.attackBonus}`
        label = `${spell.name} — Spell Attack`
        break
      case 'save':
        notation = '1d20'
        label = `${spell.name} — ${spell.saveAbility?.toUpperCase()} Save DC ${stats.dc}`
        break
      case 'damage': {
        // Magic audit section B: cantrip damage scales with character level, not slot level.
        // Toll the Dead: 1d12 (scaled) instead of 1d8 if the target is missing any HP.
        const targetToken = tokens.find(t => t.id === targetId)
        const targetIsDamaged = !!targetToken
          && targetToken.hp != null
          && (targetToken.current_hp ?? targetToken.hp) < targetToken.hp
        const cantripDamage = (spell.name === 'Toll the Dead' && targetIsDamaged)
          ? (spell.damage ?? '1d8').replace('d8', 'd12')
          : (spell.damage ?? '1d6')
        const baseDmg = spell.level === 0
          ? scaleCantripDamage(cantripDamage, myChar.level ?? 1)
          : scaleDamageForSlot(spell, slotLevel)
        // Effect 1: Agonizing Blast adds CHA per beam to Eldritch Blast.
        notation = (hasAgonizingBlast && spell.name === 'Eldritch Blast')
          ? applyAgonizingBlast(baseDmg, chaMod, true)
          : baseDmg
        label = `${spell.name} — Damage (L${slotLevel})`
        break
      }
      case 'heal': {
        const healDice = scaleHealForSlot(spell, slotLevel)
        const mod = stats.mod
        notation = mod !== 0 ? `${healDice}${mod >= 0 ? '+' : ''}${mod}` : healDice
        label = `${spell.name} — Healing (L${slotLevel})`
        break
      }
    }

    // POST to /api/roll
    const res = await fetch('/api/roll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notation,
        rollType: rollType === 'heal' ? 'custom' : rollType === 'damage' ? 'damage' : rollType,
        label,
        characterId: myChar.id,
        targetTokenId: targetId || undefined,
        sessionId,
        rollerName: myChar.name,
        rollerWallet: wallet ?? undefined,
      }),
    })

    if (!res.ok) {
      console.error('[SpellDashboard] roll API error', await res.text())
      return
    }

    const data = await res.json()

    // Damage or heal → store as pending, wait for Apply
    if (rollType === 'damage' || rollType === 'heal') {
      setPending({
        spellName: spell.name,
        result: data.total ?? 0,
        notation,
        type: rollType === 'heal' ? 'heal' : 'damage',
        targetTokenId: targetId,
      })
    }

    // Expend slot on attack/save/heal rolls (not on free damage-only rolls)
    if ((rollType === 'attack' || rollType === 'save' || rollType === 'heal') && spell.level > 0) {
      const newSlots = await expendSlot(supabase, myChar.id, slotLevel)
      if (newSlots) setSlots(newSlots)
    }
  }, [myChar, sessionId, wallet, requireConcentrationConfirmation, getSpellStats, hasAgonizingBlast, chaMod])

  // Cast a pure support/buff spell (Guidance, Shield, Shield of Faith, Bless, …):
  // no damage/heal roll — log the cast and spend a slot (cantrips are free).
  const handleSupportCast = useCallback(async (
    spell: SrdSpell,
    slotLevel: number,
    targetId: string,
  ) => {
    if (!myChar) return
    // Concentration tracking (Bless / Shield of Faith / Guidance are concentration).
    if (!requireConcentrationConfirmation(spell)) return

    const targetLabel = tokens.find(t => t.id === targetId)?.label
    const label = targetLabel
      ? `✦ ${myChar.name} casts ${spell.name} on ${targetLabel}`
      : `✦ ${myChar.name} casts ${spell.name}`

    await supabase.from('session_rolls').insert({
      session_id: sessionId,
      roll_type: 'custom',
      label,
      formula: '—',
      result_total: 0,
      roller_name: myChar.name,
      roller_wallet: wallet,
    })

    // Cantrips (Guidance) cost no slot; leveled buffs spend the chosen slot.
    if (spell.level > 0) {
      const newSlots = await expendSlot(supabase, myChar.id, slotLevel)
      if (newSlots) setSlots(newSlots)
    }

    // Summon spells: spawn a token next to the caster and drop it into
    // initiative right after the caster's turn.
    if (isSummonSpell(spell) && encounterId) {
      await summonTokenForSpell(spell)
    }
  }, [myChar, sessionId, wallet, tokens, requireConcentrationConfirmation, encounterId])

  const summonTokenForSpell = useCallback(async (spell: SrdSpell) => {
    if (!myChar || !encounterId) return
    const myToken = tokens.find(t => t.owner_wallet?.toLowerCase() === wallet)

    const { data: newTok, error: tokErr } = await supabase
      .from('tokens')
      .insert({
        encounter_id: encounterId,
        map_id: myToken?.map_id ?? null,
        label: `${spell.name} (Summon)`,
        type: 'npc',
        x: (myToken?.x ?? 0) + 40,
        y: (myToken?.y ?? 0) + 40,
        hp: 10,
        current_hp: 10,
        ac: 12,
        owner_wallet: wallet,
        character_id: null,
      })
      .select('id, label, hp')
      .maybeSingle()

    if (tokErr || !newTok) {
      console.error('[SpellDashboard] summon token create failed', tokErr)
      return
    }

    // Find the caster's initiative entry so the summon can share its init —
    // ties break by created_at ascending, so inserting now naturally places
    // the summon immediately after the caster in turn order.
    const { data: casterEntry } = await supabase
      .from('initiative_entries')
      .select('init')
      .eq('encounter_id', encounterId)
      .eq('character_id', myChar.id)
      .maybeSingle()

    await supabase.from('initiative_entries').insert({
      encounter_id: encounterId,
      character_id: null,
      token_id: (newTok as any).id,
      name: (newTok as any).label,
      init: (casterEntry as any)?.init ?? 10,
      hp: (newTok as any).hp,
      is_pc: false,
      wallet_address: wallet,
    })
  }, [myChar, encounterId, tokens, wallet])

  const handleApply = useCallback(async () => {
    if (!pending) return
    const token = tokens.find(t => t.id === pending.targetTokenId)
    if (!token) { setPending(null); return }

    const cur = token.current_hp ?? token.hp ?? 0
    const max = token.hp ?? cur

    const newHp = pending.type === 'heal'
      ? Math.min(max, cur + pending.result)
      : Math.max(0, cur - pending.result)

    // Apply through the canonical RPC so the token row, the linked character's
    // hit_points_current, AND the initiative entry all stay in sync. p_amount is
    // damage (positive); healing flips the sign. Fall back to a direct token
    // write only if the RPC is unavailable.
    const effectiveDelta = newHp - cur // negative = damage, positive = heal
    const { error: rpcErr } = await supabase.rpc('apply_combat_damage', {
      p_token_id: token.id,
      p_amount: -effectiveDelta,
    })
    if (rpcErr) {
      console.error('[SpellDashboard] apply_combat_damage failed, falling back', rpcErr)
      await supabase.from('tokens').update({ current_hp: newHp }).eq('id', token.id)
    }

    // Defeat message
    if (pending.type === 'damage' && newHp === 0) {
      await supabase
        .from('session_rolls')
        .insert({
          session_id: sessionId,
          roll_type: 'custom',
          label: `💀 ${token.label} has been defeated!`,
          formula: '0',
          result_total: 0,
          roller_name: myChar?.name ?? 'System',
          roller_wallet: wallet,
        })
        .then(() => {})
    }

    // Wave 5: when damage lands on a PC token whose character is concentrating,
    // roll the CON concentration save and post the result. If the save fails,
    // clear the target's concentration state.
    if (pending.type === 'damage' && pending.result > 0 && token.owner_wallet) {
      try {
        const { data: tokenRow } = await supabase
          .from('tokens')
          .select('character_id')
          .eq('id', token.id)
          .maybeSingle()
        const targetCharId = (tokenRow as any)?.character_id
        if (targetCharId) {
          const { data: targetChar } = await supabase
            .from('characters')
            .select('name, level, abilities, saving_throw_profs, action_state')
            .eq('id', targetCharId)
            .maybeSingle()
          const targetActionState = (targetChar as any)?.action_state ?? {}
          const targetConcSpell: string | null = typeof targetActionState.concentrating_on === 'string'
            ? targetActionState.concentrating_on
            : null
          if (targetChar && targetConcSpell) {
            const dc = Math.max(10, Math.floor(pending.result / 2))
            const con = Number((targetChar as any).abilities?.con ?? 10)
            const baseMod = Math.floor((con - 10) / 2)
            const targetLevel = Number((targetChar as any).level ?? 1)
            const targetPB = Math.floor((targetLevel - 1) / 4) + 2
            const hasConProf = Array.isArray((targetChar as any).saving_throw_profs)
              && (targetChar as any).saving_throw_profs.includes('con')
            const totalMod = baseMod + (hasConProf ? targetPB : 0)
            const sign = totalMod >= 0 ? '+' : ''
            // Roll through /api/roll so the concentration save is a real logged
            // roll (and shows the 3D dice for watchers) instead of a silent
            // Math.random. /api/roll persists to session_rolls itself.
            let total: number
            try {
              const sres = await fetch('/api/roll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  notation: `1d20${sign}${totalMod}`,
                  rollType: 'save',
                  label: `Concentration Save — ${(targetChar as any).name} (${targetConcSpell}) DC ${dc}`,
                  sessionId,
                  rollerName: (targetChar as any).name,
                  rollerWallet: token.owner_wallet ?? undefined,
                }),
              })
              total = sres.ok ? Number((await sres.json()).total ?? 0) : (Math.floor(Math.random() * 20) + 1) + totalMod
            } catch {
              total = (Math.floor(Math.random() * 20) + 1) + totalMod
            }
            const maintained = total >= dc
            if (!maintained) {
              const nextConditions: string[] = Array.isArray(targetActionState.active_conditions)
                ? targetActionState.active_conditions.filter((c: string) => c !== 'concentration')
                : []
              await supabase
                .from('characters')
                .update({
                  action_state: {
                    ...targetActionState,
                    concentrating_on: null,
                    active_conditions: nextConditions,
                  },
                })
                .eq('id', targetCharId)
            }
          }
        }
      } catch (err) {
        console.error('[SpellDashboard] concentration save trigger failed', err)
      }
    }

    setPending(null)
  }, [pending, tokens, sessionId, myChar, wallet])

  // Multi-target: apply the same rolled damage amount to a batch of extra
  // tokens caught in an AOE / multi-beam spell (Fireball, Magic Missile, …).
  const handleApplyExtra = useCallback(async (tokenIds: string[], amount: number) => {
    for (const id of tokenIds) {
      const { error } = await supabase.rpc('apply_combat_damage', { p_token_id: id, p_amount: amount })
      if (error) {
        console.error('[SpellDashboard] apply_combat_damage (extra target) failed', error)
        const token = tokens.find(t => t.id === id)
        if (token) {
          const cur = token.current_hp ?? token.hp ?? 0
          await supabase.from('tokens').update({ current_hp: Math.max(0, cur - amount) }).eq('id', id)
        }
      }
    }
  }, [tokens])

  const handleSpend = useCallback(async (level: string) => {
    if (!myChar) return
    const newSlots = await expendSlot(supabase, myChar.id, parseInt(level))
    if (newSlots) setSlots(newSlots)
  }, [myChar])

  const handleRestore = useCallback(async (level: string) => {
    if (!myChar) return
    const newSlots = await restoreSlot(supabase, myChar.id, parseInt(level))
    if (newSlots) setSlots(newSlots)
  }, [myChar])

  // Magic audit section E: long-rest restores all spell slots.
  const handleLongRest = useCallback(async () => {
    if (!myChar) return
    if (!window.confirm('Take a long rest? All spell slots will be restored.')) return
    await longRestSlots(supabase, myChar.id)
    // Re-fetch the slot data after the rest
    const { data: row } = await supabase
      .from('characters')
      .select('spell_slots, resource_state')
      .eq('id', myChar.id)
      .maybeSingle()
    if (row) setSlots(buildSlotData((row as any).spell_slots, (row as any).resource_state))
  }, [myChar])

  // Short rest only restores Warlock pact slots in V1.
  const handleShortRest = useCallback(async () => {
    if (!myChar) return
    if (!window.confirm('Take a short rest? Warlocks regain pact slots; other classes regain nothing here.')) return
    const newSlots = await shortRestSlots(supabase, myChar.id)
    if (newSlots) setSlots(newSlots)
  }, [myChar])

  // Magic audit section G: ritual cast — apply spell effect without expending a slot.
  // The handler posts a "cast" log entry and, when the spell does damage/heal,
  // rolls and queues a pending apply just like a normal cast. The only difference
  // is the slot is NOT spent.
  const handleRitualCast = useCallback(async (spell: SrdSpell, targetId: string) => {
    if (!myChar) return
    // Wave 5: ritual casts of concentration spells still trigger auto-drop.
    if (!requireConcentrationConfirmation(spell)) return
    const category = categorizeSpell(spell)
    let notation: string
    let label: string
    if (category === 'healing') {
      const healDice = scaleHealForSlot(spell, spell.level)
      const mod = spellAbilityMod
      notation = mod !== 0 ? `${healDice}${mod >= 0 ? '+' : ''}${mod}` : healDice
      label = `${spell.name} — Ritual Healing (+10 min)`
    } else if (spell.damage) {
      notation = scaleDamageForSlot(spell, spell.level)
      label = `${spell.name} — Ritual Cast (+10 min)`
    } else {
      // Utility ritual (Detect Magic, Identify, etc.) — log the cast, no roll.
      await supabase.from('session_rolls').insert({
        session_id: sessionId,
        roll_type: 'custom',
        label: `✦ ${myChar.name} casts ${spell.name} as a ritual (+10 min, no slot)`,
        formula: '—',
        result_total: 0,
        roller_name: myChar.name,
        roller_wallet: wallet,
      })
      return
    }

    const res = await fetch('/api/roll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notation,
        rollType: category === 'healing' ? 'custom' : 'damage',
        label,
        characterId: myChar.id,
        targetTokenId: targetId || undefined,
        sessionId,
        rollerName: myChar.name,
        rollerWallet: wallet ?? undefined,
      }),
    })
    if (!res.ok) return
    const data = await res.json()
    setPending({
      spellName: spell.name,
      result: data.total ?? 0,
      notation,
      type: category === 'healing' ? 'heal' : 'damage',
      targetTokenId: targetId,
    })
    // Slot deliberately NOT expended — that's the whole point of ritual.
  }, [myChar, spellAbilityMod, sessionId, wallet, requireConcentrationConfirmation])

  // Magic audit section G: ritual casting requires class proficiency.
  // 5e classes with ritual casting: Bard, Cleric, Druid, Wizard. Wave 4 adds
  // Warlocks who have the Book of Ancient Secrets invocation.
  const ritualEligible = useMemo(() => {
    const cls = (myChar?.main_job ?? '').toLowerCase().trim()
    if (cls === 'bard' || cls === 'cleric' || cls === 'druid' || cls === 'wizard') return true
    if (cls === 'warlock' && hasRitualCasting(myChar?.warlock_invocations ?? null)) return true
    return false
  }, [myChar?.main_job, myChar?.warlock_invocations])

  // ── Render: loading / error ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-slate-400 text-sm animate-pulse">Loading spell dashboard…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    )
  }

  // Non-caster who reached the route directly (the table button is hidden for
  // them). The GM keeps access for the party-slots view even without a caster.
  const charIsCaster = !!myChar && (isSpellcaster(myChar.main_job) || isSpellcaster(myChar.secondary_class))
  if (myChar && !charIsCaster && !isGm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-center">
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-slate-200">{myChar.name} isn’t a spellcaster.</p>
          <p className="mt-1 text-[12px] text-slate-500">
            The spell dashboard is only for characters with spellcasting. Head back to the table.
          </p>
        </div>
      </div>
    )
  }

  const slotLevels = Object.keys(slots).sort()

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-slate-200">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-amber-400">✦ Spell Dashboard</span>
          <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
            {sessionTitle}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span>Live</span>
          </div>
          {myChar && (
            <span>
              {myChar.name} · {myChar.main_job} {myChar.level}
            </span>
          )}
        </div>
      </header>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: spell slots + party HP + DM view */}
        <aside className="w-52 shrink-0 flex flex-col gap-4 overflow-y-auto border-r border-slate-800 bg-slate-950 p-3">

          {/* Spell slots */}
          {slotLevels.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Spell Slots
              </div>
              <div className="space-y-1.5">
                {slotLevels.map(lvl => (
                  <SlotRow
                    key={lvl}
                    level={lvl}
                    data={slots[lvl]}
                    onSpend={handleSpend}
                    onRestore={handleRestore}
                  />
                ))}
              </div>

              {/* Magic audit section E: Long Rest + Short Rest controls.
                  Long rest zeros every spell_slot_used_*. Short rest only
                  restores Warlock pact slots (see shortRestSlots helper). */}
              {myChar && (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={handleLongRest}
                    className="rounded border border-violet-700/40 bg-violet-950/40 px-2 py-1.5 text-[10px] text-violet-300 hover:bg-violet-900/50 transition"
                    title="Long Rest — restore all spell slots"
                  >
                    🌙 Long Rest
                  </button>
                  <button
                    type="button"
                    onClick={handleShortRest}
                    className="rounded border border-amber-700/40 bg-amber-950/40 px-2 py-1.5 text-[10px] text-amber-300 hover:bg-amber-900/50 transition"
                    title="Short Rest — Warlock pact slots only"
                  >
                    ☀ Short Rest
                  </button>
                </div>
              )}
            </div>
          )}

          {!myChar && !isGm && (
            <div className="text-[11px] text-slate-500 italic">
              No character linked to this session.
            </div>
          )}

          {/* Wave 5: Concentration chip — current concentration spell with drop button. */}
          {concentratingOn && (
            <div className="rounded border border-amber-700/40 bg-amber-950/30 px-2 py-1.5 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-amber-500">Conc.</span>
              <span className="truncate text-[11px] text-amber-200 flex-1 min-w-0" title={concentratingOn}>
                {concentratingOn}
              </span>
              <button
                type="button"
                onClick={() => setConcentration(null)}
                className="rounded px-1.5 py-0.5 text-[9px] text-amber-300 bg-amber-900/40 hover:bg-amber-900/60"
                title="Drop concentration"
              >
                Drop
              </button>
            </div>
          )}

          {/* Wave 3: Mystic Arcanum (Warlock 11+ — 1/day high-level spells) */}
          {arcanumEntries.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Mystic Arcanum
              </div>
              <div className="space-y-1.5">
                {arcanumEntries.map(entry => {
                  const available = entry.used < 1
                  return (
                    <div key={entry.level} className="flex items-center gap-1.5">
                      <span className="w-7 shrink-0 text-[10px] text-slate-500">
                        L{entry.level}
                      </span>
                      <span className="truncate text-[10px] text-slate-300 flex-1 min-w-0" title={entry.spellName ?? 'Not chosen'}>
                        {entry.spellName ?? <span className="italic text-slate-600">Not chosen</span>}
                      </span>
                      <div className="flex gap-0.5">
                        <div
                          className={`h-2.5 w-2.5 rounded-full border ${
                            available
                              ? 'border-fuchsia-400/60 bg-fuchsia-500/60'
                              : 'border-slate-700 bg-slate-900'
                          }`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleArcanumCast(entry.level, entry.spellName)}
                        disabled={!available || !entry.spellName}
                        className="rounded px-1 py-0.5 text-[9px] text-fuchsia-300 bg-fuchsia-900/30 hover:bg-fuchsia-900/50 disabled:opacity-30 transition"
                        title={entry.spellName ? `Cast ${entry.spellName} (1/day)` : 'Pick a spell at character creation'}
                      >
                        Cast
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Wave 2: Racial innate spells with daily-use tracking. */}
          {racialResources.length > 0 && (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Racial Innates
              </div>
              <div className="space-y-1.5">
                {racialResources.map(r => {
                  const used = racialUsed[r.key] ?? 0
                  const available = r.max - used
                  return (
                    <div key={r.key} className="flex items-center gap-1.5">
                      <span className="truncate text-[10px] text-slate-300 flex-1 min-w-0" title={r.name}>
                        {r.name}
                      </span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: r.max }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2.5 w-2.5 rounded-full border ${
                              i < available
                                ? 'border-fuchsia-400/60 bg-fuchsia-500/60'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRacialUse(r)}
                        disabled={available === 0}
                        className="rounded px-1 py-0.5 text-[9px] text-fuchsia-300 bg-fuchsia-900/30 hover:bg-fuchsia-900/50 disabled:opacity-30 transition"
                        title={`Use ${r.name} (${r.recharge.replace('_', ' ')} recharge)`}
                      >
                        Use
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRacialRestore(r)}
                        disabled={used === 0}
                        className="rounded px-1 py-0.5 text-[9px] text-slate-400 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 transition"
                        title="Restore one use"
                      >
                        +
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Party HP */}
          <PartyHealthPanel tokens={pcTokens.length > 0 ? pcTokens : tokens} />

          {/* DM all-casters view */}
          {isGm && <PartySlotsPanel sessionId={sessionId} />}

          {/* Spellcasting stats */}
          {myChar && isSpellcaster(myChar.main_job) && (
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Spell Stats
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Save DC</span>
                  <span className="font-bold text-violet-300">{spellSaveDC}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Atk Bonus</span>
                  <span className="font-bold text-blue-300">{fmtMod(spellAttackBonus)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ability</span>
                  <span className="text-slate-300 uppercase">{myChar.main_job ? getSpellcastingAbility(myChar.main_job) : '—'}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Center: Combat spells */}
        <main className="flex flex-1 flex-col overflow-y-auto border-r border-slate-800 bg-gray-950 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400/80">
              ⚔ Combat Spells
            </span>
            <select
              value={combatFilter}
              onChange={e => setCombatFilter(e.target.value)}
              className="text-[10px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
            >
              <option value="all">All levels</option>
              <option value="0">Cantrips</option>
              {slotLevels.map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredCombat.map(spell => {
              // Wave 6K: per-spell stats for multiclass characters
              const stats = getSpellStats(spell)
              return (
              <CombatSpellCard
                key={spell.name}
                spell={spell}
                slots={slots}
                targets={allTargets}
                spellAttackBonus={stats.attackBonus}
                spellSaveDC={stats.dc}
                charLevel={myChar?.level ?? 1}
                isDomain={domainSet.has(spell.name)}
                ritualEligible={ritualEligible}
                agonizingBlast={hasAgonizingBlast}
                chaMod={chaMod}
                onRoll={handleRoll}
                onRitualCast={handleRitualCast}
                pending={pending?.spellName === spell.name ? pending : null}
                onApply={handleApply}
                onClearPending={() => setPending(null)}
                onApplyExtra={handleApplyExtra}
              />
              )
            })}
            {filteredCombat.length === 0 && (
              <p className="py-8 text-center text-[11px] text-slate-600 italic">
                {preparedNames.size === 0
                  ? 'No spells prepared. Prepare spells on your character sheet.'
                  : 'No combat spells prepared at this level.'}
              </p>
            )}
          </div>
        </main>

        {/* Right: Healing spells */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-gray-950 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-green-400/80">
              ✦ Healing Spells
            </span>
            <select
              value={healFilter}
              onChange={e => setHealFilter(e.target.value)}
              className="text-[10px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
            >
              <option value="all">All levels</option>
              {slotLevels.map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredHeal.map(spell => {
              const stats = getSpellStats(spell)
              return (
              <HealingSpellCard
                key={spell.name}
                spell={spell}
                slots={slots}
                targets={pcTokens.length > 0 ? pcTokens : tokens}
                spellAbilityMod={stats.mod}
                isDomain={domainSet.has(spell.name)}
                ritualEligible={ritualEligible}
                onRoll={handleRoll}
                onRitualCast={handleRitualCast}
                pending={pending?.spellName === spell.name ? pending : null}
                onApply={handleApply}
                onClearPending={() => setPending(null)}
              />
              )
            })}
            {filteredHeal.length === 0 && (
              <p className="py-8 text-center text-[11px] text-slate-600 italic">
                {preparedNames.size === 0
                  ? 'No spells prepared. Prepare spells on your character sheet.'
                  : 'No healing spells prepared at this level.'}
              </p>
            )}
          </div>
        </main>

        {/* Far right: Support / buff / control spells */}
        <main className="flex flex-1 flex-col overflow-y-auto border-l border-slate-800 bg-gray-950 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400/80">
              🛡 Support Spells
            </span>
            <select
              value={supportFilter}
              onChange={e => setSupportFilter(e.target.value)}
              className="text-[10px] bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
            >
              <option value="all">All levels</option>
              <option value="0">Cantrips</option>
              {slotLevels.map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredSupport.map(spell => {
              const stats = getSpellStats(spell)
              return (
                <SupportSpellCard
                  key={spell.name}
                  spell={spell}
                  slots={slots}
                  targets={supportTargetsFor(spell)}
                  spellSaveDC={stats.dc}
                  isDomain={domainSet.has(spell.name)}
                  onRoll={handleRoll}
                  onSupportCast={handleSupportCast}
                />
              )
            })}
            {filteredSupport.length === 0 && (
              <p className="py-8 text-center text-[11px] text-slate-600 italic">
                {preparedNames.size === 0
                  ? 'No spells prepared. Prepare spells on your character sheet.'
                  : 'No support spells prepared at this level.'}
              </p>
            )}
          </div>
        </main>

      </div>
    </div>
  )
}
