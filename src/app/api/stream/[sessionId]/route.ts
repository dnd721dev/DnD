// /api/stream/[sessionId]
// Live streaming of the session's LiveKit room to X / Twitch / YouTube (or
// any RTMP endpoint) via LiveKit RoomComposite egress.
//
//   GET    — current live stream (if any) for the session
//   POST   — start streaming { roomName, rtmpUrl, streamKey, platform, wallet } —
//            any session participant or the GM may go live
//   DELETE — stop the active stream (starter or GM)
//
// The stream key is combined with the ingest URL server-side, passed straight
// to LiveKit, and NEVER persisted.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { EgressClient, StreamOutput, StreamProtocol } from 'livekit-server-sdk'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

function livekitHost(): string {
  const url = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? process.env.LIVEKIT_URL ?? ''
  return url.replace(/^wss?:\/\//, 'https://')
}

function makeEgressClient(): EgressClient {
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!apiKey || !apiSecret || !livekitHost()) {
    throw new Error('LiveKit credentials not configured')
  }
  return new EgressClient(livekitHost(), apiKey, apiSecret)
}

/** Caller must be the session GM or one of its players. */
async function verifyParticipant(db: ReturnType<typeof supabaseAdmin>, sessionId: string, wallet: string) {
  const { data: session } = await db.from('sessions').select('gm_wallet').eq('id', sessionId).maybeSingle()
  if (!session) return { ok: false as const, error: 'Session not found', status: 404 as const }
  if (String((session as any).gm_wallet ?? '').toLowerCase() === wallet) return { ok: true as const, isGm: true }
  const { data: player } = await db.from('session_players')
    .select('id').eq('session_id', sessionId).eq('wallet_address', wallet).maybeSingle()
  if (player) return { ok: true as const, isGm: false }
  return { ok: false as const, error: 'Only session participants can stream', status: 403 as const }
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await ctx.params
  const db = supabaseAdmin()
  const { data: stream } = await db.from('session_streams')
    .select('id, platform, started_by, started_at, egress_id')
    .eq('session_id', sessionId).eq('status', 'live')
    .order('started_at', { ascending: false }).limit(1).maybeSingle()
  return NextResponse.json({ stream: stream ?? null })
}

const StartSchema = z.object({
  wallet:    z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  roomName:  z.string().min(1).max(200),
  rtmpUrl:   z.string().url().max(500),
  streamKey: z.string().min(1).max(300),
  platform:  z.enum(['twitch', 'youtube', 'x', 'custom']).default('custom'),
})

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await ctx.params
  const rl = checkRateLimit(rateLimitKey(req, `stream:${sessionId}`), { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const parsed = StartSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 })
  const { roomName, rtmpUrl, streamKey, platform } = parsed.data
  const wallet = parsed.data.wallet.toLowerCase()

  // rtmp(s):// ingest only — refuse anything else early with a clear message.
  if (!/^rtmps?:\/\//i.test(rtmpUrl)) {
    return NextResponse.json({ error: 'Ingest URL must start with rtmp:// or rtmps://' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const who = await verifyParticipant(db, sessionId, wallet)
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })

  // One live stream per session at a time.
  const { data: existing } = await db.from('session_streams')
    .select('id').eq('session_id', sessionId).eq('status', 'live').maybeSingle()
  if (existing) return NextResponse.json({ error: 'Session is already streaming' }, { status: 409 })

  // Full RTMP target = ingest URL + key (normalized single slash join).
  const target = `${rtmpUrl.replace(/\/+$/, '')}/${streamKey.trim()}`

  try {
    const client = makeEgressClient()
    const egress = await client.startRoomCompositeEgress(
      roomName,
      { stream: new StreamOutput({ protocol: StreamProtocol.RTMP, urls: [target] }) },
      { layout: 'grid' },
    )
    const { data: row, error } = await db.from('session_streams').insert({
      session_id: sessionId,
      egress_id: egress.egressId,
      room_name: roomName,
      platform,
      started_by: wallet,
      status: 'live',
    }).select().single()
    if (error) {
      // DB insert failed — stop the egress so we don't leak a zombie stream.
      try { await client.stopEgress(egress.egressId) } catch { /* best effort */ }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, stream: row }, { status: 201 })
  } catch (e: any) {
    console.error('[stream] start failed', e)
    return NextResponse.json(
      { error: e?.message ?? 'Failed to start stream (is LiveKit egress enabled on your project?)' },
      { status: 502 },
    )
  }
}

const StopSchema = z.object({
  wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
})

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await ctx.params
  const parsed = StopSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'wallet required' }, { status: 400 })
  const wallet = parsed.data.wallet.toLowerCase()

  const db = supabaseAdmin()
  const { data: stream } = await db.from('session_streams')
    .select('id, egress_id, started_by')
    .eq('session_id', sessionId).eq('status', 'live')
    .order('started_at', { ascending: false }).limit(1).maybeSingle()
  if (!stream) return NextResponse.json({ error: 'No live stream' }, { status: 404 })

  // Starter or GM can stop.
  const who = await verifyParticipant(db, sessionId, wallet)
  const isStarter = String((stream as any).started_by).toLowerCase() === wallet
  if (!isStarter && !(who.ok && who.isGm)) {
    return NextResponse.json({ error: 'Only the streamer or the GM can stop the stream' }, { status: 403 })
  }

  try {
    const client = makeEgressClient()
    await client.stopEgress((stream as any).egress_id)
  } catch (e: any) {
    // Egress may have already ended (e.g. bad stream key) — still close the row.
    console.warn('[stream] stopEgress warning:', e?.message)
  }
  await db.from('session_streams')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', (stream as any).id)
  return NextResponse.json({ ok: true })
}
