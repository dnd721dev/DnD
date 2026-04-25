import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/livekit-token
 *   ?room=<roomName>
 *   &identity=<walletOrId>
 *   &sessionId=<uuid>   (optional — when present, grants roomAdmin to the DM)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const room      = searchParams.get('room')
  const identity  = searchParams.get('identity')
  const sessionId = searchParams.get('sessionId') ?? null

  if (!room || !identity) {
    return NextResponse.json({ error: 'room and identity are required' }, { status: 400 })
  }

  // Validate room name: allow session-<uuid>, plain uuid, or custom livekit room names
  const validRoomPattern = /^[a-zA-Z0-9_\-.:@]{1,128}$/
  if (!validRoomPattern.test(room)) {
    return NextResponse.json({ error: 'Invalid room identifier' }, { status: 400 })
  }

  const apiKey    = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 503 })
  }

  // Determine if this caller is the GM for the session — grants roomAdmin.
  // We verify server-side so the client cannot self-elevate by passing isGm=true.
  let isGm = false
  if (sessionId) {
    try {
      const db = supabaseAdmin()
      const { data: session } = await db
        .from('sessions')
        .select('gm_wallet')
        .eq('id', sessionId)
        .maybeSingle()
      if (session?.gm_wallet && session.gm_wallet.toLowerCase() === identity.toLowerCase()) {
        isGm = true
      }
    } catch {
      // Non-fatal — fall back to non-admin token
    }
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: '8h',
  })
  at.addGrant({
    roomJoin:       true,
    room,
    canPublish:     true,
    canSubscribe:   true,
    canPublishData: true,
    roomAdmin:      isGm,  // DM gets admin privileges; players do not
  })

  const token = await at.toJwt()
  return NextResponse.json({ token })
}
