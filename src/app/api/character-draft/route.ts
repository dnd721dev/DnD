import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { z } from 'zod'

const UpsertDraftSchema = z.object({
  walletAddress: z.string().min(1),
  draftData: z.record(z.unknown()),
})

/** GET /api/character-draft?wallet=0x... */
export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase()
  if (!wallet) return NextResponse.json({ draft: null })

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('character_drafts')
    .select('draft_data, updated_at')
    .eq('wallet_address', wallet)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data?.draft_data ?? null, updatedAt: data?.updated_at ?? null })
}

/** POST /api/character-draft — upsert draft */
export async function POST(req: NextRequest) {
  const parsed = UpsertDraftSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
  }

  const { walletAddress, draftData } = parsed.data
  const wallet = walletAddress.toLowerCase()

  const db = supabaseAdmin()
  const { error } = await db
    .from('character_drafts')
    .upsert({ wallet_address: wallet, draft_data: draftData }, { onConflict: 'wallet_address' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** DELETE /api/character-draft?wallet=0x... — clear draft after character is saved */
export async function DELETE(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')?.toLowerCase()
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 })

  const db = supabaseAdmin()
  const { error } = await db.from('character_drafts').delete().eq('wallet_address', wallet)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
