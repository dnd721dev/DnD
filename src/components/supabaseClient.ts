'use client'
import { createClient } from '@supabase/supabase-js'

// Support both new Vercel integration key names and legacy names.
const _supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
)!

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  _supabaseKey, // ✅ use publishable key (new or legacy name)
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
)
