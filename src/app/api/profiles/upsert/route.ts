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
 * We create (or fetch) a Supabase Auth user per wallet.
 * This gives you a guaranteed UUID `user_id` to store in `profiles.user_id`.
 */
async function getOrCreateAuthUserIdForWallet(wallet: string) {
  const w = normalizeAddr(wallet)

  // Use a deterministic email so each wallet maps to 1 auth user.
  // Domain can be anything; it won't email unless you build email flows.
  const email = `${w}@wallet.local`

  // 1) Try to find an existing user by email
  const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (list.error) throw new Error(list.error.message)

  const existing = list.data?.users?.find((u) => (u.email || '').toLowerCase() === email.toLowerCase())
  if (existing?.id) return existing.id

  // 2) Create user if not found
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { wallet_address: w },
  })

  if (created.error) throw new Error(created.error.message)
  if (!created.data?.user?.id) throw new Error('Failed to create auth user id')

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

    // Verify signature
    const ok = verifyEvmSignature({ wallet: wallet_address, message, signature })
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 })
    }

    // ✅ Guarantee a UUID user_id for this wallet
    const user_id = await getOrCreateAuthUserIdForWallet(wallet_address)

    // ✅ Upsert profile (NO updated_at field here to avoid schema cache error)
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id,
          wallet_address: normalizeAddr(wallet_address),
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
    return NextResponse.json({ ok: false, error: e?.message ?? 'Server error' }, { status: 500 })
  }
}
