'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { resolveDisplayName, ANON_NAME } from '@/lib/displayName'

// Batch-resolve profile names for a set of wallets. For UI surfaces that hold
// only a wallet (GM badges, sponsors, gifts, contest winners, homebrew creator),
// returns a getter `nameFor(wallet)` that yields the player's profile name, or
// ANON_NAME when no profile exists. Wallets are matched case-insensitively and
// never rendered.
export function useProfileNames(
  wallets: (string | null | undefined)[],
): (wallet: string | null | undefined) => string {
  // Stable key of the unique, lowercased, non-empty wallets to drive the fetch.
  const unique = useMemo(() => {
    const set = new Set<string>()
    for (const w of wallets) {
      const lw = w?.toLowerCase().trim()
      if (lw) set.add(lw)
    }
    return Array.from(set).sort()
  }, [wallets])
  const key = unique.join(',')

  const [names, setNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (unique.length === 0) { setNames({}); return }
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_address, display_name, username')
        .in('wallet_address', unique)
      if (!active || error) {
        if (error) console.error('[useProfileNames] fetch error', error)
        return
      }
      const map: Record<string, string> = {}
      for (const row of (data ?? []) as any[]) {
        const lw = String(row.wallet_address ?? '').toLowerCase()
        if (!lw) continue
        map[lw] = resolveDisplayName({ displayName: row.display_name, username: row.username })
      }
      setNames(map)
    })()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return (wallet: string | null | undefined) => {
    const lw = wallet?.toLowerCase().trim()
    if (!lw) return ANON_NAME
    return names[lw] ?? ANON_NAME
  }
}
