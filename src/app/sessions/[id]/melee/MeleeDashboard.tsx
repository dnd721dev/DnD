'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PlayerSidebar } from '@/components/table/PlayerSidebar'
import { getAbilityScore, abilityMod, buildRollerName } from '@/components/table/tableclient/utils'
import type { CharacterSummary } from '@/components/table/tableclient/types'

// Dedicated full-page dashboard for martial characters — the melee
// equivalent of the Spell Dashboard. Reuses PlayerSidebar's weapon-attack
// and action-economy panel (already fully implemented there) in a roomy,
// standalone layout instead of the cramped table sidebar.
//
// Note: this page has no map, so it can't offer click-to-target like the
// table view does — weapon attacks roll without an AC comparison here.
// Open it alongside the table tab for full targeting.

type CharRow = CharacterSummary & { id: string; name: string | null }

export function MeleeDashboard({ sessionId }: { sessionId: string }) {
  const [wallet, setWallet] = useState<string | null>(null)
  const [characters, setCharacters] = useState<CharRow[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const [charsLoading, setCharsLoading] = useState(true)
  const [charsError, setCharsError] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)

  useEffect(() => {
    const w = typeof window !== 'undefined' ? window.localStorage.getItem('dnd721_wallet') : null
    setWallet(w ? w.toLowerCase() : null)
  }, [])

  useEffect(() => {
    if (!wallet) { setCharsLoading(false); return }
    let cancelled = false
    async function load() {
      setCharsLoading(true)
      setCharsError(null)
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, level, main_job, race, abilities, hit_points_max, hp, ac, speed, vision')
        .eq('wallet_address', wallet)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error) {
        setCharsError(error.message)
        setCharsLoading(false)
        return
      }
      const rows = (data as any[] as CharRow[]) ?? []
      setCharacters(rows)
      setSelectedCharacterId((prev) => prev ?? rows[0]?.id ?? null)
      setCharsLoading(false)

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('wallet_address', wallet)
        .maybeSingle()
      if (!cancelled) setDisplayName((profile as any)?.display_name ?? null)
    }
    load()
    return () => { cancelled = true }
  }, [wallet])

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) ?? null

  const handleAbilityCheck = useCallback(async (abilityKey: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', label: string) => {
    if (!selectedCharacter) return
    const score = getAbilityScore(selectedCharacter, abilityKey)
    const mod = abilityMod(score)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + mod
    const rollerName = buildRollerName({ selectedCharacter, displayName })
    const sign = mod >= 0 ? '+' : ''
    await supabase.from('session_rolls').insert({
      session_id: sessionId,
      roll_type: 'ability_check',
      label,
      formula: `1d20${sign}${mod}`,
      result_total: total,
      roller_name: rollerName,
      roller_wallet: wallet,
    })
  }, [selectedCharacter, sessionId, wallet, displayName])

  const handleInitiative = useCallback(async () => {
    if (!selectedCharacter || !wallet) return
    const { data: enc } = await supabase
      .from('encounters')
      .select('id')
      .eq('session_id', sessionId)
      .limit(1)
      .maybeSingle()
    const encounterId = (enc as any)?.id
    if (!encounterId) return

    const dexScore = getAbilityScore(selectedCharacter, 'dex')
    const mod = abilityMod(dexScore)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + mod
    const rollerName = buildRollerName({ selectedCharacter, displayName })

    await supabase.from('initiative_entries').upsert({
      encounter_id: encounterId,
      character_id: selectedCharacter.id,
      token_id: null,
      wallet_address: wallet,
      name: selectedCharacter.name ?? rollerName,
      init: total,
      hp: Number((selectedCharacter as any).hp ?? (selectedCharacter as any).hit_points_max ?? 0) || null,
      is_pc: true,
    }, { onConflict: 'encounter_id,wallet_address' })

    const sign = mod >= 0 ? '+' : ''
    await supabase.from('session_rolls').insert({
      session_id: sessionId,
      roll_type: 'initiative',
      label: 'Initiative',
      formula: `1d20${sign}${mod}`,
      result_total: total,
      roller_name: rollerName,
      roller_wallet: wallet,
    })
  }, [selectedCharacter, sessionId, wallet, displayName])

  const handleRoll = useCallback((roll: { label: string; formula: string; result: number; outcome?: string | null }) => {
    void supabase.from('session_rolls').insert({
      session_id: sessionId,
      roll_type: 'custom',
      label: roll.label,
      formula: roll.formula,
      result_total: roll.result,
      roller_name: buildRollerName({ selectedCharacter, displayName }),
      roller_wallet: wallet,
    })
  }, [sessionId, wallet, selectedCharacter, displayName])

  return (
    <div className="flex h-screen flex-col bg-slate-950 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold text-yellow-200">⚔ Melee Dashboard</h1>
        <p className="text-[11px] text-slate-500">Open alongside the table tab for map targeting</p>
      </div>
      <div className="min-h-0 flex-1">
        <PlayerSidebar
          sessionId={sessionId}
          address={wallet}
          characters={characters.map((c) => ({ id: c.id, name: c.name }))}
          selectedCharacter={selectedCharacter ? { id: selectedCharacter.id, name: selectedCharacter.name } : null}
          selectedCharacterId={selectedCharacterId}
          charsError={charsError}
          charsLoading={charsLoading}
          onSelectCharacter={setSelectedCharacterId}
          onAbilityCheck={handleAbilityCheck}
          onInitiative={handleInitiative}
          onRoll={handleRoll}
        />
      </div>
    </div>
  )
}
