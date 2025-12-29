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
})
