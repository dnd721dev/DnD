// src/app/api/auth/nonce/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET() {
  const nonce = crypto.randomBytes(16).toString('hex')

  const res = NextResponse.json({ nonce })

  res.cookies.set('dnd721_nonce', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // ✅ localhost works
    path: '/',
    maxAge: 60 * 5,
  })

  return res
}
