import { NextResponse } from 'next/server'
import { recoverMessageAddress } from 'viem'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

type Body = {
  wallet_address: string
  username: string
  display_name?: string | null
  bio?: string | null
  avatar_url?: string | null
  location?: string | null
  timezone?: string | null
  twitter?: string | null
  discord?: string | null
  twitch?: string | null
  message: string
  signature: `0x${string}`
  // optional: if you’re using Supabase Auth session + profiles.user_id
  user_id?: string | null
}

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status })
}

// Only include keys that are NOT undefined.
// (Allows passing null explicitly if you want to clear a field.)
function compact<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v
  }
  return out as Partial<T>
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    if (!body?.wallet_address || !body?.username || !body?.message || !body?.signature) {
      return jsonError('Missing required fields.')
    }

    const claimed = body.wallet_address.toLowerCase()

    const recovered = await recoverMessageAddress({
      message: body.message,
      signature: body.signature,
    })

    if (recovered.toLowerCase() !== claimed) {
      return jsonError('Signature verification failed.', 401)
    }

    const username = body.username.trim()
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return jsonError('Username must be 3-20 chars and only letters/numbers/underscore.')
    }

    const admin = supabaseAdmin()

    // ✅ Build payload but DO NOT overwrite existing fields with undefined.
    // If client sends null intentionally, we will write null (clear field).
    const payload = compact({
      wallet_address: claimed,
      username,
      display_name: body.display_name,
      bio: body.bio,
      avatar_url: body.avatar_url,
      location: body.location,
      timezone: body.timezone,
      twitter: body.twitter,
      discord: body.discord,
      twitch: body.twitch,
      // ✅ keep your new model consistent when provided
      user_id: body.user_id ?? undefined,
    })

    // ✅ Upsert on wallet_address (matches your unique constraint)
    const { error } = await admin
      .from('profiles')
      .upsert(payload, { onConflict: 'wallet_address' })

    if (error) {
      // Friendly error if username unique exists (if you have that constraint)
      if ((error as any).code === '23505') {
        return jsonError('Username or wallet already exists.', 409)
      }
      return jsonError(error.message, 400)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Server error' },
      { status: 500 }
    )
  }
}
