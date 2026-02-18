'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SessionWithCampaign } from '../types'

export function useSessionWithCampaign(sessionId: string) {
  const [session, setSession] = useState<SessionWithCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('sessions')
        .select(
          `
          id,
          title,
          status,
          scheduled_start,
          duration_minutes,
          campaign_id,
          gm_wallet,
          map_image_url,
          campaigns:campaign_id (
            livekit_room_name,
            title
          )
        `
        )
        .eq('id', sessionId)
        .limit(1).maybeSingle()

      if (error || !data) {
        console.error(error)
        setError(error?.message ?? 'Session not found.')
        setSession(null)
        setLoading(false)
        return
      }

      setSession(data as SessionWithCampaign)
      setLoading(false)
    }

    load()
  }, [sessionId])

  return { session, setSession, loading, error }
}
