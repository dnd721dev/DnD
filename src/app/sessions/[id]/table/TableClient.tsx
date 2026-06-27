'use client'

import { useEffect, useState, type ChangeEvent, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useMounted } from '@/hooks/useMounted'
import { supabase } from '@/lib/supabase'
import GMSidebar from '@/components/table/GMSidebar'
import { PlayerSidebar } from '@/components/table/PlayerSidebar'
import { MapBuilder } from '@/components/table/MapBuilder'
import { MONSTERS } from '@/lib/monsters'
import type { SpawnMonsterParams } from '@/components/table/MonsterLibrary'

import type { DiceEntry, ExternalRoll } from '@/components/table/tableclient/types'
import { TableTopBar } from '@/components/table/tableclient/components/TableTopBar'
import { ShopModal } from '@/components/shop/ShopModal'
import { isSpellcaster } from '@/lib/spellCategories'
import type { DicePrefs } from '@/lib/diceSkins'
import { MapSection } from '@/components/table/tableclient/components/MapSection'
import { FloatingWindow } from '@/components/table/hud/FloatingWindow'
import { useHudLayout } from '@/components/table/hud/useHudLayout'
import { WidgetPicker } from '@/components/table/hud/WidgetPicker'
import { GM_TABS_META } from '@/components/table/GMSidebar'
import { PLAYER_TABS_META } from '@/components/table/PlayerSidebar'
import { useSessionWithCampaign } from '@/components/table/tableclient/hooks/useSessionWithCampaign'
import { useEncounter } from '@/components/table/tableclient/hooks/useEncounter'
import { useSessionRolls } from '@/components/table/tableclient/hooks/useSessionRolls'
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
  /** Per-player current map override (null = follow the GM's session map). */
  current_map_id?: string | null
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

  // ── Session lifecycle status ───────────────────────────────────────────────
  // Declared early so the idle-redirect effect (below) can reference sessionStatus
  // before any other game-state hooks run.
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null)
  const prevStatusRef = useRef<SessionStatus | null>(null)
  const [showPauseOverlay, setShowPauseOverlay] = useState(false)
  const [sessionToast, setSessionToast] = useState<string | null>(null)

  // ── Idle redirect (players only) ──────────────────────────────
  // Skipped during active sessions — a player may be idle for many minutes
  // simply listening to the GM or watching combat. GM is always exempt.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      const target = campaignId ? `/campaigns/${campaignId}` : '/campaigns'
      router.push(target)
    }, 20 * 60 * 1000) // 20 minutes — long enough for any passive listening stretch
  }, [campaignId, router])

  useEffect(() => {
    // Only arm the timer for players (not GMs) and only when session is NOT active.
    // During an active session a player may be idle for minutes at a time simply
    // listening to the GM or watching combat — never kick them during gameplay.
    if (isGm) return
    if (!hasMounted) return
    if (sessionStatus === 'active') return

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const
    const handle = () => resetIdleTimer()

    resetIdleTimer()
    events.forEach((ev) => window.addEventListener(ev, handle, { passive: true }))

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      events.forEach((ev) => window.removeEventListener(ev, handle))
    }
  }, [isGm, hasMounted, resetIdleTimer, sessionStatus])

  // Encounter is session-scoped; hook only needs the session.
  const { encounterId, encounterLoading, encounterError } = useEncounter(session)

  // Dice log
  const { diceLog, showDiceLog, setShowDiceLog, pushRollLocal } = useSessionRolls({
    sessionId,
    hasMounted,
  })

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

  // Listen for toggle requests from other components (e.g., Initiative list, DMPanel)
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

        // HIGH-1: If key is 'token:<id>', persist conditions to tokens table so they
        // survive page refreshes and are visible to other clients via realtime.
        if (key.startsWith('token:')) {
          const tokenId = key.slice(6)
          supabase
            .from('tokens')
            .update({ conditions: next })
            .eq('id', tokenId)
            .then(({ error }) => { if (error) console.error('[conditions] persist error', error) })
        }

        return { ...prev, [key]: next }
      })
    }

    window.addEventListener('dnd721-conditions-toggle', handler)
    return () => window.removeEventListener('dnd721-conditions-toggle', handler)
  }, [])

  // BUG-06 fix: track last triggered tile per token so triggers only fire on
  // tile ENTRY (when the token moves to a new tile), not on every move commit.
  const lastTriggerTileRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  // Environmental trigger detection — listen for token moves and check triggers
  useEffect(() => {
    if (!session) return
    const handler = async (event: Event) => {
      const ev = event as CustomEvent<{ tokenId: string; tileX: number; tileY: number; mapId?: string | null; encounterId?: string | null }>
      const { tokenId, tileX, tileY, mapId } = ev.detail ?? {}
      if (tileX == null || tileY == null) return

      // Only check triggers when the token has moved to a NEW tile
      const lastTile = lastTriggerTileRef.current.get(tokenId)
      if (lastTile && lastTile.x === tileX && lastTile.y === tileY) return
      lastTriggerTileRef.current.set(tokenId, { x: tileX, y: tileY })

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
        if (triggers.length === 0) return
        const trig = triggers[0]

        // Map-transition portal: switch the token's owner to the destination
        // map at the landing tile instead of firing a save prompt.
        if (trig.trigger_type === 'portal' && trig.target_map_id) {
          // Pre-seed the destination tile so arrival there doesn't re-fire.
          if (tokenId) lastTriggerTileRef.current.set(tokenId, { x: trig.target_x ?? 0, y: trig.target_y ?? 0 })
          await fetch('/api/maps/transition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session.id,
              callerWallet: walletLower,
              tokenId,
              triggerId: trig.id,
            }),
          }).catch(() => {})
          return
        }

        // Fire the first active trigger found at this tile
        // Include tokenId so PlayerSidebar can apply damage / conditions to the right token
        window.dispatchEvent(new CustomEvent('dnd721-trigger-tripped', {
          detail: { trigger: trig, tokenId: ev.detail.tokenId ?? null },
        }))
      } catch { /* silent */ }
    }

    window.addEventListener('dnd721-token-moved', handler)
    return () => window.removeEventListener('dnd721-token-moved', handler)
  }, [session, walletLower])

  // Dice roll animation overlay (small, quick, satisfying)
  const [rollOverlay, setRollOverlay] = useState<null | {
    roller: string
    label: string
    formula: string
    result: number
    /** Natural per-die values (pre-modifier) — what the 3D dice land on. */
    dice?: number[]
    outcome?: string | null
  }>(null)

  const rollOverlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function flashRollOverlay(payload: { roller: string; label: string; formula: string; result: number; dice?: number[]; outcome?: string | null }) {
    setRollOverlay(payload)
    // Auto-hide AFTER the 3D dice settle (~2.4s) and the result number has had
    // time to display + fade (DiceRollOverlay runs a ~5.7s lifecycle). The old
    // 950ms clear cut the dice + result off before they appeared.
    if (rollOverlayTimer.current) clearTimeout(rollOverlayTimer.current)
    rollOverlayTimer.current = setTimeout(() => setRollOverlay(null), 6000)
  }

  // Campaign Character state (locked)
  const [characters, setCharacters] = useState<CharacterRow[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRow | null>(null)
  const [charsLoading, setCharsLoading] = useState(false)
  const [charsError, setCharsError] = useState<string | null>(null)

  // ✅ GM POV selector
  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayerRow[]>([])
  const [gmViewWallet, setGmViewWallet] = useState<string | null>(null)

  // Current user's profile display_name (shown instead of raw wallet) + dice prefs
  const [myDisplayName, setMyDisplayName] = useState<string | null>(null)
  const [myDicePrefs, setMyDicePrefs] = useState<DicePrefs | null>(null)

  useEffect(() => {
    if (!walletLower) { setMyDisplayName(null); setMyDicePrefs(null); return }
    supabase
      .from('profiles')
      .select('*') // '*' so a pre-migration deploy (no dice_prefs column) still loads
      .eq('wallet_address', walletLower)
      .maybeSingle()
      .then(({ data }) => {
        setMyDisplayName((data as any)?.display_name ?? null)
        setMyDicePrefs(((data as any)?.dice_prefs ?? null) as DicePrefs | null)
      })
  }, [walletLower])

  // ✅ Multi-map management (GM only)
  const { maps, createImageMap, createTileMap, updateTileMap, deleteMap, setCurrentMap, loadAllMaps, cloneMapToSession } = useMapManager(session?.id ?? null)

  // Map UI state
  const [showNewMapModal, setShowNewMapModal] = useState(false)
  const [showMapBuilder, setShowMapBuilder] = useState(false)
  const [editingMapId, setEditingMapId] = useState<string | null>(null)
  const [newMapName, setNewMapName] = useState('')
  const [newMapType, setNewMapType] = useState<'image' | 'tile' | 'library'>('image')
  const newMapImageRef = useRef<HTMLInputElement | null>(null)
  // Stage-then-confirm: file is picked, previewed, then uploaded on Confirm.
  const [stagedFile, setStagedFile] = useState<File | null>(null)
  const [stagedFileUrl, setStagedFileUrl] = useState<string | null>(null)
  const [newMapPrivate, setNewMapPrivate] = useState(false)
  const [newMapError, setNewMapError] = useState<string | null>(null)
  const [newMapBusy, setNewMapBusy] = useState(false)
  // Library state (loaded lazily when From Library tab is opened)
  const [libraryMaps, setLibraryMaps] = useState<import('@/components/table/tableclient/hooks/useMapManager').SessionMap[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryTab, setLibraryTab] = useState<'public' | 'mine'>('public')
  const [librarySelectedId, setLibrarySelectedId] = useState<string | null>(null)

  const campaignMeta = session?.campaigns?.[0]
  const roomName = campaignMeta?.livekit_room_name || `session-${session?.id ?? sessionId}`
  const legacyMapUrl = session?.map_image_url || ''

  // Derive current map object from session.current_map_id
  const currentMapId = session?.current_map_id ?? null
  const currentMap = useMemo(
    () => maps.find((m) => m.id === currentMapId) ?? null,
    [maps, currentMapId]
  )

  // Feature A: the map THIS viewer actually sees. Players (and the GM's
  // "View As" POV) can be on a per-player map; everyone else follows the
  // session's default map. The GM's own editing tools still use currentMapId.
  const [myCurrentMapId, setMyCurrentMapId] = useState<string | null>(null)
  const effectiveMapId = useMemo(() => {
    if (isGm) {
      if (gmViewWallet) {
        const row = sessionPlayers.find((p) => p.wallet_address?.toLowerCase() === gmViewWallet.toLowerCase())
        return row?.current_map_id ?? currentMapId
      }
      return currentMapId
    }
    return myCurrentMapId ?? currentMapId
  }, [isGm, gmViewWallet, sessionPlayers, myCurrentMapId, currentMapId])
  const effectiveMap = useMemo(
    () => maps.find((m) => m.id === effectiveMapId) ?? null,
    [maps, effectiveMapId]
  )

  // GM: send one player to a specific map (moves their token too). Empty mapId
  // clears the override so the player follows the session map again.
  const [showPartyMaps, setShowPartyMaps] = useState(false)
  const assignPlayerMap = useCallback(async (targetWallet: string, mapId: string) => {
    if (!session?.id || !walletLower || !mapId) return
    await fetch('/api/player-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, callerWallet: walletLower, targetWallet, mapId }),
    }).catch(() => {})
  }, [session?.id, walletLower])

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
        .select('*') // '*' so a pre-migration deploy (no current_map_id) still loads
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

    // Refresh when players join/leave or get reassigned to a different map
    // (per-player current_map_id) so the GM roster + "View As" stay current.
    const ch = supabase
      .channel(`gm-session-players-${session.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'session_players', filter: `session_id=eq.${session.id}` },
        () => { void loadPlayers() })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(ch)
    }
  }, [isGm, session?.id])

  // ── Per-player current map (feature A) ──────────────────────────────────────
  // Players track their own session_players.current_map_id override (null =
  // follow the GM's session map). Updated live so portals / GM reassignment
  // switch the player's view without a refresh. (State declared earlier, near
  // the effectiveMap derivation, so the memo can reference it.)
  useEffect(() => {
    if (isGm || !session?.id || !walletLower) { setMyCurrentMapId(null); return }
    let mounted = true
    const load = async () => {
      const { data } = await supabase
        .from('session_players')
        .select('current_map_id')
        .eq('session_id', session.id)
        .eq('wallet_address', walletLower)
        .maybeSingle()
      if (mounted) setMyCurrentMapId(((data as any)?.current_map_id ?? null) as string | null)
    }
    void load()
    const ch = supabase
      .channel(`my-map-${session.id}-${walletLower}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_players', filter: `session_id=eq.${session.id}` },
        (payload: any) => {
          if (String(payload.new?.wallet_address ?? '').toLowerCase() === walletLower) {
            setMyCurrentMapId((payload.new?.current_map_id ?? null) as string | null)
          }
        })
      .subscribe()
    return () => { mounted = false; supabase.removeChannel(ch) }
  }, [isGm, session?.id, walletLower])

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
    // Natural per-die values (excluding advantage/disadvantage drops) so the 3D
    // dice land on the real rolls rather than the modified total.
    const naturalDice = Array.isArray(roll.individual_dice)
      ? (roll.individual_dice as any[]).filter((d) => d && !d.dropped).map((d) => Number(d.value)).filter((n) => Number.isFinite(n))
      : undefined
    flashRollOverlay({ roller: rollerName, label: roll.label, formula: roll.formula, result: roll.result, dice: naturalDice && naturalDice.length > 0 ? naturalDice : undefined, outcome: (roll as any).outcome ?? null })
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
    flashRollOverlay({ roller: rollerName, label, formula, result: total, dice: [d20] })
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
          map_id: currentMapId ?? null,
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
    flashRollOverlay({ roller: rollerName, label: 'Initiative', formula, result: total, dice: [d20] })
  }

  // ---------- Map management handlers (GM only) ----------

  /** Stage a file when the GM picks one — defer upload until Confirm. */
  function handleNewMapImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setNewMapError(null)
    if (stagedFileUrl) URL.revokeObjectURL(stagedFileUrl)
    if (!file) { setStagedFile(null); setStagedFileUrl(null); return }
    setStagedFile(file)
    setStagedFileUrl(URL.createObjectURL(file))
    // Auto-fill the name from the filename if the GM hasn't typed one yet.
    if (!newMapName.trim()) {
      const base = file.name.replace(/\.[^.]+$/, '')
      setNewMapName(base.slice(0, 80))
    }
  }

  function resetNewMapModal() {
    if (stagedFileUrl) URL.revokeObjectURL(stagedFileUrl)
    setShowNewMapModal(false)
    setNewMapName('')
    setNewMapType('image')
    setStagedFile(null)
    setStagedFileUrl(null)
    setNewMapPrivate(false)
    setNewMapError(null)
    setNewMapBusy(false)
    setLibrarySelectedId(null)
    setLibrarySearch('')
    setLibraryTab('public')
  }

  /** Confirm button — runs the right create path based on `newMapType`. */
  async function handleConfirmCreate() {
    if (!session) return
    setNewMapError(null)
    setNewMapBusy(true)
    try {
      if (newMapType === 'image') {
        if (!stagedFile) { setNewMapError('Choose a file first.'); return }
        const fallbackBase = stagedFile.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Map'
        const finalName = newMapName.trim() || fallbackBase
        const fileExt = stagedFile.name.split('.').pop() || 'png'
        const tempId = `${session.id}-${Date.now()}`
        const filePath = `${tempId}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('maps').upload(filePath, stagedFile, { upsert: true })
        if (uploadError) { setNewMapError(`Upload failed: ${uploadError.message}`); return }
        const { data } = supabase.storage.from('maps').getPublicUrl(filePath)
        const publicUrl = (data as any)?.publicUrl
        if (!publicUrl) { setNewMapError('Upload succeeded but no public URL returned.'); return }
        const newMap = await createImageMap(finalName, publicUrl, {
          visibility:  newMapPrivate ? 'private' : 'public',
          ownerWallet: walletLower,
        })
        if (!newMap) { setNewMapError('Failed to save map record (RLS or DB error).'); return }
        await setCurrentMap(session.id, newMap.id)
        setSession((prev) => prev ? { ...prev, current_map_id: newMap.id } : prev)
        resetNewMapModal()
      } else if (newMapType === 'tile') {
        // Tile Builder: hand off to the builder; name + privacy ride on shared state.
        setShowNewMapModal(false)
        setEditingMapId(null)
        setShowMapBuilder(true)
      } else if (newMapType === 'library') {
        if (!librarySelectedId) { setNewMapError('Pick a map from the library first.'); return }
        const src = libraryMaps.find((m) => m.id === librarySelectedId)
        if (!src) { setNewMapError('Selected map is no longer available.'); return }
        const cloned = await cloneMapToSession(src)
        if (!cloned) { setNewMapError('Failed to clone the map into this session.'); return }
        await setCurrentMap(session.id, cloned.id)
        setSession((prev) => prev ? { ...prev, current_map_id: cloned.id } : prev)
        resetNewMapModal()
      }
    } finally {
      setNewMapBusy(false)
    }
  }

  /** Lazy-load the platform-wide library when the GM opens that tab. */
  async function ensureLibraryLoaded() {
    if (libraryMaps.length > 0 || libraryLoading) return
    setLibraryLoading(true)
    try {
      const all = await loadAllMaps()
      // Hide maps already attached to this session so the GM doesn't see no-op duplicates.
      const usedIds = new Set(maps.map((m) => m.id))
      setLibraryMaps(all.filter((m) => !usedIds.has(m.id)))
    } finally {
      setLibraryLoading(false)
    }
  }

  async function handleSaveTileMap(tileData: import('@/lib/tilemap').TileData) {
    if (!session) return

    if (editingMapId) {
      // Editing existing tile map
      await updateTileMap(editingMapId, tileData)
    } else {
      // Creating new tile map — prefer name typed in the creator, fall back to modal name
      const name = tileData.name?.trim() || newMapName.trim() || 'Tile Map'
      const newMap = await createTileMap(name, tileData, {
        visibility:  newMapPrivate ? 'private' : 'public',
        ownerWallet: walletLower,
      })
      if (!newMap) { alert('Failed to save tile map.'); return }

      // Auto-select the new map
      await setCurrentMap(session.id, newMap.id)
      setSession((prev) => prev ? { ...prev, current_map_id: newMap.id } : prev)
    }

    setShowMapBuilder(false)
    setEditingMapId(null)
    setNewMapName('')
    setNewMapPrivate(false)
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
  async function spawnMonsterToken(monster: SpawnMonsterParams) {
    if (!encounterId) return
    if (typeof window === 'undefined') return

    // NPC Wave 2: monster spawn now uses the same armed-placement UX as PCs.
    // We resolve HP/AC + roll initiative here, then dispatch
    // 'dnd721-place-token' for MapBoard to consume on the GM's next click.
    // The hard-coded grid-spread starting coords are gone — the GM picks the
    // exact tile.
    let baseHp: number | null = null
    let baseAc: number | null = null
    let dexScore: number | null = null
    const homebrewDbId = monster.homebrewMonsterDbId ?? null

    try {
      if (homebrewDbId) {
        baseHp = monster.hp ?? null
        baseAc = monster.ac ?? null
        dexScore = monster.dexScore ?? null
      } else if (monster.id.startsWith('srd:')) {
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

    // auto-roll initiative (d20 + DEX mod) and stash it on the payload so
    // MapBoard creates the initiative_entries row with the right value when
    // the placement click lands.
    const d20 = Math.floor(Math.random() * 20) + 1
    const dexMod = dexScore != null ? abilityMod(dexScore) : 0
    const initTotal = d20 + dexMod

    // Dispatch the armed-placement event. MapBoard's listener sets
    // placementPending; the next map click INSERTs the token at the chosen
    // tile and creates the initiative entry.
    window.dispatchEvent(new CustomEvent('dnd721-place-token', {
      detail: {
        label: monster.name,
        hp: baseHp,
        ac: baseAc,
        ownerWallet: null,
        initiativeEntryId: '',
        characterId: null,
        tokenImageUrl: monster.tokenImageUrl ?? null,
        type: 'monster',
        monster_id: homebrewDbId ? null : monster.id,
        homebrew_monster_id: homebrewDbId,
        initiativeRoll: initTotal,
      },
    }))

    // Log the auto-rolled initiative for transparency. The token doesn't
    // exist yet (placement is async) — we still want the roll in the shared
    // dice log so players see the GM rolled.
    const modSign = dexMod >= 0 ? '+' : ''
    const formula = `1d20${modSign}${dexMod}`
    const rollerName = `GM · ${monster.name}`
    void persistRollToSupabase({
      label: `Initiative (${monster.name})`,
      rollType: 'initiative',
      formula,
      result: initTotal,
      rollerName,
    })
    flashRollOverlay({ roller: rollerName, label: 'Initiative', formula, result: initTotal, dice: [d20] })
  }

  // Place a non-combatant NPC token (shopkeeper, quest giver, set-dressing).
  // Dispatches the same dnd721-place-token event as a monster, but with
  // type: 'object' and no initiativeRoll → MapBoard's existing guard
  // (`if (isMonsterPlacement)`) skips the initiative_entries insert, so the
  // NPC never appears in the initiative tracker. Rename / hide / delete all
  // work via the existing TokenHUD (which already treats non-PC tokens as
  // NPCs).
  function spawnNpcToken(params: { name: string; color?: string; tokenImageUrl?: string | null }) {
    const trimmedName = params.name.trim().slice(0, 40)
    if (!trimmedName) return
    window.dispatchEvent(new CustomEvent('dnd721-place-token', {
      detail: {
        label:               trimmedName,
        color:               params.color ?? '#64748b', // slate-500 default
        type:                'object',
        tokenImageUrl:       params.tokenImageUrl ?? null,
        hp:                  null,
        ac:                  null,
        monster_id:          null,
        homebrew_monster_id: null,
        characterId:         null,
        ownerWallet:         null,
        initiativeRoll:      null, // ← critical: tells MapBoard to skip initiative
        initiativeEntryId:   null,
      },
    }))
  }

  // HIGH-5: End Session — uses the lifecycle API so all side effects run:
  // processSessionEndItems, stop recordings, end active encounters.
  // Wrapped in useCallback so TableTopBar (React.memo'd) does not re-render
  // every time unrelated game state changes.
  const handleEndSession = useCallback(async () => {
    if (!session || !walletLower) return

    const res = await fetch(`/api/sessions/${session.id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletLower,
      },
      body: JSON.stringify({ action: 'end_session' }),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      console.error('[EndSession] lifecycle API error', json)
      return
    }

    // Post a system chat message so all players see it
    await supabase.from('session_messages').insert({
      session_id: session.id,
      sender_wallet: walletLower,
      sender_name: 'GM',
      body: '⏹ The GM has ended the session. Well adventured!',
      kind: 'system',
    })

    // Update local state so the status badge and button hide immediately
    setSession((prev) => prev ? { ...prev, status: 'completed' } : prev)
  }, [session, walletLower])

  // Stable callbacks for TableTopBar — created once so React.memo can bail out
  // when these (and other props) have not changed.
  const handleToggleDiceLog = useCallback(() => setShowDiceLog((v) => !v), [])
  const handleOpenShop      = useCallback(() => setShowShop(true), [])

  const [showShop,     setShowShop]     = useState(false)
  const [shopToast,    setShopToast]    = useState<string | null>(null)

  function handleShopPurchase(itemName: string) {
    setShopToast(`🏪 ${itemName} added to inventory!`)
    setTimeout(() => setShopToast(null), 4000)
  }


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

  // React to session status changes that arrive via the useSessionWithCampaign
  // realtime subscription.  That hook already owns the `session-meta` channel and
  // updates session.status, so we do NOT need a second Supabase channel here.
  // Previously a duplicate `session-status-{sessionId}` channel existed alongside
  // `session-meta-{sessionId}` — both subscribed to the same sessions row UPDATE,
  // causing two setSession() calls and two re-renders per event.
  useEffect(() => {
    const s = session?.status as SessionStatus | undefined
    if (!s) return

    const prev = prevStatusRef.current
    if (s === prev) return  // no actual change — guard against seeding effect overlap

    prevStatusRef.current = s
    setSessionStatus(s)

    // Transition-specific UI — toasts and pause overlay
    if (s === 'lobby' && prev === 'setup') {
      setSessionToast('🟡 Lobby is open! Voice chat is available.')
      setTimeout(() => setSessionToast(null), 4000)
    }
    if (s === 'active' && (prev === 'lobby' || prev === 'setup')) {
      setSessionToast('⚔️ Session has started!')
      setTimeout(() => setSessionToast(null), 4000)
    }
    if (s === 'paused') {
      setShowPauseOverlay(true)
    }
    if (s === 'active' && prev === 'paused') {
      setShowPauseOverlay(false)
      setSessionToast('▶ Session resumed!')
      setTimeout(() => setSessionToast(null), 4000)
    }
    if (s === 'completed') {
      setShowPauseOverlay(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status])

  const topBar = (
    <>
      <TableTopBar
        session={session as any}
        isGm={isGm}
        address={address}
        displayName={myDisplayName}
        roomName={roomName}
        showDiceLog={showDiceLog}
        onToggleDiceLog={handleToggleDiceLog}
        onEndSession={isGm ? handleEndSession : undefined}
        onOpenShop={handleOpenShop}
        sessionStatus={sessionStatus}
        playerIsSpellcaster={
          isSpellcaster((selectedCharacter as any)?.main_job) ||
          isSpellcaster((selectedCharacter as any)?.secondary_class)
        }
      />
      {/* Shop / session toast notifications */}
      {(shopToast || sessionToast) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-amber-700/60 bg-slate-900 px-4 py-2.5 text-sm font-medium text-amber-200 shadow-xl">
          {sessionToast ?? shopToast}
        </div>
      )}
    </>
  )

  const hud = useHudLayout(walletLower ?? null, isGm ? 'gm' : 'player')

  const mapSection = (
    <MapSection
      expanded={hud.mapExpanded}
      onToggleExpand={() => hud.setMapExpanded(!hud.mapExpanded)}
      currentMap={effectiveMap}
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
      dicePrefs={myDicePrefs}
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
        {showNewMapModal && (() => {
          const filteredLibrary = libraryMaps.filter((m) => {
            if (libraryTab === 'mine') return m.visibility === 'private' && (m.owner_wallet?.toLowerCase() === walletLower)
            if (libraryTab === 'public') return m.visibility === 'public'
            return true
          }).filter((m) => !librarySearch.trim() || m.name.toLowerCase().includes(librarySearch.trim().toLowerCase()))

          return (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
              <div className="w-[28rem] max-w-[95vw] rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
                <h3 className="mb-4 text-sm font-semibold text-slate-200">New Map</h3>

                {/* Source-type radios */}
                <div className="mb-4 grid grid-cols-3 gap-2 text-xs text-slate-300">
                  {([
                    { id: 'image',   label: '📤 Upload'   },
                    { id: 'tile',    label: '🟫 Builder' },
                    { id: 'library', label: '📚 Library' },
                  ] as const).map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setNewMapType(o.id)
                        setNewMapError(null)
                        if (o.id === 'library') void ensureLibraryLoaded()
                      }}
                      className={`rounded-md border px-2 py-1.5 text-[11px] font-semibold transition ${
                        newMapType === o.id
                          ? 'border-emerald-600 bg-emerald-900/40 text-emerald-200'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                {/* Name field — relevant for Upload and Builder; library uses the source's name */}
                {newMapType !== 'library' && (
                  <input
                    placeholder="Map name (optional — defaults from file)"
                    value={newMapName}
                    onChange={(e) => setNewMapName(e.target.value)}
                    className="mb-3 w-full rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
                  />
                )}

                {/* Privacy toggle — only for new uploads/builders, not library picks */}
                {newMapType !== 'library' && (
                  <label className="mb-3 flex cursor-pointer items-start gap-2 rounded border border-slate-800 bg-slate-950/40 px-2 py-1.5 text-[11px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={newMapPrivate}
                      onChange={(e) => setNewMapPrivate(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      🔒 <span className="font-semibold">Private</span> — only you see this map in the library
                      <span className="ml-1 text-slate-500">(future: mint as NFT)</span>
                    </span>
                  </label>
                )}

                {/* Image Upload — file picker + preview */}
                {newMapType === 'image' && (
                  <div className="mb-4 space-y-2">
                    <input
                      ref={newMapImageRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleNewMapImageUpload}
                      className="text-xs text-slate-300"
                    />
                    {stagedFileUrl && (
                      <div className="overflow-hidden rounded-md border border-slate-700">
                        <img src={stagedFileUrl} alt="Preview" className="max-h-44 w-full object-contain bg-slate-950" />
                      </div>
                    )}
                  </div>
                )}

                {/* Tile Builder — informational; Confirm opens the builder */}
                {newMapType === 'tile' && (
                  <p className="mb-4 rounded border border-slate-800 bg-slate-950/40 px-2 py-2 text-[11px] text-slate-400">
                    Click <span className="text-emerald-300">Open Builder</span> to design a tile-based map.
                    You can rename it inside the builder; if you leave it blank, it saves as <span className="text-slate-300">"Tile Map"</span>.
                  </p>
                )}

                {/* Library — tabs + search + grid */}
                {newMapType === 'library' && (
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2">
                      {(['public', 'mine'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setLibraryTab(tab)}
                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold transition ${
                            libraryTab === tab
                              ? 'border-emerald-600 bg-emerald-900/40 text-emerald-200'
                              : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tab === 'public' ? 'All Public' : '🔒 My Private'}
                        </button>
                      ))}
                      <input
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        placeholder="Search by name…"
                        className="ml-auto w-40 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto rounded border border-slate-800 bg-slate-950/40 p-2">
                      {libraryLoading && <div className="col-span-2 py-4 text-center text-[11px] text-slate-500">Loading library…</div>}
                      {!libraryLoading && filteredLibrary.length === 0 && (
                        <div className="col-span-2 py-4 text-center text-[11px] text-slate-500">No maps yet.</div>
                      )}
                      {filteredLibrary.map((m) => {
                        const selected = librarySelectedId === m.id
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setLibrarySelectedId(m.id)}
                            className={`flex flex-col overflow-hidden rounded-md border text-left transition ${
                              selected
                                ? 'border-emerald-500 bg-emerald-900/30'
                                : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex h-20 items-center justify-center overflow-hidden bg-slate-950">
                              {m.image_url ? (
                                <img src={m.image_url} alt={m.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-2xl">🟫</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1 px-1.5 py-1 text-[10px]">
                              <span className="truncate text-slate-200">{m.name}</span>
                              {m.visibility === 'private' && <span title="Private">🔒</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {newMapError && (
                  <div className="mb-3 rounded border border-red-700/50 bg-red-900/30 px-2 py-1.5 text-[11px] text-red-300">
                    {newMapError}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={resetNewMapModal}
                    className="rounded px-3 py-1.5 text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmCreate}
                    disabled={newMapBusy || (newMapType === 'library' && !librarySelectedId)}
                    className="rounded px-3 py-1.5 text-xs bg-emerald-700 text-white hover:bg-emerald-600 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {newMapBusy
                      ? 'Working…'
                      : newMapType === 'image'    ? 'Confirm Upload'
                      : newMapType === 'tile'     ? 'Open Builder'
                      :                             'Use This Map'}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* GM "Viewing as <player>" pill — only visible when impersonating a player. */}
        {isGm && gmViewWallet && (() => {
          const viewed = sessionPlayers.find((p) => p.wallet_address === gmViewWallet)
          const label = viewed?.display_name?.trim() || `${gmViewWallet.slice(0, 6)}…${gmViewWallet.slice(-4)}`
          return (
            <button
              type="button"
              onClick={() => setGmViewWallet(null)}
              className="pointer-events-auto fixed bottom-3 left-3 z-[60] rounded-full border border-amber-700/60 bg-amber-900/70 px-3 py-1 text-[11px] font-semibold text-amber-100 shadow-lg backdrop-blur-md hover:bg-amber-900/90"
              title="Click to return to GM Free View"
            >
              👤 Viewing as <span className="text-amber-300">{label}</span>
              <span className="ml-2 text-[10px] text-amber-300/70">× clear</span>
            </button>
          )
        })()}

        <div className="relative flex-1 min-h-0 min-w-0">
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

              {/* Feature A: per-player map assignment. */}
              {maps.length > 1 && sessionPlayers.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPartyMaps((v) => !v)}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 hover:border-indigo-500"
                    title="Put players on different maps"
                  >
                    🗺 Party Maps
                  </button>
                  {showPartyMaps && (
                    <div className="absolute left-0 top-full z-[70] mt-1 w-64 rounded-lg border border-slate-700 bg-slate-900/95 p-2 shadow-xl backdrop-blur">
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">Send player to map</div>
                      <div className="space-y-1.5">
                        {sessionPlayers.map((p) => {
                          const label = p.display_name?.trim() || `${p.wallet_address.slice(0, 6)}…${p.wallet_address.slice(-4)}`
                          const cur = p.current_map_id ?? currentMapId
                          return (
                            <div key={p.wallet_address} className="flex items-center gap-1.5">
                              <span className="w-20 shrink-0 truncate text-[11px] text-slate-200" title={label}>{label}</span>
                              <select
                                value={cur ?? ''}
                                onChange={(e) => assignPlayerMap(p.wallet_address, e.target.value)}
                                className="flex-1 rounded border border-slate-700 bg-slate-950 px-1.5 py-1 text-[11px] text-slate-100"
                              >
                                <option value="" disabled>— map —</option>
                                {maps.map((m) => (
                                  <option key={m.id} value={m.id}>{m.name}{m.id === currentMapId ? ' (default)' : ''}</option>
                                ))}
                              </select>
                            </div>
                          )
                        })}
                      </div>
                      <p className="mt-1.5 text-[9px] text-slate-500">Moves the player + their token. Use “View As” to see their map.</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  setNewMapName('')
                  setNewMapType('image')
                  setStagedFile(null)
                  if (stagedFileUrl) URL.revokeObjectURL(stagedFileUrl)
                  setStagedFileUrl(null)
                  setNewMapPrivate(false)
                  setNewMapError(null)
                  setLibrarySelectedId(null)
                  setLibrarySearch('')
                  setLibraryTab('public')
                  setShowNewMapModal(true)
                }}
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

          {/* GM panel — docked or floating HUD depending on map expansion */}
          <FloatingWindow
            mode={hud.panelMode}
            isMobile={hud.isMobile}
            title="GM Controls"
            mapExpanded={hud.mapExpanded}
            dockedHeight={hud.layout.dockedHeight}
            floatingRect={hud.layout.floatingRect}
            collapsed={hud.layout.collapsed}
            opacity={hud.layout.opacity}
            onDockedHeight={hud.setDockedHeight}
            onFloatingRect={hud.setFloatingRect}
            onToggleCollapse={() => hud.setCollapsed(!hud.layout.collapsed)}
            onToggleExpand={() => hud.setMapExpanded(!hud.mapExpanded)}
            onOpacity={hud.setOpacity}
            onSnapZone={hud.setSnapZone}
            headerExtras={
              <WidgetPicker
                meta={GM_TABS_META}
                tabOrder={hud.layout.tabOrder}
                hiddenTabs={hud.layout.hiddenTabs}
                onTabOrder={hud.setTabOrder}
                onHiddenTabs={hud.setHiddenTabs}
              />
            }
          >
            <GMSidebar chromeless tabOrder={hud.layout.tabOrder} hiddenTabs={hud.layout.hiddenTabs} sessionId={session?.id ?? null} encounterId={encounterId} address={walletLower ?? null} activeMapId={currentMapId} onRoll={handleExternalRoll} spawnMonsterToken={spawnMonsterToken} spawnNpcToken={spawnNpcToken} sessionType={(session as any)?.session_type ?? null} sessionStatus={sessionStatus ?? session?.status ?? null} xpAwardedAlready={(session as any)?.xp_award ?? null} sessionStartedAt={(session as any)?.started_at ?? null} sessionCompletedAt={(session as any)?.completed_at ?? null} onSessionStatusChange={setSessionStatus} />
          </FloatingWindow>
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
        {/* Player panel — docked or floating HUD depending on map expansion */}
        <FloatingWindow
          mode={hud.panelMode}
          isMobile={hud.isMobile}
          title={selectedCharacter?.name || 'Character'}
          mapExpanded={hud.mapExpanded}
          dockedHeight={hud.layout.dockedHeight}
          floatingRect={hud.layout.floatingRect}
          collapsed={hud.layout.collapsed}
          opacity={hud.layout.opacity}
          onDockedHeight={hud.setDockedHeight}
          onFloatingRect={hud.setFloatingRect}
          onToggleCollapse={() => hud.setCollapsed(!hud.layout.collapsed)}
          onToggleExpand={() => hud.setMapExpanded(!hud.mapExpanded)}
          onOpacity={hud.setOpacity}
          onSnapZone={hud.setSnapZone}
          headerExtras={
            <WidgetPicker
              meta={PLAYER_TABS_META}
              tabOrder={hud.layout.tabOrder}
              hiddenTabs={hud.layout.hiddenTabs}
              onTabOrder={hud.setTabOrder}
              onHiddenTabs={hud.setHiddenTabs}
            />
          }
        >
          <PlayerSidebar
            chromeless tabOrder={hud.layout.tabOrder} hiddenTabs={hud.layout.hiddenTabs}
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
        </FloatingWindow>
      </div>
    </div>
  )
}

