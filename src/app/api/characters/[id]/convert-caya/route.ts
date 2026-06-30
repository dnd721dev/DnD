// src/app/api/characters/[id]/convert-caya/route.ts
// POST — convert a Free-Level character into a CAYA ("Come As You Are")
// character. This is a ONE-WAY action: it sets is_caya=true and resets the
// character to level 1 (0 XP), and there is no route that flips is_caya back.
//
// Auth: wallet_address must match the character's stored wallet (case-insensitive),
// mirroring the DELETE handler in ../route.ts.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { calcMaxHp } from '@/lib/hitPoints'
import { buildLevelUpPatch, type CharForLevelUp } from '@/lib/levelUpRefresh'
import type { ClassKey } from '@/lib/subclasses'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: characterId } = await ctx.params

  let wallet = ''
  try {
    const body = await req.json()
    wallet = String(body.wallet ?? '').toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!wallet) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: char, error: fetchErr } = await db
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[convert-caya] fetch error', fetchErr)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
  if (!char) {
    return NextResponse.json({ error: 'Character not found' }, { status: 404 })
  }
  if (String(char.wallet_address ?? '').toLowerCase() !== wallet) {
    return NextResponse.json({ error: 'Not your character' }, { status: 403 })
  }
  // One-way: cannot undo, cannot re-convert.
  if (char.is_caya === true) {
    return NextResponse.json({ error: 'Already a CAYA character' }, { status: 400 })
  }

  // Recompute the spellcasting state for level 1 as a single-class character
  // (a level-1 PC can't be multiclassed, so the secondary slot is dropped).
  const charForReset: CharForLevelUp = {
    id: char.id,
    main_job: char.main_job ?? null,
    subclass: char.subclass ?? null,
    secondary_class: null,
    secondary_subclass: null,
    secondary_level: 0,
    abilities: (char.abilities ?? {}) as Record<string, number>,
    resource_state: (char.resource_state ?? {}) as Record<string, any>,
    spells_prepared: Array.isArray(char.spells_prepared) ? char.spells_prepared : [],
    spells_known: Array.isArray(char.spells_known) ? char.spells_known : [],
    hp: char.hp ?? null,
    hit_points_max: char.hit_points_max ?? null,
    hit_points_current: char.hit_points_current ?? null,
  }
  const patch = buildLevelUpPatch(charForReset, 1)

  // Exact level-1 HP (full). buildLevelUpPatch's HP recalc is additive/up-only
  // (delta = max(0, …)) and would otherwise keep the old, higher HP.
  const conScore = Number((char.abilities ?? {} as any).con ?? 10)
  const maxHp = calcMaxHp({
    classKey: String(char.main_job ?? '').toLowerCase() as ClassKey,
    level: 1,
    conScore,
  })

  const update = {
    ...patch,
    is_caya: true,
    level: 1,
    experience_points: 0,
    proficiency: 2,
    // Drop any multiclass — level-1 PCs are single-class.
    secondary_class: null,
    secondary_subclass: null,
    secondary_level: 0,
    // Clear stale spell slots for non-casters; casters get level-1 slots from patch.
    spell_slots: patch.spell_slots ?? {},
    // Full level-1 HP pool.
    hp: maxHp,
    hit_points_max: maxHp,
    hit_points_current: maxHp,
  }

  const { data: updated, error: updateErr } = await db
    .from('characters')
    .update(update)
    .eq('id', characterId)
    .select()
    .maybeSingle()

  if (updateErr) {
    console.error('[convert-caya] update error', updateErr)
    return NextResponse.json({ error: 'Failed to convert character' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, character: updated })
}

export const dynamic = 'force-dynamic'
