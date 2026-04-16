import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'

const PatchSchema = z.object({
  transcript: z.string(),
})

type Params = { params: Promise<{ trackId: string }> }

/** PATCH /api/recording-tracks/[trackId] — update transcript text */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { trackId } = await params
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { error } = await db
    .from('recording_tracks')
    .update({ transcript: parsed.data.transcript, transcript_status: 'done' })
    .eq('id', trackId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
