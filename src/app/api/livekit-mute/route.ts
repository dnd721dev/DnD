import { NextRequest, NextResponse } from 'next/server'
import { RoomServiceClient } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'

const Schema = z.object({
  roomName:             z.string().min(1).max(200),
  participantIdentity:  z.string().min(1),
  muted:                z.boolean(),
  /** The caller's wallet address — verified as GM before mute is applied. */
  callerWallet:         z.string().min(1),
  sessionId:            z.string().uuid(),
})

/**
 * POST /api/livekit-mute
 * Allows a verified GM to remotely mute a participant's audio track.
 * Requires roomAdmin grant on the DM's token (granted by /api/livekit-token
 * when sessionId matches and caller is the session's gm_wallet).
 */
export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { roomName, participantIdentity, muted, callerWallet, sessionId } = parsed.data

  const wsUrl     = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL
  const apiKey    = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!wsUrl || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 503 })
  }

  // Server-side verification: caller must be the session's GM
  const db = supabaseAdmin()
  const { data: session } = await db
    .from('sessions')
    .select('gm_wallet')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session || session.gm_wallet?.toLowerCase() !== callerWallet.toLowerCase()) {
    return NextResponse.json({ error: 'Forbidden: only the GM can mute participants' }, { status: 403 })
  }

  const host   = wsUrl.replace('wss://', 'https://')
  const client = new RoomServiceClient(host, apiKey, apiSecret)

  try {
    // Fetch the participant to find their audio track SID
    const participant = await client.getParticipant(roomName, participantIdentity)
    // Track type 1 = AUDIO in the LiveKit protobuf enum
    const audioTrack = (participant.tracks ?? []).find((t: any) => t.type === 1)
    if (!audioTrack?.sid) {
      return NextResponse.json({ error: 'No audio track found for participant' }, { status: 404 })
    }

    await client.mutePublishedTrack(roomName, participantIdentity, audioTrack.sid, muted)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('livekit-mute error', err)
    return NextResponse.json({ error: err?.message ?? 'Mute operation failed' }, { status: 500 })
  }
}
