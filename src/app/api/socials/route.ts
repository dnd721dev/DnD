// /api/socials
// GET    — list the caller's linked accounts (tokens redacted)
// POST   — link a handle-based platform { platform, handle }
// DELETE — unlink ?platform=

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const HANDLE_PLATFORMS = ['x', 'reddit', 'instagram', 'tiktok', 'youtube', 'telegram'] as const

function walletFrom(req: NextRequest): string | null {
  const w = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  return w && /^0x[0-9a-f]{40}$/.test(w) ? w : null
}

export async function GET(req: NextRequest): Promise<Response> {
  const wallet = walletFrom(req)
  if (!wallet) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  const db = supabaseAdmin()
  const { data } = await db.from('profile_socials')
    .select('platform, handle, verified, last_scan, created_at')
    .eq('wallet', wallet)
  return NextResponse.json({ socials: data ?? [] })
}

const LinkSchema = z.object({
  platform: z.enum(HANDLE_PLATFORMS),
  handle:   z.string().min(2).max(64)
    .transform((h) => h.replace(/^@/, '').replace(/^u\//, '').trim()),
})

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = walletFrom(req)
  if (!wallet) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  const rl = checkRateLimit(rateLimitKey(req, `socials:${wallet}`), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = LinkSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const { platform, handle } = parsed.data

  // A handle can back only one wallet — prevents two wallets farming the
  // same public account's posts.
  const db = supabaseAdmin()
  const { data: taken } = await db.from('profile_socials')
    .select('id, wallet').eq('platform', platform).ilike('handle', handle).maybeSingle()
  if (taken && String((taken as any).wallet) !== wallet) {
    return NextResponse.json({ error: 'That handle is already linked to another wallet' }, { status: 409 })
  }

  const { error } = await db.from('profile_socials').upsert({
    wallet, platform, handle, verified: false,
  }, { onConflict: 'wallet,platform' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const wallet = walletFrom(req)
  if (!wallet) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  const platform = req.nextUrl.searchParams.get('platform')
  if (!platform) return NextResponse.json({ error: 'platform required' }, { status: 400 })
  const db = supabaseAdmin()
  await db.from('profile_socials').delete().eq('wallet', wallet).eq('platform', platform)
  return NextResponse.json({ ok: true })
}
