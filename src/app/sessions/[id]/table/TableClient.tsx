'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'
import GMSidebar from '@/components/table/GMSidebar'
import { PlayerSidebar } from '@/components/table/PlayerSidebar'
import { MonsterStatPanel } from '@/components/table/MonsterStatPanel'
import { MONSTERS } from '@/lib/monsters'

import type { DiceEntry, ExternalRoll } from '@/components/table/tableclient/types'
import { TableTopBar } from '@/components/table/tableclient/components/TableTopBar'
import { MapSection } from '@/components/table/tableclient/components/MapSection'
import { GMQuickRolls } from '@/components/table/tableclient/components/GMQuickRolls'
import { useSessionWithCampaign } from '@/components/table/tableclient/hooks/useSessionWithCampaign'
import { useEncounter } from '@/components/table/tableclient/hooks/useEncounter'
import { useSessionCharacters } from '@/components/table/tableclient/hooks/useSessionCharacters'
import { useSessionRolls } from '@/components/table/tableclient/hooks/useSessionRolls'
import { useMonsterPanel } from '@/components/table/tableclient/hooks/useMonsterPanel'
import {
  abilityMod,
  buildRollerName,
  getAbilityScore,
  getCharacterAC,
  getCharacterMaxHP,
  parseMaybeNumber,
} from '@/components/table/tableclient/utils'

interface TableClientProps {
  sessionId: string
}

