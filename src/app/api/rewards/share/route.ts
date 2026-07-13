// POST /api/rewards/share
// Claim points for sharing DND721 content on socials. The user submits the
// link to their post; awarded once per platform per UTC day, with the URL
// kept in the ledger note for audit/spot-checking.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { awardPoints } from '@/lib/rewards'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

const PLATFORM_HOSTS: Record<string, RegExp> = {
  x:         /(^|\.)((x|twitter)\.com)$/i,
  facebook:  /(^|\.)(facebook\.com|fb\.com)$/i,
  instagram: /(^|\.)instagram\.com$/i,
  tiktok:    /(^|\.)tiktok\.com$/i,
  youtube:   /(^|\.)(youtube\.com|youtu\.be)$/i,
  reddit:    /(^|\.)reddit\.com$/i,
  discord:   /(^|\.)discord\.(com|gg)$/i,
  telegram:  /(^|\.)(t\.me|telegram\.me)$/i,
}

const Schema = z.object({
  platform: z.enum(['x', 'facebook', 'instagram', 'tiktok', 'youtube', 'reddit', 'discord', 'telegram']),
  url:      z.string().url().max(500),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `rewards-share:${wallet}`), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const { platform, url } = parsed.data

  // The link must actually point at the platform being claimed.
  let host = ''
  try { host = new URL(url).hostname } catch { /* zod already validated */ }
  if (!PLATFORM_HOSTS[platform]!.test(host)) {
    return NextResponse.json({ error: `That link doesn't look like a ${platform} post` }, { status: 400 })
  }

  const day = new Date().toISOString().slice(0, 10)
  const result = await awardPoints(supabaseAdmin(), {
    wallet,
    action: 'social_share',
    refId: `${platform}:${day}`,   // one share reward per platform per day
    note: url,
  })
  if (!result.awarded) {
    return NextResponse.json({ error: `Already claimed today's ${platform} share — come back tomorrow!` }, { status: 409 })
  }
  return NextResponse.json({ ok: true, points: result.points })
}
