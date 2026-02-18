'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SessionWithCampaign } from '../types'

export function useEncounter(session: SessionWithCampaign | null, address?: string | null) {
  const [encounterId, setEncounterId] = useState<string | null>(null)
  const [encounterLoading, setEncounterLoading] = useState(false)
  const [encounterError, setEncounterError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.id) return
    const s = session

    let cancelled = false
    let pollTimer: any = null

    const isGm = Boolean(
      address &&
        s.gm_wallet &&
        s.gm_wallet.trim().toLowerCase() === address.trim().toLowerCase()
    )

    const readExisting = async () => {
      const res = await supabase
        .from('encounters')
        .select('id')
        .eq('session_id', s.id)
        .limit(1)
        .maybeSingle()

      if (cancelled) return { id: null as string | null, error: null as any }

      if (res.error && (res.error as any).code !== 'PGRST116') {
        return { id: null as string | null, error: res.error }
      }

      return { id: (res.data as any)?.id ?? null, error: null as any }
    }

    const createEncounter = async () => {
      // IMPORTANT: don’t .select() here — RLS can allow INSERT but deny SELECT-return
      const ins = await supabase.from('encounters').insert({
        session_id: s.id,
        title: s.title ?? 'Session Encounter',
      })

      if (cancelled) return { error: null as any }

      // If insert fails, show real fields
      if (ins.error) {
        console.error('encounters insert error', {
          message: ins.error.message,
          code: (ins.error as any).code,
          details: (ins.error as any).details,
          hint: (ins.error as any).hint,
          raw: ins.error,
        })
        return { error: ins.error }
      }

      return { error: null as any }
    }

    const run = async () => {
      setEncounterLoading(true)
      setEncounterError(null)

      // 1) Try read
      const first = await readExisting()

      if (cancelled) return

      if (first.error) {
        console.error('encounters select error', {
          message: first.error.message,
          code: (first.error as any).code,
          details: (first.error as any).details,
          hint: (first.error as any).hint,
          raw: first.error,
        })
        setEncounterError(first.error.message || 'Failed to load encounter')
        setEncounterLoading(false)
        return
      }

      if (first.id) {
        setEncounterId(first.id)
        setEncounterLoading(false)
        return
      }

      // 2) None exists: GM creates
      if (isGm) {
        const created = await createEncounter()
        if (cancelled) return

        if (created.error) {
          setEncounterError(created.error.message || 'Failed to create encounter')
          setEncounterLoading(false)
          return
        }

        // 3) Re-read to get id (works if SELECT allowed for GM)
        const second = await readExisting()
        if (cancelled) return

        if (second.error) {
          setEncounterError(second.error.message || 'Encounter created but cannot be read (RLS SELECT).')
          setEncounterLoading(false)
          return
        }

        setEncounterId(second.id)
        setEncounterLoading(false)
        return
      }

      // 4) Players: poll until GM creates it (so it “shows up” without refresh)
      setEncounterId(null)
      setEncounterLoading(false)

      pollTimer = setInterval(async () => {
        const polled = await readExisting()
        if (cancelled) return
        if (polled.error) return // keep quiet; don’t spam UI
        if (polled.id) {
          setEncounterId(polled.id)
          clearInterval(pollTimer)
          pollTimer = null
        }
      }, 2000)
    }

    void run()

    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [session?.id, session?.gm_wallet, session?.title, address])

  return { encounterId, encounterLoading, encounterError }
}
