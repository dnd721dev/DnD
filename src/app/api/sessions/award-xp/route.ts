import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { xpToLevel } from '@/lib/dnd5e'
import {
  canMulticlassInto,
  MULTICLASS_PREREQS,
} from '@/lib/spellcastingProgression'
import { buildLevelUpPatch, MAX_XP_PER_AWARD } from '@/lib/levelUpRefresh'

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
  // Audit Wave 2B: cap to prevent rogue-GM / griefing inflation.
  if (xp_amount > MAX_XP_PER_AWARD) {
    return NextResponse.json(
      { error: `xp_amount must be ≤ ${MAX_XP_PER_AWARD}` },
      { status: 400 },
    )
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
  const { data: charactersRaw, error: charErr } = await db
    .from('characters')
    .select('id, wallet_address, experience_points, level, main_job, subclass, secondary_class, secondary_subclass, secondary_level, abilities, spells_prepared, spells_known, resource_state, action_state, hp, hit_points_max, hit_points_current')
    .in('wallet_address', wallets)
    .eq('is_caya', true)

  if (charErr) {
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
  }

  if (!charactersRaw?.length) {
    return NextResponse.json({ error: 'No CAYA characters found for participants' }, { status: 400 })
  }

  // Audit Wave 2A: defense-in-depth — re-verify each character's wallet is
  // actually in the participant list before awarding. Prevents XP escalation
  // if `characters.wallet_address` were tampered or join logic regressed.
  const participantWalletSet = new Set(
    participants.map((p: any) => String(p.wallet_address ?? '').toLowerCase()),
  )
  const characters = charactersRaw.filter((c: any) =>
    participantWalletSet.has(String(c.wallet_address ?? '').toLowerCase()),
  )

  if (characters.length === 0) {
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

        // Audit Wave 2C: spell slots, save DC, attack bonus, HP recalc and
        // subclass-spell unions are computed by the shared helper so that
        // award-xp-mid produces an identical result when it level-ups.
        const levelUpPatch = buildLevelUpPatch(char, newLevel)
        Object.assign(patch, levelUpPatch)
        levelUps.push({ characterId: char.id, oldLevel, newLevel })
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
