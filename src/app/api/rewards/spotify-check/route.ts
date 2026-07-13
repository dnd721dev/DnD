// POST /api/rewards/spotify-check
// VERIFIED podcast listens: reads the caller's linked Spotify account and
// awards podcast_listen for DND721 podcast episodes found in their
// currently-playing or recently-played history. Once per episode.
//
// Episode matching: DND721_SPOTIFY_SHOW_ID (exact show) when set, else any
// show whose name contains "dnd721".

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { awardPoints } from '@/lib/rewards'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const SHOW_ID = process.env.DND721_SPOTIFY_SHOW_ID ?? ''

async function freshAccessToken(db: ReturnType<typeof supabaseAdmin>, row: any): Promise<string | null> {
  const expires = row.token_expires ? new Date(row.token_expires).getTime() : 0
  if (row.access_token && expires > Date.now() + 60_000) return row.access_token
  // Refresh
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret || !row.refresh_token) return null
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.refresh_token }),
  })
  const json: any = await res.json().catch(() => ({}))
  if (!json.access_token) return null
  await db.from('profile_socials').update({
    access_token: json.access_token,
    token_expires: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
  }).eq('id', row.id)
  return json.access_token
}

function isOurShow(show: any): boolean {
  if (!show) return false
  if (SHOW_ID) return show.id === SHOW_ID
  return /dnd\s*721/i.test(String(show.name ?? ''))
}

export async function POST(req: NextRequest): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }
  const rl = checkRateLimit(rateLimitKey(req, `spotify-check:${wallet}`), { limit: 6, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const db = supabaseAdmin()
  const { data: link } = await db.from('profile_socials')
    .select('*').eq('wallet', wallet).eq('platform', 'spotify').maybeSingle()
  if (!link) return NextResponse.json({ error: 'Connect Spotify on your profile first' }, { status: 404 })

  const token = await freshAccessToken(db, link)
  if (!token) return NextResponse.json({ error: 'Spotify link expired — reconnect it' }, { status: 401 })

  const episodes: Array<{ id: string; name: string }> = []
  try {
    // Currently playing (episodes need additional_types)
    const nowRes = await fetch(
      'https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode',
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (nowRes.status === 200) {
      const now: any = await nowRes.json()
      const item = now?.item
      if (item?.type === 'episode' && isOurShow(item.show)) {
        episodes.push({ id: item.id, name: item.name })
      }
    }
    // Recently played (may include episodes depending on client)
    const recRes = await fetch(
      'https://api.spotify.com/v1/me/player/recently-played?limit=50',
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (recRes.ok) {
      const rec: any = await recRes.json()
      for (const it of rec?.items ?? []) {
        const track = it?.track
        if (track?.type === 'episode' && isOurShow(track.show)) {
          episodes.push({ id: track.id, name: track.name })
        }
      }
    }
  } catch (e) {
    console.error('[spotify-check]', e)
    return NextResponse.json({ error: 'Spotify API error — try again' }, { status: 502 })
  }

  await db.from('profile_socials').update({ last_scan: new Date().toISOString() }).eq('id', (link as any).id)

  let awarded = 0
  const seen = new Set<string>()
  for (const ep of episodes) {
    if (seen.has(ep.id)) continue
    seen.add(ep.id)
    const r = await awardPoints(db, {
      wallet, action: 'podcast_listen',
      refId: `spotify:${ep.id}`,
      note: `Spotify: ${ep.name}`,
    })
    if (r.awarded) awarded++
  }

  return NextResponse.json({
    ok: true,
    found: seen.size,
    awarded,
    message: seen.size === 0
      ? 'No DND721 episodes in your current/recent Spotify playback. Play an episode, then check again while it plays.'
      : awarded === 0
      ? 'Episodes found, but you already earned points for them.'
      : `+${awarded} listen${awarded > 1 ? 's' : ''} verified!`,
  })
}
