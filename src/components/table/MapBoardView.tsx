'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { renderTilesToCanvas, type TileData } from '@/lib/tilemap'
import { SESSION_GATES, type SessionStatus } from '@/lib/sessionGates'

type Token = {
  id: string
  label: string
  x: number
  y: number
  color?: string | null
  hp?: number | null
  ac?: number | null
  owner_wallet?: string | null
  type?: string | null
  token_image_url?: string | null
}

type FogReveal = {
  tile_x: number
  tile_y: number
}

type MapBoardViewProps = {
  encounterId: string
  mapImageUrl?: string
  tileData?: TileData | null
  mapId?: string | null
  ownerWallet?: string | null
  // ✅ if provided, we can track per-turn movement + action economy in characters.action_state
  characterId?: string | null
  gridSize?: number
  speedFeet?: number
  visionFeet?: number
  /** Gates player token movement — tokens only movable when session is active */
  sessionStatus?: SessionStatus | null
  /** When true, renders the GM fog control toolbar (Reveal All + Reset Fog) */
  isGm?: boolean
  /** Player wallet addresses — used by GM Reveal All to upsert tiles for all players */
  sessionPlayerWallets?: string[]
}

type Point = { x: number; y: number }

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n))
}

function dist(a: Point, b: Point) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function keyTile(x: number, y: number) {
  return `${x}:${y}`
}

function logSupabaseError(prefix: string, err: any) {
  // Next/Chrome sometimes prints {} for complex objects.
  // This forces something visible.
  try {
    console.error(prefix, err)
    console.error(prefix + ' (stringified):', JSON.stringify(err, Object.getOwnPropertyNames(err)))
  } catch {
    console.error(prefix, err)
  }
}

