'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { rollD20WithCrit } from '@/lib/dice'
import { SKILLS, type SkillKey, type AbilityKey } from '@/lib/skills'
import { profBonus, abilityModifier } from '@/lib/spellCategories'

// ──────────────────────────────────────────────────────────────────────────────
// Private (secret) rolls panel — DM picks a player + a skill (or raw ability)
// + DC + advantage mode, then rolls d20 with the picked character's modifier.
// The result is shown ONLY in this panel — no public roll feed, no realtime.
// Ideal for "Alice rolls Perception for the hidden trap, only the DM sees it."
//
// Storage: local state only (ephemeral). The plan flagged Option B (persisted
// table) as a follow-up if reload survival becomes a real ask.
// ──────────────────────────────────────────────────────────────────────────────

export type PrivateRollPlayer = {
  characterId: string
  name: string
  level: number
}

type CharacterDetails = {
  id: string
  level: number | null
  abilities: Record<string, number> | null
  skill_profs: string[] | null
}

type RollMode = 'normal' | 'adv' | 'dis'

type ResultRow = {
  ts: number               // epoch ms for ordering
  player: string
  checkLabel: string
  natural: number
  total: number
  mod: number
  dc: number | null
  mode: RollMode
}

const SKILL_OPTIONS: { key: SkillKey | 'raw'; label: string }[] = [
  ...(Object.entries(SKILLS) as [SkillKey, typeof SKILLS[SkillKey]][])
    .map(([k, s]) => ({ key: k, label: s.name } as { key: SkillKey | 'raw'; label: string })),
]
// We also let the DM pick a "raw ability" check.
const ABILITIES: { key: AbilityKey; label: string }[] = [
  { key: 'str', label: 'Strength' },
  { key: 'dex', label: 'Dexterity' },
  { key: 'con', label: 'Constitution' },
  { key: 'int', label: 'Intelligence' },
  { key: 'wis', label: 'Wisdom' },
  { key: 'cha', label: 'Charisma' },
]

