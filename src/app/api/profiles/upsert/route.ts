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

/**
 * HARD RULE:
 * 1 wallet = 1 auth user
 * 1 auth user = 1 wallet
 *
 * This function ENFORCES that rule.
 */
async function getOrCreateAuthUserIdForWallet(wallet: string) {
  const w = normalizeAddr(wallet)
  const email = `${w}@wallet.local`

  // Look up existing auth user
  const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (list.error) throw new Error(list.error.message)

  const existing = list.data.users.find(
    (u) => (u.email || '').toLowerCase() === email
  )

  if (existing?.id) return existing.id

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

    // Verify wallet signature
    const valid = verifyEvmSignature({ wallet: wallet_address, message, signature })
    if (!valid) {
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 })
    }

    const wallet = normalizeAddr(wallet_address)

    // Get or create auth user
    const user_id = await getOrCreateAuthUserIdForWallet(wallet)

    /**
     * 🔥 CRITICAL FIX 🔥
     * If this user_id was previously linked to ANOTHER wallet,
     * we NULL it out first so UNIQUE(user_id) never explodes.
     */
    const clear = await supabaseAdmin
      .from('profiles')
      .update({ user_id: null })
      .eq('user_id', user_id)
      .neq('wallet_address', wallet)

    if (clear.error) {
      return NextResponse.json({ ok: false, error: clear.error.message }, { status: 400 })
    }

    // Final authoritative upsert
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id,
          wallet_address: wallet,
          username,
          bio: bio ?? null,
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
