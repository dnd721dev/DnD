// GET /api/socials/spotify/callback — Spotify OAuth redirect target.
// Exchanges the code for tokens, stores them (service-role only table),
// and bounces back to /rewards.

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  const code = req.nextUrl.searchParams.get('code')
  const wallet = req.nextUrl.searchParams.get('state')?.toLowerCase() ?? ''
  const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const back = (msg: string) => NextResponse.redirect(`${origin}/rewards?spotify=${encodeURIComponent(msg)}`)

  if (!code || !/^0x[0-9a-f]{40}$/.test(wallet)) return back('error')

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return back('not-configured')

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${origin}/api/socials/spotify/callback`,
      }),
    })
    const json: any = await res.json()
    if (!json.access_token) return back('token-failed')

    // Who is this Spotify user? (id lets us block double-linking later)
    const meRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${json.access_token}` },
    })
    const me: any = await meRes.json().catch(() => ({}))

    const db = supabaseAdmin()
    const { error } = await db.from('profile_socials').upsert({
      wallet,
      platform: 'spotify',
      handle: me?.display_name ?? me?.id ?? null,
      external_id: me?.id ?? null,
      access_token: json.access_token,
      refresh_token: json.refresh_token ?? null,
      token_expires: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
      verified: true,
    }, { onConflict: 'wallet,platform' })
    if (error) return back('save-failed')
    return back('connected')
  } catch (e) {
    console.error('[spotify/callback]', e)
    return back('error')
  }
}
