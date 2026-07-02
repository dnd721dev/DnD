import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { xpToLevel } from '@/lib/dnd5e'
import { MAX_XP_PER_AWARD } from '@/lib/levelUpRefresh'

/** POST /api/sessions/award-xp-mid
 *  Awards XP to all CAYA characters assigned to an **active** session.
 *  Unlike /award-xp, this does NOT require session status to be 'completed'.
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
  // Audit Wave 2B: same hard cap as end-of-session award.
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

  // Verify session + GM identity
  const { data: session, error: sessionErr } = await db
    .from('sessions')
    .select('id, gm_wallet, status, session_type')
    .eq('id', session_id)
    .maybeSingle()

  if (sessionErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if ((session.gm_wallet ?? '').toLowerCase() !== gm_wallet.toLowerCase()) {
    return NextResponse.json({ error: 'Only the session GM can award XP' }, { status: 403 })
  }

  // Fetch players assigned to this session
  const { data: players, error: playersErr } = await db
    .from('session_players')
    .select('character_id, wallet_address')
    .eq('session_id', session_id)
    .eq('role', 'player')

  if (playersErr) {
    return NextResponse.json({ error: 'Failed to fetch session players' }, { status: 500 })
  }

  if (!players?.length) {
    return NextResponse.json({ error: 'No players found in session' }, { status: 400 })
  }

  // Gather character IDs (some slots may be null if player hasn't picked a char yet)
  const characterIds = players
    .map((p: any) => p.character_id as string | null)
    .filter((id): id is string => !!id)

  if (!characterIds.length) {
    return NextResponse.json({ error: 'No characters assigned to session players yet' }, { status: 400 })
  }

  // Fetch those characters — only award to CAYA characters.
  // Wave 2C: pull all the columns the shared level-up helper reads, so that
  // crossing a level threshold mid-session refreshes spell slots / DC / HP
  // the same way end-of-session award does.
  const { data: charactersRaw, error: charErr } = await db
    .from('characters')
    .select('id, wallet_address, experience_points, level, main_job, subclass, secondary_class, secondary_subclass, secondary_level, abilities, spells_prepared, spells_known, resource_state, action_state, hp, hit_points_max, hit_points_current, is_caya')
    .in('id', characterIds)
    .eq('is_caya', true)

  if (charErr) {
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
  }

  if (!charactersRaw?.length) {
    return NextResponse.json({ error: 'No CAYA characters found for session players' }, { status: 400 })
  }

  // Audit Wave 2A: defense-in-depth — re-verify each fetched character's
  // wallet matches a session_players row. Prevents XP leakage if
  // session_players.character_id were tampered to point at another wallet's
  // character (the existing FK alone doesn't enforce ownership).
  const playerWalletByCharId = new Map<string, string>()
  for (const p of players as any[]) {
    if (p.character_id && p.wallet_address) {
      playerWalletByCharId.set(p.character_id, String(p.wallet_address).toLowerCase())
    }
  }
  const characters = (charactersRaw as any[]).filter((c) =>
    playerWalletByCharId.get(c.id) === String(c.wallet_address ?? '').toLowerCase(),
  )

  if (characters.length === 0) {
    return NextResponse.json({ error: 'No CAYA characters found for session players' }, { status: 400 })
  }

  // Bank XP only — never auto-level. Crossing a threshold makes the gold
  // "Click to Level Up" bar appear on the player's sheet, which runs the
  // manual class-pick → ASI/subclass → HP flow (take-class-level). Auto-leveling
  // here skipped that flow entirely, so we only advance XP.
  const levelUps: { characterId: string; oldLevel: number; newLevel: number }[] = []
  const updates = await Promise.all(
    characters.map((char: any) => {
      const oldXp = Number(char.experience_points ?? 0)
      const newXp = oldXp + xp_amount
      const oldLevel = Number(char.level ?? 1)
      const newLevel = xpToLevel(newXp)
      if (newLevel > oldLevel) levelUps.push({ characterId: char.id, oldLevel, newLevel })
      return db.from('characters').update({ experience_points: newXp }).eq('id', char.id)
    }),
  )

  const failed = updates.filter((r) => r.error)
  if (failed.length > 0) {
    console.error('Mid-session XP update errors:', failed.map((r) => r.error))
    return NextResponse.json({ error: 'Some XP updates failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    awarded_to: characters.length,
    xp_amount,
    level_ups: levelUps,
  })
}
