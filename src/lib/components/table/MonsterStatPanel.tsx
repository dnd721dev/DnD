'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type MonsterStatPanelProps = {
  token: any
  monster: any
  conditions: string[]
  onToggleCondition: (condition: string) => void
  onClose: () => void
  onRoll: (roll: { label: string; formula: string; result: number }) => void
}

export function MonsterStatPanel({
  token,
  monster,
  conditions,
  onToggleCondition,
  onClose,
  onRoll,
}: MonsterStatPanelProps) {
  if (!token) return null

  const m = monster || {}
  const name = m.name || token.label || 'Unknown Monster'


  // 🎯 Target selection (click a token on the map)
  const [target, setTarget] = useState<any | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (ev: any) => {
      const t = (ev?.detail ?? {})?.token ?? null
      setTarget(t)
    }
    window.addEventListener('dnd721-target-selected', handler)
    return () => window.removeEventListener('dnd721-target-selected', handler)
  }, [])

  const targetAC = useMemo(() => {
    const n = Number((target as any)?.ac)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [target])

  // ---- Core stats (CR, AC, HP, Speed) ----
  const crValue =
    m.cr ??
    m.challenge_rating ??
    m.challengeRating ??
    m.crValue

  const acValue =
    m.ac ??
    m.armor_class ??
    m.armorClass ??
    (Array.isArray(m.armor_class) ? m.armor_class[0]?.value : undefined)

  const hpValue =
    m.hp ??
    m.hit_points ??
    m.hitPoints ??
    m.max_hp ??
    m.maxHp

  const speedValue =
    m.speed_text ??
    m.movement ??
    (typeof m.speed === 'string'
      ? m.speed
      : m.speed && typeof m.speed === 'object'
      ? Object.entries(m.speed)
          .map(([k, v]) => `${v} ${k}`)
          .join(', ')
      : undefined)

  const cr = crValue ?? '—'
  const ac = acValue ?? '—'
  const hp = hpValue ?? '—'
  const speed = speedValue ?? '—'

  // ---- Ability scores helpers ----
  function abilityScore(raw: any): number | null {
    if (typeof raw === 'number') return raw
    if (typeof raw === 'string') {
      const parsed = parseInt(raw, 10)
      return Number.isNaN(parsed) ? null : parsed
    }
    return null
  }

  function getAbility(key: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha') {
    const val =
      m[key] ??
      m[key.toUpperCase()] ??
      (key === 'str'
        ? m.strength
        : key === 'dex'
        ? m.dexterity
        : key === 'con'
        ? m.constitution
        : key === 'int'
        ? m.intelligence
        : key === 'wis'
        ? m.wisdom
        : m.charisma) ??
      m.ability_scores?.[key] ??
      m.abilities?.[key]

    return abilityScore(val)
  }

  function abilityMod(score: number | null): string {
    if (score == null) return '—'
    const mod = Math.floor((score - 10) / 2)
    return mod >= 0 ? `+${mod}` : `${mod}`
  }

  function rollD20(label: string, mod: number) {
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + mod
    const sign = mod >= 0 ? '+' : ''
    onRoll({
      label,
      formula: `1d20${sign}${mod}`,
      result: total,
    })
  }

  const str = getAbility('str')
  const dex = getAbility('dex')
  const con = getAbility('con')
  const intScore = getAbility('int')
  const wis = getAbility('wis')
  const cha = getAbility('cha')

  // ---- Other details (saves, skills, etc.) ----
  function formatObjOrString(value: any): string | null {
    if (!value) return null
    if (typeof value === 'string') return value
    if (Array.isArray(value)) {
      return value
        .map((v: any) => {
          if (typeof v === 'string') return v
          if (v.name && v.bonus !== undefined) return `${v.name} ${v.bonus}`
          return String(v)
        })
        .join(', ')
    }
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([k, v]) => `${k.toString().toUpperCase()} ${v}`)
        .join(', ')
    }
    return String(value)
  }

  const savingThrows =
    formatObjOrString(m.saving_throws ?? m.saves ?? m.savingThrows) || null

  const skills =
    formatObjOrString(m.skills ?? m.skill) || null

  const senses =
    formatObjOrString(m.senses) || null

  const languages =
    formatObjOrString(m.languages) || null

  const resistances =
    formatObjOrString(
      m.damage_resistances ??
        m.resistances ??
        m.damageResistances
    ) || null

  const immunities =
    formatObjOrString(
      m.damage_immunities ??
        m.immunities ??
        m.damageImmunities
    ) || null

  const conditionImmunities =
    formatObjOrString(
      m.condition_immunities ??
        m.conditionImmunities
    ) || null

  const traits: any[] = Array.isArray(m.special_abilities)
    ? m.special_abilities
    : Array.isArray(m.traits)
    ? m.traits
    : []

  const actions: any[] = Array.isArray(m.actions)
    ? m.actions
    : Array.isArray(m.attacks)
    ? m.attacks
    : []

  // ---- Rolling helpers ----
  function rollFormula(formula: string): number {
    try {
      const parts = formula.toLowerCase().split('+')
      let total = 0
      for (const part of parts) {
        const trimmed = part.trim()
        if (!trimmed) continue

        if (trimmed.includes('d')) {
          const [countStr, sidesStr] = trimmed.split('d')
          const count = parseInt(countStr || '1', 10)
          const sides = parseInt(sidesStr || '6', 10)
          for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * sides) + 1
          }
        } else {
          const flat = parseInt(trimmed, 10)
          if (!Number.isNaN(flat)) total += flat
        }
      }
      return total
    } catch {
      return Math.floor(Math.random() * 20) + 1
    }
  }

  function handleAttackRoll(action: any) {
    const toHitRaw = action.to_hit ?? action.toHit ?? action.attack_bonus ?? 0
    const toHit = Number(toHitRaw)
    const bonus = Number.isFinite(toHit) ? toHit : 0

    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + bonus

    // ✅ hit logic (AC)
    let outcome: string | null = null
    if (targetAC != null) {
      if (d20 === 1) outcome = `MISS (nat 1) vs AC ${targetAC}`
      else if (d20 === 20) outcome = `HIT (nat 20) vs AC ${targetAC}`
      else outcome = total >= targetAC ? `HIT vs AC ${targetAC}` : `MISS vs AC ${targetAC}`
    }

    const sign = bonus >= 0 ? '+' : ''

    onRoll({
      label: `${name}: ${action.name || 'Attack'}${target?.label ? ` → ${target.label}` : ''}`,
      formula: `1d20${sign}${bonus}`,
      result: total,
      outcome,
    } as any)

    return { d20, total, outcome }
  }

  function handleDamageRoll(action: any) {
    const dmgFormula =
      action.damage_dice ||
      action.damage ||
      action.damage_formula ||
      (Array.isArray(action.damage) && action.damage[0]?.damage_dice)

    if (!dmgFormula || typeof dmgFormula !== 'string') return

    const result = rollFormula(dmgFormula)

    onRoll({
      label: `${name}: ${action.name || 'Damage'}`,
      formula: dmgFormula,
      result,
    })

    return { dmgFormula, result }
  }

  async function applyDamageToTarget(amount: number) {
    try {
      if (!target?.id) return
      const { data, error } = await supabase
        .from('tokens')
        .select('current_hp, hp')
        .eq('id', target.id)
        .maybeSingle()

      if (error) throw error

      const cur = Number((data as any)?.current_hp ?? (data as any)?.hp ?? 0)
      const next = Math.max(0, cur - Math.max(0, amount))

      const { error: upErr } = await supabase
        .from('tokens')
        .update({ current_hp: next })
        .eq('id', target.id)

      if (upErr) throw upErr
    } catch (e) {
      console.error('applyDamageToTarget failed', e)
    }
  }

  async function handleAttackAndDamage(action: any) {
    const atk = handleAttackRoll(action)

    // If we don't have an AC target, just stop at the attack roll.
    if (!atk) return
    if (targetAC == null) return

    const hit = String(atk.outcome || '').startsWith('HIT')
    if (!hit) return

    const dmg = handleDamageRoll(action)
    if (!dmg) return

    // Auto-apply damage to the currently selected target token.
    await applyDamageToTarget(dmg.result)

    onRoll({
      label: `${name}: Applied ${dmg.result} damage${target?.label ? ` → ${target.label}` : ''}`,
      formula: `-${dmg.result} HP`,
      result: dmg.result,
    } as any)
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-slate-700 bg-slate-900/90 p-3 text-xs text-slate-200 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Monster
          </p>
          <p className="text-sm font-semibold text-slate-50">{name}</p>
          <p className="text-[11px] text-slate-400">
            Token:{' '}
            <span className="font-mono">
              {String(token.id).slice(0, 6)}…
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
        >
          Close
        </button>
      </div>

      {/* Top summary: CR / AC / HP / Speed */}
      <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-950/60 p-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            CR
          </p>
          <p className="text-sm text-slate-100">{cr}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            AC
          </p>
          <p className="text-sm text-slate-100">{ac}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            HP
          </p>
          <p className="text-sm text-slate-100">{hp}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            Speed
          </p>
          <p className="text-sm text-slate-100">{speed}</p>
        </div>
      </div>

      {/* Conditions */}
      <div>
        <p className="mb-1 text-[11px] font-semibold text-slate-100">
          Conditions
        </p>

        {conditions.length > 0 ? (
          <div className="mb-1 flex flex-wrap gap-1.5">
            {conditions.map(c => (
              <span
                key={c}
                className="rounded-full border border-rose-700 bg-rose-900/40 px-2 py-0.5 text-[10px] font-medium text-rose-200"
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-1 text-[10px] text-slate-500">
            No conditions applied.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {[
            'Prone',
            'Grappled',
            'Restrained',
            'Stunned',
            'Unconscious',
            'Invisible',
          ].map(cond => {
            const active = conditions.includes(cond)
            return (
              <button
                key={cond}
                type="button"
                onClick={() => onToggleCondition(cond)}
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                  active
                    ? 'border border-rose-500 bg-rose-700 text-rose-50'
                    : 'border border-slate-700 bg-slate-800 text-slate-100 hover:border-sky-500'
                }`}
              >
                {active ? `✓ ${cond}` : cond}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ability scores */}
      <div>
        <p className="mb-1 text-[11px] font-semibold text-slate-100">
          Ability Scores
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {[
            ['STR', str],
            ['DEX', dex],
            ['CON', con],
            ['INT', intScore],
            ['WIS', wis],
            ['CHA', cha],
          ].map(([label, score]) => (
            <div
              key={label}
              role={score != null ? 'button' : undefined}
              tabIndex={score != null ? 0 : -1}
              onClick={() => {
                if (score == null) return
                const mod = Math.floor(((score as number) - 10) / 2)
                rollD20(`${name} · ${label} Check`, mod)
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                if (score == null) return
                const mod = Math.floor(((score as number) - 10) / 2)
                rollD20(`${name} · ${label} Check`, mod)
              }}
              className={`rounded-md border border-slate-700 bg-slate-950/70 p-1.5 text-center ${
                score != null ? 'cursor-pointer hover:border-sky-500 hover:bg-slate-950/90' : ''
              }`}
            >
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className="text-sm font-semibold text-slate-50">
                {score ?? '—'}
              </p>
              <p className="text-[10px] text-slate-400">
                {score != null ? abilityMod(score as number) : ''}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Extra details */}
      <div className="space-y-1.5">
        {savingThrows && (
          <p className="text-[11px] text-slate-200">
            <span className="font-semibold text-slate-100">
              Saving Throws:{' '}
            </span>
            {savingThrows}
          </p>
        )}
        {skills && (
          <p className="text-[11px] text-slate-200">
            <span className="font-semibold text-slate-100">Skills: </span>
            {skills}
          </p>
        )}
        {senses && (
          <p className="text-[11px] text-slate-200">
            <span className="font-semibold text-slate-100">Senses: </span>
            {senses}
          </p>
        )}
        {languages && (
          <p className="text-[11px] text-slate-200">
            <span className="font-semibold text-slate-100">
              Languages:{' '}
            </span>
            {languages}
          </p>
        )}
        {resistances && (
          <p className="text-[11px] text-slate-200">
            <span className="font-semibold text-slate-100">
              Damage Resistances:{' '}
            </span>
            {resistances}
          </p>
        )}
        {immunities && (
          <p className="text-[11px] text-slate-200">
            <span className="font-semibold text-slate-100">
              Damage Immunities:{' '}
            </span>
            {immunities}
          </p>
        )}
        {conditionImmunities && (
          <p className="text-[11px] text-slate-200">
            <span className="font-semibold text-slate-100">
              Condition Immunities:{' '}
            </span>
            {conditionImmunities}
          </p>
        )}
      </div>

      {/* Traits */}
      {traits.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-100">
            Traits
          </p>
          <div className="space-y-1.5">
            {traits.map((t: any, idx: number) => (
              <div
                key={idx}
                className="rounded-md border border-slate-700 bg-slate-950/60 p-1.5"
              >
                <p className="text-[11px] font-semibold text-slate-50">
                  {t.name || 'Trait'}
                </p>
                {t.desc && (
                  <p className="text-[11px] text-slate-300">{t.desc}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-100">
            Actions
          </p>
          <div className="space-y-1.5">
            {actions.map((a: any, idx: number) => (
              <div
                key={idx}
                className="rounded-md border border-slate-700 bg-slate-950/60 p-1.5"
              >
                <p className="text-[11px] font-semibold text-slate-50">
                  {a.name || 'Action'}
                </p>
                {a.desc && (
                  <p className="text-[11px] text-slate-300">
                    {a.desc}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(a.to_hit ?? a.toHit ?? a.attack_bonus) != null && (
                    <button
                      type="button"
                      onClick={() => handleAttackRoll(a)}
                      className="rounded-md bg-sky-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-sky-500"
                    >
                      Roll Attack
                    </button>
                  )}
                  {(a.to_hit ?? a.toHit ?? a.attack_bonus) != null &&
                    (a.damage_dice ||
                      a.damage ||
                      a.damage_formula ||
                      (Array.isArray(a.damage) && a.damage[0]?.damage_dice)) && (
                      <button
                        type="button"
                        onClick={() => handleAttackAndDamage(a)}
                        className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-emerald-500"
                        title="Roll attack vs selected target AC, then roll damage and apply to target HP if it hits"
                      >
                        Attack + Damage
                      </button>
                    )}
                  {(a.damage_dice ||
                    a.damage ||
                    a.damage_formula ||
                    (Array.isArray(a.damage) &&
                      a.damage[0]?.damage_dice)) && (
                    <button
                      type="button"
                      onClick={() => handleDamageRoll(a)}
                      className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-rose-500"
                    >
                      Roll Damage
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!monster && (
        <p className="text-[11px] text-slate-400">
          No detailed stat block found for this monster id:{' '}
          <span className="font-mono">
            {String(token.monster_id)}
          </span>
        </p>
      )}
    </div>
  )
}
