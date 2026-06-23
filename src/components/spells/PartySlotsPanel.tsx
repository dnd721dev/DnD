'use client'

// Party spell-slot overview — shown to the GM in two places:
//   • the Spell Dashboard left aside (compact)
//   • the DM Dashboard as its own tab (compact grid)
//
// Extracted from the old inline `AllCastersSlots` in SpellDashboard. Two
// improvements over that version:
//   1. Realtime — subscribes to `characters` so slot pips refresh live as the
//      party expends/restores slots (the old panel loaded once on mount).
//   2. Multiclass — includes characters whose secondary class is a caster, not
//      just the primary class.

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { buildSlotData } from '@/lib/spellSlots'
import { isSpellcaster } from '@/lib/spellCategories'

type CasterRow = {
  id: string
  name: string | null
  level: number | null
  main_job: string | null
  secondary_class: string | null
  secondary_level: number | null
  spell_slots: Record<string, number> | null
  resource_state: Record<string, any> | null
}

function classLabel(c: CasterRow): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  const main = c.main_job ? `${cap(c.main_job)} ${c.level ?? 1}` : '—'
  if (c.secondary_class && (c.secondary_level ?? 0) > 0) {
    return `${main} / ${cap(c.secondary_class)} ${c.secondary_level}`
  }
  return main
}

export function PartySlotsPanel({ sessionId }: { sessionId: string }) {
  const [casters, setCasters] = useState<CasterRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      const { data: links } = await supabase
        .from('session_characters')
        .select('character_id')
        .eq('session_id', sessionId)

      const ids = (links ?? []).map((l: any) => l.character_id).filter(Boolean)
      if (ids.length === 0) {
        if (mounted) { setCasters([]); setLoading(false) }
        return
      }

      const { data: chars } = await supabase
        .from('characters')
        .select('id, name, level, main_job, secondary_class, secondary_level, spell_slots, resource_state')
        .in('id', ids)

      // Include multiclass casters — a Fighter/Wizard still has slots to track.
      const casterList = (chars ?? []).filter(
        (c: any) =>
          c.spell_slots &&
          Object.keys(c.spell_slots).length > 0 &&
          (isSpellcaster(c.main_job) || isSpellcaster(c.secondary_class)),
      )
      if (mounted) { setCasters(casterList as CasterRow[]); setLoading(false) }
    }

    void load()

    // Realtime: refresh whenever any character's slots/resources change. We
    // listen broadly (one filter clause allowed) and just reload — the roster
    // is small so a refetch is cheap.
    const ch = supabase
      .channel(`party-slots-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'characters' },
        (payload: any) => {
          const id = payload?.new?.id
          if (!id) return
          setCasters((prev) =>
            prev.map((c) =>
              c.id === id
                ? { ...c, spell_slots: payload.new.spell_slots ?? c.spell_slots, resource_state: payload.new.resource_state ?? c.resource_state }
                : c,
            ),
          )
        },
      )
      .subscribe()

    return () => { mounted = false; supabase.removeChannel(ch) }
  }, [sessionId])

  if (loading) {
    return <div className="text-[11px] text-slate-500 italic">Loading party slots…</div>
  }
  if (casters.length === 0) {
    return <div className="text-[11px] text-slate-500 italic">No spellcasters in this party.</div>
  }

  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Party Slots
      </div>
      {casters.map((char) => {
        const slots = buildSlotData(char.spell_slots, char.resource_state)
        const levels = Object.keys(slots).sort()
        return (
          <div key={char.id} className="mb-3">
            <div className="mb-1 truncate text-[10px] text-slate-400">{char.name ?? 'Unnamed'} · {classLabel(char)}</div>
            <div className="space-y-0.5">
              {levels.length === 0 ? (
                <div className="text-[9px] italic text-slate-600">No leveled slots</div>
              ) : (
                levels.map((lvl) => {
                  const data = slots[lvl]
                  const available = data.max - data.used
                  return (
                    <div key={lvl} className="flex items-center gap-1">
                      <span className="w-4 text-[9px] text-slate-600">L{lvl}</span>
                      <div className="flex gap-0.5">
                        {Array.from({ length: data.max }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full ${
                              i < available ? 'bg-violet-500' : 'border border-slate-700 bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="ml-auto text-[9px] tabular-nums text-slate-500">{available}/{data.max}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
