'use client'

import { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { loadDraft, saveDraft } from '@/lib/characterDraft'

const SYNC_INTERVAL_MS = 30_000 // sync to Supabase every 30 seconds

/**
 * Auto-syncs the character creation draft (stored in localStorage) to Supabase.
 * - On mount: restores draft from Supabase if localStorage is empty.
 * - Every 30s: pushes current localStorage draft to Supabase.
 * - On page hide: pushes a final sync before the tab closes.
 *
 * Add this hook once in the character creation layout. No changes needed in step pages.
 */
export function useCharacterDraftSync() {
  const { address } = useAccount()
  const hasSynced = useRef(false)

  async function pushToSupabase(wallet: string) {
    const draft = loadDraft()
    if (!draft || Object.keys(draft).length === 0) return

    try {
      await fetch('/api/character-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet, draftData: draft }),
      })
    } catch {
      // Silently ignore — localStorage is the source of truth during the session
    }
  }

  // On mount: if localStorage is empty, pull from Supabase
  useEffect(() => {
    if (!address || hasSynced.current) return
    hasSynced.current = true

    const localDraft = loadDraft()
    const hasLocalData = Object.keys(localDraft).length > 0

    if (!hasLocalData) {
      fetch(`/api/character-draft?wallet=${address.toLowerCase()}`)
        .then((r) => r.json())
        .then(({ draft }) => {
          if (draft && typeof draft === 'object' && Object.keys(draft).length > 0) {
            saveDraft(draft)
          }
        })
        .catch(() => {})
    }
  }, [address])

  // Periodic sync to Supabase
  useEffect(() => {
    if (!address) return
    const id = setInterval(() => pushToSupabase(address), SYNC_INTERVAL_MS)
    return () => clearInterval(id)
  }, [address])

  // Final sync on page hide (tab close, navigation away)
  useEffect(() => {
    if (!address) return

    const wallet = address
    const handler = () => void pushToSupabase(wallet)
    window.addEventListener('pagehide', handler)
    return () => window.removeEventListener('pagehide', handler)
  }, [address])
}
