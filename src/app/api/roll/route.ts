import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const RollSchema = z.object({
  /** Dice notation: "1d20", "2d6+3", "1d20-1". Max 20 dice, sides 2–100. */
  notation: z
    .string()
    .min(1)
    .max(50)
    .regex(/^\d+[dD]\d+([+-]\d+)?$/, 'Invalid notation — use e.g. 1d20+5'),

  sessionId: z.string().uuid(),
  rollType: z
    .enum(['attack', 'skill', 'save', 'damage', 'initiative', 'ability_check', 'coin_flip', 'test', 'custom'])
    .default('custom'),
  label: z.string().max(100).optional().default(''),
  characterId: z.string().uuid().optional(),
  targetTokenId: z.string().uuid().optional(),

  /** Advantage: roll the d20 portion twice, keep the higher value. */
  advantage: z.boolean().optional().default(false),
  /** Disadvantage: roll the d20 portion twice, keep the lower value. */
  disadvantage: z.boolean().optional().default(false),

  rollerName: z.string().max(80).optional().default('Adventurer'),
  rollerWallet: z.string().max(100).optional(),
})

// ── Parsing ────────────────────────────────────────────────────────────────────

interface ParsedNotation {
  count: number
  sides: number
  mod: number
}

function parseNotation(raw: string): ParsedNotation | null {
  const m = raw.match(/^(\d+)[dD](\d+)\s*([+-]\d+)?$/)
  if (!m) return null
  const count = parseInt(m[1], 10)
  const sides = parseInt(m[2], 10)
  const mod   = m[3] ? parseInt(m[3], 10) : 0
  if (count < 1 || count > 20) return null
  if (sides < 2  || sides > 100) return null
  return { count, sides, mod }
}

// ── Rolling ────────────────────────────────────────────────────────────────────

/** Roll a single die using a CSPRNG. */
function rollDie(sides: number): number {
  return randomInt(1, sides + 1) // [1, sides] inclusive
}

/** Roll coin: returns 1 (heads) or 2 (tails). */
function rollCoin(): number {
  return randomInt(0, 2) === 0 ? 1 : 2
}

interface RollOutput {
  individualDice: { die: string; value: number; dropped?: true }[]
  kept: number[]
  mod: number
  total: number
}

function executeRoll(
  parsed: ParsedNotation,
  advantage: boolean,
  disadvantage: boolean,
): RollOutput {
  const { count, sides, mod } = parsed
  const dieName = `d${sides}`

  // Advantage/disadvantage only applies to single d20 rolls (1d20)
  const useAdv = (advantage || disadvantage) && count === 1 && sides === 20

  if (useAdv) {
    const roll1 = rollDie(sides)
    const roll2 = rollDie(sides)
    const kept   = advantage
      ? Math.max(roll1, roll2)
      : Math.min(roll1, roll2)
    const dropped = advantage ? Math.min(roll1, roll2) : Math.max(roll1, roll2)

    return {
      individualDice: [
        { die: dieName, value: kept },
        { die: dieName, value: dropped, dropped: true },
      ],
      kept: [kept],
      mod,
      total: kept + mod,
    }
  }

  // Standard roll
  const rolls = Array.from({ length: count }, () => rollDie(sides))
  return {
    individualDice: rolls.map((v) => ({ die: dieName, value: v })),
    kept: rolls,
    mod,
    total: rolls.reduce((a, b) => a + b, 0) + mod,
  }
}

// ── Outcome ────────────────────────────────────────────────────────────────────

