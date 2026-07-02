// src/app/api/characters/[id]/take-class-level/route.ts
// Wave 6I — Apply a level-up choice for a multiclass-eligible character.
//
// Triggered from the character sheet after award-xp surfaced a pending
// `levelup_class_pick` choice. The endpoint commits the player's decision:
//   - 'primary': add one level to the primary class (level += 1)
//   - 'secondary': add one level to the existing secondary class (secondary_level += 1)
//   - 'new': start a new secondary class (sets secondary_class/subclass, secondary_level = 1)
//
// After the level is applied this endpoint recomputes spell slots (multiclass-
// aware), save DC, attack bonus, HP (additively — only the gained HP becomes
// available, not a full heal), and unions any newly-available subclass spells
// into spells_prepared. Finally it clears the pending choice.
//
// Auth: wallet_address must match the character's owner (no GM override here
// — leveling is the player's decision).

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  getSlotsForCasterType,
  getWarlockPactRow,
  getDomainSpells,
  getMaxSpellLevelForClass,
  getMulticlassSlots,
  canMulticlassInto,
  type MulticlassEntry,
} from '@/lib/spellcastingProgression'
import {
  getSpellcastingAbility,
  isSpellcaster,
  profBonus,
  abilityModifier,
} from '@/lib/spellCategories'
import type { ClassKey } from '@/lib/subclasses'
import { calcMaxHpMulticlass } from '@/lib/hitPoints'
import { asiSlotsForClassLevel } from '@/lib/rules'

