// Pure env-var check — NO async, NO DB calls, always responds instantly.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const urlNew    = process.env.SUPABASE_URL      ?? null
  const urlLegacy = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null
  const urlUsed   = urlNew ?? urlLegacy ?? null
  const projectRef = urlUsed
    ? urlUsed.replace('https://', '').split('.')[0]
    : null

  return NextResponse.json({
    ok: true,
    projectRef,
    env: {
      SUPABASE_URL:                                 Boolean(urlNew),
      NEXT_PUBLIC_SUPABASE_URL:                     Boolean(urlLegacy),
      SUPABASE_SECRET_KEY:                          Boolean(process.env.SUPABASE_SECRET_KEY),
      SUPABASE_SERVICE_ROLE_KEY:                    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:         Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      NEXT_PUBLIC_SUPABASE_ANON_KEY:                Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY),
      SUPABASE_JWT_SECRET:                          Boolean(process.env.SUPABASE_JWT_SECRET),
    },
  })
}
