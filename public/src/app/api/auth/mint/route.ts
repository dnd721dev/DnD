import { NextResponse } from 'next/server'
import { recoverMessageAddress } from 'viem'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

type Body = {
  wallet_address: string
  message: string
  signature: `0x${string}`
}

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    if (!body?.wallet_address || !body?.message || !body?.signature) {
      return jsonError('Missing fields.')
    }

    const claimed = body.wallet_address.toLowerCase()

    const recovered = await recoverMessageAddress({
      message: body.message,
      signature: body.signature,
    })

    if (recovered.toLowerCase() !== claimed) {
      return jsonError('Signature verification failed.', 401)
    }

    const admin = supabaseAdmin()

    // Ensure profile exists for this wallet (so FKs to profiles work)
    const { error: upsertErr } = await admin
      .from('profiles')
      .upsert({ wallet_address: claimed }, { onConflict: 'wallet_address' })

    if (upsertErr) return jsonError(upsertErr.message, 400)

    // IMPORTANT: this must be set in Supabase project settings (Auth > JWT Secret)
    const jwtSecret = process.env.SUPABASE_JWT_SECRET
    if (!jwtSecret) {
      return jsonError('Missing SUPABASE_JWT_SECRET on server env vars.', 500)
    }

    // Mint an access token with wallet_address claim
    // role MUST be "authenticated" (so it’s treated like a real session)
    const now = Math.floor(Date.now() / 1000)
    const exp = now + 60 * 60 // 1 hour

    const token = jwt.sign(
      {
        aud: 'authenticated',
        role: 'authenticated',
        wallet_address: claimed,
        sub: claimed, // we use wallet as subject
        iat: now,
        exp,
      },
      jwtSecret
    )

    return NextResponse.json({
      ok: true,
      access_token: token,
      refresh_token: 'no-refresh', // we’ll not use refresh in this simple flow
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
