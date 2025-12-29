// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import jwt from 'jsonwebtoken'

type Body = {
  walletAddress: string
  signature: string
  nonce: string
}

function lower(s: string) {
  return (s || '').toLowerCase()
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_JWT_SECRET on server' },
      { status: 500 }
    )
  }

  const cookieNonce = req.cookies.get('dnd721_nonce')?.value || ''

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const walletAddress = lower(body.walletAddress || '')
  const signature = body.signature || ''
  const nonce = body.nonce || ''

  if (!walletAddress || !signature || !nonce) {
    return NextResponse.json(
      { error: 'walletAddress, signature, nonce required' },
      { status: 400 }
    )
  }

  if (!cookieNonce || nonce !== cookieNonce) {
    return NextResponse.json(
      { error: 'Nonce mismatch or missing nonce cookie. Refresh and try again.' },
      { status: 401 }
    )
  }

  // Message must match what the client signs
  const message = `DnD721 Login\nWallet: ${walletAddress}\nNonce: ${nonce}`

  let recovered = ''
  try {
    recovered = lower(ethers.verifyMessage(message, signature))
  } catch {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  if (recovered !== walletAddress) {
    return NextResponse.json({ error: 'Signature does not match wallet' }, { status: 401 })
  }

  // Mint Supabase-compatible JWT:
  // - role must be "authenticated" for RLS "to authenticated"
  // - include wallet_address claim for your policies
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 60 * 60 * 6 // 6 hours

  const token = jwt.sign(
    {
      role: 'authenticated',
      wallet_address: walletAddress,
      iat: now,
      exp,
      aud: 'authenticated',
      iss: 'dnd721',
    },
    secret,
    { algorithm: 'HS256' }
  )

  const res = NextResponse.json({ token, walletAddress })
  // clear nonce cookie so it can’t be reused
  res.cookies.set('dnd721_nonce', '', { path: '/', maxAge: 0 })
  return res
}
