// src/lib/supabase.ts
'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,         // ✅ REQUIRED so auth.uid() exists after refresh
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  // ✅ Inject the connected wallet into every PostgREST request.
  // RLS should read it from request headers (NOT JWT):
  // lower(nullif(current_setting('request.headers', true)::json->>'x-wallet-address',''))
  global: {
    fetch: async (url, options: any = {}) => {
      const headers = new Headers(options?.headers || {})
      try {
        const w = typeof window !== 'undefined' ? window.localStorage.getItem('dnd721_wallet') : null
        if (w) headers.set('x-wallet-address', w)
      } catch {
        // ignore
      }
      return fetch(url, { ...options, headers })
    },
  },
})
