// POST /api/rewards/telegram-winner
// Called by the Telegram DND bot to grant weekly-winner points.
// Auth: Authorization: Bearer <REWARDS_BOT_SECRET> (falls back to CRON_SECRET).
// Body: { wallet, week? } — week defaults to the current ISO week, and is the
// dedupe key so a winner can only be granted once per week.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { awardPoints } from '@/lib/rewards'

function isoWeek(d = new Date()): string {
  // ISO-8601 week number, e.g. "2026-W27"
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

const Schema = z.object({
  wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  week:   z.string().regex(/^\d{4}-W\d{2}$/).optional(),
  note:   z.string().max(200).optional(),
})

export async function POST(req: NextRequest): Promise<Response> {
  const secret = process.env.REWARDS_BOT_SECRET || process.env.CRON_SECRET
  const auth = req.headers.get('authorization') ?? ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const week = parsed.data.week ?? isoWeek()

  const result = await awardPoints(supabaseAdmin(), {
    wallet: parsed.data.wallet.toLowerCase(),
    action: 'telegram_weekly_winner',
    refId: week,
    note: parsed.data.note ?? `Telegram DND bot weekly winner (${week})`,
  })
  if (!result.awarded) {
    return NextResponse.json({ error: `Winner already granted for ${week}` }, { status: 409 })
  }
  return NextResponse.json({ ok: true, week, points: result.points })
}