async function computeOutcome(params: {
  rollType: string
  kept: number[]
  sides: number
  total: number
  targetTokenId?: string
  db: ReturnType<typeof supabaseAdmin>
}): Promise<string | null> {
  const { rollType, kept, sides, total, targetTokenId, db } = params

  if (rollType === 'coin_flip') {
    return total === 1 ? 'Heads' : 'Tails'
  }

  if (rollType === 'attack' && sides === 20 && kept.length >= 1) {
    const natural = kept[0]
    if (natural === 20) return 'crit'
    if (natural === 1)  return 'crit_miss'

    if (targetTokenId) {
      const { data: token } = await db
        .from('tokens')
        .select('ac')
        .eq('id', targetTokenId)
        .maybeSingle()
      if (token?.ac != null) {
        return total >= token.ac ? 'hit' : 'miss'
      }
    }
  }

  return null
}

// ── Route handler ──────────────────────────────────────────────────────────────

export const runtime = 'nodejs' // crypto.randomInt requires Node.js

export async function POST(req: NextRequest) {
  // 60 rolls per minute per IP
  const rl = checkRateLimit(rateLimitKey(req, 'roll'), { limit: 60, windowMs: 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter) },
    })
  }

  const parsed = RollSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const {
    notation,
    sessionId,
    rollType,
    label,
    characterId,
    targetTokenId,
    advantage,
    disadvantage,
    rollerName,
    rollerWallet,
  } = parsed.data

  const db = supabaseAdmin()

  // ── Verify session exists ──────────────────────────────────────────────────
  const { data: session } = await db
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // ── Coin flip shortcut ─────────────────────────────────────────────────────
  if (rollType === 'coin_flip') {
    const value = rollCoin()
    const outcome = value === 1 ? 'Heads' : 'Tails'
    const coinNotation = '1d2'

    const { data: row, error: insertErr } = await db
      .from('session_rolls')
      .insert({
        session_id:      sessionId,
        character_id:    characterId ?? null,
        roller_wallet:   rollerWallet?.toLowerCase() ?? null,
        roller_name:     rollerName,
        roll_type:       'coin_flip',
        label:           label || 'Coin Flip',
        formula:         coinNotation,
        result_total:    value,
        individual_dice: [{ die: 'd2', value }],
        outcome,
        advantage:       false,
        disadvantage:    false,
      })
      .select()
      .maybeSingle()

    if (insertErr) {
      console.error('coin flip insert error', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      results:       [value],
      total:         value,
      rollId:        row?.id ?? null,
      outcome,
      individualDice: [{ die: 'd2', value }],
    }, { status: 201 })
  }

  // ── Parse notation ─────────────────────────────────────────────────────────
  const parsedNotation = parseNotation(notation)
  if (!parsedNotation) {
    return NextResponse.json(
      { error: `Cannot parse notation "${notation}". Use e.g. 2d6+3` },
      { status: 400 },
    )
  }

  // ── Execute roll ───────────────────────────────────────────────────────────
  const rollOutput = executeRoll(parsedNotation, advantage, disadvantage)

  // ── Compute outcome ────────────────────────────────────────────────────────
  const outcome = await computeOutcome({
    rollType,
    kept:          rollOutput.kept,
    sides:         parsedNotation.sides,
    total:         rollOutput.total,
    targetTokenId,
    db,
  })

  // ── Persist ────────────────────────────────────────────────────────────────
  const { data: row, error: insertErr } = await db
    .from('session_rolls')
    .insert({
      session_id:      sessionId,
      character_id:    characterId ?? null,
      roller_wallet:   rollerWallet?.toLowerCase() ?? null,
      roller_name:     rollerName,
      roll_type:       rollType,
      label:           label || notation,
      formula:         notation,
      result_total:    rollOutput.total,
      individual_dice: rollOutput.individualDice,
      target_token_id: targetTokenId ?? null,
      outcome:         outcome ?? null,
      advantage,
      disadvantage,
    })
    .select()
    .maybeSingle()

  if (insertErr) {
    console.error('session_rolls insert error', insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    results:        rollOutput.kept,
    total:          rollOutput.total,
    rollId:         row?.id ?? null,
    outcome,
    individualDice: rollOutput.individualDice,
  }, { status: 201 })
}
