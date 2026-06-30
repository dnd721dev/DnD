// src/app/api/characters/[id]/apply-subclass/route.ts
// Choose a subclass at level 3 (2024 rules), queued by take-class-level as
// pending_choices.levelup_subclass. Sets the subclass for the primary or
// secondary class slot, then recomputes spell slots / save DC / attack bonus and
// unions the subclass's always-prepared spells (matters for Eldritch Knight /
// Arcane Trickster third-casting and for domain/oath/circle spells).
//
// Auth: wallet_address must match the character's owner.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  getWarlockPactRow,
  getDomainSpells,
  getMaxSpellLevelForClass,
  getMulticlassSlots,
  type MulticlassEntry,
} from '@/lib/spellcastingProgression'
import {
  getSpellcastingAbility,
  isSpellcaster,
  profBonus,
  abilityModifier,
} from '@/lib/spellCategories'
import { CLASS_SUBCLASSES, type ClassKey } from '@/lib/subclasses'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: characterId } = await ctx.params

  let body: { wallet?: string; subclassKey?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const wallet = String(body.wallet ?? '').toLowerCase()
  const subclassKey = String(body.subclassKey ?? '').toLowerCase()
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  if (!subclassKey) return NextResponse.json({ error: 'subclassKey required' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: char, error: fetchErr } = await db
    .from('characters')
    .select('id, wallet_address, level, main_job, subclass, secondary_class, secondary_subclass, secondary_level, abilities, spells_prepared, spells_known, resource_state, action_state')
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
  const choice = pending.levelup_subclass
  if (!choice) {
    return NextResponse.json({ error: 'No subclass choice pending' }, { status: 400 })
  }

  const slot: 'primary' | 'secondary' = choice.slot === 'secondary' ? 'secondary' : 'primary'
  const classKey = String(choice.class ?? '').toLowerCase() as ClassKey

  // Validate the subclass belongs to the class taking it.
  const options = CLASS_SUBCLASSES[classKey] ?? []
  if (!options.some((o) => o.key === subclassKey)) {
    return NextResponse.json({ error: 'Subclass does not belong to that class' }, { status: 400 })
  }

  const patch: Record<string, any> = {}
  if (slot === 'primary') patch.subclass = subclassKey
  else patch.secondary_subclass = subclassKey

  // Build class entries with the newly-chosen subclass applied to its slot.
  const primaryClassKey = String(char.main_job ?? 'fighter').toLowerCase() as ClassKey
  const primaryLevel = Math.max(1, Number(char.level ?? 1))
  const primarySubclass = slot === 'primary' ? subclassKey : (char.subclass ? String(char.subclass).toLowerCase() : null)
  const secondaryClassKey = char.secondary_class ? (String(char.secondary_class).toLowerCase() as ClassKey) : null
  const secondaryLevel = Math.max(0, Number(char.secondary_level ?? 0))
  const secondarySubclass = slot === 'secondary' ? subclassKey : (char.secondary_subclass ? String(char.secondary_subclass).toLowerCase() : null)

  const entries: MulticlassEntry[] = [
    { classKey: primaryClassKey, level: primaryLevel, subclassKey: primarySubclass },
  ]
  if (secondaryClassKey && secondaryLevel > 0) {
    entries.push({ classKey: secondaryClassKey, level: secondaryLevel, subclassKey: secondarySubclass })
  }

  // ── Recompute spell slots (EK/AT third-casting may now apply) ────────────────
  const isPureWarlock = entries.length === 1 && entries[0].classKey === 'warlock'
  let spellSlots: Record<string, number> = {}
  if (isPureWarlock) {
    const pact = getWarlockPactRow(entries[0].level)
    if (pact) spellSlots = { [String(pact.pactSlotLevel)]: pact.pactSlots }
  } else {
    const combined = getMulticlassSlots(entries)
    spellSlots = Object.fromEntries(Object.entries(combined).map(([k, v]) => [k, v as number]))
  }
  if (Object.keys(spellSlots).length > 0) {
    patch.spell_slots = spellSlots
    const resourceState: Record<string, any> = (char as any).resource_state ?? {}
    const nextResource = { ...resourceState }
    for (const key of Object.keys(nextResource)) {
      if (key.startsWith('spell_slot_used_')) nextResource[key] = 0
    }
    patch.resource_state = nextResource
  }

  // ── Save DC / attack bonus ──────────────────────────────────────────────────
  const abilities: Record<string, number> = ((char as any).abilities ?? {}) as Record<string, number>
  let castingAbilityKey: 'int' | 'wis' | 'cha' | null = null
  if (isSpellcaster(primaryClassKey)) castingAbilityKey = getSpellcastingAbility(primaryClassKey)
  else if (secondaryClassKey && isSpellcaster(secondaryClassKey)) castingAbilityKey = getSpellcastingAbility(secondaryClassKey)
  else if (slot === 'primary' && (subclassKey === 'fighter_eldritch_knight' || subclassKey === 'rogue_arcane_trickster')) castingAbilityKey = 'int'
  if (castingAbilityKey) {
    const score = Number(abilities[castingAbilityKey] ?? 10)
    const mod = abilityModifier(score)
    const pb = profBonus(primaryLevel + secondaryLevel)
    patch.spell_save_dc = 8 + pb + mod
    patch.spell_attack_bonus = pb + mod
  }

  // ── Union the subclass's always-prepared spells ─────────────────────────────
  const prepared: string[] = Array.isArray(char.spells_prepared) ? char.spells_prepared : []
  const known: string[] = Array.isArray(char.spells_known) ? char.spells_known : []
  const subLevel = slot === 'primary' ? primaryLevel : secondaryLevel
  const maxLvl = getMaxSpellLevelForClass(classKey, subclassKey, subLevel)
  const additions = maxLvl > 0 ? getDomainSpells(subclassKey, maxLvl) : []
  if (additions.length > 0) {
    patch.spells_prepared = Array.from(new Set([...prepared, ...additions]))
    patch.spells_known = Array.from(new Set([...known, ...additions]))
  }

  // ── Clear the pending subclass choice ───────────────────────────────────────
  const nextPending = { ...pending }
  delete nextPending.levelup_subclass
  patch.action_state = { ...actionState, pending_choices: nextPending }

  const { data: updated, error: updateErr } = await db
    .from('characters')
    .update(patch)
    .eq('id', characterId)
    .select()
    .maybeSingle()

  if (updateErr) {
    console.error('[apply-subclass] update error', updateErr)
    return NextResponse.json({ error: updateErr.message ?? 'Failed to apply subclass' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, character: updated })
}

export const dynamic = 'force-dynamic'
