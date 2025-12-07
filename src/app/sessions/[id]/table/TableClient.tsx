'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'
import VoiceChat from '@/components/table/VoiceChat'
import MapBoard from '@/components/table/MapBoard'
import MapBoardView from '@/components/table/MapBoardView'
import GMSidebar from '@/components/table/GMSidebar'
import { PlayerSidebar } from '@/components/table/PlayerSidebar'
import { MonsterStatPanel } from '../../../../components/table/MonsterStatPanel'
import { MONSTERS } from '@/lib/monsters'

type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

type SessionWithCampaign = {
  id: string
  title: string | null
  status: SessionStatus
  scheduled_start: string | null
  duration_minutes: number
  campaign_id: string | null
  gm_wallet: string | null
  map_image_url: string | null
  campaigns?: {
    livekit_room_name: string | null
    title: string | null
  }[] | null
}

interface TableClientProps {
  sessionId: string
}

type DiceEntry = {
  id: string
  roller: string
  label: string
  result: number
  formula: string
  timestamp: string
}

type ExternalRoll = {
  label: string
  formula: string
  result: number
}

// Loose character summary – we only care about a few fields
type CharacterSummary = {
  id: string
  name?: string | null
  abilities?: {
    str?: number | string
    dex?: number | string
    con?: number | string
    int?: number | string
    wis?: number | string
    cha?: number | string
    [key: string]: number | string | undefined
  }
  [key: string]: any
}

