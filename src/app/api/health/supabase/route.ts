// src/app/api/health/supabase/route.ts
// Read-only diagnostic — shows which env vars are present and whether the
// admin client can actually reach Supabase. Leaks no secret values.
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Which URL vars are set?
  const urlNew     = process.env.SUPABASE_URL
  const urlLegacy  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const urlResolved = urlNew ?? urlLegacy ?? null
  const projectRef  = urlResolved
    ? urlResolved.replace('https://', '').split('.')[0]
    : null

  // Which key vars are set?
  const keyNew     = Boolean(process.env.SUPABASE_SECRET_KEY)
  const keyLegacy  = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const pubNew     = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  const pubAnon    = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const pubLegacy  = Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
  const hasJwt     = Boolean(process.env.SUPABASE_JWT_SECRET)

  // Try the admin client against the DB
  let adminOk = false
  let adminError: string | null = null
  try {
    const db = supabaseAdmin()
    const { error } = await db.from('sessions').select('id').limit(1)
    if (error) adminError = `${error.code ?? ''}: ${error.message}`.trim()
    else adminOk = true
  } catch (e: any) {
    adminError = e?.message ?? String(e)
  }

  return NextResponse.json({
    projectRef,
    env: {
      SUPABASE_URL:                             Boolean(urlNew),
      NEXT_PUBLIC_SUPABASE_URL:                 Boolean(urlLegacy),
      SUPABASE_SECRET_KEY:                      keyNew,
      SUPABASE_SERVICE_ROLE_KEY:                keyLegacy,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:     pubNew,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:            pubAnon,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: pubLegacy,
      SUPABASE_JWT_SECRET:                      hasJwt,
    },
    adminOk,
    adminError,
  })
}
