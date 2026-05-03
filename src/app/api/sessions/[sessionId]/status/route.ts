// POST /api/sessions/[sessionId]/status
// DM-only endpoint for session lifecycle transitions.
//
// Body: { action: 'open_lobby' | 'start_session' | 'pause' | 'resume' | 'end_session' }
//
// State machine:
//   setup   → open_lobby   → lobby
//   lobby   → start_session → active
//   active  → pause        → paused
//   paused  → resume       → active
//   lobby | active | paused → end_session → completed

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { processSessionEndItems } from '@/lib/sessionItemProcessor'

type SessionStatus = 'setup' | 'lobby' | 'active' | 'paused' | 'completed'

type Action = 'open_lobby' | 'start_session' | 'pause' | 'resume' | 'end_session'

interface Transition {
  from:   SessionStatus[]
  to:     SessionStatus
  stampField?: string       // timestamp column to set to now()
  clearField?: string       // timestamp column to clear (null)
}

const TRANSITIONS: Record<Action, Transition> = {
  open_lobby:    { from: ['setup'],                        to: 'lobby',     stampField: 'lobby_at'      },
  start_session: { from: ['lobby'],                        to: 'active',    stampField: 'started_at'    },
  pause:         { from: ['active'],                       to: 'paused',    stampField: 'paused_at'     },
  resume:        { from: ['paused'],                       to: 'active',    clearField: 'paused_at'     },
  end_session:   { from: ['lobby', 'active', 'paused'],    to: 'completed', stampField: 'completed_at'  },
}

const BodySchema = z.object({
  action: z.enum(['open_lobby', 'start_session', 'pause', 'resume', 'end_session']),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const wallet = req.headers.get('x-wallet-address')?.toLowerCase() ?? null
  if (!wallet || !/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
  }

  const { sessionId } = await params
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid request' },
      { status: 400 },
    )
  }
  const { action } = parsed.data

  const db = supabaseAdmin()

  // ── Load session ────────────────────────────────────────────────────────────
  const { data: session, error: fetchErr } = await db
    .from('sessions')
    .select('id, status, gm_wallet, started_at, completed_at')
    .eq('id', sessionId)
    .maybeSingle()

  if (fetchErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // ── DM-only guard ───────────────────────────────────────────────────────────
  const gmWallet = String((session as any).gm_wallet ?? '').toLowerCase()
  if (gmWallet !== wallet) {
    return NextResponse.json({ error: 'Only the GM can change session status' }, { status: 403 })
  }

  const currentStatus = (session as any).status as SessionStatus

  // ── Validate transition ─────────────────────────────────────────────────────
  const transition = TRANSITIONS[action]
  if (!transition.from.includes(currentStatus)) {
    return NextResponse.json(
      {
        error: `Cannot perform '${action}' when session is '${currentStatus}'. ` +
               `Valid from: ${transition.from.join(', ')}`,
      },
      { status: 409 },
    )
  }

  // ── Build update payload ────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const update: Record<string, unknown> = { status: transition.to }

  if (transition.stampField) update[transition.stampField] = now
  if (transition.clearField) update[transition.clearField] = null

  // For 'end_session', calculate duration_seconds from started_at
  if (action === 'end_session') {
    const startedAt = (session as any).started_at as string | null
    if (startedAt) {
      const durationMs = Date.now() - new Date(startedAt).getTime()
      update['duration_seconds'] = Math.floor(durationMs / 1000)
    }
  }

  // ── Apply status update ─────────────────────────────────────────────────────
  const { error: updateErr } = await db
    .from('sessions')
    .update(update)
    .eq('id', sessionId)

  if (updateErr) {
    console.error(`[sessions/status] update error:`, updateErr.message)
    return NextResponse.json({ error: 'Failed to update session status' }, { status: 500 })
  }

  // ── Side effects on end_session ─────────────────────────────────────────────
  if (action === 'end_session') {
    // 1. Process session items (remove auto-remove items from character inventories)
    try {
      await processSessionEndItems(sessionId)
    } catch (err) {
      console.error('[sessions/status] processSessionEndItems error:', err)
      // Non-fatal — session is already marked completed
    }

    // 2. Stop any active recordings
    try {
      await db
        .from('session_recordings')
        .update({ status: 'stopped', stopped_at: now })
        .eq('session_id', sessionId)
        .eq('status', 'recording')
    } catch (err) {
      console.error('[sessions/status] stop recording error:', err)
    }

    // 3. Mark any active encounters as ended
    try {
      await db
        .from('encounters')
        .update({ status: 'ended' })
        .eq('session_id', sessionId)
        .eq('status', 'active')
    } catch (err) {
      console.error('[sessions/status] end encounters error:', err)
    }
  }

  return NextResponse.json({
    ok:     true,
    status: transition.to,
    action,
  })
}
