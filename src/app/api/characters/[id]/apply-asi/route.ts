// src/app/api/characters/[id]/apply-asi/route.ts
// Apply an Ability Score Improvement / Feat choice queued by a level-up.
//
// Triggered from the character sheet's LevelUpAsiModal after take-class-level
// surfaced a pending `levelup_asi` choice. Applies one ASI slot:
//   - 'plus2':       +2 to one ability (cap 20)
//   - 'plus1plus1':  +1 to two abilities (cap 20)
//   - 'feat':        append a feat (by key) to feats[]
// Then recomputes HP (CON may have changed) and spell save DC / attack bonus
// (casting ability may have changed), and clears/decrements the pending choice.
//
// Auth: wallet_address must match the character's owner.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { calcMaxHpMulticlass } from '@/lib/hitPoints'
import {
  getSpellcastingAbility,
  isSpellcaster,
  profBonus,
  abilityModifier,
} from '@/lib/spellCategories'
import type { ClassKey } from '@/lib/subclasses'
import { getFeatAbilityBonus } from '@/lib/feats'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

type Choice = {
  type?: 'plus2' | 'plus1plus1' | 'feat'
  ability1?: AbilityKey
  ability2?: AbilityKey
  featName?: string
  /** For half-feats that grant +1 to one of several abilities. */
  featAbility?: AbilityKey
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: characterId } = await ctx.params

  let body: { wallet?: string; choice?: Choice }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const wallet = String(body.wallet ?? '').toLowerCase()
  const choice = body.choice ?? {}
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: char, error: fetchErr } = await db
    .from('characters')
    .select('id, wallet_address, level, main_job, secondary_class, secondary_level, abilities, feats, saving_throw_profs, action_state, hp, hit_points_max, hit_points_current')
    .eq('id', characterId)
    .maybeSingle()

  if (fetchErr || !char) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  }
  if (String((char as any).wallet_address ?? '').toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Not your character' }, { status: 403 })
  }

  const actionState: Record<string, any> = (char as any).action_state ?? {}
  const pending = actionState.pending_choices ?? {}
  const asi = pending.levelup_asi
  if (!asi) {
    return NextResponse.json({ error: 'No ASI/feat choice pending' }, { status: 400 })
  }

  // ── Validate + apply the choice ─────────────────────────────────────────────
  const abilities: Record<string, number> = { ...((char as any).abilities ?? {}) }
  const feats: string[] = Array.isArray((char as any).feats) ? [...(char as any).feats] : []
  const patch: Record<string, any> = {}

  const bump = (k: AbilityKey | undefined, by: number) => {
    if (!k || !ABILITY_KEYS.includes(k)) return false
    abilities[k] = Math.min(20, Number(abilities[k] ?? 10) + by)
    return true
  }

  if (choice.type === 'plus2') {
    if (!bump(choice.ability1, 2)) {
      return NextResponse.json({ error: 'plus2 requires a valid ability1' }, { status: 400 })
    }
    patch.abilities = abilities
  } else if (choice.type === 'plus1plus1') {
    if (!choice.ability1 || !choice.ability2 || choice.ability1 === choice.ability2) {
      return NextResponse.json({ error: 'plus1plus1 requires two different abilities' }, { status: 400 })
    }
    bump(choice.ability1, 1)
    bump(choice.ability2, 1)
    patch.abilities = abilities
  } else if (choice.type === 'feat') {
    const featKey = String(choice.featName ?? '').trim()
    if (!featKey) {
      return NextResponse.json({ error: 'feat requires featName' }, { status: 400 })
    }
    if (!feats.includes(featKey)) feats.push(featKey)
    patch.feats = feats

    // Half-feats also grant +1 to an ability score (and Resilient grants the
    // matching saving-throw proficiency).
    const bonus = getFeatAbilityBonus(featKey)
    if (bonus) {
      const chosen =
        choice.featAbility && bonus.abilities.includes(choice.featAbility)
          ? choice.featAbility
          : (bonus.abilities.length === 1 ? bonus.abilities[0] : null)
      if (!chosen) {
        return NextResponse.json({ error: 'This feat needs an ability choice (featAbility)' }, { status: 400 })
      }
      bump(chosen, bonus.amount)
      patch.abilities = abilities
      if (featKey === 'resilient') {
        const profs: string[] = Array.isArray((char as any).saving_throw_profs) ? [...(char as any).saving_throw_profs] : []
        if (!profs.includes(chosen)) profs.push(chosen)
        patch.saving_throw_profs = profs
      }
    }
  } else {
    return NextResponse.json({ error: 'choice.type must be plus2 | plus1plus1 | feat' }, { status: 400 })
  }

  // ── Recompute HP (CON may have changed) ─────────────────────────────────────
  const primaryClassKey = String(char.main_job ?? 'fighter').toLowerCase() as ClassKey
  const primaryLevel = Math.max(1, Number(char.level ?? 1))
  const secondaryClassKey = char.secondary_class ? (String(char.secondary_class).toLowerCase() as ClassKey) : null
  const secondaryLevel = Math.max(0, Number(char.secondary_level ?? 0))
  const totalLevel = primaryLevel + secondaryLevel

  try {
    const conScore = Number(abilities.con ?? 10)
    const classes = [{ classKey: primaryClassKey, level: primaryLevel }]
    if (secondaryClassKey && secondaryLevel > 0) classes.push({ classKey: secondaryClassKey, level: secondaryLevel })
    const newMaxHp = calcMaxHpMulticlass({ classes, conScore, method: 'average' })
    const oldMaxHp = Number((char as any).hit_points_max ?? (char as any).hp ?? 0)
    const delta = Math.max(0, newMaxHp - oldMaxHp)
    const oldCurHp = Number((char as any).hit_points_current ?? oldMaxHp)
    patch.hp = newMaxHp
    patch.hit_points_max = newMaxHp
    patch.hit_points_current = Math.max(0, Math.min(newMaxHp, oldCurHp + delta))
  } catch (e) {
    console.error('[apply-asi] HP recalc error', e)
  }

  // ── Recompute spell save DC / attack bonus (casting ability may have changed) ─
  let castingAbilityKey: 'int' | 'wis' | 'cha' | null = null
  if (isSpellcaster(primaryClassKey)) {
    castingAbilityKey = getSpellcastingAbility(primaryClassKey)
  } else if (secondaryClassKey && isSpellcaster(secondaryClassKey)) {
    castingAbilityKey = getSpellcastingAbility(secondaryClassKey)
  }
  if (castingAbilityKey) {
    const score = Number(abilities[castingAbilityKey] ?? 10)
    const mod = abilityModifier(score)
    const pb = profBonus(totalLevel)
    patch.spell_save_dc = 8 + pb + mod
    patch.spell_attack_bonus = pb + mod
  }

  // ── Clear / decrement the pending ASI choice ────────────────────────────────
  const nextPending = { ...pending }
  const remaining = Number(asi.count ?? 1) - 1
  if (remaining > 0) {
    nextPending.levelup_asi = { ...asi, count: remaining }
  } else {
    delete nextPending.levelup_asi
  }
  patch.action_state = { ...actionState, pending_choices: nextPending }

  const { data: updated, error: updateErr } = await db
    .from('characters')
    .update(patch)
    .eq('id', characterId)
    .select()
    .maybeSingle()

  if (updateErr) {
    console.error('[apply-asi] update error', updateErr)
    return NextResponse.json({ error: updateErr.message ?? 'Failed to apply ASI' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, character: updated })
}

export const dynamic = 'force-dynamic'
