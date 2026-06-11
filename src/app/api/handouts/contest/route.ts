import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

// Mirrors src/components/character-sheet/skills.ts — kept server-side so the
// contest can resolve without trusting client-submitted modifiers.
const SKILL_ABILITY: Record<string, 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'> = {
  acrobatics: 'dex', animal_handling: 'wis', arcana: 'int', athletics: 'str',
  deception: 'cha', history: 'int', insight: 'wis', intimidation: 'cha',
  investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
  performance: 'cha', persuasion: 'cha', religion: 'int',
  sleight_of_hand: 'dex', stealth: 'dex', survival: 'wis',
}

function profBonusForLevel(level: number) {
  if (level >= 17) return 6
  if (level >= 13) return 5
  if (level >= 9) return 4
  if (level >= 5) return 3
  return 2
}

const ContestSchema = z.object({
  sessionId: z.string().uuid(),
  handoutId: z.string().uuid(),
  gmWallet:  z.string().min(1),
  skill:     z.string().min(1).max(30),
})

/**
 * POST /api/handouts/contest
 * GM-only: roll the chosen skill check for every player character in the
 * session (1d20 + ability mod + proficiency where proficient), reveal the
 * handout to the highest roller only, and announce the contest results in
 * session chat. Returns the per-player rolls + winner.
 */
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(rateLimitKey(req, 'handout-contest'), { limit: 20, windowMs: 60 * 1000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = ContestSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { sessionId, handoutId, gmWallet, skill } = parsed.data
  const skillKey = skill.toLowerCase().replace(/\s+/g, '_')
  const ability = SKILL_ABILITY[skillKey]
  if (!ability) return NextResponse.json({ error: `Unknown skill: ${skill}` }, { status: 400 })

  const db = supabaseAdmin()

  // GM auth
  const { data: session } = await db.from('sessions').select('gm_wallet').eq('id', sessionId).maybeSingle()
  if (!session || session.gm_wallet?.toLowerCase() !== gmWallet.toLowerCase()) {
    return NextResponse.json({ error: 'Only the GM can run a handout contest' }, { status: 403 })
  }

  // Handout must belong to this session
  const { data: handout } = await db
    .from('session_handouts')
    .select('id, title, revealed_to')
    .eq('id', handoutId)
    .eq('session_id', sessionId)
    .maybeSingle()
  if (!handout) return NextResponse.json({ error: 'Handout not found' }, { status: 404 })

  // Every player character in the session participates.
  const { data: links } = await db
    .from('session_characters')
    .select('character_id, wallet_address')
    .eq('session_id', sessionId)
  if (!links || links.length === 0) {
    return NextResponse.json({ error: 'No player characters in this session' }, { status: 400 })
  }

  const charIds = links.map((l: any) => l.character_id)
  const { data: chars } = await db
    .from('characters')
    .select('id, name, level, abilities, skill_proficiencies')
    .in('id', charIds)

  type RollRow = { wallet: string; name: string; d20: number; mod: number; total: number }
  const rolls: RollRow[] = []
  for (const link of links) {
    const ch: any = (chars ?? []).find((x: any) => x.id === link.character_id)
    if (!ch) continue
    const score = Number(ch.abilities?.[ability] ?? 10)
    const abilityMod = Math.floor((score - 10) / 2)
    const profState = String(ch.skill_proficiencies?.[skillKey] ?? 'none')
    const pb = profBonusForLevel(Number(ch.level ?? 1))
    const profPart = profState === 'expertise' ? pb * 2 : profState === 'proficient' ? pb : 0
    const mod = abilityMod + profPart
    const d20 = Math.floor(Math.random() * 20) + 1
    rolls.push({
      wallet: String(link.wallet_address).toLowerCase(),
      name: ch.name ?? 'Adventurer',
      d20,
      mod,
      total: d20 + mod,
    })
  }
  if (rolls.length === 0) return NextResponse.json({ error: 'No eligible characters' }, { status: 400 })

  // Highest total wins; tie-break by higher modifier, then first in order.
  rolls.sort((a, b) => b.total - a.total || b.mod - a.mod)
  const winner = rolls[0]

  // Reveal the handout to the winner only (dedup).
  const current: string[] = Array.isArray(handout.revealed_to) ? handout.revealed_to : []
  if (!current.map((x) => x.toLowerCase()).includes(winner.wallet)) {
    const { error: updErr } = await db
      .from('session_handouts')
      .update({ revealed_to: [...current, winner.wallet] })
      .eq('id', handoutId)
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // Announce in session chat so every player sees the contest play out.
  const skillLabel = skillKey.replace(/_/g, ' ')
  const lines = rolls.map((r) => `${r.name}: ${r.total} (d20 ${r.d20} ${r.mod >= 0 ? '+' : ''}${r.mod})`)
  await db.from('session_messages').insert({
    session_id: sessionId,
    sender_wallet: gmWallet.toLowerCase(),
    sender_name: 'GM',
    kind: 'system',
    body: `🎲 ${skillLabel} contest for "${handout.title}" — ${lines.join(' · ')}. ${winner.name} succeeds and receives the handout!`,
  })

  return NextResponse.json({ rolls, winner: { wallet: winner.wallet, name: winner.name, total: winner.total } })
}
