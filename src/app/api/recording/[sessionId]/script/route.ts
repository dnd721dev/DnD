import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'

const Schema = z.object({
  recordingId:  z.string().uuid(),
  masterScript: z.string(),
})

type Params = { params: Promise<{ sessionId: string }> }

/** PATCH /api/recording/[sessionId]/script — save edited master script */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { sessionId } = await params
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { recordingId, masterScript } = parsed.data

  const db = supabaseAdmin()
  const { error } = await db
    .from('session_recordings')
    .update({ master_script: masterScript, master_script_status: 'done' })
    .eq('id', recordingId)
    .eq('session_id', sessionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
