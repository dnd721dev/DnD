'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { SessionWithCampaign } from '../types'

export function useSessionWithCampaign(sessionId: string) {
  const [session, setSession] = useState<SessionWithCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

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
          current_map_id,
          campaigns:campaign_id (
            livekit_room_name,
            title
          )
        `
        )
        .eq('id', sessionId)
        .limit(1).maybeSingle()

      if (!mounted) return

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

    // Realtime: detect when GM switches the active map so all clients update
    const channel = supabase
      .channel(`session-meta-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (!mounted) return
          const updated = payload.new as any
          setSession((prev) =>
            prev ? { ...prev, current_map_id: updated.current_map_id ?? null } : prev
          )
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  return { session, setSession, loading, error }
}
