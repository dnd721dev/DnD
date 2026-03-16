import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit'

type Params = { params: Promise<{ id: string }> }

const PatchSponsorSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'status must be approved or rejected' }),
  }),
  gm_notes: z.string().max(1000).optional(),
})

/** PATCH /api/sponsor/[id]  — GM approves or rejects a sponsored monster */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // 20 approvals/rejections per minute per IP
  const rl = checkRateLimit(rateLimitKey(req, 'sponsor'), { limit: 20, windowMs: 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many requests. Slow down.' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter) },
    })
  }

  const parsed = PatchSponsorSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { status, gm_notes } = parsed.data

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('sponsored_monsters')
    .update({ status, gm_notes: gm_notes ?? null })
    .eq('id', id)
    .select()
    .maybeSingle()

  if (error) {
    console.error('sponsor update error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sponsor: data })
}
