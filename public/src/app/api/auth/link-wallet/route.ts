import { NextResponse } from 'next/server'
import { recoverMessageAddress } from 'viem'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

type Body = {
  wallet_address: string
  user_id: string
  message: string
  signature: `0x${string}`
}

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status })
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    if (!body?.wallet_address || !body?.user_id || !body?.message || !body?.signature) {
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

    // ✅ IMPORTANT:
    // Ensure this supabase user_id is linked to ONLY ONE wallet.
    // If it was previously linked to another wallet row, clear it first
    const { error: clearErr } = await admin
      .from('profiles')
      .update({ user_id: null })
      .eq('user_id', body.user_id)
      .neq('wallet_address', claimed)

    if (clearErr) return jsonError(clearErr.message, 400)

    // Now safely link this wallet to this user_id
    const { error: upsertErr } = await admin
      .from('profiles')
      .upsert(
        { wallet_address: claimed, user_id: body.user_id },
        { onConflict: 'wallet_address' }
      )

    if (upsertErr) return jsonError(upsertErr.message, 400)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 })
  }
}
