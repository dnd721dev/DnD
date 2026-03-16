import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'

const AddMarkerSchema = z.object({
  recordingId: z.string().uuid(),
  sessionId: z.string().uuid(),
  label: z.string().min(1).max(100),
  offsetSec: z.number().int().min(0),
})

/** GET /api/recording-markers?recordingId=<uuid> */
export async function GET(req: NextRequest) {
  const recordingId = req.nextUrl.searchParams.get('recordingId')
  if (!recordingId) return NextResponse.json({ error: 'recordingId required' }, { status: 400 })

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('recording_markers')
    .select('*')
    .eq('recording_id', recordingId)
    .order('offset_sec', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ markers: data ?? [] })
}

/** POST /api/recording-markers — add a marker */
export async function POST(req: NextRequest) {
  const parsed = AddMarkerSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { recordingId, sessionId, label, offsetSec } = parsed.data
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('recording_markers')
    .insert({ recording_id: recordingId, session_id: sessionId, label, offset_sec: offsetSec })
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ marker: data }, { status: 201 })
}

/** DELETE /api/recording-markers?id=<uuid> */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const db = supabaseAdmin()
  const { error } = await db.from('recording_markers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
