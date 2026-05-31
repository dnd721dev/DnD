// src/lib/inviteServer.ts  — SERVER ONLY
// Helpers for invite routes: verify the connected wallet from the JWT and
// compute an invite's validity status.

import type { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

/** Verify the Authorization bearer JWT (minted by /api/auth/login) and return
 *  the lowercased wallet_address claim, or null if absent/invalid. */
export function walletFromRequest(req: NextRequest): string | null {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return null
  const auth = req.headers.get('authorization') ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return null
  try {
    const decoded = jwt.verify(m[1], secret) as { wallet_address?: string }
    const w = (decoded.wallet_address ?? '').toLowerCase()
    return /^0x[0-9a-f]{40}$/.test(w) ? w : null
  } catch {
    return null
  }
}

export type InviteRow = {
  id: string
  token: string
  campaign_id: string
  session_id: string | null
  role: string
  max_uses: number | null
  uses: number
  expires_at: string | null
  revoked: boolean
}

export type InviteStatus = 'valid' | 'expired' | 'revoked' | 'maxed'

export function inviteStatusOf(row: InviteRow): InviteStatus {
  if (row.revoked) return 'revoked'
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return 'expired'
  if (row.max_uses != null && row.uses >= row.max_uses) return 'maxed'
  return 'valid'
}
