import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const wallet = (searchParams.get('wallet') || '').trim().toLowerCase()

    if (!wallet) return jsonError('Missing wallet.')

    const admin = supabaseAdmin()

    const { data, error } = await admin
      .from('profiles')
      .select('username')
      .eq('wallet_address', wallet)
      .limit(1)
      .maybeSingle()

    if (error) return jsonError(error.message, 400)

    return NextResponse.json({
      ok: true,
      profile: { username: data?.username ?? null },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
