import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

/** GET /api/livekit-token?room=<roomName>&identity=<walletOrId> */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const room     = searchParams.get('room')
  const identity = searchParams.get('identity')

  if (!room || !identity) {
    return NextResponse.json({ error: 'room and identity are required' }, { status: 400 })
  }

  // Validate room name: allow session-<uuid>, plain uuid, or custom livekit room names
  // Reject anything with shell-injectable chars or excessive length
  const validRoomPattern = /^[a-zA-Z0-9_\-.:@]{1,128}$/
  if (!validRoomPattern.test(room)) {
    return NextResponse.json({ error: 'Invalid room identifier' }, { status: 400 })
  }

  const apiKey    = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 503 })
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: '8h',
  })
  at.addGrant({
    roomJoin:     true,
    room,
    canPublish:   true,
    canSubscribe: true,
    canPublishData: true,
  })

  const token = await at.toJwt()
  return NextResponse.json({ token })
}
