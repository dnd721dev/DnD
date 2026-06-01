// src/lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'

export function supabaseAdmin() {
  // Support both the new Vercel Supabase integration names and the legacy names
  // so .env.local (legacy) and Vercel (new) both work without changes.
  const url     = process.env.SUPABASE_URL     ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !service) {
    throw new Error(
      'Missing Supabase server env vars. Need SUPABASE_URL + SUPABASE_SECRET_KEY (or legacy NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).'
    )
  }

  return createClient(url, service, {
    auth: { persistSession: false },
  })
}
