'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { DiceEntry } from '../types'

function rowToEntry(row: any): DiceEntry {
  return {
    id: row.id as string,
    roller: (row.roller_name as string) || 'Unknown',
    label: (row.label as string) || '',
    result: row.result_total as number,
    formula: (row.formula as string) || '',
    timestamp: new Date(row.created_at as string).toLocaleTimeString(),
    outcome: (row.outcome as string | null) ?? null,
    individual_dice: (row.individual_dice as DiceEntry['individual_dice']) ?? null,
    roll_type: (row.roll_type as string | null) ?? null,
  }
}

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
          'id, label, formula, result_total, created_at, roller_name, outcome, individual_dice, roll_type'
        )
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('session_rolls load error', error)
        return
      }

      setDiceLog((data ?? []).map(rowToEntry))
    }

    loadRolls()

    // Real-time: push new rolls to the top of the log as they are inserted.
    // Requires `session_rolls` to be in the supabase_realtime publication
    // (run: ALTER PUBLICATION supabase_realtime ADD TABLE session_rolls).
    const channel = supabase
      .channel(`session-rolls-rt-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_rolls',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const entry = rowToEntry(payload.new)
          setDiceLog((prev) => {
            // Guard against duplicates (loadRolls may have already fetched it)
            if (prev.some((e) => e.id === entry.id)) return prev
            return [entry, ...prev].slice(0, 20)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hasMounted, sessionId])

  function pushRollLocal(entry: DiceEntry) {
    setDiceLog(prev => {
      const updated = [entry, ...prev]
      return updated.slice(0, 20)
    })
  }

  return { diceLog, setDiceLog, showDiceLog, setShowDiceLog, pushRollLocal }
}
