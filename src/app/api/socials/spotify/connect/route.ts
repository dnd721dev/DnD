// GET /api/socials/spotify/connect?wallet=0x…
// Kicks off Spotify OAuth so listens to the DND721 podcast can be VERIFIED.
// Scopes are read-only playback history. The wallet rides in `state`.

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase() ?? ''
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: 'Spotify not configured (SPOTIFY_CLIENT_ID missing)' }, { status: 503 })

  const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`
  const redirectUri = `${origin}/api/socials/spotify/callback`
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'user-read-recently-played user-read-currently-playing',
    redirect_uri: redirectUri,
    state: wallet,
  })
  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`)
}
