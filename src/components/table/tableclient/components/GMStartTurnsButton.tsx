'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  encounterId: string | null
  isGm: boolean
}

export function GMStartTurnsButton({ encounterId, isGm }: Props) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const disabled = useMemo(() => {
    return !isGm || !encounterId || busy
  }, [isGm, encounterId, busy])

  async function onStart() {
    if (!encounterId) return
    setBusy(true)
    setMsg(null)

    try {
      const { error } = await supabase.rpc('start_turns', { p_encounter_id: encounterId })

      if (error) {
        // show whatever we can
        const m = (error as any)?.message || 'Failed to start turns.'
        setMsg(m)
        console.error('start_turns RPC failed:', error)
        return
      }

      setMsg('✅ Turns started')
    } catch (e) {
      console.error('start_turns exception:', e)
      setMsg('Failed to start turns.')
    } finally {
      setBusy(false)
      // auto-clear after a moment
      setTimeout(() => setMsg(null), 2500)
    }
  }

  if (!isGm) return null

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-2">
      <button
        onClick={onStart}
        disabled={disabled}
        className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Starting…' : 'Start Turns'}
      </button>

      {msg && <div className="mt-2 text-xs text-slate-200">{msg}</div>}

      {!encounterId && <div className="mt-1 text-[11px] text-slate-400">Waiting for encounter…</div>}
    </div>
  )
}
