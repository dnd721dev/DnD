'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CharacterSheetData } from './types'

// ── Types ──────────────────────────────────────────────────────────────────────

type PersonalityField = 'personality_traits' | 'ideals' | 'bonds' | 'flaws'

const PERSONALITY_FIELDS: { key: PersonalityField; label: string }[] = [
  { key: 'personality_traits', label: 'Personality Traits' },
  { key: 'ideals', label: 'Ideals' },
  { key: 'bonds', label: 'Bonds' },
  { key: 'flaws', label: 'Flaws' },
]

type CampaignOption = { id: string; title: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Read notes_data from the character, falling back to the legacy plain-text
 * `notes` field as the "general" entry for backwards compatibility.
 */
function loadNotesData(c: CharacterSheetData): Record<string, string> {
  const raw = (c as any).notes_data
  if (raw && typeof raw === 'object') return raw as Record<string, string>
  // Legacy: migrate plain text to general
  const legacy = String(c.notes ?? '')
  return legacy ? { general: legacy } : {}
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PersonalityNotesPanel({ c }: { c: CharacterSheetData }) {
  // ── Personality fields ──────────────────────────────────────────────────

  const [personalityValues, setPersonalityValues] = useState<Record<PersonalityField, string>>({
    personality_traits: String(c.personality_traits ?? ''),
    ideals: String(c.ideals ?? ''),
    bonds: String(c.bonds ?? ''),
    flaws: String(c.flaws ?? ''),
  })
  const [saveStatus, setSaveStatus] = useState('')
  const personalityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Campaign-aware notes ────────────────────────────────────────────────

  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('general')
  const [notesData, setNotesData] = useState<Record<string, string>>(() => loadNotesData(c))
  const [notesDraft, setNotesDraft] = useState<string>('')
  const [notesDirty, setNotesDirty] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync if character changes (e.g. re-load)
  useEffect(() => {
    setPersonalityValues({
      personality_traits: String(c.personality_traits ?? ''),
      ideals: String(c.ideals ?? ''),
      bonds: String(c.bonds ?? ''),
      flaws: String(c.flaws ?? ''),
    })
    const nd = loadNotesData(c)
    setNotesData(nd)
    setNotesDraft(nd[selectedCampaignId] ?? '')
    setNotesDirty(false)
  }, [c.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep draft in sync when switching campaign tab
  useEffect(() => {
    setNotesDraft(notesData[selectedCampaignId] ?? '')
    setNotesDirty(false)
  }, [selectedCampaignId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load campaigns this character belongs to
  useEffect(() => {
    if (!c.id) return
    ;(async () => {
      const { data } = await supabase
        .from('campaign_character_selections')
        .select('campaign_id, campaigns(id, title)')
        .eq('character_id', c.id)
      if (!data) return
      const list: CampaignOption[] = (data as any[])
        .map((row) => ({
          id: row.campaign_id as string,
          title: (row.campaigns as any)?.title ?? 'Unnamed Campaign',
        }))
        .filter((x) => Boolean(x.id))
      setCampaigns(list)
    })()
  }, [c.id])

  // ── Handlers ────────────────────────────────────────────────────────────

  function handlePersonalityChange(key: PersonalityField, val: string) {
    setPersonalityValues((prev) => ({ ...prev, [key]: val }))
    if (personalityTimer.current) clearTimeout(personalityTimer.current)
    setSaveStatus('Saving…')
    personalityTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('characters')
        .update({ [key]: val || null })
        .eq('id', c.id)
      setSaveStatus(error ? `Error: ${error.message}` : 'Saved!')
      setTimeout(() => setSaveStatus(''), 1200)
    }, 500)
  }

  function handleNotesDraftChange(val: string) {
    setNotesDraft(val)
    setNotesDirty(val !== (notesData[selectedCampaignId] ?? ''))
  }

  async function saveNotes() {
    const next = { ...notesData, [selectedCampaignId]: notesDraft }
    setNotesSaving(true)
    const { error } = await supabase
      .from('characters')
      .update({ notes_data: next })
      .eq('id', c.id)
    if (!error) {
      setNotesData(next)
      setNotesDirty(false)
    }
    setNotesSaving(false)
    return !error
  }

  function handleNotesBlur() {
    if (notesDirty) {
      if (notesTimer.current) clearTimeout(notesTimer.current)
      notesTimer.current = setTimeout(() => void saveNotes(), 500)
    }
  }

  function handleCampaignSwitch(id: string) {
    if (notesDirty) {
      // Prompt before losing unsaved changes
      const ok = window.confirm('You have unsaved notes. Save before switching?')
      if (ok) {
        void saveNotes().then(() => setSelectedCampaignId(id))
        return
      }
      // Discard
      setNotesDirty(false)
    }
    setSelectedCampaignId(id)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const activeCampaignTitle =
    selectedCampaignId === 'general'
      ? 'General'
      : (campaigns.find((c) => c.id === selectedCampaignId)?.title ?? 'Campaign')

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-200">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Personality & Notes
        </h2>
        {saveStatus && <span className="text-[10px] text-slate-400">{saveStatus}</span>}
      </div>

      {/* Personality fields */}
      <div className="grid gap-3 md:grid-cols-2">
        {PERSONALITY_FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
              {f.label}
            </label>
            <textarea
              rows={3}
              value={personalityValues[f.key]}
              onChange={(e) => handlePersonalityChange(f.key, e.target.value)}
              placeholder={`Enter ${f.label.toLowerCase()}…`}
              className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[12px] text-slate-100 placeholder-slate-600 focus:border-indigo-600 focus:outline-none"
            />
          </div>
        ))}
      </div>

      {/* Campaign-aware notes */}
      <div className="mt-4">
        {/* Campaign tabs */}
        <div className="mb-2 flex items-center gap-1 flex-wrap">
          <button
            onClick={() => handleCampaignSwitch('general')}
            className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
              selectedCampaignId === 'general'
                ? 'bg-indigo-600/30 text-indigo-200 ring-1 ring-indigo-500/50'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            General
          </button>
          {campaigns.map((camp) => (
            <button
              key={camp.id}
              onClick={() => handleCampaignSwitch(camp.id)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                selectedCampaignId === camp.id
                  ? 'bg-indigo-600/30 text-indigo-200 ring-1 ring-indigo-500/50'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {camp.title}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">
          Notes — {activeCampaignTitle}
        </label>
        <textarea
          rows={5}
          value={notesDraft}
          onChange={(e) => handleNotesDraftChange(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Session notes, reminders, character history…"
          className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[12px] text-slate-100 placeholder-slate-600 focus:border-indigo-600 focus:outline-none"
        />

        {/* Save button + dirty indicator */}
        <div className="mt-1.5 flex items-center justify-between">
          <span className={`text-[10px] ${notesDirty ? 'text-amber-400' : 'text-slate-600'}`}>
            {notesDirty ? '● Unsaved changes' : ''}
          </span>
          <button
            onClick={() => void saveNotes()}
            disabled={!notesDirty || notesSaving}
            className="rounded-md bg-indigo-600 px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            {notesSaving ? 'Saving…' : 'Save notes'}
          </button>
        </div>
      </div>
    </section>
  )
}
