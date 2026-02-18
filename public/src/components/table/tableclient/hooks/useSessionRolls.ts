'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DiceEntry } from '../types'

export function useSessionRolls(params: { sessionId: string; hasMounted: boolean }) {
  const { sessionId, hasMounted } = params
  const [diceLog, setDiceLog] = useState<DiceEntry[]>([])
  const [showDiceLog, setShowDiceLog] = useState(false)

  useEffect(() => {
    if (!hasMounted || !sessionId) return

    async function loadRolls() {
      const { data, error } = await supabase
        .from('session_rolls')
        .select(
          `
          id,
          label,
          formula,
          result_total,
          created_at,
          roller_name
        `
        )
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('session_rolls load error', error)
        return
      }

      const entries: DiceEntry[] =
        (data ?? []).map((row: any) => ({
          id: row.id as string,
          roller: (row.roller_name as string) || 'Unknown',
          label: (row.label as string) || '',
          result: row.result_total as number,
          formula: (row.formula as string) || '',
          timestamp: new Date(row.created_at as string).toLocaleTimeString(),
        })) ?? []

      setDiceLog(entries)
    }

    loadRolls()
  }, [hasMounted, sessionId])

  function pushRollLocal(entry: DiceEntry) {
    setDiceLog(prev => {
      const updated = [entry, ...prev]
      return updated.slice(0, 20)
    })
  }

  return { diceLog, setDiceLog, showDiceLog, setShowDiceLog, pushRollLocal }
}
