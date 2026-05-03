'use client'

import { useEffect, useState, type ChangeEvent, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useMounted } from '@/hooks/useMounted'
import { supabase } from '@/lib/supabase'
import GMSidebar from '@/components/table/GMSidebar'
import { PlayerSidebar } from '@/components/table/PlayerSidebar'
import { MonsterStatPanel } from '@/components/table/MonsterStatPanel'
import { MapBuilder } from '@/components/table/MapBuilder'
import { MONSTERS } from '@/lib/monsters'

import type { DiceEntry, ExternalRoll } from '@/components/table/tableclient/types'
import { TableTopBar } from '@/components/table/tableclient/components/TableTopBar'
import { ShopModal } from '@/components/shop/ShopModal'
import { MapSection } from '@/components/table/tableclient/components/MapSection'
import { useSessionWithCampaign } from '@/components/table/tableclient/hooks/useSessionWithCampaign'
import { useEncounter } from '@/components/table/tableclient/hooks/useEncounter'
import { useSessionRolls } from '@/components/table/tableclient/hooks/useSessionRolls'
import { useMonsterPanel } from '@/components/table/tableclient/hooks/useMonsterPanel'
import { useMapManager } from '@/components/table/tableclient/hooks/useMapManager'
import {
  abilityMod,
  buildRollerName,
  getAbilityScore,
  getCharacterAC,
  getCharacterMaxHP,
  parseMaybeNumber,
} from '@/components/table/tableclient/utils'
import { type SessionStatus } from '@/lib/sessionGates'

interface TableClientProps {
  sessionId: string
}

type CharacterRow = {
  id: string
  name: string
  level: number | null
  main_job: string | null
  race: string | null
  abilities?: any
  hit_points_max?: number | null
  hp?: number | null
  ac?: number | null
  speed?: number | null
  vision?: number | null
}

type SessionPlayerRow = {
  wallet_address: string
  character_id: string | null
  display_name?: string | null
  vision?: number | null
  race?: string | null
}

