// POST /api/rewards/scan-shares
// Scans the caller's LINKED social accounts for DND721 mentions and awards
// social_share per detected post (deduped by post id — no daily cap needed,
// because these are verified real posts, not pasted links).
//
// Adapters:
//   • reddit — public JSON API: posts + comments by u/<handle> matching /dnd ?721/i
//   • x      — X API v2 recent search (`from:<handle> dnd721`) when
//              X_BEARER_TOKEN is configured (X requires a paid API tier)
//   • instagram / tiktok / youtube / telegram — no public per-user read APIs;
//     reported as needing the manual claim path.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { awardPoints } from '@/lib/rewards'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const MENTION = /dnd\s*721/i

type ScanResult = { platform: string; found: number; awarded: number; note?: string }

async function scanReddit(db: any, wallet: string, handle: string): Promise<ScanResult> {
  let found = 0, awarded = 0
  try {
    for (const feed of ['submitted', 'comments']) {
      const res = await fetch(`https://www.reddit.com/user/${encodeURIComponent(handle)}/${feed}.json?limit=50`, {
        headers: { 'User-Agent': 'dnd721-rewards/1.0' },
      })
      if (!res.ok) continue
      const json: any = await res.json()
      for (const child of json?.data?.children ?? []) {
        const d = child?.data ?? {}
        const text = `${d.title ?? ''} ${d.selftext ?? ''} ${d.body ?? ''} ${d.url ?? ''}`
        if (!MENTION.test(text)) continue
        found++
        const r = await awardPoints(db, {
          wallet, action: 'social_share',
          refId: `reddit:${d.name ?? d.id}`,
          note: `https://reddit.com${d.permalink ?? ''}`,
        })
        if (r.awarded) awarded++
      }
    }
    return { platform: 'reddit', found, awarded }
  } catch (e) {
    console.error('[scan-shares] reddit', e)
    return { platform: 'reddit', found, awarded, note: 'Reddit scan failed — try again later' }
  }
}

async function scanX(db: any, wallet: string, handle: string): Promise<ScanResult> {
  const bearer = process.env.X_BEARER_TOKEN
  if (!bearer) {
    return { platform: 'x', found: 0, awarded: 0, note: 'X scanning not enabled yet — use the manual claim below' }
  }
  let found = 0, awarded = 0
  try {
    const q = encodeURIComponent(`from:${handle} dnd721 -is:retweet`)
    const res = await fetch(`https://api.x.com/2/tweets/search/recent?query=${q}&max_results=50`, {
      headers: { Authorization: `Bearer ${bearer}` },
    })
    if (!res.ok) {
      return { platform: 'x', found: 0, awarded: 0, note: `X API error (${res.status})` }
    }
    const json: any = await res.json()
    for (const t of json?.data ?? []) {
      found++
      const r = await awardPoints(db, {
        wallet, action: 'social_share',
        refId: `x:${t.id}`,
        note: `https://x.com/${handle}/status/${t.id}`,
      })
      if (r.awarded) awarded++
    }
    return { platform: 'x', found, awarded }
  } catch (e) {
    console.error('[scan-shares] x', e)
    return { platform: 'x', found, awarded, note: 'X scan failed — try again later' }
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `scan-shares:${wallet}`), { limit: 4, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const db = supabaseAdmin()
  const { data: links } = await db.from('profile_socials')
    .select('id, platform, handle')
    .eq('wallet', wallet)
    .neq('platform', 'spotify')
  if (!links || links.length === 0) {
    return NextResponse.json({ error: 'Link a social account on your profile first' }, { status: 404 })
  }

  const results: ScanResult[] = []
  for (const link of links as any[]) {
    if (!link.handle) continue
    if (link.platform === 'reddit') results.push(await scanReddit(db, wallet, link.handle))
    else if (link.platform === 'x') results.push(await scanX(db, wallet, link.handle))
    else results.push({
      platform: link.platform, found: 0, awarded: 0,
      note: 'This platform has no public post API — use the manual claim for it',
    })
    await db.from('profile_socials').update({ last_scan: new Date().toISOString() }).eq('id', link.id)
  }

  const totalAwarded = results.reduce((s, r) => s + r.awarded, 0)
  return NextResponse.json({ ok: true, results, totalAwarded })
}
