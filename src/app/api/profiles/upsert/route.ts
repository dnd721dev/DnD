import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER ONLY

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

function normalizeAddr(a: string) {
  return (a || '').trim().toLowerCase()
}

function verifyEvmSignature(params: { wallet: string; message: string; signature: string }) {
  const recovered = ethers.verifyMessage(params.message, params.signature)
  return normalizeAddr(recovered) === normalizeAddr(params.wallet)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { wallet_address, username, bio, signature, message } = body as {
      wallet_address: string
      username: string
      bio?: string
      signature: string
      message: string
    }

    if (!wallet_address || !username || !signature || !message) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    }

    // IMPORTANT: message should be something you generate (nonce) to prevent replay attacks.
    const ok = verifyEvmSignature({ wallet: wallet_address, message, signature })
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          wallet_address,
          username,
          bio: bio ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'wallet_address' }
      )
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, profile: data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
