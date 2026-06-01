import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

// Support both new Vercel integration names and legacy names.
const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)!
const SERVICE_KEY  = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)! // SERVER ONLY

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing Supabase server env vars (need SUPABASE_URL + SUPABASE_SECRET_KEY)')
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

function normalizeAddr(a: string) {
  return (a || '').trim().toLowerCase()
}

function verifyEvmSignature(params: { wallet: string; message: string; signature: string }) {
  const recovered = ethers.verifyMessage(params.message, params.signature)
  return normalizeAddr(recovered) === normalizeAddr(params.wallet)
}

// Audit Wave 2D: avatar_url is written straight from the client into the DB
// and later rendered in <img src> across many components. Reject schemes that
// can execute script (javascript:, data:text/html, vbscript:) or read local
// files (file:). Only http/https and relative paths are allowed. Empty / null
// stays valid — that just clears the avatar.
function sanitizeAvatarUrl(raw: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw == null) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false, error: 'avatar_url must be a string or null' }
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: true, value: null }
  // Relative paths (e.g. uploaded asset paths handled by Supabase Storage)
  // are accepted — they don't carry a scheme.
  if (trimmed.startsWith('/')) return { ok: true, value: trimmed }
  // Anything with a scheme must be http(s).
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, error: 'avatar_url must use http(s) or be a relative path' }
  }
  return { ok: true, value: trimmed }
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

    // Audit Wave 2D: reject avatar_url schemes that can execute script or
    // read local files. Anything other than http(s) or a relative path
    // returns 400.
    const avatarCheck = sanitizeAvatarUrl(avatar_url)
    if (!avatarCheck.ok) {
      return NextResponse.json({ ok: false, error: avatarCheck.error }, { status: 400 })
    }
    const safeAvatarUrl = avatarCheck.value

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
          avatar_url:   safeAvatarUrl,
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
