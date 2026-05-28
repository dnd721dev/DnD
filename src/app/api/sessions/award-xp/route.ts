import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { xpToLevel } from '@/lib/dnd5e'
import {
  getSpellSlotsForClass,
  getSlotsForCasterType,
  getWarlockPactRow,
  getDomainSpells,
  getMaxSpellLevelForClass,
  getMulticlassSlots,
  canMulticlassInto,
  MULTICLASS_PREREQS,
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

/** POST /api/sessions/award-xp
 *  Awards XP equally to all CAYA participants in a completed CAYA session.
 *  Body: { session_id: string, xp_amount: number, gm_wallet: string }
 */
export async function POST(req: NextRequest) {
  let body: { session_id?: string; xp_amount?: number; gm_wallet?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { session_id, xp_amount, gm_wallet } = body

  if (!session_id || typeof session_id !== 'string') {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 })
  }
  if (!xp_amount || typeof xp_amount !== 'number' || xp_amount <= 0 || !Number.isInteger(xp_amount)) {
    return NextResponse.json({ error: 'xp_amount must be a positive integer' }, { status: 400 })
  }
  if (!gm_wallet || typeof gm_wallet !== 'string') {
    return NextResponse.json({ error: 'gm_wallet required' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Fetch and validate session
  const { data: session, error: sessionErr } = await db
    .from('sessions')
    .select('id, gm_wallet, status, session_type, xp_award')
    .eq('id', session_id)
    .maybeSingle()

  if (sessionErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if ((session.gm_wallet ?? '').toLowerCase() !== gm_wallet.toLowerCase()) {
    return NextResponse.json({ error: 'Only the session GM can award XP' }, { status: 403 })
  }

  if (session.session_type !== 'caya') {
    return NextResponse.json({ error: 'XP awards only apply to CAYA sessions' }, { status: 400 })
  }

  if (session.status !== 'completed') {
    return NextResponse.json({ error: 'Session must be completed before awarding XP' }, { status: 400 })
  }

  // Fetch player participants
  const { data: participants, error: partErr } = await db
    .from('session_participants')
    .select('wallet_address')
    .eq('session_id', session_id)
    .eq('role', 'player')

  if (partErr || !participants?.length) {
    return NextResponse.json({ error: 'No player participants found' }, { status: 400 })
  }

  const wallets = participants.map((p: any) => p.wallet_address)

  // Fetch CAYA characters belonging to participant wallets.
  // We pull spellcasting-relevant columns here so a level-up can recompute slots,
  // DC, attack bonus, and union new domain/oath/circle spells into spells_prepared.
  // Wave 6: also pull multiclass columns so combined slot math runs correctly.
  const { data: characters, error: charErr } = await db
    .from('characters')
    .select('id, experience_points, level, main_job, subclass, secondary_class, secondary_subclass, secondary_level, abilities, spells_prepared, spells_known, resource_state, action_state, hp, hit_points_max, hit_points_current')
    .in('wallet_address', wallets)
    .eq('is_caya', true)

  if (charErr) {
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
  }

  if (!characters?.length) {
    return NextResponse.json({ error: 'No CAYA characters found for participants' }, { status: 400 })
  }

  // BUG-05 fix: Update each CAYA character's XP AND level up if threshold crossed.
  //
  // Magic audit section A: when a level-up occurs we must also recompute
  // spell_slots / spell_save_dc / spell_attack_bonus, reset spent slots
  // (matching a long rest), and union any newly-available domain/oath/circle
  // spells into spells_prepared. Without this, a level-up leaves all spell
  // mechanics stale until the player manually edits their sheet.
  const levelUps: { characterId: string; oldLevel: number; newLevel: number }[] = []

  const updates = await Promise.all(
    characters.map(async (char: any) => {
      const oldXp = char.experience_points ?? 0
      const newXp = oldXp + xp_amount
      const oldLevel = char.level ?? 1
      const newLevel = xpToLevel(newXp)

      const patch: Record<string, any> = { experience_points: newXp }

      if (newLevel > oldLevel) {
        // Wave 6I: when the character already has a secondary class OR could
        // multiclass into at least one new class (ability prereqs met), surface
        // a pending choice instead of auto-leveling the primary class. A
        // separate endpoint (POST /api/characters/[id]/take-class-level)
        // commits the player's choice.
        //
        // Characters with NO multiclass options (e.g. low INT Wizard who can't
        // qualify for anything else) still auto-level so they don't get stuck
        // in a useless prompt.
        const hasSecondaryClass = !!String(char.secondary_class ?? '').trim()
        const primaryKey = String(char.main_job ?? '').toLowerCase()
        const abilitiesForCheck = (char.abilities ?? {}) as Record<string, number>
        const canMulticlassIntoAny = Object.keys(MULTICLASS_PREREQS).some(k => {
          if (k === primaryKey) return false
          if (hasSecondaryClass && k === String(char.secondary_class).toLowerCase()) return false
          return canMulticlassInto(k as any, abilitiesForCheck as any, primaryKey as any).ok
        })
        const shouldPromptForClassPick = hasSecondaryClass || canMulticlassIntoAny

        if (shouldPromptForClassPick) {
          const actionState: Record<string, any> = char.action_state ?? {}
          const prevPending: Record<string, any> = actionState.pending_choices ?? {}
          patch.action_state = {
            ...actionState,
            pending_choices: {
              ...prevPending,
              levelup_class_pick: {
                from_level: oldLevel,
                to_level: newLevel,
                created_at: new Date().toISOString(),
              },
            },
          }
          levelUps.push({ characterId: char.id, oldLevel, newLevel })
          // Do NOT advance level here — the sheet UI will call the take-class-level
          // endpoint which decides which class gets the level(s).
          return db.from('characters').update(patch).eq('id', char.id)
        }

        patch.level = newLevel
        levelUps.push({ characterId: char.id, oldLevel, newLevel })

        // ── Spellcasting refresh on level-up ────────────────────────────────
        const classKey = String(char.main_job ?? '').toLowerCase()
        const subclassKey = String(char.subclass ?? '').toLowerCase()

        const isEK = classKey === 'fighter' && subclassKey === 'fighter_eldritch_knight' && newLevel >= 3
        const isAT = classKey === 'rogue' && subclassKey === 'rogue_arcane_trickster' && newLevel >= 3
        const isThirdCasterSubclass = isEK || isAT

        const hasCasting = isSpellcaster(classKey) || isThirdCasterSubclass

        if (hasCasting) {
          // Wave 6: build the multiclass entries (single-class characters
          // get a one-element array). award-xp currently only levels up the
          // primary class; secondary_level stays unchanged unless a future
          // level-up UI lets the player pick.
          const secondaryClass = String(char.secondary_class ?? '').toLowerCase()
          const secondaryLevel = Math.max(0, Number(char.secondary_level ?? 0))
          const entries: MulticlassEntry[] = [
            { classKey: classKey as ClassKey, level: newLevel, subclassKey: subclassKey || null },
          ]
          if (secondaryClass && secondaryLevel > 0) {
            entries.push({
              classKey: secondaryClass as ClassKey,
              level: secondaryLevel,
              subclassKey: char.secondary_subclass ?? null,
            })
          }
          const isMulticlass = entries.length > 1

          // Recompute spell slots from the progression tables
          let spellSlots: Record<string, number> = {}
          if (classKey === 'warlock' && !isMulticlass) {
            // Pure Warlock: pact magic only
            const pact = getWarlockPactRow(newLevel)
            if (pact) spellSlots = { [String(pact.pactSlotLevel)]: pact.pactSlots }
          } else if (isMulticlass) {
            // Multiclass: combine all non-Warlock class levels into the
            // full-caster table. Warlock pact slots layer on separately —
            // for V1 we keep pact slots out of the combined map (PHB rule).
            const combined = getMulticlassSlots(entries)
            spellSlots = Object.fromEntries(
              Object.entries(combined).map(([k, v]) => [k, v as number])
            )
          } else if (isThirdCasterSubclass) {
            const raw = getSlotsForCasterType('third', newLevel)
            spellSlots = Object.fromEntries(
              Object.entries(raw).map(([k, v]) => [k, v as number])
            )
          } else if (isSpellcaster(classKey)) {
            const raw = getSpellSlotsForClass(classKey as any, newLevel)
            spellSlots = Object.fromEntries(
              Object.entries(raw).map(([k, v]) => [k, v as number])
            )
          }
          if (Object.keys(spellSlots).length > 0) {
            patch.spell_slots = spellSlots

            // Reset spent counts so the new slots are available immediately
            // (treats the level-up as occurring after a long rest).
            const resourceState: Record<string, any> = char.resource_state ?? {}
            const nextResource = { ...resourceState }
            for (const key of Object.keys(nextResource)) {
              if (key.startsWith('spell_slot_used_')) nextResource[key] = 0
            }
            patch.resource_state = nextResource
          }

          // Recompute save DC and attack bonus from the new proficiency bonus
          const abilities = (char.abilities ?? {}) as Record<string, number>
          let castingAbilityKey: 'int' | 'wis' | 'cha' | null = null
          if (isSpellcaster(classKey)) {
            castingAbilityKey = getSpellcastingAbility(classKey)
          } else if (isThirdCasterSubclass) {
            castingAbilityKey = 'int'
          }
          if (castingAbilityKey) {
            const score = Number(abilities[castingAbilityKey] ?? 10)
            const mod = abilityModifier(score)
            const pb = profBonus(newLevel)
            patch.spell_save_dc = 8 + pb + mod
            patch.spell_attack_bonus = pb + mod
          }

          // Union new domain / oath / circle spells into spells_prepared so
          // higher-level subclass spells unlock automatically.
          const maxSpellLevel = getMaxSpellLevelForClass(classKey, subclassKey, newLevel)
          const rawDomain = subclassKey ? getDomainSpells(subclassKey, maxSpellLevel) : []
          if (rawDomain.length > 0) {
            const currentPrepared: string[] = Array.isArray(char.spells_prepared) ? char.spells_prepared : []
            const currentKnown: string[] = Array.isArray(char.spells_known) ? char.spells_known : []
            patch.spells_prepared = Array.from(new Set([...currentPrepared, ...rawDomain]))
            patch.spells_known = Array.from(new Set([...currentKnown, ...rawDomain]))
          }
        }

        // ── HP recalc on level-up (Wave 6H) ─────────────────────────────────
        // 5e average rule: each new level adds (avg hit die + CON mod).
        // We use calcMaxHpMulticlass with a one-element classes array for
        // single-class characters. Current HP increases by the same delta
        // so the level-up doesn't fully heal the character, but the newly
        // gained HP IS available immediately.
        try {
          const abilities = (char.abilities ?? {}) as Record<string, number>
          const conScore = Number(abilities.con ?? 10)
          const newMaxHp = calcMaxHpMulticlass({
            classes: [{ classKey: classKey as ClassKey, level: newLevel }],
            conScore,
            method: 'average',
          })
          const oldMaxHp = Number(char.hit_points_max ?? char.hp ?? 0)
          const delta = Math.max(0, newMaxHp - oldMaxHp)
          const oldCurHp = Number(char.hit_points_current ?? oldMaxHp)
          patch.hp = newMaxHp
          patch.hit_points_max = newMaxHp
          patch.hit_points_current = Math.max(0, Math.min(newMaxHp, oldCurHp + delta))
        } catch (e) {
          console.error('award-xp HP recalc error', e)
        }
      }

      return db
        .from('characters')
        .update(patch)
        .eq('id', char.id)
    })
  )

  const updateErrors = updates.filter((r) => r.error)
  if (updateErrors.length > 0) {
    console.error('XP update errors:', updateErrors.map((r) => r.error))
    return NextResponse.json({ error: 'Some XP updates failed' }, { status: 500 })
  }

  // Record xp_award on the session
  await db
    .from('sessions')
    .update({ xp_award: xp_amount })
    .eq('id', session_id)

  return NextResponse.json({
    ok: true,
    awarded_to: characters.length,
    xp_amount,
    level_ups: levelUps,
  })
}
