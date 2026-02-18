'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SessionWithCampaign } from '../types'

export function useEncounter(session: SessionWithCampaign | null) {
  const [encounterId, setEncounterId] = useState<string | null>(null)
  const [encounterLoading, setEncounterLoading] = useState(false)
  const [encounterError, setEncounterError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return

    async function ensureEncounter(s: SessionWithCampaign) {
      setEncounterLoading(true)
      setEncounterError(null)

      const { data, error } = await supabase
        .from('encounters')
        .select('id')
        .eq('session_id', s.id)
        .limit(1).maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('encounters select error', error)
        setEncounterError(error.message)
        setEncounterLoading(false)
        return
      }

      if (data && (data as any).id) {
        setEncounterId((data as any).id as string)
        setEncounterLoading(false)
        return
      }

      const { data: created, error: insertError } = await supabase
        .from('encounters')
        .insert({
          session_id: s.id,
          title: s.title ?? 'Session Encounter',
        })
        .select('id')
        .limit(1).maybeSingle()

      if (insertError) {
        console.error('encounters insert error', insertError)
        setEncounterError(insertError.message)
        setEncounterLoading(false)
        return
      }

      setEncounterId((created as any).id as string)
      setEncounterLoading(false)
    }

    ensureEncounter(session)
  }, [session])

  return { encounterId, encounterLoading, encounterError }
}
