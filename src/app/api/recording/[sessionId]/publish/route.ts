import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'

const Schema = z.object({
  recordingId:   z.string().uuid(),
  published:     z.boolean(),
  episodeTitle:  z.string().max(200).optional(),
  episodeNumber: z.number().int().positive().optional(),
})

type Params = { params: Promise<{ sessionId: string }> }

/** PATCH /api/recording/[sessionId]/publish — publish or unpublish an episode */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { sessionId } = await params
  const parsed = Schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }
  const { recordingId, published, episodeTitle, episodeNumber } = parsed.data

  const update: Record<string, unknown> = { published }
  if (episodeTitle  !== undefined) update.episode_title  = episodeTitle
  if (episodeNumber !== undefined) update.episode_number = episodeNumber

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('session_recordings')
    .update(update)
    .eq('id', recordingId)
    .eq('session_id', sessionId)
    .select('id, published, episode_title, episode_number')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recording: data })
}
