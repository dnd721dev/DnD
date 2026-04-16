'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CharacterSheetData } from './types'

type Field = 'personality_traits' | 'ideals' | 'bonds' | 'flaws' | 'notes'

const FIELDS: { key: Field; label: string }[] = [
  { key: 'personality_traits', label: 'Personality Traits' },
  { key: 'ideals', label: 'Ideals' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'flaws', label: 'Flaws' },
  { key: 'notes', label: 'Notes' },
]

export function PersonalityNotesPanel({ c }: { c: CharacterSheetData }) {
  const [values, setValues] = useState<Record<Field, string>>({
    personality_traits: String(c.personality_traits ?? ''),
    ideals: String(c.ideals ?? ''),
    bonds: String(c.bonds ?? ''),
    flaws: String(c.flaws ?? ''),
    notes: String(c.notes ?? ''),
  })
  const [status, setStatus] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync if character prop changes (e.g. page reload)
  useEffect(() => {
    setValues({
      personality_traits: String(c.personality_traits ?? ''),
      ideals: String(c.ideals ?? ''),
      bonds: String(c.bonds ?? ''),
      flaws: String(c.flaws ?? ''),
      notes: String(c.notes ?? ''),
    })
  }, [c.id])

  function handleChange(key: Field, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }))
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('Saving…')
    timerRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('characters')
        .update({ [key]: val || null })
        .eq('id', c.id)
      setStatus(error ? `Error: ${error.message}` : 'Saved!')
      setTimeout(() => setStatus(''), 1200)
    }, 500)
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Personality & Notes
        </h2>
        {status && <span className="text-[10px] text-slate-400">{status}</span>}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {FIELDS.filter((f) => f.key !== 'notes').map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
              {f.label}
            </label>
            <textarea
              rows={3}
              value={values[f.key]}
              onChange={(e) => handleChange(f.key, e.target.value)}
              placeholder={`Enter ${f.label.toLowerCase()}…`}
              className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[12px] text-slate-100 placeholder-slate-600 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
          Notes
        </label>
        <textarea
          rows={5}
          value={values.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Session notes, reminders, character history…"
          className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[12px] text-slate-100 placeholder-slate-600 focus:border-indigo-600 focus:outline-none"
        />
      </div>
    </section>
  )
}