export default function TableClient({ sessionId }: TableClientProps) {
  const { address } = useAccount()

  // Prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => setHasMounted(true), [])

  // Session + encounter
  const { session, setSession, loading, error } = useSessionWithCampaign(sessionId)
  const { encounterId, encounterLoading, encounterError } = useEncounter(session)

  // Player characters
  const {
    characters,
    selectedCharacter,
    setSelectedCharacter,
    charsLoading,
    charsError,
    setCharsError,
  } = useSessionCharacters({ address, sessionId, hasMounted })

  // Dice log
  const { diceLog, showDiceLog, setShowDiceLog, pushRollLocal } = useSessionRolls({
    sessionId,
    hasMounted,
  })

  // Monster stat panel
  const { openMonsterToken, setOpenMonsterToken, openMonsterData, setOpenMonsterData } = useMonsterPanel()

  // Per-token combat conditions (GM only, local state)
  const [tokenConditions, setTokenConditions] = useState<Record<string, string[]>>({})

  // ---------- Early render states ----------

  if (!hasMounted) {
    return (
      <div className="flex h-[calc(100vh-2rem)] flex-col gap-2 p-2 sm:p-4">
        <div className="h-12 rounded-xl bg-slate-900/80" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-1 gap-2">
            <div className="flex-1 rounded-xl bg-slate-900/60" />
            <div className="hidden w-80 rounded-xl bg-slate-900/40 md:block" />
          </div>
          <div className="h-28 rounded-xl bg-slate-900/40" />
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-4 text-sm text-slate-400">Loading table…</div>
  }

  if (error || !session) {
    return <div className="p-4 text-sm text-red-400">{error ?? 'Session not found.'}</div>
  }

  // GM check
  const isGm = Boolean(
    address && session.gm_wallet && session.gm_wallet.trim().toLowerCase() === address.trim().toLowerCase()
  )

  const campaignMeta = session.campaigns?.[0]
  const roomName = campaignMeta?.livekit_room_name || `session-${session.id}`
  const mapUrl = session.map_image_url || ''

  // ---------- Dice persistence ----------

  async function persistRollToSupabase(params: {
    label: string
    rollType: string
    formula: string
    result: number
    rollerName: string
  }) {
    if (!session) {
      console.warn('No session loaded, storing roll only locally')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('session_rolls')
        .insert({
          session_id: session.id,
          character_id: selectedCharacter?.id ?? null,
          roller_wallet: address ?? null,
          roller_name: params.rollerName,
          roll_type: params.rollType,
          label: params.label,
          formula: params.formula,
          result_total: params.result,
          result_data: null,
        })
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
        .limit(1).maybeSingle()

      if (error) {
        console.error('session_rolls insert error', error)
        return null
      }

      const entry: DiceEntry = {
        id: (data as any).id as string,
        roller: ((data as any).roller_name as string) || 'Unknown',
        label: ((data as any).label as string) || '',
        result: (data as any).result_total as number,
        formula: ((data as any).formula as string) || '',
        timestamp: new Date((data as any).created_at as string).toLocaleTimeString(),
      }

      return entry
    } catch (e) {
      console.error('session_rolls insert exception', e)
      return null
    }
  }

  async function handleExternalRoll(roll: ExternalRoll) {
    const rollerName = buildRollerName({ selectedCharacter, address })
    const fallbackId = `local-${Date.now()}`

    const persisted = await persistRollToSupabase({
      label: roll.label,
      rollType: 'monster',
      formula: roll.formula,
      result: roll.result,
      rollerName,
    })

    const entry: DiceEntry =
      persisted ?? {
        id: fallbackId,
        roller: rollerName,
        label: roll.label,
        result: roll.result,
        formula: roll.formula,
        timestamp: new Date().toLocaleTimeString(),
      }

    pushRollLocal(entry)
  }

  async function handleTestRoll() {
    const d20 = Math.floor(Math.random() * 20) + 1
    const rollerName = buildRollerName({ selectedCharacter, address })
    const fallbackId = `local-${Date.now()}`

    const persisted = await persistRollToSupabase({
      label: 'Test Roll',
      rollType: 'test',
      formula: '1d20',
      result: d20,
      rollerName,
    })

    const entry: DiceEntry =
      persisted ?? {
        id: fallbackId,
        roller: rollerName,
        label: 'Test Roll',
        result: d20,
        formula: '1d20',
        timestamp: new Date().toLocaleTimeString(),
      }

    pushRollLocal(entry)
    setShowDiceLog(true)
  }

  async function handleAbilityCheck(abilityKey: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', label: string) {
    const score = getAbilityScore(selectedCharacter, abilityKey)
    const mod = abilityMod(score)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + mod

    const rollerName = buildRollerName({ selectedCharacter, address })
    const modSign = mod >= 0 ? '+' : ''
    const formula = `1d20${modSign}${mod}`
    const fallbackId = `local-${Date.now()}`

    const persisted = await persistRollToSupabase({
      label,
      rollType: 'ability_check',
      formula,
      result: total,
      rollerName,
    })

    const entry: DiceEntry =
      persisted ?? {
        id: fallbackId,
        roller: rollerName,
        label,
        result: total,
        formula,
        timestamp: new Date().toLocaleTimeString(),
      }

    pushRollLocal(entry)
    setShowDiceLog(true)
  }

  async function handleInitiative() {
    const dexScore = getAbilityScore(selectedCharacter, 'dex')
    const mod = abilityMod(dexScore)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + mod

    const rollerName = buildRollerName({ selectedCharacter, address })
    const modSign = mod >= 0 ? '+' : ''
    const formula = `1d20${modSign}${mod}`
    const fallbackId = `local-${Date.now()}`

    const persisted = await persistRollToSupabase({
      label: 'Initiative',
      rollType: 'initiative',
      formula,
      result: total,
      rollerName,
    })

    // Also upsert into initiative_entries for this encounter
    if (encounterId && address) {
      const { error } = await supabase
        .from('initiative_entries')
        .upsert(
          {
            encounter_id: encounterId,
            character_id: selectedCharacter?.id ?? null,
            token_id: null,
            wallet_address: address,
            name: selectedCharacter?.name ?? rollerName,
            init: total,
            hp: getCharacterMaxHP(selectedCharacter),
            is_pc: true,
          },
          { onConflict: 'encounter_id,wallet_address' }
        )

      if (error) {
        console.error('initiative_entries upsert error', error)
      }
    }

    const entry: DiceEntry = {
      id: persisted?.id ?? fallbackId,
      roller: rollerName,
      label: 'Initiative',
      result: total,
      formula,
      timestamp: new Date().toLocaleTimeString(),
    }

    pushRollLocal(entry)
    setShowDiceLog(true)
  }

  // ---------- Character selection (players) ----------

  async function handleSelectCharacter(characterId: string) {
    if (!address || !session) {
      setCharsError('Connect your wallet to select a character.')
      return
    }

    setCharsError(null)

    // ✅ FIX: avoid `.limit(1).maybeSingle()()` throwing "Cannot coerce..."
    const { data, error } = await supabase
      .from('session_characters')
      .upsert(
        {
          session_id: session.id,
          wallet_address: address,
          character_id: characterId,
          is_active: true,
        },
        { onConflict: 'session_id,wallet_address' }
      )
      .select('character_id')
      .limit(1)
      .limit(1).maybeSingle()

    if (error) {
      console.error('session_characters upsert error', error)
      setCharsError(error.message)
      return
    }

    const updatedId = (data as any)?.character_id ?? characterId
    const found = characters.find(c => c.id === updatedId) ?? null
    setSelectedCharacter(found)

    // Ensure a PC token exists on the map for this wallet+character
    if (encounterId && address && found) {
      try {
        const { data: existing, error: existingError } = await supabase
          .from('tokens')
          .select('id')
          .eq('encounter_id', encounterId)
          .eq('type', 'pc')
          .eq('owner_wallet', address)
          .limit(1).maybeSingle()

        if (existingError && (existingError as any).code !== 'PGRST116') {
          console.error('tokens existing pc error', existingError)
        }

        if (!existing) {
          const hp = getCharacterMaxHP(found)
          const ac = getCharacterAC(found)

          const { error: insertError } = await supabase.from('tokens').insert({
            encounter_id: encounterId,
            type: 'pc',
            label: found.name || 'PC',
            x: 100,
            y: 100,
            owner_wallet: address,
            hp,
            current_hp: hp,
            ac,
          })

          if (insertError) {
            console.error('Failed to create PC token', insertError)
          } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dnd721-tokens-updated', { detail: { source: 'pc-selection' } }))
          }
        }
      } catch (err) {
        console.error('Error ensuring PC token', err)
      }
    }
  }

  // ---------- Map upload (GM only) ----------

  async function handleMapUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !session) return
    const file = e.target.files[0]
    if (!file) return

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${session.id}.${fileExt}`
    const filePath = fileName

    const { error: uploadError } = await supabase.storage.from('maps').upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error(uploadError)
      alert('Failed to upload map.')
      return
    }

    const { data } = supabase.storage.from('maps').getPublicUrl(filePath)
    const publicUrl = (data as any)?.publicUrl

    if (!publicUrl) {
      alert('Map uploaded, but no public URL returned.')
      return
    }

    const { error: updateError } = await supabase.from('sessions').update({ map_image_url: publicUrl }).eq('id', session.id)

    if (updateError) {
      console.error(updateError)
      alert('Failed to update session with map URL')
      return
    }

    setSession(prev => (prev ? { ...prev, map_image_url: publicUrl } : prev))
    alert('Map updated successfully!')
  }

  // ---------- Monster spawning helper ----------

  async function spawnMonsterToken(monster: { id: string; name: string }) {
    if (!encounterId) return

    const startX = 100
    const startY = 100

    let baseHp: number | null = null
    let baseAc: number | null = null

    try {
      if (monster.id.startsWith('srd:')) {
        const key = monster.id.replace('srd:', '')
        const found = (MONSTERS as any[]).find((m: any) => {
          const nameMatch = m.name && typeof m.name === 'string' && m.name.toLowerCase() === monster.name.toLowerCase()
          return m.id === key || m.slug === key || nameMatch
        })

        if (found) {
          baseHp =
            parseMaybeNumber(found.hp) ??
            parseMaybeNumber(found.hit_points) ??
            parseMaybeNumber(found.hitPoints) ??
            parseMaybeNumber(found.max_hp) ??
            parseMaybeNumber(found.maxHp) ??
            null

          baseAc =
            parseMaybeNumber(found.ac) ??
            parseMaybeNumber(found.armor_class) ??
            parseMaybeNumber(found.armorClass) ??
            (Array.isArray(found.armor_class) ? parseMaybeNumber(found.armor_class[0]?.value) : null)
        }
      }
    } catch (err) {
      console.warn('Could not derive base HP/AC for monster', monster, err)
    }

    const { error } = await supabase.from('tokens').insert({
      encounter_id: encounterId,
      type: 'monster',
      monster_id: monster.id,
      name: monster.name,
      label: monster.name,
      x: startX,
      y: startY,
      hp: baseHp,
      current_hp: baseHp,
      ac: baseAc,
    })

    if (error) {
      console.error('Failed to spawn monster token', (error as any).message || (error as any).details || error)
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dnd721-tokens-updated', { detail: { encounterId } }))
    }
  }

  // ---------- Shared layout pieces ----------

  const topBar = (
    <TableTopBar
      session={session}
      isGm={isGm}
      address={address}
      roomName={roomName}
      showDiceLog={showDiceLog}
      onToggleDiceLog={() => setShowDiceLog(v => !v)}
    />
  )

  const mapSection = (
    <MapSection
      mapUrl={mapUrl}
      encounterId={encounterId}
      encounterLoading={encounterLoading}
      encounterError={encounterError}
      isGm={isGm}
      address={address}
      onMapUpload={handleMapUpload}
      showDiceLog={showDiceLog}
      diceLog={diceLog}
      onTestRoll={handleTestRoll}
      onCloseDiceLog={() => setShowDiceLog(false)}
    />
  )

  // ---------- GM layout ----------

  if (isGm) {
    return (
      <div className="flex h-[calc(100vh-2rem)] flex-col gap-2 p-2 sm:p-4">
        {topBar}

        <div className="flex flex-1 gap-2 min-h-0 min-w-0">
          <div className="flex-1 min-h-0 min-w-0">{mapSection}</div>

          <aside className="hidden w-80 shrink-0 flex-col md:flex">
            <GMSidebar
              encounterId={encounterId}
              address={address ?? null}
              onRoll={handleExternalRoll}
              spawnMonsterToken={spawnMonsterToken}
            />

            <GMQuickRolls onRoll={handleExternalRoll} />

            {openMonsterToken && (
              <MonsterStatPanel
                token={openMonsterToken}
                monster={openMonsterData}
                conditions={tokenConditions[String(openMonsterToken.id)] ?? []}
                onToggleCondition={condition => {
                  const key = String(openMonsterToken.id)
                  setTokenConditions(prev => {
                    const existing = prev[key] ?? []
                    const has = existing.includes(condition)
                    const next = has ? existing.filter(c => c !== condition) : [...existing, condition]
                    return { ...prev, [key]: next }
                  })
                }}
                onClose={() => {
                  setOpenMonsterToken(null)
                  setOpenMonsterData(null)
                }}
                onRoll={handleExternalRoll}
              />
            )}
          </aside>
        </div>
      </div>
    )
  }

  // ---------- Player layout ----------

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-2 p-2 sm:p-4">
      {topBar}

      <div className="flex flex-1 flex-col gap-2 min-h-0">
        <div className="flex flex-1 gap-2 min-h-0">
          {mapSection}

          <PlayerSidebar
            address={address ?? null}
            characters={characters}
            selectedCharacter={selectedCharacter}
            selectedCharacterId={selectedCharacter?.id ?? null}
            charsError={charsError}
            charsLoading={charsLoading}
            onSelectCharacter={id => {
              if (!id) {
                setSelectedCharacter(null)
                if (address) {
                  const key = `table_selected_char_${sessionId}_${address.toLowerCase()}`
                  window.localStorage.removeItem(key)
                }
                return
              }
              void handleSelectCharacter(id)
            }}
            onAbilityCheck={handleAbilityCheck}
            onInitiative={handleInitiative}
          />
        </div>
      </div>
    </div>
  )
}
