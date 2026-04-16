// src/lib/supabase.ts
'use client'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // We manage auth ourselves via dnd721_supabase_jwt in localStorage.
    // Disable Supabase's own session management to prevent it from trying to
    // use our custom JWT as a refresh token (which would fail and trigger
    // SIGNED_OUT events that spam the wallet signature prompt).
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  // ✅ Inject the connected wallet + JWT into every PostgREST request.
  // RLS reads the wallet from the x-wallet-address header:
  //   lower(nullif(current_setting('request.headers', true)::json->>'x-wallet-address',''))
  // The Authorization header grants the 'authenticated' role.
  global: {
    fetch: async (url, options: any = {}) => {
      const headers = new Headers(options?.headers || {})
      try {
        const w = typeof window !== 'undefined' ? window.localStorage.getItem('dnd721_wallet') : null
        if (w) headers.set('x-wallet-address', w)
        const jwt = typeof window !== 'undefined' ? window.localStorage.getItem('dnd721_supabase_jwt') : null
        if (jwt) headers.set('Authorization', `Bearer ${jwt}`)
      } catch {
        // ignore
      }
      return fetch(url, { ...options, headers })
    },
  },
})
