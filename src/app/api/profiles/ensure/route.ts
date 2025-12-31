import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const wallet_address = String(body?.wallet_address ?? '').trim()

    if (!wallet_address) {
      return NextResponse.json({ ok: false, error: 'Missing wallet_address' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    })

    // Ensure profile exists (minimal safe upsert)
    const { data, error } = await admin
      .from('profiles')
      .upsert(
        {
          wallet_address,
        },
        { onConflict: 'wallet_address' }
      )
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, profile: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
