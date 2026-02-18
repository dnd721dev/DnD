// src/app/api/profiles/ensure/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const wallet_address = String(body.wallet_address ?? '').trim().toLowerCase()

    if (!wallet_address) {
      return NextResponse.json({ ok: false, error: 'Missing wallet_address' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url) {
      return NextResponse.json({ ok: false, error: 'Missing NEXT_PUBLIC_SUPABASE_URL' }, { status: 500 })
    }
    if (!serviceKey) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
    }

    // Server-side admin client (bypasses RLS)
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { error } = await admin
      .from('profiles')
      .upsert({ wallet_address }, { onConflict: 'wallet_address' })

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'Supabase upsert failed', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
