'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
}

type FogReveal = {
  tile_x: number
  tile_y: number
}

type MapBoardViewProps = {
  encounterId: string
  mapImageUrl: string
  ownerWallet?: string | null
  // ✅ if provided, we can track per-turn movement + action economy in characters.action_state
  characterId?: string | null
  gridSize?: number
  speedFeet?: number
  visionFeet?: number
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
  ownerWallet,
  characterId,
  gridSize = 50,
  speedFeet = 30,
  visionFeet = 30,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const tokenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [tokens, setTokens] = useState<Token[]>([])
  const [reveals, setReveals] = useState<FogReveal[]>([])
  const [revealSet, setRevealSet] = useState<Set<string>>(new Set())

  // NOTE: Token-level condition overlays were removed (canvas sync was fragile).
  // Conditions remain available in Initiative + Monster panel.

  const [dragTokenId, setDragTokenId] = useState<string | null>(null)
  const dragStartTokenRef = useRef<Point | null>(null)
  const clickTokenIdRef = useRef<string | null>(null)

  // ✅ initiative turn lock (from InitiativeTracker)
  const [activeWalletLower, setActiveWalletLower] = useState<string | null>(null)

  // ✅ movement tracking (feet used this turn)
  const [moveUsedFt, setMoveUsedFt] = useState<number>(0)

  const [zoom, setZoom] = useState(1)
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 })

  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<Point | null>(null)
  const panTranslateStartRef = useRef<Point | null>(null)

  const ownerLower = useMemo(() => (ownerWallet ? ownerWallet.toLowerCase() : null), [ownerWallet])

  // Listen for active initiative changes (locks movement to the active player)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handler = (ev: any) => {
      const detail = (ev?.detail ?? {}) as { name?: string | null; wallet?: string | null }
      const w = detail.wallet ? String(detail.wallet).toLowerCase() : null
      setActiveWalletLower(w)
    }

    window.addEventListener('dnd721-active-initiative', handler as any)
    return () => window.removeEventListener('dnd721-active-initiative', handler as any)
  }, [])

  const isMyTurn = useMemo(() => {
    if (!ownerLower) return false
    if (!activeWalletLower) return false
    return ownerLower === activeWalletLower
  }, [ownerLower, activeWalletLower])

  // Load + subscribe to character action_state for movement usage
  useEffect(() => {
    if (!characterId) {
      setMoveUsedFt(0)
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

  // 5e simple movement: speedFeet -> max distance per drag
  const maxMovePx = useMemo(() => {
    const s = Number(speedFeet)
    const safe = Number.isFinite(s) && s > 0 ? clamp(Math.floor(s), 5, 120) : 30
    return (safe / 5) * gridSize
  }, [speedFeet, gridSize])

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

  // Load map image
  useEffect(() => {
    if (!mapImageUrl) return
    const image = new Image()
    image.src = mapImageUrl
    image.onload = () => setImg(image)
  }, [mapImageUrl])

  // Load tokens + realtime
  useEffect(() => {
    let mounted = true

    async function loadTokens() {
      const { data, error } = await supabase
        .from('tokens')
        .select('id, label, x, y, color, hp, ac, owner_wallet, type')
        .eq('encounter_id', encounterId)

      if (!mounted) return
      if (error) {
        logSupabaseError('Error loading tokens (view):', error)
        return
      }
      setTokens((data ?? []) as any)
    }

    loadTokens()

    const channel = supabase
      .channel(`tokens-view-${encounterId}`)
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
  }, [encounterId])

  // Load fog reveals + realtime (per viewer)
  useEffect(() => {
    if (!ownerLower) {
      setReveals([])
      setRevealSet(new Set())
      return
    }

    let mounted = true

    async function loadReveals() {
      const { data, error } = await supabase
        .from('fog_reveals')
        .select('tile_x, tile_y')
        .eq('encounter_id', encounterId)
        .eq('viewer_wallet', ownerLower)

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
    }

    loadReveals()

    const channel = supabase
      .channel(`fog-${encounterId}-${ownerLower}`)
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
  }, [encounterId, ownerLower])

  // Persist “eraser trail” reveals
  async function revealAround(center: Point) {
    if (!ownerLower) return

    const rTiles = Math.ceil(visionPx / gridSize)
    const cx = Math.floor(center.x / gridSize)
    const cy = Math.floor(center.y / gridSize)

    const toInsert: FogReveal[] = []
    const nextSet = new Set(revealSet)

    for (let dx = -rTiles; dx <= rTiles; dx++) {
      for (let dy = -rTiles; dy <= rTiles; dy++) {
        const tx = cx + dx
        const ty = cy + dy

        // distance check vs tile center
        const px = (tx + 0.5) * gridSize
        const py = (ty + 0.5) * gridSize
        if (dist(center, { x: px, y: py }) <= visionPx) {
          const k = keyTile(tx, ty)
          if (!nextSet.has(k)) {
            nextSet.add(k)
            toInsert.push({ tile_x: tx, tile_y: ty })
          }
        }
      }
    }

    if (toInsert.length === 0) return

    // update local immediately
    setRevealSet(nextSet)
    setReveals((prev) => [...prev, ...toInsert])

    // IMPORTANT: use UPSERT to avoid duplicate constraint errors
    const payload = toInsert.map((t) => ({
      encounter_id: encounterId,
      viewer_wallet: ownerLower,
      tile_x: t.tile_x,
      tile_y: t.tile_y,
    }))

    const { error } = await supabase
      .from('fog_reveals')
      .upsert(payload, {
        onConflict: 'encounter_id,viewer_wallet,tile_x,tile_y',
        ignoreDuplicates: true,
      })

    if (error) {
      logSupabaseError('Failed to persist fog reveals:', error)
    }
  }

  // Reveal around player once on load
  useEffect(() => {
    if (!ownerLower) return
    const myPc = tokens.find((t) => t.type === 'pc' && t.owner_wallet?.toLowerCase() === ownerLower)
    if (!myPc) return
    void revealAround({ x: myPc.x, y: myPc.y })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerLower, tokens.length])

  // Draw map + grid
  useEffect(() => {
    const canvas = mapCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !img) return

    canvas.width = img.width
    canvas.height = img.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'

    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
  }, [img, gridSize])

  // Draw tokens
  useEffect(() => {
    const canvas = tokenCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !img) return

    canvas.width = img.width
    canvas.height = img.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    tokens.forEach((t) => {
      const r = gridSize * 0.35
      const isMine = ownerLower && t.owner_wallet?.toLowerCase() === ownerLower

      ctx.beginPath()
      ctx.fillStyle = t.color || '#111827'
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2)
      ctx.fill()

      if (isMine) {
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

      ctx.font = `${Math.max(12, gridSize * 0.35)}px system-ui, sans-serif`
      ctx.fillStyle = '#e5e7eb'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(t.label || 'T', t.x, t.y)

      // (conditions overlay removed)
    })
  }, [tokens, img, gridSize, ownerLower])

  // Draw fog overlay (PERSISTENT reveals only)
  useEffect(() => {
    const canvas = fogCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !img) return

    canvas.width = img.width
    canvas.height = img.height

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
  }, [img, reveals, gridSize])

  // Helpers
  const getScreenPointFromMouse = (e: React.MouseEvent) => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }
    const rect = container.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const getScreenPointFromWheel = (e: React.WheelEvent) => {
    const container = containerRef.current
    if (!container) return { x: 0, y: 0 }
    const rect = container.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const screenToWorld = (screen: Point) => ({
    x: (screen.x - translate.x) / zoom,
    y: (screen.y - translate.y) / zoom,
  })

  const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize

  const canMoveToken = (t: Token) => {
    if (!ownerLower) return false
    if (t.owner_wallet?.toLowerCase() !== ownerLower) return false

    // ✅ If initiative is active, only the active player can move on their turn
    if (activeWalletLower && ownerLower !== activeWalletLower) return false

    // ✅ If we are enforcing movement and you have no movement left, block dragging
    if (activeWalletLower && characterId && remainingMovePx <= 0) return false

    return true
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return

    const screen = getScreenPointFromMouse(e)
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
      clickTokenIdRef.current = null
      setIsPanning(true)
      panStartRef.current = screen
      panTranslateStartRef.current = { ...translate }
      setDragTokenId(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const screen = getScreenPointFromMouse(e)
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

  const handleMouseUp = async () => {
    // ✅ target selection (click token)
    if (!dragTokenId && clickTokenIdRef.current) {
      const tok = tokens.find((t) => t.id === clickTokenIdRef.current)
      clickTokenIdRef.current = null
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

    const startPoint = start
    const movedPx = startPoint ? dist(startPoint, { x: tok.x, y: tok.y }) : 0
    const movedFt = startPoint ? Math.round(movedPx / gridSize) * 5 : 0

    const { error: moveErr } = await supabase.rpc('move_my_token', {
      p_token_id: tok.id,
      p_x: Math.round(tok.x),
      p_y: Math.round(tok.y),
    })

    if (moveErr) {
      logSupabaseError('move_my_token RPC failed:', moveErr)

      if (start?.x != null && start?.y != null) {
        setTokens((prev) => prev.map((t) => (t.id === tok.id ? { ...t, x: start.x, y: start.y } : t)))
      }
      return
    }

    // ✅ success: persist movement used (only when it's your turn + we have a character)
    if (characterId && activeWalletLower && isMyTurn && movedFt > 0) {
      const next = Math.max(0, Math.floor(moveUsedFt) + movedFt)
      setMoveUsedFt(next)

      // merge into action_state
      const { data: row, error: readErr } = await supabase
        .from('characters')
        .select('action_state')
        .eq('id', characterId)
        .maybeSingle()

      if (readErr) {
        logSupabaseError('Error reading action_state for move_used_ft:', readErr)
      } else {
        const st = ((row as any)?.action_state ?? {}) as Record<string, any>
        const prevUsed = Number(st.move_used_ft ?? 0)
        const safePrev = Number.isFinite(prevUsed) && prevUsed >= 0 ? prevUsed : 0
        const merged = { ...st, move_used_ft: Math.max(0, Math.floor(safePrev + movedFt)) }
        const { error: writeErr } = await supabase.from('characters').update({ action_state: merged }).eq('id', characterId)
        if (writeErr) logSupabaseError('Error updating action_state.move_used_ft:', writeErr)
      }
    }

    // success: permanent eraser reveal
    void revealAround({ x: tok.x, y: tok.y })
  }

  const handleMouseLeave = () => {
    if (isPanning) setIsPanning(false)
    setDragTokenId(null)
    dragStartTokenRef.current = null
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = -e.deltaY
    if (delta === 0) return

    const zoomFactor = delta > 0 ? 1.1 : 0.9
    const newZoom = clamp(zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM)
    if (newZoom === zoom) return

    const screen = getScreenPointFromWheel(e)
    const worldX = (screen.x - translate.x) / zoom
    const worldY = (screen.y - translate.y) / zoom

    setZoom(newZoom)
    setTranslate({ x: screen.x - worldX * newZoom, y: screen.y - worldY * newZoom })
  }

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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      <div className="relative inline-block" style={transformStyle}>
        <canvas ref={mapCanvasRef} className="block" />
        <canvas ref={tokenCanvasRef} className="pointer-events-none absolute left-0 top-0" />
        <canvas ref={fogCanvasRef} className="pointer-events-none absolute left-0 top-0" />
      </div>
    </div>
  )
}

export default MapBoardView
