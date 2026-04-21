import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER ONLY

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

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
    const {
      wallet_address, username, bio, display_name,
      avatar_url, location, timezone, twitter, discord, twitch,
      signature, message,
    } = body as {
      wallet_address: string
      username:       string
      bio?:           string
      display_name?:  string
      avatar_url?:    string
      location?:      string
      timezone?:      string
      twitter?:       string
      discord?:       string
      twitch?:        string
      signature:      string
      message:        string
    }

    if (!wallet_address || !username || !signature || !message) {
      return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    }

    // Verify wallet signature
    const valid = verifyEvmSignature({ wallet: wallet_address, message, signature })
    if (!valid) {
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 })
    }

    const wallet = normalizeAddr(wallet_address)

    // Upsert profile — wallet_address is the PK, no auth.users dependency
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          wallet_address: wallet,
          username,
          bio:          bio          ?? null,
          display_name: display_name ?? null,
          avatar_url:   avatar_url   ?? null,
          location:     location     ?? null,
          timezone:     timezone     ?? null,
          twitter:      twitter      ?? null,
          discord:      discord      ?? null,
          twitch:       twitch       ?? null,
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
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'Server error' },
      { status: 500 }
    )
  }
}