export default function TableClient({ sessionId }: TableClientProps) {
  const { address } = useAccount()

  const [session, setSession] = useState<SessionWithCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Encounter row in encounters table (real FK target for tokens)
  const [encounterId, setEncounterId] = useState<string | null>(null)
  const [encounterLoading, setEncounterLoading] = useState(false)
  const [encounterError, setEncounterError] = useState<string | null>(null)

  // Dice log
  const [diceLog, setDiceLog] = useState<DiceEntry[]>([])
  const [showDiceLog, setShowDiceLog] = useState(false)

  // Monster stat panel state (GM)
  const [openMonsterToken, setOpenMonsterToken] = useState<any | null>(null)
  const [openMonsterData, setOpenMonsterData] = useState<any | null>(null)

  // Per-token combat conditions (GM only, local state)
  const [tokenConditions, setTokenConditions] = useState<
    Record<string, string[]>
  >({})

  // Character drawer state
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [selectedCharacter, setSelectedCharacter] =
    useState<CharacterSummary | null>(null)
  const [charsLoading, setCharsLoading] = useState(false)
  const [charsError, setCharsError] = useState<string | null>(null)

  // Prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false)
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Load session + campaign info
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('sessions')
        .select(
          `
          id,
          title,
          status,
          scheduled_start,
          duration_minutes,
          campaign_id,
          gm_wallet,
          map_image_url,
          campaigns:campaign_id (
            livekit_room_name,
            title
          )
        `
        )
        .eq('id', sessionId)
        .single()

      if (error || !data) {
        console.error(error)
        setError(error?.message ?? 'Session not found.')
        setSession(null)
        setLoading(false)
        return
      }

      setSession(data as SessionWithCampaign)
      setLoading(false)
    }

    load()
  }, [sessionId])

  // Ensure there is an encounters row for this session
  useEffect(() => {
    if (!session) return

    async function ensureEncounter(s: SessionWithCampaign) {
      setEncounterLoading(true)
      setEncounterError(null)

      // 1) Try to find an existing encounter for this session
      const { data, error } = await supabase
        .from('encounters')
        .select('id')
        .eq('session_id', s.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('encounters select error', error)
        setEncounterError(error.message)
        setEncounterLoading(false)
        return
      }

      if (data && data.id) {
        setEncounterId(data.id as string)
        setEncounterLoading(false)
        return
      }

      // 2) If none exists, create one
      const { data: created, error: insertError } = await supabase
        .from('encounters')
        .insert({
          session_id: s.id,
          title: s.title ?? 'Session Encounter',
        })
        .select('id')
        .single()

      if (insertError) {
        console.error('encounters insert error', insertError)
        setEncounterError(insertError.message)
        setEncounterLoading(false)
        return
      }

      setEncounterId(created.id as string)
      setEncounterLoading(false)
    }

    ensureEncounter(session)
  }, [session])

  // Load characters for this wallet + link to session_characters
  useEffect(() => {
    if (!address || !hasMounted || !sessionId) return

    async function loadCharactersForWallet() {
      setCharsLoading(true)
      setCharsError(null)

      // 1) Load any existing session_characters link for this wallet
      const { data: link, error: linkError } = await supabase
        .from('session_characters')
        .select('character_id')
        .eq('session_id', sessionId)
        .eq('wallet_address', address)
        .maybeSingle()

      if (linkError && linkError.code !== 'PGRST116') {
        console.error('session_characters error', linkError)
      }

      const linkedCharacterId = link?.character_id ?? null

      // 2) Load all characters for this wallet
      const { data: charRows, error: charError } = await supabase
        .from('characters')
        .select('*')
        .eq('wallet_address', address)
        .order('created_at', { ascending: true })

      if (charError) {
        console.error('characters error', charError)
        setCharsError(charError.message)
        setCharacters([])
        setSelectedCharacter(null)
        setCharsLoading(false)
        return
      }

      const chars = (charRows ?? []) as CharacterSummary[]
      setCharacters(chars)

      if (linkedCharacterId) {
        const existing = chars.find(c => c.id === linkedCharacterId)
        setSelectedCharacter(existing ?? null)
      } else {
        setSelectedCharacter(null)
      }

      setCharsLoading(false)
    }

    loadCharactersForWallet()
  }, [address, sessionId, hasMounted])

  // Load last rolls for this session from Supabase
  useEffect(() => {
    if (!hasMounted || !sessionId) return

    async function loadRolls() {
      const { data, error } = await supabase
        .from('session_rolls')
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
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('session_rolls load error', error)
        return
      }

      const entries: DiceEntry[] =
        (data ?? []).map(row => ({
          id: row.id as string,
          roller: (row.roller_name as string) || 'Unknown',
          label: (row.label as string) || '',
          result: row.result_total as number,
          formula: (row.formula as string) || '',
          timestamp: new Date(row.created_at as string).toLocaleTimeString(),
        })) ?? []

      setDiceLog(entries)
    }

    loadRolls()
  }, [hasMounted, sessionId])

  // Listen for "open monster" events from the map (right-click on token)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (event: any) => {
      const token = event?.detail?.token
      if (!token) return
      setOpenMonsterToken(token)
    }

    window.addEventListener('dnd721-open-monster', handler as EventListener)
    return () => {
      window.removeEventListener(
        'dnd721-open-monster',
        handler as EventListener
      )
    }
  }, [])

  // When a token is selected, load its monster (SRD or DB)
  useEffect(() => {
    async function loadMonster() {
      if (!openMonsterToken?.monster_id) {
        setOpenMonsterData(null)
        return
      }

      const monsterId = String(openMonsterToken.monster_id)

      // SRD monster from MONSTERS list
      if (monsterId.startsWith('srd:')) {
        const key = monsterId.replace('srd:', '')
        const found = (MONSTERS as any[]).find(
          (m: any) =>
            m.id === key ||
            m.slug === key ||
            m.name?.toLowerCase() === openMonsterToken.label?.toLowerCase()
        )
        setOpenMonsterData(found ?? null)
        return
      }

      // Custom monster stored in Supabase "monsters" table
      if (monsterId.startsWith('db:')) {
        const dbId = monsterId.replace('db:', '')
        const { data, error } = await supabase
          .from('monsters')
          .select('*')
          .eq('id', dbId)
          .maybeSingle()

        if (error) {
          console.error('Error loading monster from DB', error)
        }

        setOpenMonsterData(data ?? null)
        return
      }

      // Unknown format
      setOpenMonsterData(null)
    }

    loadMonster()
  }, [openMonsterToken])

  // ---------- Helpers ----------

  function formatDateTime(value: string | null) {
    if (!value) return 'TBD'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString()
  }

  function getAbilityScore(
    char: CharacterSummary | null,
    key: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
  ): number {
    if (!char || !char.abilities) return 10
    const raw = char.abilities[key]
    if (typeof raw === 'number') return raw
    if (typeof raw === 'string') {
      const parsed = parseInt(raw, 10)
      if (!Number.isNaN(parsed)) return parsed
    }
    return 10
  }

  function abilityMod(score: number): number {
    return Math.floor((score - 10) / 2)
  }

  function parseMaybeNumber(value: any): number | null {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10)
      return Number.isNaN(parsed) ? null : parsed
    }
    return null
  }

  function getCharacterMaxHP(char: CharacterSummary | null): number | null {
    if (!char) return null

    const direct = parseMaybeNumber((char as any).hp)
    if (direct !== null) return direct

    const maxHp = parseMaybeNumber((char as any).max_hp)
    if (maxHp !== null) return maxHp

    const alt = parseMaybeNumber((char as any).hit_points)
    if (alt !== null) return alt

    return null
  }

  function getCharacterAC(char: CharacterSummary | null): number | null {
    if (!char) return null

    const ac = parseMaybeNumber((char as any).ac)
    if (ac !== null) return ac

    const armor = parseMaybeNumber((char as any).armor_class)
    if (armor !== null) return armor

    return null
  }

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
        .single()

      if (error) {
        console.error('session_rolls insert error', error)
        return null
      }

      const entry: DiceEntry = {
        id: data.id as string,
        roller: (data.roller_name as string) || 'Unknown',
        label: (data.label as string) || '',
        result: data.result_total as number,
        formula: (data.formula as string) || '',
        timestamp: new Date(data.created_at as string).toLocaleTimeString(),
      }

      return entry
    } catch (e) {
      console.error('session_rolls insert exception', e)
      return null
    }
  }

  function pushRollLocal(entry: DiceEntry) {
    setDiceLog(prev => {
      const updated = [entry, ...prev]
      return updated.slice(0, 20)
    })
  }

  function buildRollerName(): string {
    if (
      selectedCharacter?.name &&
      String(selectedCharacter.name).trim().length > 0
    ) {
      return String(selectedCharacter.name)
    }
    if (address) {
      return `${address.slice(0, 6)}…${address.slice(-4)}`
    }
    return 'Unknown'
  }

  async function handleExternalRoll(roll: ExternalRoll) {
    const rollerName = buildRollerName()
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
    const rollerName = buildRollerName()
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

  async function handleAbilityCheck(
    abilityKey: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha',
    label: string
  ) {
    const score = getAbilityScore(selectedCharacter, abilityKey)
    const mod = abilityMod(score)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + mod

    const rollerName = buildRollerName()
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

    const rollerName = buildRollerName()
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
          {
            onConflict: 'encounter_id,wallet_address',
          }
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

  async function handleSelectCharacter(characterId: string) {
    if (!address || !session) {
      setCharsError('Connect your wallet to select a character.')
      return
    }

    setCharsError(null)

    // 1) Save which character this wallet is using for this session
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
      .single()

    if (error) {
      console.error('session_characters upsert error', error)
      setCharsError(error.message)
      return
    }

    const updatedId = data?.character_id ?? characterId
    const found = characters.find(c => c.id === updatedId) ?? null
    setSelectedCharacter(found)

    // 2) Ensure a PC token exists on the map for this wallet+character
    if (encounterId && address && found) {
      try {
        const { data: existing, error: existingError } = await supabase
          .from('tokens')
          .select('id')
          .eq('encounter_id', encounterId)
          .eq('type', 'pc')
          .eq('owner_wallet', address)
          .maybeSingle()

        if (existingError && existingError.code !== 'PGRST116') {
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
          } else {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('dnd721-tokens-updated', {
                  detail: { source: 'pc-selection' },
                })
              )
            }
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

    const { error: uploadError } = await supabase.storage
      .from('maps')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      console.error(uploadError)
      alert('Failed to upload map.')
      return
    }

    const { data } = supabase.storage.from('maps').getPublicUrl(filePath)
    const publicUrl = data?.publicUrl

    if (!publicUrl) {
      alert('Map uploaded, but no public URL returned.')
      return
    }

    const { error: updateError } = await supabase
      .from('sessions')
      .update({ map_image_url: publicUrl })
      .eq('id', session.id)

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
          const nameMatch =
            m.name &&
            typeof m.name === 'string' &&
            m.name.toLowerCase() === monster.name.toLowerCase()
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
            (Array.isArray(found.armor_class)
              ? parseMaybeNumber(found.armor_class[0]?.value)
              : null)
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
      console.error(
        'Failed to spawn monster token',
        error.message || error.details || error
      )
    } else if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dnd721-tokens-updated', {
          detail: { encounterId },
        })
      )
    }
  }

  // ---------- Render ----------

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
    return (
      <div className="p-4 text-sm text-slate-400">
        Loading table…
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="p-4 text-sm text-red-400">
        {error ?? 'Session not found.'}
      </div>
    )
  }

  // GM check
  const isGm = Boolean(
    address &&
      session.gm_wallet &&
      session.gm_wallet.trim().toLowerCase() === address.trim().toLowerCase()
  )

  const campaignMeta = session.campaigns?.[0]
  const roomName =
    campaignMeta?.livekit_room_name || `session-${session.id}`

  const mapUrl = session.map_image_url || ''

  // Shared top bar (GM & players)
  const topBar = (
    <header className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/70 p-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Session info */}
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">
          DND721 Session Table {isGm ? '· GM' : '· Player'}
        </p>
        <h1 className="text-lg font-bold text-slate-50 sm:text-xl">
          {session.title || 'Untitled Session'}
        </h1>
        <p className="text-xs text-slate-400">
          {campaignMeta?.title && (
            <>
              Campaign:{' '}
              <span className="text-slate-200">
                {campaignMeta.title}
              </span>{' '}
              ·{' '}
            </>
          )}
          {formatDateTime(session.scheduled_start)} ·{' '}
          {session.duration_minutes} min
        </p>
      </div>

      {/* Right: Voice + Dice + status */}
      <div className="flex flex-col items-start gap-2 text-xs text-slate-300 sm:items-end">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDiceLog(v => !v)}
            className="rounded-md bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-700"
          >
            {showDiceLog ? 'Hide Dice Log' : 'Show Dice Log'}
          </button>
          <div className="shrink-0">
            <VoiceChat
              // extra prop ignored by the simple VoiceChat component
              // @ts-expect-error
              roomName={roomName}
            />
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide">
            {session.status}
          </span>
          {address ? (
            <p className="font-mono text-slate-400">
              You:{' '}
              {address.slice(0, 6)}…{address.slice(-4)}{' '}
              {isGm && <span className="text-emerald-400">(GM)</span>}
            </p>
          ) : (
            <p className="text-xs text-amber-400">
              Connect your wallet to join this table.
            </p>
          )}
        </div>
      </div>
    </header>
  )

  // Map + dice log area
  const mapSection = (
    <section className="relative h-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
      <div className="relative w-full min-h-[calc(100vh-180px)] overflow-hidden bg-[radial-gradient(circle_at_top,_#1e293b,_#020617)] p-3">
        {mapUrl ? (
          encounterLoading || !encounterId ? (
            <div className="flex h-full items-center justify-center text-center text-slate-400">
              <div className="px-4">
                <p className="text-sm font-semibold text-slate-200">
                  Preparing encounter board…
                </p>
                {encounterError && (
                  <p className="mt-1 text-xs text-red-400">
                    {encounterError}
                  </p>
                )}
              </div>
            </div>
          ) : isGm ? (
            <MapBoard
              encounterId={encounterId}
              mapImageUrl={mapUrl}
              gridSize={50}
            />
          ) : (
            <MapBoardView
              encounterId={encounterId}
              mapImageUrl={mapUrl}
              ownerWallet={address ?? null}
              gridSize={50}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center text-center text-slate-400">
            <div className="px-4">
              <p className="text-sm font-semibold text-slate-200">
                No map set for this session.
              </p>

              {isGm && (
                <div className="mt-4 space-y-2">
                  <label className="text-xs text-slate-300">
                    Upload a map image (PNG/JPG)
                  </label>

                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleMapUpload}
                    className="text-xs text-slate-100"
                  />
                </div>
              )}

              {!isGm && (
                <p className="mt-1 text-xs text-slate-400">
                  Waiting for GM to upload a map…
                </p>
              )}
            </div>
          </div>
        )}

        {/* Floating Dice Log overlay */}
        {showDiceLog && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex items-stretch justify-end p-4">
            <div className="pointer-events-auto h-full w-full max-w-md rounded-xl border border-slate-700 bg-slate-950/95 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-100">
                    Dice Log
                  </h2>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                    Synced (Session)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestRoll}
                    className="rounded-md bg-sky-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-sky-500"
                  >
                    Roll d20
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDiceLog(false)}
                    className="rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-700"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="h-full overflow-y-auto px-3 py-2 text-[11px]">
                {diceLog.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    No rolls yet for this session. Use quick rolls or the
                    &quot;Roll d20&quot; button to add a roll.
                  </p>
                )}
                {diceLog.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between border-b border-slate-800/60 py-1 last:border-b-0"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-100">
                        {entry.roller}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {entry.label} · {entry.formula}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-sky-300">
                        {entry.result}
                      </span>
                      <div className="text-[10px] text-slate-500">
                        {entry.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )

  // ---------- GM LAYOUT ----------

  if (isGm) {
    return (
      <div className="flex h-[calc(100vh-2rem)] flex-col gap-2 p-2 sm:p-4">
        {topBar}

        <div className="flex flex-1 gap-2 min-h-0 min-w-0">
          {/* Left: map */}
          <div className="flex-1 min-h-0 min-w-0">{mapSection}</div>

          {/* Right: GM tools */}
          <aside className="hidden w-80 shrink-0 flex-col md:flex">
            <GMSidebar
              encounterId={encounterId}
              address={address ?? null}
              onRoll={handleExternalRoll}
              spawnMonsterToken={spawnMonsterToken}
            />

            {/* GM Quick Rolls */}
            <div className="mt-2 space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  GM Quick Rolls
                </h2>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                  Tools
                </span>
              </div>

              <p className="text-[11px] text-slate-400">
                Fire off common GM rolls directly into the session dice log.
              </p>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const result = Math.floor(Math.random() * 20) + 1
                    handleExternalRoll({
                      label: 'GM: Flat d20',
                      formula: '1d20',
                      result,
                    })
                  }}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-sky-500"
                >
                  Flat d20
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const result = Math.floor(Math.random() * 20) + 1
                    handleExternalRoll({
                      label: 'GM: Group Perception',
                      formula: '1d20',
                      result,
                    })
                  }}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-emerald-500"
                >
                  Group Perception
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const result = Math.floor(Math.random() * 20) + 1
                    handleExternalRoll({
                      label: 'GM: Group Stealth',
                      formula: '1d20',
                      result,
                    })
                  }}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-emerald-500"
                >
                  Group Stealth
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const result = Math.floor(Math.random() * 20) + 1
                    handleExternalRoll({
                      label: 'GM: Group CON Save',
                      formula: '1d20',
                      result,
                    })
                  }}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-rose-500"
                >
                  Group CON Save
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const result = Math.floor(Math.random() * 20) + 1
                    handleExternalRoll({
                      label: 'GM: Random Encounter Check',
                      formula: '1d20 (high = encounter)',
                      result,
                    })
                  }}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-amber-500"
                >
                  Encounter Check
                </button>
              </div>

              <p className="text-[10px] text-slate-500">
                These rolls are GM helpers and don&apos;t depend on any
                specific character.
              </p>
            </div>

            {/* Monster Stat Block panel */}
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
                    const next = has
                      ? existing.filter(c => c !== condition)
                      : [...existing, condition]
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

  // ---------- PLAYER LAYOUT ----------

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col gap-2 p-2 sm:p-4">
      {topBar}

      <div className="flex flex-1 flex-col gap-2 min-h-0">
        <div className="flex flex-1 gap-2 min-h-0">
          {/* Center: map */}
          {mapSection}

          {/* Right: Player character sheet / selection */}
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
