import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER ONLY

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

async function getOrCreateAuthUserIdForWallet(wallet: string) {
  const w = normalizeAddr(wallet)
  const email = `${w}@wallet.local`

  // Try to look up by email first (avoids fetching all users)
  const { data: existing } = await supabaseAdmin.auth.admin.getUserByEmail(email)
  if (existing?.user?.id) return existing.user.id

  // Create auth user if missing
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { wallet_address: w },
  })

  if (created.error) throw new Error(created.error.message)
  if (!created.data?.user?.id) throw new Error('Failed to create auth user')

  return created.data.user.id
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
      username: string
      bio?: string
      display_name?: string
      avatar_url?: string
      location?: string
      timezone?: string
      twitter?: string
      discord?: string
      twitch?: string
      signature: string
      message: string
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

    // Get or create auth user
    const user_id = await getOrCreateAuthUserIdForWallet(wallet)

    // If this user_id was previously linked to a different wallet, clear it first
    // so the UNIQUE(user_id) constraint never fires.
    const clear = await supabaseAdmin
      .from('profiles')
      .update({ user_id: null })
      .eq('user_id', user_id)
      .neq('wallet_address', wallet)

    if (clear.error) {
      return NextResponse.json({ ok: false, error: clear.error.message }, { status: 400 })
    }

    // Upsert all profile fields
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id,
          wallet_address: wallet,
          username,
          bio: bio ?? null,
          display_name: display_name ?? null,
          avatar_url: avatar_url ?? null,
          location: location ?? null,
          timezone: timezone ?? null,
          twitter: twitter ?? null,
          discord: discord ?? null,
          twitch: twitch ?? null,
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