const MapBoardView: React.FC<MapBoardViewProps> = ({
  encounterId,
  mapImageUrl,
  tileData,
  mapId,
  ownerWallet,
  characterId,
  gridSize = 50,
  speedFeet = 30,
  visionFeet = 30,
  sessionStatus,
  isGm = false,
  sessionPlayerWallets = [],
}) => {
  // Players can only move tokens when session is active; default permissive when no status given
  const canInteract = !sessionStatus || SESSION_GATES.canInteractWithMap(sessionStatus)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const tokenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [tokens, setTokens] = useState<Token[]>([])
  const [reveals, setReveals] = useState<FogReveal[]>([])
  const [revealSet, setRevealSet] = useState<Set<string>>(new Set())
  // Hidden until the first loadReveals() resolves to prevent a flash of
  // fully-revealed map (or all-black fog) during the async DB fetch.
  const [fogsLoaded, setFogsLoaded] = useState(false)

  // NOTE: Token-level condition overlays were removed (canvas sync was fragile).
  // Conditions remain available in Initiative + Monster panel.

  const [dragTokenId, setDragTokenId] = useState<string | null>(null)
  const dragStartTokenRef = useRef<Point | null>(null)
  const clickTokenIdRef = useRef<string | null>(null)

  // ✅ initiative turn lock — set from DB subscription so all clients stay in sync
  const [activeWalletLower, setActiveWalletLower] = useState<string | null>(null)
  const [activeInitiativeName, setActiveInitiativeName] = useState<string | null>(null)

  // Token image cache: URL → loaded HTMLImageElement
  const tokenImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const [tokenImgVersion, setTokenImgVersion] = useState(0)

  // ✅ movement tracking (feet used this turn)
  const [moveUsedFt, setMoveUsedFt] = useState<number>(0)
  // Dash action — doubles movement budget this turn
  const [isDashing, setIsDashing] = useState(false)
  // Last committed move — allows undo (one level)
  const [lastMove, setLastMove] = useState<{ tokenId: string; fromX: number; fromY: number; movedFt: number } | null>(null)
  // Bug 16: tap-selected token for tap-to-move (mobile-friendly)
  const [tapSelectTokenId, setTapSelectTokenId] = useState<string | null>(null)

  const [zoom, setZoom] = useState(1)
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 })

  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<Point | null>(null)
  const panTranslateStartRef = useRef<Point | null>(null)

  // Multi-touch pinch-to-zoom tracking
  const activePointersRef = useRef<Map<number, Point>>(new Map())
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartZoomRef = useRef<number>(1)
  const pinchMidRef       = useRef<Point | null>(null)

  const ownerLower = useMemo(() => (ownerWallet ? ownerWallet.toLowerCase() : null), [ownerWallet])

  // Canvas dimensions driven by tile data or image
  const canvasSize = useMemo(() => {
    if (tileData) return { width: tileData.cols * gridSize, height: tileData.rows * gridSize }
    if (img) return { width: img.width, height: img.height }
    return null
  }, [tileData, img, gridSize])

  // GM fog controls — only used when isGm=true (View As mode)
  const [isRevealingAll, setIsRevealingAll] = useState(false)

  const handleGmRevealAll = async () => {
    if (!canvasSize) return
    if (!window.confirm('Reveal entire map for all players?')) return
    setIsRevealingAll(true)
    try {
      const cols = Math.ceil(canvasSize.width / gridSize)
      const rows = Math.ceil(canvasSize.height / gridSize)
      const allRows: { encounter_id: string; viewer_wallet: string; map_id: string | null; tile_x: number; tile_y: number }[] = []
      for (let tx = 0; tx < cols; tx++) {
        for (let ty = 0; ty < rows; ty++) {
          for (const w of sessionPlayerWallets) {
            allRows.push({ encounter_id: encounterId, viewer_wallet: w.toLowerCase(), map_id: mapId ?? null, tile_x: tx, tile_y: ty })
          }
        }
      }
      for (let i = 0; i < allRows.length; i += 500) {
        const { error } = await supabase.from('fog_reveals').upsert(allRows.slice(i, i + 500), { ignoreDuplicates: true })
        if (error) { console.error('reveal all failed:', error); break }
      }
    } finally {
      setIsRevealingAll(false)
    }
  }

  const handleGmResetFog = async () => {
    if (!window.confirm('Reset all fog of war? This cannot be undone.')) return
    let q = supabase.from('fog_reveals').delete().eq('encounter_id', encounterId)
    if (mapId) q = (q as any).eq('map_id', mapId)
    else q = (q as any).is('map_id', null)
    const { error } = await q
    if (error) console.error('reset fog failed:', error)
  }

  // Subscribe to encounters.active_entry_id so all clients get the active turn via DB realtime
  useEffect(() => {
    let mounted = true

    async function applyActiveEntry(entryId: string | null) {
      if (!entryId) {
        setActiveWalletLower(null)
        setActiveInitiativeName(null)
        return
      }
      const { data, error } = await supabase
        .from('initiative_entries')
        .select('name, wallet_address')
        .eq('id', entryId)
        .maybeSingle()
      if (!mounted || error) return
      setActiveWalletLower(data?.wallet_address ? String(data.wallet_address).toLowerCase() : null)
      setActiveInitiativeName(data?.name ?? null)
    }

    async function loadEncounterTurn() {
      const { data, error } = await supabase
        .from('encounters')
        .select('active_entry_id')
        .eq('id', encounterId)
        .maybeSingle()
      if (!mounted || error) return
      await applyActiveEntry((data as any)?.active_entry_id ?? null)
    }

    loadEncounterTurn()

    const channel = supabase
      .channel(`encounter-turn-${encounterId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'encounters', filter: `id=eq.${encounterId}` },
        (payload) => {
          const rec = (payload as any).new as { active_entry_id?: string | null }
          applyActiveEntry(rec?.active_entry_id ?? null)
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [encounterId])

  const isMyTurn = useMemo(() => {
    if (!ownerLower) return false
    if (!activeWalletLower) return false
    return ownerLower === activeWalletLower
  }, [ownerLower, activeWalletLower])

  // Load + subscribe to character action_state for movement usage
  useEffect(() => {
    if (!characterId) {
      setMoveUsedFt(0)
      setIsDashing(false)
      setLastMove(null)
      return
    }

    let mounted = true

    async function loadMoveUsed() {
      const { data, error } = await supabase
        .from('characters')
        .select('action_state')
        .eq('id', characterId)
        .maybeSingle()

      if (!mounted) return

      if (error) {
        logSupabaseError('Error loading character action_state:', error)
        return
      }

      const st = ((data as any)?.action_state ?? {}) as Record<string, any>
      const n = Number(st.move_used_ft ?? 0)
      setMoveUsedFt(Number.isFinite(n) && n >= 0 ? n : 0)
      setIsDashing(Boolean(st.dashing))
    }

    loadMoveUsed()

    const channel = supabase
      .channel(`char-move-${characterId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters', filter: `id=eq.${characterId}` },
        () => loadMoveUsed()
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [characterId])

  // Pre-load token portrait images; bump tokenImgVersion to trigger canvas redraw
  useEffect(() => {
    const cache = tokenImgCacheRef.current
    tokens.forEach(t => {
      const url = t.token_image_url
      if (!url || cache.has(url)) return
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { cache.set(url, img); setTokenImgVersion(v => v + 1) }
      img.onerror = () => cache.set(url, new Image()) // mark failed so we don't retry
      img.src = url
    })
  }, [tokens])

  // 5e simple movement: speedFeet -> max distance per drag
  // Dash action doubles the speed budget (PHB "Dash" action)
  const maxMovePx = useMemo(() => {
    const s = Number(speedFeet)
    const safe = Number.isFinite(s) && s > 0 ? clamp(Math.floor(s), 5, 120) : 30
    return (safe / 5) * gridSize * (isDashing ? 2 : 1)
  }, [speedFeet, gridSize, isDashing])

  // Remaining movement this turn (only enforced when it's your turn AND we have a characterId)
  const remainingMovePx = useMemo(() => {
    if (!characterId) return maxMovePx
    if (!activeWalletLower) return maxMovePx // not in combat / no active lock => just use simple cap
    if (!isMyTurn) return 0

    const used = Number(moveUsedFt)
    const safeUsed = Number.isFinite(used) && used > 0 ? used : 0
    const remainingFt = Math.max(0, Math.floor(speedFeet) - safeUsed)
    return (remainingFt / 5) * gridSize
  }, [characterId, maxMovePx, activeWalletLower, isMyTurn, moveUsedFt, speedFeet, gridSize])

  // Vision radius in pixels (for revealing tiles permanently)
  const visionPx = useMemo(() => {
    const v = Number(visionFeet)
    const safe = Number.isFinite(v) && v > 0 ? clamp(Math.floor(v), 5, 300) : 30
    return (safe / 5) * gridSize
  }, [visionFeet, gridSize])

  // Load map image (image maps only)
  useEffect(() => {
    if (!mapImageUrl) { setImg(null); return }
    const image = new Image()
    image.src = mapImageUrl
    image.onload = () => setImg(image)
  }, [mapImageUrl])

  // Load tokens + realtime — filter by map (null map_id = PC tokens visible everywhere)
  useEffect(() => {
    let mounted = true

    async function loadTokens() {
      let query = supabase
        .from('tokens')
        .select('id, label, x, y, color, hp, ac, owner_wallet, type, token_image_url')
        .eq('encounter_id', encounterId)

      if (mapId) {
        query = query.or(`map_id.eq.${mapId},map_id.is.null`)
      }

      const { data, error } = await query

      if (!mounted) return
      if (error) {
        logSupabaseError('Error loading tokens (view):', error)
        return
      }
      setTokens((data ?? []) as any)
    }

    loadTokens()

    const channel = supabase
      .channel(`tokens-view-${encounterId}-${mapId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens', filter: `encounter_id=eq.${encounterId}` },
        () => loadTokens()
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [encounterId, mapId])

  // Load fog reveals + realtime (per viewer, per map)
  useEffect(() => {
    if (!ownerLower) {
      setReveals([])
      setRevealSet(new Set())
      setFogsLoaded(false)
      return
    }
    setFogsLoaded(false)

    let mounted = true

    async function loadReveals() {
      let query = supabase
        .from('fog_reveals')
        .select('tile_x, tile_y')
        .eq('encounter_id', encounterId)
        .eq('viewer_wallet', ownerLower)

      // Scope fog to the active map so each map starts fresh
      if (mapId) {
        query = query.eq('map_id', mapId)
      } else {
        query = query.is('map_id', null)
      }

      const { data, error } = await query

      if (!mounted) return

      if (error) {
        logSupabaseError('Error loading fog reveals:', error)
        return
      }

      const rows = ((data ?? []) as any) as FogReveal[]
      setReveals(rows)

      const s = new Set<string>()
      for (const r of rows) s.add(keyTile(r.tile_x, r.tile_y))
      setRevealSet(s)
      setFogsLoaded(true)
    }

    loadReveals()

    const channel = supabase
      .channel(`fog-${encounterId}-${ownerLower}-${mapId ?? 'nomap'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fog_reveals', filter: `encounter_id=eq.${encounterId}` },
        () => loadReveals()
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [encounterId, ownerLower, mapId])

  // Reveal fog around a canvas-pixel center point.
  // useCallback gives a stable reference so the initial-reveal effect below
  // can list it as a proper dependency — it only changes when vision/map/
  // encounter actually change, not on every render.
  const revealAround = useCallback(async function(center: Point) {
    if (!ownerLower) return
    // Guard against NaN/Infinity
    if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) return

    // Snap the origin to the center of the token's tile (not the raw pixel
    // position which sits at a grid-line intersection).  Tile-center to
    // tile-center distances produce a perfectly symmetric circle.
    const cx = Math.floor(center.x / gridSize)
    const cy = Math.floor(center.y / gridSize)
    const originX = (cx + 0.5) * gridSize
    const originY = (cy + 0.5) * gridSize

    // +1 so tiles exactly at the boundary distance are always included
    const rTiles = Math.ceil(visionPx / gridSize) + 1


    // Map bounds in tiles — clamp to avoid negative coords or off-map DB rows.
    const maxTileX = canvasSize ? Math.floor(canvasSize.width  / gridSize) - 1 : Infinity
    const maxTileY = canvasSize ? Math.floor(canvasSize.height / gridSize) - 1 : Infinity

    // Collect every tile whose center falls within the vision radius.
    // We do NOT filter against the current revealSet closure here because
    // revealSet may be a stale snapshot from an earlier render — filtering
    // happens inside the functional state updater which always receives the
    // latest state value.
    const circleTiles: FogReveal[] = []
    for (let dx = -rTiles; dx <= rTiles; dx++) {
      for (let dy = -rTiles; dy <= rTiles; dy++) {
        const tx = cx + dx
        const ty = cy + dy
        // Skip tiles outside the map canvas — they'd be stored as negative or
        // off-canvas coords (wasted DB rows, never drawn).
        if (tx < 0 || ty < 0 || tx > maxTileX || ty > maxTileY) continue
        const px = (tx + 0.5) * gridSize
        const py = (ty + 0.5) * gridSize
        if (dist({ x: originX, y: originY }, { x: px, y: py }) <= visionPx) {
          circleTiles.push({ tile_x: tx, tile_y: ty })
        }
      }
    }


    // CRITICAL: use functional state updates so that two concurrent
    // revealAround calls (e.g. fast left→right→left) merge their tiles
    // rather than the later call's direct-value overwrite wiping the
    // earlier call's newly-revealed tiles.
    setRevealSet(prev => {
      const next = new Set(prev)
      for (const t of circleTiles) next.add(keyTile(t.tile_x, t.tile_y))
      return next
    })
    // Append only NEW tiles to keep the array bounded over a long session.
    // The functional updater receives the latest state, so the key-set check
    // is always accurate even for concurrent reveals.
    setReveals(prev => {
      const existing = new Set(prev.map((t) => keyTile(t.tile_x, t.tile_y)))
      const incoming = circleTiles.filter((t) => !existing.has(keyTile(t.tile_x, t.tile_y)))
      return incoming.length ? [...prev, ...incoming] : prev
    })

    // Persist to DB — upsert with ignoreDuplicates handles server-side dedup
    const payload = circleTiles.map((t) => ({
      encounter_id: encounterId,
      viewer_wallet: ownerLower,
      map_id: mapId ?? null,
      tile_x: t.tile_x,
      tile_y: t.tile_y,
    }))

    const { error } = await supabase
      .from('fog_reveals')
      .upsert(payload, { ignoreDuplicates: true })

    if (error) {
      logSupabaseError('Failed to persist fog reveals:', error)
    }
  // setRevealSet / setReveals are stable React dispatch functions — no dep needed.
  // supabase is a module singleton — no dep needed.
  }, [ownerLower, visionPx, gridSize, encounterId, mapId, canvasSize])

  // Reveal fog whenever the player's token appears or is replaced.
  // revealAround upserts with ON CONFLICT DO NOTHING, so re-running it for the
  // same position is safe and cheap. Tracking the full token-ID list (not just
  // count) ensures a replacement at the same list-length also triggers a reveal.
  const tokenIds = tokens.map((t) => t.id).join(',')
  useEffect(() => {
    if (!ownerLower) return
    const myPc = tokens.find((t) => t.type === 'pc' && t.owner_wallet?.toLowerCase() === ownerLower)
    if (!myPc) return
    // null DB value coerces to 0 via Number() — check for null/undefined first
    if (myPc.x == null || myPc.y == null) return
    const px = Number(myPc.x)
    const py = Number(myPc.y)
    if (!Number.isFinite(px) || !Number.isFinite(py)) return
    // Skip unpositioned tokens: snap() always produces multiples of gridSize,
    // so (0, 0) means "not yet placed" in almost all cases.
    if (px === 0 && py === 0) return
    void revealAround({ x: px, y: py })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerLower, tokenIds, revealAround])

  // Draw map + grid
  useEffect(() => {
    const canvas = mapCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    if (!tileData && !img) return

    if (tileData) {
      canvas.width = tileData.cols * gridSize
      canvas.height = tileData.rows * gridSize
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      renderTilesToCanvas(ctx, tileData, gridSize)
      return
    }

    if (img) {
      canvas.width = img.width
      canvas.height = img.height
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(148,163,184,0.25)'

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }
    }
  }, [img, tileData, gridSize])

  // Draw tokens
  useEffect(() => {
    const canvas = tokenCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !canvasSize) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    tokens.forEach((t) => {
      const isPC = t.type === 'pc'
      const isMine = ownerLower && t.owner_wallet?.toLowerCase() === ownerLower

      // Hide non-PC tokens that are inside unrevealed fog tiles.
      // PC tokens (players' characters) are always visible to everyone.
      if (!isPC) {
        const tokenTileX = Math.floor(t.x / gridSize)
        const tokenTileY = Math.floor(t.y / gridSize)
        if (!revealSet.has(keyTile(tokenTileX, tokenTileY))) return
      }

      const r = gridSize * 0.35

      // Active initiative token — green glow (visible to ALL players, NPC or PC)
      const isActiveTurn =
        (activeInitiativeName && t.label === activeInitiativeName) ||
        (activeWalletLower && t.owner_wallet?.toLowerCase() === activeWalletLower)

      ctx.beginPath()
      ctx.fillStyle = t.color || '#111827'
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
      ctx.fill()

      if (isActiveTurn) {
        const lw = Math.max(3, gridSize * 0.12)
        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = lw
        ctx.strokeStyle = 'rgba(16,185,129,0.95)'
        ctx.shadowColor = 'rgba(16,185,129,0.7)'
        ctx.shadowBlur = Math.max(10, gridSize * 0.35)
        ctx.arc(t.x, t.y, r + lw * 0.7, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      } else if (isMine) {
        // Blue ring for my own token when it's not my turn
        const lw = Math.max(3, gridSize * 0.12)
        ctx.save()
        ctx.beginPath()
        ctx.lineWidth = lw
        ctx.strokeStyle = 'rgba(59,130,246,0.9)'
        ctx.shadowColor = 'rgba(59,130,246,0.6)'
        ctx.shadowBlur = Math.max(8, gridSize * 0.3)
        ctx.arc(t.x, t.y, r + lw * 0.6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // Bug 16: tap-selected highlight — white dashed ring
      if (t.id === tapSelectTokenId) {
        const lw = Math.max(2, gridSize * 0.08)
        ctx.save()
        ctx.beginPath()
        ctx.setLineDash([4, 4])
        ctx.lineWidth = lw
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.shadowColor = 'rgba(255,255,255,0.5)'
        ctx.shadowBlur = Math.max(6, gridSize * 0.2)
        ctx.arc(t.x, t.y, r + lw + 2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // Draw portrait image if available, otherwise fall back to text label
      const tokenImg = t.token_image_url ? tokenImgCacheRef.current.get(t.token_image_url) : undefined
      if (tokenImg && tokenImg.complete && tokenImg.naturalWidth > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(tokenImg, t.x - r, t.y - r, r * 2, r * 2)
        ctx.restore()
      } else {
        ctx.font = `${Math.max(12, gridSize * 0.35)}px system-ui, sans-serif`
        ctx.fillStyle = '#e5e7eb'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(t.label || 'T', t.x, t.y)
      }
    })
  }, [tokens, canvasSize, gridSize, ownerLower, revealSet, activeInitiativeName, activeWalletLower, tokenImgVersion, tapSelectTokenId])

  // Draw fog overlay (PERSISTENT reveals only)
  useEffect(() => {
    const canvas = fogCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !canvasSize) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // full fog
    ctx.fillStyle = 'rgba(2,6,23,0.92)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // erase revealed tiles
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0,0,0,1)'
    for (const r of reveals) {
      ctx.fillRect(r.tile_x * gridSize, r.tile_y * gridSize, gridSize, gridSize)
    }
    ctx.restore()
  }, [canvasSize, reveals, gridSize])

  // ✅ Dash action — sets dashing flag locally + persists to action_state
  async function handleDash() {
    setIsDashing(true)
    setLastMove(null) // clear undo when dashing (fresh budget)
    if (!characterId) return
    const { data: row } = await supabase
      .from('characters')
      .select('action_state')
      .eq('id', characterId)
      .maybeSingle()
    const st = ((row as any)?.action_state ?? {}) as Record<string, any>
    await supabase
      .from('characters')
      .update({ action_state: { ...st, dashing: true } })
      .eq('id', characterId)
  }

  // ✅ Undo last move — reverts token to saved position and subtracts the feet
  async function handleUndoMove() {
    if (!lastMove) return
    const { tokenId, fromX, fromY, movedFt } = lastMove

    const { error } = await supabase.rpc('move_my_token', {
      p_token_id: tokenId,
      p_x: Math.round(fromX),
      p_y: Math.round(fromY),
    })
    if (error) { logSupabaseError('undo move_my_token failed:', error); return }

    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, x: fromX, y: fromY } : t))
    setLastMove(null)

    const newUsed = Math.max(0, moveUsedFt - movedFt)
    setMoveUsedFt(newUsed)

    if (characterId) {
      const { data: row } = await supabase
        .from('characters')
        .select('action_state')
        .eq('id', characterId)
        .maybeSingle()
      const st = ((row as any)?.action_state ?? {}) as Record<string, any>
      await supabase
        .from('characters')
        .update({ action_state: { ...st, move_used_ft: newUsed } })
        .eq('id', characterId)
    }
  }

  // ── Shared move-commit helper (used by drag, tap-to-move, and arrow keys) ────
  // Commits a token from startPos to target: RPC → action_state → fog → trigger.
  const commitMoveToTarget = useCallback(async (
    tok: Token,
    target: Point,
    startPos: Point,
  ) => {
    const movedPx = dist(startPos, target)
    const movedFt = Math.round(movedPx / gridSize) * 5

    const { error: moveErr } = await supabase.rpc('move_my_token', {
      p_token_id: tok.id,
      p_x: Math.round(target.x),
      p_y: Math.round(target.y),
    })

    if (moveErr) {
      logSupabaseError('move_my_token RPC failed:', moveErr)
      setTokens((prev) => prev.map((t) => (t.id === tok.id ? { ...t, x: startPos.x, y: startPos.y } : t)))
      return
    }

    if (characterId && activeWalletLower && isMyTurn && movedFt > 0) {
      setLastMove({ tokenId: tok.id, fromX: startPos.x, fromY: startPos.y, movedFt })

      const next = Math.max(0, Math.floor(moveUsedFt) + movedFt)
      setMoveUsedFt(next)

      const { data: row, error: readErr } = await supabase
        .from('characters')
        .select('action_state')
        .eq('id', characterId)
        .maybeSingle()
      if (!readErr) {
        const st = ((row as any)?.action_state ?? {}) as Record<string, any>
        const prevUsed = Number(st.move_used_ft ?? 0)
        const safePrev = Number.isFinite(prevUsed) && prevUsed >= 0 ? prevUsed : 0
        const merged = { ...st, move_used_ft: Math.max(0, Math.floor(safePrev + movedFt)) }
        await supabase.from('characters').update({ action_state: merged }).eq('id', characterId)
      }
    }

    void revealAround({ x: target.x, y: target.y })

    const tileX = Math.round(target.x / gridSize)
    const tileY = Math.round(target.y / gridSize)
    window.dispatchEvent(
      new CustomEvent('dnd721-token-moved', {
        detail: { tokenId: tok.id, tileX, tileY, mapId, encounterId },
      })
    )
  }, [characterId, activeWalletLower, isMyTurn, moveUsedFt, gridSize, revealAround, mapId, encounterId])

  // Helpers — accept any event with clientX/clientY (pointer, mouse, wheel)
  const getScreenPoint = (e: { clientX: number; clientY: number }) => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }
    const rect = container.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const screenToWorld = (screen: Point) => ({
    x: (screen.x - translate.x) / zoom,
    y: (screen.y - translate.y) / zoom,
  })

  // Snap to tile CENTER (not the grid-line intersection) so the fog-reveal circle
  // is always symmetric around the token.  See MapBoard.tsx snap() for details.
  const snapToGrid = (value: number) => Math.floor(value / gridSize) * gridSize + gridSize / 2

  const canMoveToken = (t: Token) => {
    if (!canInteract) return false
    if (!ownerLower) return false
    if (t.owner_wallet?.toLowerCase() !== ownerLower) return false

    // ✅ If initiative is active, only the active player can move on their turn
    if (activeWalletLower && ownerLower !== activeWalletLower) return false

    // ✅ If we are enforcing movement and you have no movement left, block dragging
    if (activeWalletLower && characterId && remainingMovePx <= 0) return false

    return true
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two-finger pinch: snapshot zoom state
    if (activePointersRef.current.size >= 2) {
      const pts = Array.from(activePointersRef.current.values())
      pinchStartDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchStartZoomRef.current = zoom
      pinchMidRef.current = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      setIsPanning(false)
      setDragTokenId(null)
      return
    }

    if (e.button !== 0) return

    const screen = getScreenPoint(e)
    const world = screenToWorld(screen)

    const hit = tokens.find((t) => Math.hypot(t.x - world.x, t.y - world.y) < gridSize * 0.5)

    if (hit) {
      if (canMoveToken(hit)) {
        setDragTokenId(hit.id)
        dragStartTokenRef.current = { x: hit.x, y: hit.y }
        clickTokenIdRef.current = null
        setIsPanning(false)
      } else {
        // token clicked but not draggable => treat as a target select
        clickTokenIdRef.current = hit.id
        setDragTokenId(null)
        setIsPanning(false)
      }
    } else {
      // Bug 16: if a token is tap-selected, this empty-space tap is a "move here"
      if (tapSelectTokenId) {
        const selectedTok = tokens.find((t) => t.id === tapSelectTokenId)
        setTapSelectTokenId(null)
        if (selectedTok && canMoveToken(selectedTok)) {
          const snapped = { x: snapToGrid(world.x), y: snapToGrid(world.y) }
          const tapDist = dist({ x: selectedTok.x, y: selectedTok.y }, snapped)
          const budget = characterId && activeWalletLower && isMyTurn ? remainingMovePx : Infinity
          if (tapDist <= budget) {
            // Optimistic position update before async commit
            setTokens((prev) =>
              prev.map((t) => (t.id === selectedTok.id ? { ...t, x: snapped.x, y: snapped.y } : t))
            )
            void commitMoveToTarget(selectedTok, snapped, { x: selectedTok.x, y: selectedTok.y })
          }
        }
        return
      }
      clickTokenIdRef.current = null
      setIsPanning(true)
      panStartRef.current = screen
      panTranslateStartRef.current = { ...translate }
      setDragTokenId(null)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two-finger pinch zoom
    if (activePointersRef.current.size >= 2 && pinchStartDistRef.current !== null) {
      const pts = Array.from(activePointersRef.current.values())
      const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const newZoom = clamp(
        pinchStartZoomRef.current * (newDist / pinchStartDistRef.current),
        MIN_ZOOM,
        MAX_ZOOM,
      )
      if (newZoom !== zoom && pinchMidRef.current) {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const midX = pinchMidRef.current.x - rect.left
          const midY = pinchMidRef.current.y - rect.top
          const worldX = (midX - translate.x) / zoom
          const worldY = (midY - translate.y) / zoom
          setZoom(newZoom)
          setTranslate({ x: midX - worldX * newZoom, y: midY - worldY * newZoom })
        }
      }
      return
    }

    const screen = getScreenPoint(e)
    const world = screenToWorld(screen)

    if (isPanning && panStartRef.current && panTranslateStartRef.current) {
      const dx = screen.x - panStartRef.current.x
      const dy = screen.y - panStartRef.current.y
      setTranslate({ x: panTranslateStartRef.current.x + dx, y: panTranslateStartRef.current.y + dy })
      return
    }

    if (dragTokenId) {
      const startToken = dragStartTokenRef.current
      if (!startToken) return

      const desired = { x: snapToGrid(world.x), y: snapToGrid(world.y) }
      const d = dist(startToken, desired)

      // ✅ enforce remaining move (per turn) if available
      const budget = remainingMovePx > 0 ? remainingMovePx : 0

      const limited =
        d <= budget
          ? desired
          : (() => {
              const ratio = budget / d
              const nx = startToken.x + (desired.x - startToken.x) * ratio
              const ny = startToken.y + (desired.y - startToken.y) * ratio
              return { x: snapToGrid(nx), y: snapToGrid(ny) }
            })()

      setTokens((prev) => prev.map((t) => (t.id === dragTokenId ? { ...t, x: limited.x, y: limited.y } : t)))
    }
  }

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId)
    if (activePointersRef.current.size < 2) pinchStartDistRef.current = null

    // ✅ target selection (click non-owned token)
    if (!dragTokenId && clickTokenIdRef.current) {
      const tok = tokens.find((t) => t.id === clickTokenIdRef.current)
      clickTokenIdRef.current = null
      setTapSelectTokenId(null) // clear any tap selection
      if (tok && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dnd721-target-selected', { detail: { token: tok } }))
      }
      return
    }

    if (isPanning) setIsPanning(false)

    if (!dragTokenId) return
    const tok = tokens.find((t) => t.id === dragTokenId)
    const start = dragStartTokenRef.current
    setDragTokenId(null)
    dragStartTokenRef.current = null
    if (!tok) return

    const startPoint = start ?? { x: tok.x, y: tok.y }
    const movedPx = dist(startPoint, { x: tok.x, y: tok.y })

    // Bug 16: distinguish tap (<30% of a tile) from a real drag
    const TAP_THRESHOLD = gridSize * 0.3
    if (movedPx < TAP_THRESHOLD && start) {
      // Restore the tiny nudge caused by pointer events
      setTokens((prev) => prev.map((t) => (t.id === tok.id ? { ...t, x: start.x, y: start.y } : t)))
      // Toggle tap selection — second tap on same token deselects
      setTapSelectTokenId((prev) => (prev === tok.id ? null : tok.id))
      return
    }

    // Real drag — clear any lingering tap selection
    setTapSelectTokenId(null)

    await commitMoveToTarget(tok, { x: tok.x, y: tok.y }, startPoint)
  }

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId)
    if (activePointersRef.current.size < 2) pinchStartDistRef.current = null
    // Only clear pan/drag if no pointers remain (pointer capture keeps them active during drag)
    if (activePointersRef.current.size === 0) {
      if (isPanning) setIsPanning(false)
      setDragTokenId(null)
      dragStartTokenRef.current = null
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = -e.deltaY
    if (delta === 0) return

    const zoomFactor = delta > 0 ? 1.1 : 0.9
    const newZoom = clamp(zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM)
    if (newZoom === zoom) return

    const screen = getScreenPoint(e)
    const worldX = (screen.x - translate.x) / zoom
    const worldY = (screen.y - translate.y) / zoom

    setZoom(newZoom)
    setTranslate({ x: screen.x - worldX * newZoom, y: screen.y - worldY * newZoom })
  }

  // Bug 17: Arrow-key movement — moves the player's PC token one tile per keypress
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      if (!ownerLower) return

      const myTok = tokens.find(
        (t) => t.type === 'pc' && t.owner_wallet?.toLowerCase() === ownerLower
      )
      if (!myTok) return

      // Replicate canMoveToken checks inline (closure over current state)
      if (myTok.owner_wallet?.toLowerCase() !== ownerLower) return
      if (activeWalletLower && ownerLower !== activeWalletLower) return
      if (activeWalletLower && characterId && remainingMovePx <= 0) return

      // One grid step — exactly 5 ft
      const dx = e.key === 'ArrowLeft' ? -gridSize : e.key === 'ArrowRight' ? gridSize : 0
      const dy = e.key === 'ArrowUp'   ? -gridSize : e.key === 'ArrowDown'  ? gridSize : 0
      if (dx === 0 && dy === 0) return

      // Don't steal focus from text inputs
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return

      e.preventDefault()

      const newX = myTok.x + dx
      const newY = myTok.y + dy

      // Enforce movement budget
      if (characterId && activeWalletLower && isMyTurn && remainingMovePx < gridSize) return

      // Optimistic position update so the canvas redraws immediately
      setTokens((prev) => prev.map((t) => (t.id === myTok.id ? { ...t, x: newX, y: newY } : t)))

      await commitMoveToTarget(myTok, { x: newX, y: newY }, { x: myTok.x, y: myTok.y })
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [ownerLower, tokens, gridSize, characterId, activeWalletLower, isMyTurn, remainingMovePx, commitMoveToTarget])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const preventScroll = (event: WheelEvent) => event.preventDefault()
    container.addEventListener('wheel', preventScroll, { passive: false })
    return () => container.removeEventListener('wheel', preventScroll)
  }, [])

  const transformStyle = {
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
    transformOrigin: 'top left' as const,
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden overscroll-none rounded-xl border border-slate-800 bg-slate-950/80"
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onWheel={handleWheel}
    >
      <div className="relative inline-block" style={transformStyle}>
        <canvas ref={mapCanvasRef} className="block" />
        <canvas ref={tokenCanvasRef} className="pointer-events-none absolute left-0 top-0" />
        <canvas
          ref={fogCanvasRef}
          className={`pointer-events-none absolute left-0 top-0 transition-opacity duration-300 ${fogsLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      {/* GM fog toolbar — shown when viewing as a player (View As mode) */}
      {isGm && (
        <div className="pointer-events-auto absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={handleGmRevealAll}
            disabled={!canvasSize || isRevealingAll}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 shadow transition hover:border-emerald-500/60 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            title="Reveal entire map for all players"
          >
            {isRevealingAll ? '⏳ Revealing…' : '👁 Reveal All'}
          </button>
          <button
            type="button"
            onClick={handleGmResetFog}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 shadow transition hover:border-red-500/60 hover:text-red-300"
            title="Re-fog the entire map for all players"
          >
            🚫 Reset Fog
          </button>
        </div>
      )}

      {/* Movement action bar — only shown on your turn */}
      {isMyTurn && characterId && (
        <div className="pointer-events-auto absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/90 px-2.5 py-1.5 shadow-lg backdrop-blur-sm">
          {/* Remaining movement indicator */}
          <span className="text-[10px] text-slate-400">
            {Math.max(0, Math.round((remainingMovePx / gridSize) * 5))}ft left
          </span>
          {/* Dash button */}
          <button
            type="button"
            onClick={handleDash}
            disabled={isDashing}
            title={isDashing ? 'Already dashing (2× speed)' : 'Dash — double your movement this turn'}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold transition ${
              isDashing
                ? 'bg-amber-800/60 text-amber-300 opacity-60 cursor-default'
                : 'bg-amber-700/80 text-amber-100 hover:bg-amber-600/80'
            }`}
          >
            {isDashing ? '⚡ Dashing' : '⚡ Dash'}
          </button>
          {/* Undo button */}
          <button
            type="button"
            onClick={handleUndoMove}
            disabled={!lastMove}
            title={lastMove ? 'Undo last move' : 'No move to undo'}
            className="rounded bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-600/80 disabled:cursor-default disabled:opacity-40"
          >
            ↩ Undo
          </button>
        </div>
      )}
    </div>
  )
}

export default MapBoardView
