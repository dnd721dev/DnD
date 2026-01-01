'use client'

import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
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

type CharacterRow = {
  id: string
  name: string
  level: number | null
  class_key: string | null
  race_key: string | null
  abilities?: any
  hit_points_max?: number | null
  hp?: number | null
  ac?: number | null
}

export default function TableClient({ sessionId }: TableClientProps) {
  const { address } = useAccount()

  // Prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => setHasMounted(true), [])

  // Session + encounter
  const { session, setSession, loading, error } = useSessionWithCampaign(sessionId)
  const { encounterId, encounterLoading, encounterError } = useEncounter(session)

  // Dice log
  const { diceLog, showDiceLog, setShowDiceLog, pushRollLocal } = useSessionRolls({
    sessionId,
    hasMounted,
  })

  // Monster stat panel
  const { openMonsterToken, setOpenMonsterToken, openMonsterData, setOpenMonsterData } = useMonsterPanel()

  // Per-token combat conditions (GM only, local state)
  const [tokenConditions, setTokenConditions] = useState<Record<string, string[]>>({})

  // ✅ Campaign Character state (locked)
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRow | null>(null)
  const [charsLoading, setCharsLoading] = useState(false)
  const [charsError, setCharsError] = useState<string | null>(null)

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

  const campaignId = session.campaign_id ?? null

  // ✅ Load characters + campaign selection ONCE per campaignId/address (players only)
  useEffect(() => {
    if (!hasMounted) return
    if (!campaignId) return

    // GM can run without a character
    if (isGm) {
      setCharsError(null)
      setCharsLoading(false)
      setCharacters([])
      setSelectedCharacter(null)
      return
    }

    if (!address) {
      setCharsError('Connect your wallet to load your campaign character.')
      setCharsLoading(false)
      setCharacters([])
      setSelectedCharacter(null)
      return
    }

    const load = async () => {
      setCharsLoading(true)
      setCharsError(null)

      // 1) Load all characters for this wallet (so sidebar can still show info)
      const charsRes = await supabase
        .from('characters')
        .select('id, name, level, class_key, race_key, abilities, hit_points_max, hp, ac')
        .eq('wallet_address', address)
        .order('created_at', { ascending: true })

      if (charsRes.error) {
        console.error('characters load error', charsRes.error)
        setCharsError(charsRes.error.message)
        setCharsLoading(false)
        return
      }

      const chars = (charsRes.data as any as CharacterRow[]) ?? []
      setCharacters(chars)

      // 2) Load Campaign Character selection
      const selRes = await supabase
        .from('campaign_character_selections')
        .select('character_id')
        .eq('campaign_id', campaignId)
        .eq('wallet_address', address)
        .limit(1)
        .maybeSingle()

      if (selRes.error) {
        console.error('campaign_character_selections error', selRes.error)
        setCharsError(selRes.error.message)
        setSelectedCharacter(null)
        setCharsLoading(false)
        return
      }

      const selectedId = (selRes.data as any)?.character_id ?? null
      if (!selectedId) {
        setCharsError('No Campaign Character selected. Go to the campaign page and select one.')
        setSelectedCharacter(null)
        setCharsLoading(false)
        return
      }

      const found = chars.find((c) => c.id === selectedId) ?? null
      if (!found) {
        setCharsError('Your selected Campaign Character was not found in your characters list.')
        setSelectedCharacter(null)
        setCharsLoading(false)
        return
      }

      setSelectedCharacter(found)
      setCharsLoading(false)
    }

    void load()
  }, [hasMounted, campaignId, address, isGm])

  // ✅ Ensure session_players row matches campaign character (players only)
  useEffect(() => {
    if (!session?.id) return
    if (!campaignId) return
    if (!address) return
    if (isGm) return
    if (!selectedCharacter?.id) return

    const ensure = async () => {
      const { error } = await supabase
        .from('session_players')
        .upsert(
          {
            session_id: session.id,
            wallet_address: address,
            character_id: selectedCharacter.id,
            role: 'player',
            is_ready: false,
          },
          { onConflict: 'session_id,wallet_address' }
        )

      if (error) console.error('session_players upsert error', error)
    }

    void ensure()
  }, [session?.id, campaignId, address, isGm, selectedCharacter?.id])

  // ✅ Ensure PC token exists for this wallet (players only)
  useEffect(() => {
    if (!encounterId) return
    if (!address) return
    if (isGm) return
    if (!selectedCharacter) return

    const ensurePcToken = async () => {
      try {
        const { data: existing, error: existingError } = await supabase
          .from('tokens')
          .select('id')
          .eq('encounter_id', encounterId)
          .eq('type', 'pc')
          .eq('owner_wallet', address)
          .limit(1)
          .maybeSingle()

        if (existingError && (existingError as any).code !== 'PGRST116') {
          console.error('tokens existing pc error', existingError)
        }

        if (!existing) {
          const hp = getCharacterMaxHP(selectedCharacter)
          const ac = getCharacterAC(selectedCharacter)

          const { error: insertError } = await supabase.from('tokens').insert({
            encounter_id: encounterId,
            type: 'pc',
            label: selectedCharacter.name || 'PC',
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
            window.dispatchEvent(new CustomEvent('dnd721-tokens-updated', { detail: { source: 'campaign-char' } }))
          }
        }
      } catch (err) {
        console.error('Error ensuring PC token', err)
      }
    }

    void ensurePcToken()
  }, [encounterId, address, isGm, selectedCharacter])

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
        .limit(1)
        .maybeSingle()

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
    if (!selectedCharacter) return
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
    if (!selectedCharacter) return
    if (!encounterId) return
    if (!address) return

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

    // ✅ FIX: Upsert initiative for this encounter (force character_id to never be null)
    const { error } = await supabase
      .from('initiative_entries')
      .upsert(
        {
          encounter_id: encounterId,
          character_id: selectedCharacter.id, // ✅ enforce not-null
          token_id: null,
          wallet_address: address,
          name: selectedCharacter.name ?? rollerName,
          init: total,
          hp: getCharacterMaxHP(selectedCharacter),
          is_pc: true,
        },
        { onConflict: 'encounter_id,wallet_address' }
      )

    if (error) console.error('initiative_entries upsert error', error)

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

    setSession((prev) => (prev ? { ...prev, map_image_url: publicUrl } : prev))
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
      onToggleDiceLog={() => setShowDiceLog((v) => !v)}
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
                onToggleCondition={(condition) => {
                  const key = String(openMonsterToken.id)
                  setTokenConditions((prev) => {
                    const existing = prev[key] ?? []
                    const has = existing.includes(condition)
                    const next = has ? existing.filter((c) => c !== condition) : [...existing, condition]
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

  // 🔒 If player hasn’t selected a Campaign Character, block the table
  if (!address) {
    return <div className="p-4 text-sm text-yellow-300">Connect your wallet to join the table.</div>
  }

  if (charsLoading) {
    return <div className="p-4 text-sm text-slate-400">Loading your campaign character…</div>
  }

  if (charsError || !selectedCharacter) {
    return (
      <div className="p-4 text-sm text-red-300">
        {charsError ?? 'No Campaign Character selected. Go to the campaign page and pick one.'}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-2 p-2 sm:p-4">
      {topBar}

      <div className="flex flex-1 flex-col gap-2 min-h-0">
        <div className="flex flex-1 gap-2 min-h-0">
          {mapSection}

          <PlayerSidebar
            address={address ?? null}
            // keep list, but selection is locked by us
            characters={characters}
            selectedCharacter={selectedCharacter}
            selectedCharacterId={selectedCharacter?.id ?? null}
            charsError={null}
            charsLoading={false}
            onSelectCharacter={() => {
              // 🔒 locked on purpose
              setCharsError('Character is locked to your Campaign Character. Change it on the campaign page.')
              setTimeout(() => setCharsError(null), 1800)
            }}
            onAbilityCheck={handleAbilityCheck}
            onInitiative={handleInitiative}
          />
        </div>
      </div>
    </div>
  )
}