export function PrivateRollsPanel({ players }: { players: PrivateRollPlayer[] }) {
  const [selectedCharId, setSelectedCharId] = useState<string>('')
  const [selectedSkill, setSelectedSkill] = useState<SkillKey>('perception')
  const [rawAbility, setRawAbility]      = useState<AbilityKey>('wis')
  const [useRawAbility, setUseRawAbility] = useState(false)
  const [dc, setDc]       = useState<string>('15')
  const [mode, setMode]   = useState<RollMode>('normal')
  const [results, setResults] = useState<ResultRow[]>([])
  const [busy, setBusy] = useState(false)

  // Fetched character details for the currently-picked player (abilities + skill profs).
  const [details, setDetails] = useState<Record<string, CharacterDetails>>({})

  useEffect(() => {
    // Auto-select the first player on first render so the panel isn't empty.
    if (!selectedCharId && players.length > 0) {
      setSelectedCharId(players[0].characterId)
    }
  }, [players, selectedCharId])

  // Lazy-fetch character ability data when a player is picked.
  useEffect(() => {
    if (!selectedCharId || details[selectedCharId]) return
    void supabase
      .from('characters')
      .select('id, level, abilities, skill_profs')
      .eq('id', selectedCharId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setDetails((prev) => ({ ...prev, [selectedCharId]: data as CharacterDetails }))
      })
  }, [selectedCharId, details])

  const detail = details[selectedCharId]

  // Compute the modifier for the current pick, or null if we don't have enough data.
  const previewMod = useMemo<number | null>(() => {
    if (!detail) return null
    const abilities = detail.abilities ?? {}
    const level = Math.max(1, Number(detail.level ?? 1))
    if (useRawAbility) {
      const score = Number(abilities[rawAbility] ?? 10)
      return abilityModifier(score)
    }
    const skill = SKILLS[selectedSkill]
    const score = Number(abilities[skill.ability] ?? 10)
    const baseMod = abilityModifier(score)
    const profs = (detail.skill_profs ?? []).map((s) => String(s).toLowerCase())
    const isProficient = profs.includes(selectedSkill.toLowerCase())
    return baseMod + (isProficient ? profBonus(level) : 0)
  }, [detail, useRawAbility, rawAbility, selectedSkill])

  const player = players.find((p) => p.characterId === selectedCharId) ?? null

  function doRoll() {
    if (!player || previewMod == null) return
    setBusy(true)
    try {
      const sign = previewMod >= 0 ? '+' : ''
      const formula =
        mode === 'adv' ? `2d20kh1${sign}${previewMod}` :
        mode === 'dis' ? `2d20kl1${sign}${previewMod}` :
                         `1d20${sign}${previewMod}`
      const res = rollD20WithCrit(formula)
      const natural = res.natural ?? res.kept[0] ?? 0
      const checkLabel = useRawAbility
        ? `${ABILITIES.find((a) => a.key === rawAbility)?.label ?? rawAbility} (raw)`
        : SKILLS[selectedSkill].name
      const dcNum = dc.trim() ? Number(dc) : null

      const row: ResultRow = {
        ts: Date.now(),
        player: player.name,
        checkLabel,
        natural,
        total: res.total,
        mod: previewMod,
        dc: Number.isFinite(dcNum) ? (dcNum as number) : null,
        mode,
      }
      setResults((prev) => [row, ...prev].slice(0, 20))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h3 className="text-sm font-bold text-indigo-200">Private Rolls</h3>
        <p className="text-xs text-slate-400">
          Roll an ability/skill check for a player. Results stay in this tab — players never see them in their feed.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="uppercase tracking-wide text-slate-400">Player</span>
          <select
            value={selectedCharId}
            onChange={(e) => setSelectedCharId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
          >
            {players.length === 0 && <option>(no players in this session)</option>}
            {players.map((p) => (
              <option key={p.characterId} value={p.characterId}>
                {p.name} (Lv {p.level})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="uppercase tracking-wide text-slate-400">Check Type</span>
          <div className="flex items-center gap-2">
            <select
              value={useRawAbility ? '__raw__' : selectedSkill}
              onChange={(e) => {
                if (e.target.value === '__raw__') {
                  setUseRawAbility(true)
                } else {
                  setUseRawAbility(false)
                  setSelectedSkill(e.target.value as SkillKey)
                }
              }}
              className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="__raw__">— Raw ability check —</option>
              {SKILL_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </label>

        {useRawAbility && (
          <label className="flex flex-col gap-1 text-xs text-slate-300">
            <span className="uppercase tracking-wide text-slate-400">Ability</span>
            <select
              value={rawAbility}
              onChange={(e) => setRawAbility(e.target.value as AbilityKey)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
            >
              {ABILITIES.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="uppercase tracking-wide text-slate-400">DC (optional)</span>
          <input
            type="number"
            value={dc}
            onChange={(e) => setDc(e.target.value)}
            placeholder="—"
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
        </label>

        <div className="flex flex-col gap-1 text-xs text-slate-300">
          <span className="uppercase tracking-wide text-slate-400">Roll Mode</span>
          <div className="flex gap-1">
            {(['normal', 'adv', 'dis'] as RollMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ring-1 transition ${
                  mode === m
                    ? 'bg-indigo-600/30 text-indigo-100 ring-indigo-500/60'
                    : 'bg-slate-900 text-slate-300 ring-slate-700 hover:bg-slate-800'
                }`}
              >
                {m === 'normal' ? 'Normal' : m === 'adv' ? 'Advantage' : 'Disadvantage'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={doRoll}
          disabled={busy || !player || previewMod == null}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-40"
        >
          🎲 Roll Secretly
        </button>
        <span className="text-xs text-slate-400">
          Modifier preview:{' '}
          {previewMod == null ? '—' : (previewMod >= 0 ? `+${previewMod}` : previewMod)}
        </span>
      </div>

      <section>
        <h4 className="mb-2 text-xs uppercase tracking-wide text-slate-400">Last results (private)</h4>
        {results.length === 0 ? (
          <p className="text-xs italic text-slate-500">No rolls yet this session.</p>
        ) : (
          <ul className="space-y-1 font-mono text-xs">
            {results.map((r) => {
              const passed = r.dc != null ? r.total >= r.dc : null
              const time = new Date(r.ts).toLocaleTimeString()
              const sign = r.mod >= 0 ? '+' : ''
              return (
                <li
                  key={r.ts}
                  className="flex items-baseline justify-between rounded-md bg-slate-950/60 px-2 py-1 ring-1 ring-slate-800"
                >
                  <span className="text-slate-500">{time}</span>
                  <span className="flex-1 px-2 text-slate-200">
                    {r.player} — {r.checkLabel}
                    {r.mode !== 'normal' && (
                      <span className="ml-1 text-amber-300">[{r.mode === 'adv' ? 'adv' : 'dis'}]</span>
                    )}
                  </span>
                  <span className="text-slate-400">
                    nat {r.natural}{sign}{r.mod} = <span className="font-bold text-slate-100">{r.total}</span>
                    {r.dc != null && (
                      <span className={`ml-2 font-semibold ${passed ? 'text-emerald-300' : 'text-red-400'}`}>
                        DC {r.dc} {passed ? '✓' : '✗'}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
