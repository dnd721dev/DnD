'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ──────────────────────────────────────────────────────────────────────────────
// GM Notes scratchpad — lifted from GMSidebar.tsx. Writes to sessions.gm_notes
// with the same 1s debounce. Rendered larger because the dashboard has space.
// ──────────────────────────────────────────────────────────────────────────────

export function GmNotesPanel({ sessionId }: { sessionId: string | null }) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    void supabase
      .from('sessions')
      .select('gm_notes')
      .eq('id', sessionId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setNotes((data as any)?.gm_notes ?? '')
        setLoaded(true)
      })
    return () => { cancelled = true }
  }, [sessionId])

  function onChange(value: string) {
    setNotes(value)
    if (!sessionId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await supabase.from('sessions').update({ gm_notes: value }).eq('id', sessionId)
      setSaving(false)
    }, 1000)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-yellow-300">Session Notes</h3>
        <span className="text-[11px] text-slate-500">
          {!loaded ? 'Loading…' : saving ? 'Saving…' : 'Auto-saved'}
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        rows={18}
        disabled={!sessionId || !loaded}
        placeholder="NPC names, plot hooks, secret DCs, foreshadowing… anything you need to remember."
        className="w-full resize-vertical rounded-lg border border-yellow-900/40 bg-slate-950/90 p-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-yellow-500 focus:outline-none disabled:opacity-60"
      />
    </div>
  )
}