type Body = {
  wallet?: string
  pickClass?: 'primary' | 'secondary' | 'new'
  newClassKey?: string
  newSubclassKey?: string | null
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: characterId } = await ctx.params

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const wallet = String(body.wallet ?? '').toLowerCase()
  const pickClass = body.pickClass
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  if (pickClass !== 'primary' && pickClass !== 'secondary' && pickClass !== 'new') {
    return NextResponse.json({ error: 'pickClass must be primary | secondary | new' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: char, error: fetchErr } = await db
    .from('characters')
    .select('id, wallet_address, level, main_job, subclass, secondary_class, secondary_subclass, secondary_level, abilities, spells_prepared, spells_known, resource_state, action_state, hp, hit_points_max, hit_points_current')
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
  const choice = pending.levelup_class_pick
  if (!choice) {
    return NextResponse.json({ error: 'No level-up pending for this character' }, { status: 400 })
  }

  const fromLevel = Number(choice.from_level ?? char.level ?? 1)
  const toLevel = Number(choice.to_level ?? (Number(char.level ?? 1) + 1))
  if (toLevel <= fromLevel) {
    return NextResponse.json({ error: 'Pending choice has no level delta' }, { status: 400 })
  }
  // We apply ONE level at a time; if multiple levels were gained, the UI
  // calls this endpoint repeatedly. This keeps multiclass choices clean
  // (one decision per level).
  const targetTotalLevel = fromLevel + 1

  // Build current class entries
  const primaryClassKey = String(char.main_job ?? 'fighter').toLowerCase() as ClassKey
  const primarySubclassKey = char.subclass ? String(char.subclass).toLowerCase() : null
  const primaryLevel = Math.max(1, Number(char.level ?? 1))
  const secondaryClassKey: ClassKey | null = char.secondary_class
    ? (String(char.secondary_class).toLowerCase() as ClassKey)
    : null
  const secondarySubclassKey = char.secondary_subclass ? String(char.secondary_subclass).toLowerCase() : null
  const secondaryLevel = Math.max(0, Number(char.secondary_level ?? 0))

  const abilities: Record<string, number> = ((char as any).abilities ?? {}) as Record<string, number>

  // Determine the patch based on the player's choice.
  let newEntries: MulticlassEntry[] = []
  const patch: Record<string, any> = {}

  if (pickClass === 'primary') {
    // Add one level to the primary class
    patch.level = primaryLevel + 1
    newEntries = [
      { classKey: primaryClassKey, level: primaryLevel + 1, subclassKey: primarySubclassKey },
    ]
    if (secondaryClassKey && secondaryLevel > 0) {
      newEntries.push({ classKey: secondaryClassKey, level: secondaryLevel, subclassKey: secondarySubclassKey })
    }
  } else if (pickClass === 'secondary') {
    if (!secondaryClassKey || secondaryLevel <= 0) {
      return NextResponse.json({ error: 'No secondary class on this character' }, { status: 400 })
    }
    patch.secondary_level = secondaryLevel + 1
    newEntries = [
      { classKey: primaryClassKey, level: primaryLevel, subclassKey: primarySubclassKey },
      { classKey: secondaryClassKey, level: secondaryLevel + 1, subclassKey: secondarySubclassKey },
    ]
  } else if (pickClass === 'new') {
    // Starting a new secondary class — validate prereqs
    const newClass = String(body.newClassKey ?? '').toLowerCase() as ClassKey
    if (!newClass) {
      return NextResponse.json({ error: 'newClassKey required when pickClass=new' }, { status: 400 })
    }
    if (newClass === primaryClassKey) {
      return NextResponse.json({ error: "Can't add the same class as your primary — use pickClass='primary'" }, { status: 400 })
    }
    if (secondaryClassKey && secondaryClassKey !== newClass) {
      return NextResponse.json({ error: 'Already has a different secondary class' }, { status: 400 })
    }
    const prereq = canMulticlassInto(newClass, abilities as any, primaryClassKey)
    if (!prereq.ok) {
      return NextResponse.json({ error: `Multiclass prereq failed: ${prereq.reason}` }, { status: 400 })
    }
    patch.secondary_class = newClass
    patch.secondary_subclass = body.newSubclassKey ?? null
    patch.secondary_level = 1
    newEntries = [
      { classKey: primaryClassKey, level: primaryLevel, subclassKey: primarySubclassKey },
      { classKey: newClass, level: 1, subclassKey: body.newSubclassKey ?? null },
    ]
  }

  // ── Recompute spell slots (multiclass-aware) ────────────────────────────────
  const isPureWarlock = newEntries.length === 1 && newEntries[0].classKey === 'warlock'
  let spellSlots: Record<string, number> = {}
  if (isPureWarlock) {
    const pact = getWarlockPactRow(newEntries[0].level)
    if (pact) spellSlots = { [String(pact.pactSlotLevel)]: pact.pactSlots }
  } else {
    // Multiclass slot math (or single-class equivalent — getMulticlassSlots
    // produces the same result for a single non-Warlock entry).
    const combined = getMulticlassSlots(newEntries)
    spellSlots = Object.fromEntries(Object.entries(combined).map(([k, v]) => [k, v as number]))
  }
  if (Object.keys(spellSlots).length > 0) {
    patch.spell_slots = spellSlots
    // Reset spent slot counts (treats level-up as occurring after a long rest)
    const resourceState: Record<string, any> = (char as any).resource_state ?? {}
    const nextResource = { ...resourceState }
    for (const key of Object.keys(nextResource)) {
      if (key.startsWith('spell_slot_used_')) nextResource[key] = 0
    }
    patch.resource_state = nextResource
  }

  // ── Spellcasting DC / attack bonus ──────────────────────────────────────────
  // Use the PRIMARY class's casting ability if the primary is a spellcaster;
  // otherwise fall back to the secondary's. Per-spell casting ability is
  // surfaced in the dashboard separately (task 6K).
  let castingAbilityKey: 'int' | 'wis' | 'cha' | null = null
  if (isSpellcaster(primaryClassKey)) {
    castingAbilityKey = getSpellcastingAbility(primaryClassKey)
  } else if (secondaryClassKey && isSpellcaster(secondaryClassKey)) {
    castingAbilityKey = getSpellcastingAbility(secondaryClassKey)
  }
  if (castingAbilityKey) {
    const score = Number(abilities[castingAbilityKey] ?? 10)
    const mod = abilityModifier(score)
    const pb = profBonus(targetTotalLevel) // proficiency uses TOTAL level
    patch.spell_save_dc = 8 + pb + mod
    patch.spell_attack_bonus = pb + mod
  }

  // ── HP recalc (Wave 6H) ─────────────────────────────────────────────────────
  try {
    const conScore = Number(abilities.con ?? 10)
    const newMaxHp = calcMaxHpMulticlass({
      classes: newEntries.map(e => ({ classKey: e.classKey, level: e.level })),
      conScore,
      method: 'average',
    })
    const oldMaxHp = Number((char as any).hit_points_max ?? (char as any).hp ?? 0)
    const delta = Math.max(0, newMaxHp - oldMaxHp)
    const oldCurHp = Number((char as any).hit_points_current ?? oldMaxHp)
    patch.hp = newMaxHp
    patch.hit_points_max = newMaxHp
    patch.hit_points_current = Math.max(0, Math.min(newMaxHp, oldCurHp + delta))
  } catch (e) {
    console.error('take-class-level HP recalc error', e)
  }

  // ── Union new subclass-granted spells into spells_prepared ──────────────────
  // For every class entry that has a subclass with domain spells, union them in.
  const prepared: string[] = Array.isArray(char.spells_prepared) ? char.spells_prepared : []
  const known: string[] = Array.isArray(char.spells_known) ? char.spells_known : []
  const additions: string[] = []
  for (const entry of newEntries) {
    if (!entry.subclassKey) continue
    const maxLvl = getMaxSpellLevelForClass(entry.classKey, entry.subclassKey, entry.level)
    if (maxLvl > 0) {
      additions.push(...getDomainSpells(entry.subclassKey, maxLvl))
    }
  }
  if (additions.length > 0) {
    patch.spells_prepared = Array.from(new Set([...prepared, ...additions]))
    patch.spells_known = Array.from(new Set([...known, ...additions]))
  }

  // ── Did this class level grant an ASI / feat? ───────────────────────────────
  // ASI breakpoints are per-CLASS level (Fighter & Rogue get extras). Compare the
  // chosen class's old vs new class level.
  let asiClassKey = primaryClassKey as string
  let asiOldLevel = primaryLevel
  let asiNewLevel = primaryLevel + 1
  if (pickClass === 'secondary') {
    asiClassKey = String(secondaryClassKey)
    asiOldLevel = secondaryLevel
    asiNewLevel = secondaryLevel + 1
  } else if (pickClass === 'new') {
    asiClassKey = String(body.newClassKey ?? '').toLowerCase()
    asiOldLevel = 0
    asiNewLevel = 1
  }
  const asiDelta =
    asiSlotsForClassLevel(asiClassKey, asiNewLevel) - asiSlotsForClassLevel(asiClassKey, asiOldLevel)

  // ── Update the pending choices ──────────────────────────────────────────────
  const nextPending = { ...pending }
  // If the player still has more levels to assign (multi-level XP award),
  // update the choice's from_level instead of clearing it.
  if (targetTotalLevel < toLevel) {
    nextPending.levelup_class_pick = {
      ...choice,
      from_level: targetTotalLevel,
    }
  } else {
    delete nextPending.levelup_class_pick
  }
  // Queue an ASI/feat choice if this level granted one. The sheet shows the
  // ASI picker (priority) before any remaining class pick.
  if (asiDelta > 0) {
    nextPending.levelup_asi = {
      class: asiClassKey,
      at_total_level: targetTotalLevel,
      count: asiDelta,
    }
  }

  // Subclass selection at level 3 (2024 rules) if not yet chosen for this slot.
  if (pickClass === 'primary' && primaryLevel + 1 === 3 && !char.subclass) {
    nextPending.levelup_subclass = { class: primaryClassKey, slot: 'primary', at_total_level: targetTotalLevel }
  } else if (pickClass === 'secondary' && secondaryLevel + 1 === 3 && !char.secondary_subclass) {
    nextPending.levelup_subclass = { class: String(secondaryClassKey), slot: 'secondary', at_total_level: targetTotalLevel }
  }
  patch.action_state = {
    ...actionState,
    pending_choices: nextPending,
  }

  const { error: updateErr } = await db
    .from('characters')
    .update(patch)
    .eq('id', characterId)

  if (updateErr) {
    console.error('take-class-level update error', updateErr)
    return NextResponse.json({ error: updateErr.message ?? 'Failed to apply level' }, { status: 500 })
  }

  // ── Propagate the new HP to any linked combat token(s) ──────────────────────
  // PC party cards and the map show the TOKEN's hp/current_hp when a token
  // exists for the character. Without this the token keeps its pre-level-up
  // (e.g. level-1) HP and the dashboard shows stale max HP after leveling.
  if (patch.hit_points_max != null) {
    try {
      const newMaxHp = Number(patch.hit_points_max)
      const { data: toks } = await db
        .from('tokens')
        .select('id, hp, current_hp')
        .eq('character_id', characterId)
      for (const tk of toks ?? []) {
        const tokDelta = Math.max(0, newMaxHp - Number((tk as any).hp ?? 0))
        const tokCur = Number((tk as any).current_hp ?? (tk as any).hp ?? newMaxHp)
        await db
          .from('tokens')
          .update({
            hp: newMaxHp,
            current_hp: Math.max(0, Math.min(newMaxHp, tokCur + tokDelta)),
          })
          .eq('id', (tk as any).id)
      }
    } catch (e) {
      console.error('take-class-level token HP sync error', e)
    }
  }

  return NextResponse.json({
    ok: true,
    classes: newEntries.map(e => ({ classKey: e.classKey, level: e.level, subclassKey: e.subclassKey })),
    total_level: targetTotalLevel,
    levels_remaining: Math.max(0, toLevel - targetTotalLevel),
  })
}

// Suppress prerender of this dynamic route during build
export const dynamic = 'force-dynamic'
