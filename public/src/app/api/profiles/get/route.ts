 import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status })
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const username = (searchParams.get('username') || '').trim()

    if (!username) return jsonError('Missing username.')

    const admin = supabaseAdmin()

    const { data: profile, error: pErr } = await admin
      .from('profiles')
      .select('wallet_address, username, display_name, bio, avatar_url, location, timezone, twitter, discord, twitch')
      .eq('username', username)
      .limit(1)
      .maybeSingle()

    if (pErr) return jsonError(pErr.message, 400)
    if (!profile) return jsonError('Profile not found.', 404)

    const { data: chars, error: cErr } = await admin
      .from('characters')
      .select('id, name, level, class_key, race_key, avatar_url, wallet_address')
      .eq('wallet_address', profile.wallet_address)
      .order('created_at', { ascending: true })

    if (cErr) return jsonError(cErr.message, 400)

    return NextResponse.json({ ok: true, profile, characters: chars ?? [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