export default function TableClient({ sessionId }: TableClientProps) {
  const { address } = useAccount()
  const router = useRouter()

  // ✅ always use lowercased wallet for DB compares / RLS functions
  const walletLower = useMemo(() => (address ? address.trim().toLowerCase() : null), [address])

  // Prevent hydration mismatch
  const hasMounted = useMounted()

  // Session + encounter
  const { session, setSession, loading, error } = useSessionWithCampaign(sessionId)
  const campaignId = session?.campaign_id ?? null

  const isGm = useMemo(() => {
    if (!walletLower) return false
    const gm = (session?.gm_wallet ?? '').trim().toLowerCase()
    return Boolean(gm && gm === walletLower)
  }, [walletLower, session?.gm_wallet])

  // ── Idle redirect (players only) ──────────────────────────────
  // If a player has not interacted with the page for 30 seconds,
  // redirect them to the campaign page. GM is exempt.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      const target = campaignId ? `/campaigns/${campaignId}` : '/campaigns'
      router.push(target)
    }, 30_000)
  }, [campaignId, router])

  useEffect(() => {
    // Only arm the timer for players (not GMs)
    if (isGm) return
    if (!hasMounted) return

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const
    const handle = () => resetIdleTimer()

    resetIdleTimer()
    events.forEach((ev) => window.addEventListener(ev, handle, { passive: true }))

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      events.forEach((ev) => window.removeEventListener(ev, handle))
    }
  }, [isGm, hasMounted, resetIdleTimer])

  // Encounter is session-scoped; hook only needs the session.
  const { encounterId, encounterLoading, encounterError } = useEncounter(session)

  // Dice log
  const { diceLog, showDiceLog, setShowDiceLog, pushRollLocal } = useSessionRolls({
    sessionId,
    hasMounted,
  })

  // Monster stat panel
  const { openMonsterToken, setOpenMonsterToken, openMonsterData, setOpenMonsterData } = useMonsterPanel()

  // Combat conditions (local, shared across UI via window events)
  // Key format:
  //  - token:<tokenId>  (monsters + PCs on map)
  //  - char:<characterId> (PCs)
  const [actorConditions, setActorConditions] = useState<Record<string, string[]>>({})

  // Broadcast condition changes so Initiative + Map HUD + Monster panel stay in sync
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('dnd721-conditions-updated', { detail: { map: actorConditions } }))
  }, [actorConditions])

  // Listen for toggle requests from other components (e.g., Initiative list)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (event: Event) => {
      const ev = event as CustomEvent<{ key?: string; condition?: string }>
      const key = String(ev.detail?.key ?? '')
      const condition = String(ev.detail?.condition ?? '')
      if (!key || !condition) return

      setActorConditions((prev) => {
        const existing = prev[key] ?? []
        const has = existing.includes(condition)
        const next = has ? existing.filter((c) => c !== condition) : [...existing, condition]
        return { ...prev, [key]: next }
      })
    }

    window.addEventListener('dnd721-conditions-toggle', handler)
    return () => window.removeEventListener('dnd721-conditions-toggle', handler)
  }, [])

  // Environmental trigger detection — listen for token moves and check triggers
  useEffect(() => {
    if (!session) return
    const handler = async (event: Event) => {
      const ev = event as CustomEvent<{ tokenId: string; tileX: number; tileY: number; mapId?: string | null; encounterId?: string | null }>
      const { tileX, tileY, mapId } = ev.detail ?? {}
      if (tileX == null || tileY == null) return

      try {
        const params = new URLSearchParams({
          sessionId: session.id,
          tileX: String(tileX),
          tileY: String(tileY),
        })
        if (mapId) params.set('mapId', mapId)
        const res = await fetch(`/api/triggers?${params}`)
        if (!res.ok) return
        const json = await res.json()
        const triggers: any[] = json.triggers ?? []
        if (triggers.length > 0) {
          // Fire the first active trigger found at this tile
          window.dispatchEvent(new CustomEvent('dnd721-trigger-tripped', { detail: { trigger: triggers[0] } }))
        }
      } catch { /* silent */ }
    }

    window.addEventListener('dnd721-token-moved', handler)
    return () => window.removeEventListener('dnd721-token-moved', handler)
  }, [session])

  // Dice roll animation overlay (small, quick, satisfying)
  const [rollOverlay, setRollOverlay] = useState<null | {
    roller: string
    label: string
    formula: string
    result: number
    outcome?: string | null
  }>(null)

  function flashRollOverlay(payload: { roller: string; label: string; formula: string; result: number; outcome?: string | null }) {
    setRollOverlay(payload)
    // auto-hide
    setTimeout(() => setRollOverlay(null), 950)
  }

  // Campaign Character state (locked)
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRow | null>(null)
  const [charsLoading, setCharsLoading] = useState(false)
  const [charsError, setCharsError] = useState<string | null>(null)

  // ✅ GM POV selector
  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayerRow[]>([])
  const [gmViewWallet, setGmViewWallet] = useState<string | null>(null)

  // Current user's profile display_name (shown instead of raw wallet)
  const [myDisplayName, setMyDisplayName] = useState<string | null>(null)

  useEffect(() => {
    if (!walletLower) { setMyDisplayName(null); return }
    supabase
      .from('profiles')
      .select('display_name')
      .eq('wallet_address', walletLower)
      .maybeSingle()
      .then(({ data }) => { setMyDisplayName((data as any)?.display_name ?? null) })
  }, [walletLower])

  // ✅ Multi-map management (GM only)
  const { maps, createImageMap, createTileMap, updateTileMap, deleteMap, setCurrentMap } = useMapManager(session?.id ?? null)

  // Map UI state
  const [showNewMapModal, setShowNewMapModal] = useState(false)
  const [showMapBuilder, setShowMapBuilder] = useState(false)
  const [editingMapId, setEditingMapId] = useState<string | null>(null)
  const [newMapName, setNewMapName] = useState('')
  const [newMapType, setNewMapType] = useState<'image' | 'tile'>('image')
  const newMapImageRef = useRef<HTMLInputElement | null>(null)

  const campaignMeta = session?.campaigns?.[0]
  const roomName = campaignMeta?.livekit_room_name || `session-${session?.id ?? sessionId}`
  const legacyMapUrl = session?.map_image_url || ''

  // Derive current map object from session.current_map_id
  const currentMapId = session?.current_map_id ?? null
  const currentMap = useMemo(
    () => maps.find((m) => m.id === currentMapId) ?? null,
    [maps, currentMapId]
  )

  // ✅ Pull speed from character row — default 30 if missing
  const speedFeet = useMemo(() => {
    if (isGm) return 9999
    if (!selectedCharacter) return 30

    const raw = (selectedCharacter as any)?.speed
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (!Number.isFinite(n) || n <= 0) return 30
    return Math.max(5, Math.min(120, Math.floor(n)))
  }, [selectedCharacter, isGm])

  // ✅ Pull vision from character row — if missing, use simple 5e guess by race
  const visionFeet = useMemo(() => {
    const darkvisionRaces = new Set([
      'elf',
      'dwarf',
      'gnome',
      'half_elf',
      'half-elf',
      'half_orc',
      'half-orc',
      'tiefling',
      'drow',
    ])

    // GM free view — unlimited sight, no fog
    if (isGm && !gmViewWallet) return 120

    // GM "View As" — use the selected player's actual vision radius, not the GM's
    if (isGm && gmViewWallet) {
      const viewed = sessionPlayers.find((p) => p.wallet_address === gmViewWallet)
      const raw = viewed?.vision
      const n = typeof raw === 'number' ? raw : Number(raw)
      if (Number.isFinite(n) && n > 0) return Math.max(5, Math.min(240, Math.floor(n)))
      const race = String(viewed?.race ?? '').trim().toLowerCase()
      return darkvisionRaces.has(race) ? 60 : 30
    }

    // Player view
    if (!selectedCharacter) return 30
    const raw = (selectedCharacter as any)?.vision
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isFinite(n) && n > 0) {
      return Math.max(5, Math.min(240, Math.floor(n)))
    }
    const race = String(selectedCharacter.race ?? '').trim().toLowerCase()
    return darkvisionRaces.has(race) ? 60 : 30
  }, [selectedCharacter, isGm, gmViewWallet, sessionPlayers])

  // ✅ GM: load session players list (for dropdown)
  useEffect(() => {
    if (!isGm) return
    if (!session?.id) return

    let mounted = true

    const loadPlayers = async () => {
      const { data, error } = await supabase
        .from('session_players')
        .select('wallet_address, character_id')
        .eq('session_id', session.id)

      if (!mounted) return

      if (error) {
        console.error('Failed to load session_players for GM POV:', error)
        return
      }

      const rows = (data ?? []) as SessionPlayerRow[]

      // Batch-fetch display names for all wallets
      if (rows.length > 0) {
        const wallets = rows.map((p) => p.wallet_address)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('wallet_address, display_name')
          .in('wallet_address', wallets)
        if (!mounted) return
        const profileMap = new Map(
          (profiles ?? []).map((p: any) => [p.wallet_address as string, p.display_name as string | null])
        )

        // Batch-fetch character vision + race so GM "View As" uses the correct radius
        const charIds = rows.map((p) => p.character_id).filter(Boolean) as string[]
        type CharVision = { id: string; vision: number | null; race: string | null }
        const charMap = new Map<string, CharVision>()
        if (charIds.length > 0) {
          const { data: chars } = await supabase
            .from('characters')
            .select('id, vision, race')
            .in('id', charIds)
          if (!mounted) return
          for (const ch of (chars ?? []) as CharVision[]) charMap.set(ch.id, ch)
        }

        setSessionPlayers(
          rows.map((p) => {
            const ch = p.character_id ? charMap.get(p.character_id) : undefined
            return {
              ...p,
              display_name: profileMap.get(p.wallet_address) ?? null,
              vision: ch?.vision ?? null,
              race: ch?.race ?? null,
            }
          })
        )
      } else {
        setSessionPlayers([])
      }
    }

    void loadPlayers()

    return () => {
      mounted = false
    }
  }, [isGm, session?.id])

  // ✅ Load characters + campaign selection (players only)
  useEffect(() => {
    if (!hasMounted) return
    if (!session?.id) return
    if (!campaignId) return

    // GM can run without a character
    if (isGm) {
      setCharsError(null)
      setCharsLoading(false)
      setCharacters([])
      setSelectedCharacter(null)
      return
    }

    if (!walletLower) {
      setCharsError('Connect your wallet to load your campaign character.')
      setCharsLoading(false)
      setCharacters([])
      setSelectedCharacter(null)
      return
    }

    let cancelled = false

    const load = async () => {
      setCharsLoading(true)
      setCharsError(null)

      const charsRes = await supabase
        .from('characters')
        .select('id, name, level, main_job, race, abilities, hit_points_max, hp, ac, speed, vision')
        .eq('wallet_address', walletLower)
        .order('created_at', { ascending: true })

      if (cancelled) return

      if (charsRes.error) {
        console.error('characters load error', charsRes.error)
        setCharsError(charsRes.error.message)
        setCharsLoading(false)
        return
      }

      const chars = ((charsRes.data as any) as CharacterRow[]) ?? []
      setCharacters(chars)

      const selRes = await supabase
        .from('campaign_character_selections')
        .select('character_id')
        .eq('campaign_id', campaignId)
        .eq('wallet_address', walletLower)
        .limit(1)
        .maybeSingle()

      if (cancelled) return

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

    return () => {
      cancelled = true
    }
  }, [hasMounted, session?.id, campaignId, isGm, walletLower])

  // ✅ Ensure session_players row matches campaign character (players only)
  useEffect(() => {
    if (!session?.id) return
    if (!campaignId) return
    if (!walletLower) return
    if (isGm) return
    if (!selectedCharacter?.id) return

    const ensure = async () => {
      const sc = selectedCharacter
      if (!sc?.id) return
      const { error } = await supabase
        .from('session_players')
        .upsert(
          {
            session_id: session.id,
            wallet_address: walletLower,
            character_id: sc.id,
            role: 'player',
            is_ready: false,
          },
          { onConflict: 'session_id,wallet_address' }
        )

      if (error) console.error('session_players upsert error', error)
    }

    void ensure()
  }, [session?.id, campaignId, walletLower, isGm, selectedCharacter?.id])

  // PC tokens are now placed manually by the GM via the initiative tracker "📍 Place" button.
  // Auto-spawn removed intentionally.

  // ---------- Dice persistence ----------
  async function persistRollToSupabase(params: {
    label: string
    rollType: string
    formula: string
    result: number
    rollerName: string
    individual_dice?: { die: string; value: number; dropped?: true }[] | null
  }) {
    if (!session) return null

    try {
      const { data, error } = await supabase
        .from('session_rolls')
        .insert({
          session_id: session.id,
          character_id: selectedCharacter?.id ?? null,
          roller_wallet: walletLower ?? null,
          roller_name: params.rollerName,
          roll_type: params.rollType,
          label: params.label,
          formula: params.formula,
          result_total: params.result,
          individual_dice: params.individual_dice ?? null,
        })
        .select('id, label, formula, result_total, created_at, roller_name')
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
        outcome: null,
        individual_dice: params.individual_dice ?? null,
      }

      return entry
    } catch (e) {
      console.error('session_rolls insert exception', e)
      return null
    }
  }

  async function handleExternalRoll(roll: ExternalRoll) {
    const rollerName = buildRollerName({ selectedCharacter, address, displayName: myDisplayName })
    const fallbackId = `local-${Date.now()}`

    const persisted = await persistRollToSupabase({
      label: roll.label,
      rollType: 'sheet',
      formula: roll.formula,
      result: roll.result,
      rollerName,
      individual_dice: roll.individual_dice ?? null,
    })

    const entry: DiceEntry =
      persisted ?? {
        id: fallbackId,
        roller: rollerName,
        label: roll.label,
        result: roll.result,
        formula: roll.formula,
        timestamp: new Date().toLocaleTimeString(),
        outcome: null,
        individual_dice: roll.individual_dice ?? null,
      }

    pushRollLocal(entry)
    setShowDiceLog(true)
    flashRollOverlay({ roller: rollerName, label: roll.label, formula: roll.formula, result: roll.result, outcome: (roll as any).outcome ?? null })
  }

  async function handleTestRoll() {
    const d20 = Math.floor(Math.random() * 20) + 1
    const rollerName = buildRollerName({ selectedCharacter, address, displayName: myDisplayName })
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
        outcome: null,
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

    const rollerName = buildRollerName({ selectedCharacter, address, displayName: myDisplayName })
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
        outcome: null,
      }

    pushRollLocal(entry)
    setShowDiceLog(true)
    flashRollOverlay({ roller: rollerName, label, formula, result: total })
  }

  async function handleInitiative() {
    const sc = selectedCharacter
    if (!sc) return
    if (!encounterId) return
    if (!walletLower) return

    const dexScore = getAbilityScore(sc, 'dex')
    const mod = abilityMod(dexScore)
    const d20 = Math.floor(Math.random() * 20) + 1
    const total = d20 + mod

    const rollerName = buildRollerName({ selectedCharacter, address, displayName: myDisplayName })
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

    const { error } = await supabase
      .from('initiative_entries')
      .upsert(
        {
          encounter_id: encounterId,
          character_id: sc.id,
          token_id: null,
          wallet_address: walletLower,
          name: sc.name ?? rollerName,
          init: total,
          hp: getCharacterMaxHP(sc),
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
        outcome: null,
    }

    pushRollLocal(entry)
    setShowDiceLog(true)
    flashRollOverlay({ roller: rollerName, label: 'Initiative', formula, result: total })
  }

  // ---------- Map management handlers (GM only) ----------

  async function handleNewMapImageUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !session) return
    const file = e.target.files[0]
    if (!file || !newMapName.trim()) { alert('Enter a map name first.'); return }

    const fileExt = file.name.split('.').pop() || 'png'
    const tempId = `${session.id}-${Date.now()}`
    const filePath = `${tempId}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('maps').upload(filePath, file, { upsert: true })
    if (uploadError) { console.error(uploadError); alert('Failed to upload map image.'); return }

    const { data } = supabase.storage.from('maps').getPublicUrl(filePath)
    const publicUrl = (data as any)?.publicUrl
    if (!publicUrl) { alert('Upload succeeded but no public URL returned.'); return }

    const newMap = await createImageMap(newMapName.trim(), publicUrl)
    if (!newMap) { alert('Failed to save map record.'); return }

    // Auto-select the new map
    await setCurrentMap(session.id, newMap.id)
    setSession((prev) => prev ? { ...prev, current_map_id: newMap.id } : prev)

    setShowNewMapModal(false)
    setNewMapName('')
  }

  async function handleOpenTileBuilder() {
    // Tile map: open builder, create map on save
    if (!newMapName.trim()) { alert('Enter a map name first.'); return }
    setShowNewMapModal(false)
    setEditingMapId(null)
    setShowMapBuilder(true)
  }

  async function handleSaveTileMap(tileData: import('@/lib/tilemap').TileData) {
    if (!session) return

    if (editingMapId) {
      // Editing existing tile map
      await updateTileMap(editingMapId, tileData)
    } else {
      // Creating new tile map
      const name = newMapName.trim() || 'Tile Map'
      const newMap = await createTileMap(name, tileData)
      if (!newMap) { alert('Failed to save tile map.'); return }

      // Auto-select the new map
      await setCurrentMap(session.id, newMap.id)
      setSession((prev) => prev ? { ...prev, current_map_id: newMap.id } : prev)
    }

    setShowMapBuilder(false)
    setEditingMapId(null)
    setNewMapName('')
  }

  function handleEditCurrentTileMap() {
    if (!currentMap?.is_tile_map) return
    setEditingMapId(currentMap.id)
    setShowMapBuilder(true)
  }

  async function handleSelectMap(mapId: string | null) {
    if (!session) return
    await setCurrentMap(session.id, mapId)
    setSession((prev) => prev ? { ...prev, current_map_id: mapId } : prev)
  }

  async function handleDeleteCurrentMap() {
    if (!session || !currentMapId) return
    if (!window.confirm(`Delete map "${currentMap?.name}"? This also removes its tokens and fog data.`)) return
    await deleteMap(currentMapId)
    await setCurrentMap(session.id, null)
    setSession((prev) => prev ? { ...prev, current_map_id: null } : prev)
  }

  // Legacy single-map upload kept for backwards compat
  async function handleMapUpload(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !session) return
    const file = e.target.files[0]
    if (!file) return

    const fileExt = file.name.split('.').pop() || 'png'
    const filePath = `${session.id}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('maps').upload(filePath, file, { upsert: true })
    if (uploadError) { console.error(uploadError); alert('Failed to upload map.'); return }

    const { data } = supabase.storage.from('maps').getPublicUrl(filePath)
    const publicUrl = (data as any)?.publicUrl
    if (!publicUrl) { alert('Map uploaded, but no public URL returned.'); return }

    const { error: updateError } = await supabase.from('sessions').update({ map_image_url: publicUrl }).eq('id', session.id)
    if (updateError) { console.error(updateError); alert('Failed to update session with map URL'); return }

    setSession((prev) => (prev ? { ...prev, map_image_url: publicUrl } : prev))
    alert('Map updated successfully!')
  }

  // ---------- Monster spawning helper ----------
  async function spawnMonsterToken(monster: { id: string; name: string }) {
    if (!encounterId) return

    // Spread monster spawns so multiple tokens don't stack at the same pixel.
    // Count existing tokens in this encounter and offset each new spawn on a grid.
    const { count: existingCount } = await supabase
      .from('tokens')
      .select('id', { count: 'exact', head: true })
      .eq('encounter_id', encounterId)
    const n = existingCount ?? 0
    const SPAWN_TILE = 60 // ~1 tile step between spawns (pixels)
    const startX = 100 + (n % 10) * SPAWN_TILE
    const startY = 100 + Math.floor(n / 10) * SPAWN_TILE

    let baseHp: number | null = null
    let baseAc: number | null = null
    let dexScore: number | null = null

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

          dexScore =
            parseMaybeNumber((found as any).dex) ??
            parseMaybeNumber((found as any).dexterity) ??
            parseMaybeNumber((found as any).dex_score) ??
            parseMaybeNumber((found as any).dexScore) ??
            null
        }
      }
    } catch (err) {
      console.warn('Could not derive base HP/AC for monster', monster, err)
    }

    // ✅ auto-roll initiative for the monster (d20 + DEX mod if available)
    const d20 = Math.floor(Math.random() * 20) + 1
    const dexMod = dexScore != null ? abilityMod(dexScore) : 0
    const initTotal = d20 + dexMod

    // 1) Spawn the token (associate with current active map so it stays on this map)
    const { data: tokenRows, error } = await supabase
      .from('tokens')
      .insert({
      encounter_id: encounterId,
      map_id: currentMapId ?? null,
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
      .select('id, name, hp, current_hp')

    const token = (tokenRows && tokenRows[0]) as any | undefined

    if (error) {
      console.error('Failed to spawn monster token', (error as any).message || (error as any).details || error)
    } else if (typeof window !== 'undefined') {
      // 2) Also add it to initiative so monsters show up in turn order automatically
      try {
        if (token?.id) {
          const { error: initErr } = await supabase.from('initiative_entries').insert({
            encounter_id: encounterId,
            name: token.name ?? monster.name,
            init: initTotal,
            hp: (token.current_hp ?? token.hp ?? baseHp) ?? null,
            is_pc: false,
            character_id: null,
            token_id: token.id,
            wallet_address: null,
          })
          if (initErr) console.error('Failed to add monster to initiative', initErr)

          // optional: log the roll in the shared dice log for the session
          const modSign = dexMod >= 0 ? '+' : ''
          const formula = `1d20${modSign}${dexMod}`
          const rollerName = `GM · ${token.name ?? monster.name}`
          void persistRollToSupabase({
            label: `Initiative (${token.name ?? monster.name})`,
            rollType: 'initiative',
            formula,
            result: initTotal,
            rollerName,
          })
          flashRollOverlay({ roller: rollerName, label: 'Initiative', formula, result: initTotal })
        }
      } catch (err) {
        console.warn('Monster initiative insert failed', err)
      }

    }
  }

  // Bug 18: End Session — GM-only flow that marks session completed + posts system message
  async function handleEndSession() {
    if (!session) return

    // Mark completed in DB
    const { error: updateErr } = await supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', session.id)

    if (updateErr) {
      console.error('[EndSession] failed to update status', updateErr)
      return
    }

    // Post a system chat message so all players see it
    await supabase.from('session_messages').insert({
      session_id: session.id,
      sender_wallet: walletLower ?? 'gm',
      sender_name: 'GM',
      body: '⏹ The GM has ended the session. Well adventured!',
      kind: 'system',
    })

    // Update local state so the status badge and button hide immediately
    setSession((prev) => prev ? { ...prev, status: 'completed' } : prev)
  }

  const [showShop,     setShowShop]     = useState(false)
  const [shopToast,    setShopToast]    = useState<string | null>(null)

  function handleShopPurchase(itemName: string) {
    setShopToast(`🏪 ${itemName} added to inventory!`)
    setTimeout(() => setShopToast(null), 4000)
  }

  // ── Session lifecycle status ───────────────────────────────────────────────
  // Derive initial status from loaded session; keep in sync via realtime.
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null)
  const prevStatusRef = useRef<SessionStatus | null>(null)
  const [showPauseOverlay, setShowPauseOverlay] = useState(false)
  const [sessionToast, setSessionToast] = useState<string | null>(null)

  function showSessionToast(msg: string) {
    setSessionToast(msg)
    setTimeout(() => setSessionToast(null), 4000)
  }

  // Seed status from session once loaded
  useEffect(() => {
    if (!session?.status) return
    const s = session.status as SessionStatus
    setSessionStatus(s)
    prevStatusRef.current = s
    if (s === 'paused') setShowPauseOverlay(true)
  }, [session?.id])  // only re-seed when session ID changes (not every re-render)

  // Realtime subscription for session status changes (Fix 7)
  useEffect(() => {
    if (!sessionId) return

    const channel = supabase
      .channel(`session-status-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const newStatus = (payload.new as any).status as SessionStatus
          const prev = prevStatusRef.current
          prevStatusRef.current = newStatus
          setSessionStatus(newStatus)

          // Sync local session object so status badge updates immediately
          setSession((s) => s ? { ...s, status: newStatus } : s)

          // Transition-specific UI
          if (newStatus === 'lobby' && prev === 'setup') {
            showSessionToast('🟡 Lobby is open! Voice chat is available.')
          }
          if (newStatus === 'active' && (prev === 'lobby' || prev === 'setup')) {
            showSessionToast('⚔️ Session has started!')
          }
          if (newStatus === 'paused') {
            setShowPauseOverlay(true)
          }
          if (newStatus === 'active' && prev === 'paused') {
            setShowPauseOverlay(false)
            showSessionToast('▶ Session resumed!')
          }
          if (newStatus === 'completed') {
            setShowPauseOverlay(false)
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [sessionId])

  const topBar = (
    <>
      <TableTopBar
        session={session as any}
        isGm={isGm}
        address={address}
        displayName={myDisplayName}
        roomName={roomName}
        showDiceLog={showDiceLog}
        onToggleDiceLog={() => setShowDiceLog((v) => !v)}
        onEndSession={isGm ? handleEndSession : undefined}
        onOpenShop={() => setShowShop(true)}
        sessionStatus={sessionStatus}
      />
      {/* Shop / session toast notifications */}
      {(shopToast || sessionToast) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-amber-700/60 bg-slate-900 px-4 py-2.5 text-sm font-medium text-amber-200 shadow-xl">
          {sessionToast ?? shopToast}
        </div>
      )}
    </>
  )

  const mapSection = (
    <MapSection
      currentMap={currentMap}
      legacyMapUrl={legacyMapUrl}
      encounterId={encounterId}
      encounterLoading={encounterLoading}
      encounterError={encounterError}
      isGm={isGm}
      address={address}
      viewAsWallet={gmViewWallet}
      characterId={isGm ? null : (selectedCharacter?.id ?? null)}
      showDiceLog={showDiceLog}
      diceLog={diceLog}
      onTestRoll={handleTestRoll}
      onCloseDiceLog={() => setShowDiceLog(false)}
      onRollEntry={(entry) => { pushRollLocal(entry); setShowDiceLog(true) }}
      sessionId={sessionId}
      rollerName={buildRollerName({ selectedCharacter, address, displayName: myDisplayName })}
      rollerWallet={walletLower ?? undefined}
      rollOverlay={rollOverlay}
      visionFeet={visionFeet}
      speedFeet={speedFeet}
      sessionPlayerWallets={sessionPlayers.map((p) => p.wallet_address)}
      sessionStatus={sessionStatus}
    />
  )

  // ✅ ONLY RETURNS BELOW HERE (guaranteed stable hooks)
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

  if (loading) return <div className="p-4 text-sm text-slate-400">Loading table…</div>
  if (error || !session) return <div className="p-4 text-sm text-red-400">{error ?? 'Session not found.'}</div>

  if (isGm) {
    return (
      <div className="flex h-[calc(100vh-2rem)] flex-col gap-2 p-2 sm:p-4">
        {topBar}

        {/* Shop modal */}
        {showShop && (
          <ShopModal
            isModal
            sessionId={sessionId}
            onClose={() => setShowShop(false)}
            onPurchase={handleShopPurchase}
            sessionStatus={sessionStatus}
          />
        )}

        {/* MapBuilder overlay */}
        {showMapBuilder && (
          <MapBuilder
            initialData={editingMapId ? (currentMap?.tile_data ?? null) : null}
            onSave={handleSaveTileMap}
            onCancel={() => { setShowMapBuilder(false); setEditingMapId(null) }}
          />
        )}

        {/* New Map modal */}
        {showNewMapModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <div className="w-80 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
              <h3 className="mb-4 text-sm font-semibold text-slate-200">New Map</h3>

              <input
                placeholder="Map name"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />

              <div className="mb-4 flex gap-4 text-xs text-slate-300">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    checked={newMapType === 'image'}
                    onChange={() => setNewMapType('image')}
                  />
                  Image Upload
                </label>
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    checked={newMapType === 'tile'}
                    onChange={() => setNewMapType('tile')}
                  />
                  Tile Builder
                </label>
              </div>

              {newMapType === 'image' && (
                <div className="mb-4">
                  <input
                    ref={newMapImageRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleNewMapImageUpload}
                    className="text-xs text-slate-300"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowNewMapModal(false); setNewMapName('') }}
                  className="rounded px-3 py-1.5 text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                {newMapType === 'tile' && (
                  <button
                    onClick={handleOpenTileBuilder}
                    className="rounded px-3 py-1.5 text-xs bg-emerald-700 text-white hover:bg-emerald-600 font-semibold"
                  >
                    Open Builder
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="relative flex-1 min-h-0 min-w-0">
          {/* Monster Stat Panel — floats as overlay */}
          {openMonsterToken && (
            <MonsterStatPanel
              token={openMonsterToken}
              monster={openMonsterData}
              conditions={actorConditions[`token:${String(openMonsterToken.id)}`] ?? []}
              onToggleCondition={(condition) => {
                const key = `token:${String(openMonsterToken.id)}`
                setActorConditions((prev) => {
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

          <div className="absolute inset-0 flex flex-col overflow-hidden">
            {/* GM control bar: View As + Map selector */}
            <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span>View As:</span>
              <select
                value={gmViewWallet ?? ''}
                onChange={(e) => setGmViewWallet(e.target.value || null)}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              >
                <option value="">GM Free View</option>
                {sessionPlayers.map((p) => (
                  <option key={p.wallet_address} value={p.wallet_address}>
                    {p.display_name?.trim() || `${p.wallet_address.slice(0, 6)}…${p.wallet_address.slice(-4)}`}
                  </option>
                ))}
              </select>

              <span className="text-slate-600">|</span>

              <span>Map:</span>
              <select
                value={currentMapId ?? ''}
                onChange={(e) => handleSelectMap(e.target.value || null)}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
              >
                <option value="">— none —</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>

              <button
                onClick={() => { setNewMapName(''); setNewMapType('image'); setShowNewMapModal(true) }}
                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
              >
                + New
              </button>

              {currentMap?.is_tile_map && (
                <button
                  onClick={handleEditCurrentTileMap}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Edit
                </button>
              )}

              {currentMap && (
                <button
                  onClick={handleDeleteCurrentMap}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-red-400 hover:bg-slate-800"
                >
                  Delete
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0">
              {mapSection}
            </div>
          </div>

          {/* GM overlay panel */}
          <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
            <GMSidebar sessionId={session?.id ?? null} encounterId={encounterId} address={walletLower ?? null} activeMapId={currentMapId} onRoll={handleExternalRoll} spawnMonsterToken={spawnMonsterToken} sessionType={(session as any)?.session_type ?? null} sessionStatus={sessionStatus ?? session?.status ?? null} xpAwardedAlready={(session as any)?.xp_award ?? null} />
          </div>
        </div>
      </div>
    )
  }

  if (!walletLower) return <div className="p-4 text-sm text-yellow-300">Connect your wallet to join the table.</div>
  if (charsLoading) return <div className="p-4 text-sm text-slate-400">Loading your campaign character…</div>

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

      {/* Shop modal (player) */}
      {showShop && (
        <ShopModal
          isModal
          sessionId={sessionId}
          onClose={() => setShowShop(false)}
          onPurchase={handleShopPurchase}
          sessionStatus={sessionStatus}
        />
      )}

      {/* Pause overlay */}
      {showPauseOverlay && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="rounded-2xl border border-yellow-700/50 bg-slate-900 p-8 text-center shadow-2xl">
            <p className="text-4xl mb-3">⏸</p>
            <p className="text-lg font-bold text-yellow-200">Session Paused</p>
            <p className="mt-1 text-sm text-slate-400">Waiting for the GM to resume…</p>
          </div>
        </div>
      )}

      <div className="relative flex-1 min-h-0 min-w-0">
        <div className="absolute inset-0">
          {mapSection}
        </div>
        {/* Player overlay panel */}
        <div className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none">
          <PlayerSidebar
            sessionId={session?.id ?? null}
            address={walletLower ?? null}
            characters={characters}
            selectedCharacter={selectedCharacter}
            selectedCharacterId={selectedCharacter?.id ?? null}
            speedFeet={speedFeet}
            charsError={null}
            charsLoading={false}
            onSelectCharacter={() => {
              setCharsError('Character is locked to your Campaign Character. Change it on the campaign page.')
              setTimeout(() => setCharsError(null), 1800)
            }}
            onAbilityCheck={handleAbilityCheck}
            onInitiative={handleInitiative}
            onRoll={handleExternalRoll}
            diceLog={diceLog}
            onOpenDiceLog={() => setShowDiceLog(true)}
            sessionStatus={sessionStatus}
          />
        </div>
      </div>
    </div>
  )
}

