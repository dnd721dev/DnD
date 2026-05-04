'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SESSION_GATES, type SessionStatus } from '@/lib/sessionGates';
import { supabase } from '@/lib/supabase';
import TokenHUD from '@/components/table/TokenHUD';
import { renderTilesToCanvas, type TileData } from '@/lib/tilemap';
import { CONDITION_RING_COLORS } from '@/components/table/InitiativeTracker';

type Token = {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string | null;
  hp?: number | null;
  current_hp?: number | null;
  ac?: number | null;
  type?: string | null;
  monster_id?: string | null;
  token_image_url?: string | null;
  character_id?: string | null;
};

type TriggerIcon = {
  id: string;
  tile_x: number;
  tile_y: number;
  name: string;
  trigger_type?: string | null;
  is_active: boolean;
};

type MapBoardProps = {
  encounterId: string;
  mapImageUrl?: string;
  tileData?: TileData | null;
  mapId?: string | null;
  gridSize?: number;
  highlightTokenId?: string;
  /** Wallets to write fog_reveals for when using GM fog tools */
  sessionPlayerWallets?: string[];
  /** Gates token dragging — GM can place/move tokens in setup, lobby, and active */
  sessionStatus?: SessionStatus | null;
};

type Point = { x: number; y: number };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

function keyTile(x: number, y: number) { return `${x}:${y}`; }

const MapBoard: React.FC<MapBoardProps> = ({
  encounterId,
  mapImageUrl,
  tileData,
  mapId,
  gridSize = 50,
  highlightTokenId,
  sessionPlayerWallets = [],
  sessionStatus,
}) => {
  // GM can place/move tokens in setup, lobby, and active; blocked only when completed/paused
  const canMoveTokens = !sessionStatus || SESSION_GATES.dmCanPlaceTokens(sessionStatus)
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tokenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  // Token portrait image cache
  const tokenImgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [tokenImgVersion, setTokenImgVersion] = useState(0);
  const [activeInitiativeName, setActiveInitiativeName] = useState<string | null>(null);
  const [tokenConditions, setTokenConditions] = useState<Record<string, string[]>>({});

  const [dragTokenId, setDragTokenId] = useState<string | null>(null);
  const downTokenIdRef = useRef<string | null>(null);
  const downTokenPosRef = useRef<{ x: number; y: number } | null>(null);

  const [hudTokenId, setHudTokenId] = useState<string | null>(null);
  const [hudPos, setHudPos] = useState<Point | null>(null);

  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<Point | null>(null);
  const panTranslateStartRef = useRef<Point | null>(null);

  // Measurement tool
  const [rulerActive, setRulerActive] = useState(false);
  const [measureStart, setMeasureStart] = useState<Point | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point | null>(null);
  const [measureFrozen, setMeasureFrozen] = useState(false);

  // Token placement mode — triggered by GM clicking "📍 Place" in InitiativeTracker
  type PlacementPayload = {
    label: string;
    hp: number | null;
    ac: number | null;
    ownerWallet: string | null;
    initiativeEntryId: string;
    characterId?: string | null;
    tokenImageUrl?: string | null;
  };
  const [placementPending, setPlacementPending] = useState<PlacementPayload | null>(null);
  const [ghostPos, setGhostPos] = useState<Point | null>(null);

  // Resistance / immunity tags — keyed by token ID, local session state
  const [tokenResistances, setTokenResistances] = useState<Record<string, string[]>>({});
  const [tokenImmunities, setTokenImmunities] = useState<Record<string, string[]>>({});

  // Fog of war GM tools
  const [fogToolActive, setFogToolActive] = useState(false);
  const [fogRevealSet, setFogRevealSet] = useState<Set<string>>(new Set());
  const [isRevealingAll, setIsRevealingAll] = useState(false);
  const isFogPaintingRef = useRef(false);

  // Multi-touch pinch-to-zoom tracking
  const activePointersRef   = useRef<Map<number, Point>>(new Map());
  const pinchStartDistRef   = useRef<number | null>(null);
  const pinchStartZoomRef   = useRef<number>(1);
  const pinchMidRef         = useRef<Point | null>(null);

  // Trigger placement mode
  const [triggerMode, setTriggerMode] = useState(false);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [mapTriggers, setMapTriggers] = useState<TriggerIcon[]>([]);

  const activeHudToken =
    hudTokenId ? tokens.find((t) => t.id === hudTokenId) ?? null : null;

  // Canvas dimensions — driven by image or tile data
  const canvasSize = useMemo(() => {
    if (tileData) return { width: tileData.cols * gridSize, height: tileData.rows * gridSize };
    if (img) return { width: img.width, height: img.height };
    return null;
  }, [tileData, img, gridSize]);

  /** Load map image (image maps only) */
  useEffect(() => {
    if (!mapImageUrl) { setImg(null); return; }
    const image = new Image();
    image.src = mapImageUrl;
    image.onload = () => setImg(image);
  }, [mapImageUrl]);

  /** Load union fog state for all players (GM overlay) + realtime sync */
  useEffect(() => {
    if (!fogToolActive) return;
    let mounted = true;

    async function loadFog() {
      let q = supabase
        .from('fog_reveals')
        .select('tile_x, tile_y')
        .eq('encounter_id', encounterId);
      if (mapId) q = q.eq('map_id', mapId);
      else q = q.is('map_id', null);
      const { data } = await q;
      if (!mounted) return;
      const s = new Set<string>();
      for (const r of (data ?? []) as { tile_x: number; tile_y: number }[]) {
        s.add(keyTile(r.tile_x, r.tile_y));
      }
      setFogRevealSet(s);
    }

    loadFog();

    const channel = supabase
      .channel(`gm-fog-${encounterId}-${mapId ?? 'nomap'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fog_reveals', filter: `encounter_id=eq.${encounterId}` }, loadFog)
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [fogToolActive, encounterId, mapId]);

  /** Listen for initiative highlight events (same-tab fast path) */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ name: string | null }>;
      setActiveInitiativeName(custom.detail?.name ?? null);
    };
    window.addEventListener('dnd721-active-initiative', handler);
    return () => window.removeEventListener('dnd721-active-initiative', handler);
  }, []);

  /** Listen for place-token requests from InitiativeTracker */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<PlacementPayload>;
      setPlacementPending(custom.detail ?? null);
      setGhostPos(null);
    };
    window.addEventListener('dnd721-place-token', handler);
    return () => window.removeEventListener('dnd721-place-token', handler);
  }, []);

  /** Enter trigger placement mode */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { setTriggerMode(true); setHoveredTile(null); };
    window.addEventListener('dnd721-place-trigger', handler);
    return () => window.removeEventListener('dnd721-place-trigger', handler);
  }, []);

  /** Cancel trigger placement mode from TriggersPanel */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => { setTriggerMode(false); setHoveredTile(null); };
    window.addEventListener('dnd721-trigger-placement-cancel', handler);
    return () => window.removeEventListener('dnd721-trigger-placement-cancel', handler);
  }, []);

  /** Receive updated trigger list from TriggersPanel */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<TriggerIcon[]>;
      setMapTriggers(custom.detail ?? []);
    };
    window.addEventListener('dnd721-triggers-updated', handler);
    return () => window.removeEventListener('dnd721-triggers-updated', handler);
  }, []);

  /** Sync condition rings from InitiativeTracker */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<Record<string, string[]>>;
      setTokenConditions(custom.detail ?? {});
    };
    window.addEventListener('dnd721-conditions-updated', handler);
    return () => window.removeEventListener('dnd721-conditions-updated', handler);
  }, []);

  /** Escape key cancels placement, ruler, or fog brush */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fogToolActive) { setFogToolActive(false); isFogPaintingRef.current = false; }
        if (triggerMode) { setTriggerMode(false); setHoveredTile(null); }
        if (placementPending) { setPlacementPending(null); setGhostPos(null); }
        if (rulerActive) { setRulerActive(false); setMeasureStart(null); setMeasureEnd(null); setMeasureFrozen(false); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fogToolActive, placementPending, rulerActive]);

  /** Subscribe to encounters.active_entry_id for cross-device reliability */
  useEffect(() => {
    let mounted = true;

    async function applyEntry(entryId: string | null) {
      if (!entryId) { setActiveInitiativeName(null); return; }
      const { data, error } = await supabase
        .from('initiative_entries')
        .select('name')
        .eq('id', entryId)
        .maybeSingle();
      if (!mounted || error) return;
      setActiveInitiativeName(data?.name ?? null);
    }

    async function load() {
      const { data, error } = await supabase
        .from('encounters')
        .select('active_entry_id')
        .eq('id', encounterId)
        .maybeSingle();
      if (!mounted || error) return;
      await applyEntry((data as any)?.active_entry_id ?? null);
    }

    load();

    const channel = supabase
      .channel(`gm-encounter-turn-${encounterId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'encounters', filter: `id=eq.${encounterId}` },
        (payload) => {
          const rec = (payload as any).new as { active_entry_id?: string | null };
          applyEntry(rec?.active_entry_id ?? null);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [encounterId]);

  /** Load tokens + subscribe to DB updates */
  useEffect(() => {
    let isMounted = true;

    async function loadTokens() {
      let query = supabase
        .from('tokens')
        .select('id, label, x, y, color, hp, ac, current_hp, type, monster_id, token_image_url, character_id, conditions, resistances, immunities')
        .eq('encounter_id', encounterId);

      // GM free view: show tokens for current map + tokens with no map (PC tokens)
      if (mapId) {
        query = query.or(`map_id.eq.${mapId},map_id.is.null`);
      }

      const { data, error } = await query;

      if (!isMounted) return;
      if (error) return console.error('Error loading tokens:', error);

      setTokens(
        data.map((t: any) => ({
          id: t.id,
          label: t.label,
          x: t.x,
          y: t.y,
          color: t.color,
          hp: t.hp,
          ac: t.ac,
          current_hp: t.current_hp,
          type: t.type,
          monster_id: t.monster_id,
          token_image_url: t.token_image_url,
          character_id: t.character_id ?? null,
        }))
      );

      // HIGH-1: Seed condition rings from DB (persisted conditions survive refresh)
      const dbConditions: Record<string, string[]> = {};
      const dbResistances: Record<string, string[]> = {};
      const dbImmunities: Record<string, string[]> = {};
      for (const t of data as any[]) {
        if (t.conditions?.length)  dbConditions[t.id]  = t.conditions;
        if (t.resistances?.length) dbResistances[t.id] = t.resistances;
        if (t.immunities?.length)  dbImmunities[t.id]  = t.immunities;
      }
      setTokenConditions(prev => ({ ...dbConditions, ...prev }));
      setTokenResistances(prev => ({ ...dbResistances, ...prev }));
      setTokenImmunities(prev => ({ ...dbImmunities, ...prev }));
    }

    loadTokens();

    const channel = supabase
      .channel(`tokens-${encounterId}-${mapId ?? 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens', filter: `encounter_id=eq.${encounterId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = payload.new as any;
            // Apply same map filter as loadTokens: allow tokens with no map_id, or matching mapId
            if (t.map_id !== null && t.map_id !== undefined && t.map_id !== mapId) return;
            setTokens((prev) => [
              ...prev,
              { id: t.id, label: t.label, x: t.x, y: t.y, color: t.color,
                hp: t.hp, ac: t.ac, current_hp: t.current_hp, type: t.type, monster_id: t.monster_id,
                token_image_url: t.token_image_url, character_id: t.character_id ?? null },
            ]);
            if (t.conditions?.length)  setTokenConditions(p => ({ ...p, [t.id]: t.conditions }));
            if (t.resistances?.length) setTokenResistances(p => ({ ...p, [t.id]: t.resistances }));
            if (t.immunities?.length)  setTokenImmunities(p => ({ ...p, [t.id]: t.immunities }));
          } else if (payload.eventType === 'UPDATE') {
            const t = payload.new as any;
            setTokens((prev) =>
              prev.map((tok) =>
                tok.id === t.id
                  ? { ...tok, label: t.label, x: t.x, y: t.y, color: t.color,
                      hp: t.hp, ac: t.ac, current_hp: t.current_hp, type: t.type, monster_id: t.monster_id,
                      token_image_url: t.token_image_url, character_id: t.character_id ?? tok.character_id ?? null }
                  : tok
              )
            );
            // Sync conditions/resistances/immunities from DB update
            setTokenConditions(p => ({ ...p, [t.id]: t.conditions ?? [] }));
            setTokenResistances(p => ({ ...p, [t.id]: t.resistances ?? [] }));
            setTokenImmunities(p => ({ ...p, [t.id]: t.immunities ?? [] }));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id: string };
            setTokens((prev) => prev.filter((tok) => tok.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [encounterId, mapId]);

  /** Draw map + grid */
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (!tileData && !img) return;

    if (tileData) {
      canvas.width = tileData.cols * gridSize;
      canvas.height = tileData.rows * gridSize;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderTilesToCanvas(ctx, tileData, gridSize);
      return;
    }

    if (img) {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(148,163,184,0.3)';
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    }
  }, [img, tileData, gridSize]);

  /** Pre-load token portrait images */
  useEffect(() => {
    const cache = tokenImgCacheRef.current;
    tokens.forEach(t => {
      const url = t.token_image_url;
      if (!url || cache.has(url)) return;
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => { cache.set(url, im); setTokenImgVersion(v => v + 1); };
      im.onerror = () => cache.set(url, new Image());
      im.src = url;
    });
  }, [tokens]);

  /** Draw tokens */
  useEffect(() => {
    const canvas = tokenCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !canvasSize) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    tokens.forEach((t) => {
      const r = gridSize * 0.35;
      const ringLw = Math.max(2, gridSize * 0.07);
      const conditions = tokenConditions[t.id] ?? [];

      // Draw condition rings outward from the token (outermost first so innermost is on top)
      if (conditions.length > 0) {
        ctx.save();
        [...conditions].reverse().forEach((cond, revIdx) => {
          const idx = conditions.length - 1 - revIdx;
          const ringR = r + ringLw * 0.5 + idx * (ringLw + 2);
          const ringColor = CONDITION_RING_COLORS[cond] ?? '#94a3b8';
          ctx.beginPath();
          ctx.lineWidth = ringLw;
          ctx.strokeStyle = ringColor;
          ctx.shadowColor = ringColor;
          ctx.shadowBlur = ringLw * 2;
          ctx.arc(t.x, t.y, ringR, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.restore();
      }

      ctx.beginPath();
      ctx.fillStyle = t.color || '#111827';
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();

      const isHighlighted =
        (highlightTokenId && t.id === highlightTokenId) ||
        (activeInitiativeName && t.label === activeInitiativeName);

      if (isHighlighted) {
        const lw = Math.max(3, gridSize * 0.12);
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = lw;
        ctx.strokeStyle = 'rgba(16,185,129,0.9)';
        ctx.shadowColor = 'rgba(16,185,129,0.6)';
        ctx.shadowBlur = Math.max(8, gridSize * 0.3);
        ctx.arc(t.x, t.y, r + lw * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Portrait image if available, otherwise text label
      const tokenImg = t.token_image_url ? tokenImgCacheRef.current.get(t.token_image_url) : undefined;
      if (tokenImg && tokenImg.complete && tokenImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(tokenImg, t.x - r, t.y - r, r * 2, r * 2);
        ctx.restore();
      } else {
        ctx.font = `${Math.max(12, gridSize * 0.35)}px system-ui, sans-serif`;
        ctx.fillStyle = '#e5e7eb';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.label || 'T', t.x, t.y);
      }

      // Resistance / immunity indicator dots (bottom-right of token)
      const resists = tokenResistances[t.id] ?? [];
      const immunes = tokenImmunities[t.id] ?? [];
      if (resists.length > 0 || immunes.length > 0) {
        const dotR = Math.max(4, gridSize * 0.08);
        const dotX = t.x + r * 0.72;
        const dotY = t.y + r * 0.72;
        if (immunes.length > 0) {
          ctx.beginPath();
          ctx.fillStyle = '#a855f7'; // purple for immunity
          ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
          ctx.fill();
        } else if (resists.length > 0) {
          ctx.beginPath();
          ctx.fillStyle = '#3b82f6'; // blue for resistance
          ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    // Draw trigger icons in the top-left corner of each trigger tile (GM only)
    mapTriggers.forEach((trigger) => {
      const iconX = trigger.tile_x * gridSize + gridSize * 0.18;
      const iconY = trigger.tile_y * gridSize + gridSize * 0.18;
      const iconR = Math.max(5, gridSize * 0.14);
      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = trigger.is_active ? 'rgba(239,68,68,0.9)' : 'rgba(100,116,139,0.6)';
      ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `bold ${Math.max(8, Math.floor(gridSize * 0.15))}px system-ui,sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', iconX, iconY);
      ctx.restore();
    });
  }, [tokens, canvasSize, gridSize, highlightTokenId, activeInitiativeName, tokenConditions, tokenResistances, tokenImmunities, mapTriggers, tokenImgVersion]);

  /** Draw fog overlay (GM view: dark = unrevealed, slight green tint = revealed) */
  useEffect(() => {
    const canvas = fogCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !canvasSize) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!fogToolActive) return;

    const cols = Math.ceil(canvasSize.width / gridSize);
    const rows = Math.ceil(canvasSize.height / gridSize);

    for (let tx = 0; tx < cols; tx++) {
      for (let ty = 0; ty < rows; ty++) {
        const px = tx * gridSize;
        const py = ty * gridSize;
        if (fogRevealSet.has(keyTile(tx, ty))) {
          ctx.fillStyle = 'rgba(74,222,128,0.12)';
        } else {
          ctx.fillStyle = 'rgba(2,6,23,0.6)';
        }
        ctx.fillRect(px, py, gridSize, gridSize);
      }
    }
  }, [fogToolActive, canvasSize, gridSize, fogRevealSet]);

  /** Paint a single tile for all players and update local set */
  const paintFogAt = async (world: Point) => {
    if (sessionPlayerWallets.length === 0) return;
    const tx = Math.floor(world.x / gridSize);
    const ty = Math.floor(world.y / gridSize);
    const k = keyTile(tx, ty);
    if (fogRevealSet.has(k)) return;

    setFogRevealSet((prev) => { const next = new Set(prev); next.add(k); return next; });

    const rows = sessionPlayerWallets.map((w) => ({
      encounter_id: encounterId,
      viewer_wallet: w.toLowerCase(),
      map_id: mapId ?? null,
      tile_x: tx,
      tile_y: ty,
    }));
    const { error } = await supabase.from('fog_reveals').upsert(rows, { ignoreDuplicates: true });
    if (error) console.error('fog paint failed:', error);
  };

  /** Reveal every tile on the current map for all players */
  const handleRevealAll = async () => {
    if (!canvasSize) return;
    if (!window.confirm('Reveal entire map for all players?')) return;
    setIsRevealingAll(true);
    try {
      const cols = Math.ceil(canvasSize.width / gridSize);
      const rows = Math.ceil(canvasSize.height / gridSize);
      const allRows: { encounter_id: string; viewer_wallet: string; map_id: string | null; tile_x: number; tile_y: number }[] = [];
      const nextSet = new Set<string>();
      for (let tx = 0; tx < cols; tx++) {
        for (let ty = 0; ty < rows; ty++) {
          nextSet.add(keyTile(tx, ty));
          for (const w of sessionPlayerWallets) {
            allRows.push({ encounter_id: encounterId, viewer_wallet: w.toLowerCase(), map_id: mapId ?? null, tile_x: tx, tile_y: ty });
          }
        }
      }
      setFogRevealSet(nextSet);
      // Upsert in batches of 500 to avoid request size limits
      for (let i = 0; i < allRows.length; i += 500) {
        const { error } = await supabase.from('fog_reveals').upsert(allRows.slice(i, i + 500), { ignoreDuplicates: true });
        if (error) { console.error('reveal all failed:', error); break; }
      }
    } finally {
      setIsRevealingAll(false);
    }
  };

  /** Delete all fog reveals for this encounter/map */
  const handleResetFog = async () => {
    if (!window.confirm('Reset all fog of war? This cannot be undone.')) return;
    let q = supabase.from('fog_reveals').delete().eq('encounter_id', encounterId);
    if (mapId) q = (q as any).eq('map_id', mapId);
    else q = (q as any).is('map_id', null);
    const { error } = await q;
    if (error) console.error('reset fog failed:', error);
    else setFogRevealSet(new Set());
  };

  /** Math helpers — accept any event with clientX/clientY (mouse, pointer, wheel) */
  const getScreenPoint = (e: { clientX: number; clientY: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getWorldPoint = (e: { clientX: number; clientY: number }) => {
    const p = getScreenPoint(e);
    return { x: (p.x - translate.x) / zoom, y: (p.y - translate.y) / zoom };
  };

  // Snap to the CENTER of whichever grid tile the coordinate falls in, not the
  // grid-line intersection.  Corner-snap (Math.round * gridSize) puts tokens on
  // the boundary between two tiles; when the token is near x=0 the fog-reveal
  // circle extends from –rTiles to +rTiles, but negative-x tiles are off-screen,
  // so only the right half of the circle is visible — "clears the left half".
  // Tile-center snap ensures the reveal is always symmetric around the token.
  const snap = (v: number) => Math.floor(v / gridSize) * gridSize + gridSize / 2;

  /** HUD positioning */
  const updateHudPosition = (token: Token | null) => {
    if (!token) return setHudPos(null);
    setHudPos({ x: translate.x + token.x * zoom, y: translate.y + token.y * zoom - 72 * zoom });
  };

  useEffect(() => {
    if (!hudTokenId) return setHudPos(null);
    const tok = tokens.find((t) => t.id === hudTokenId) ?? null;
    updateHudPosition(tok);
  }, [hudTokenId, tokens, zoom, translate]);

  /** Pointer events — handles mouse, touch, and stylus uniformly */
  const onDown = (e: React.PointerEvent) => {
    // Capture so pointermove / pointerup fire even when pointer leaves the element
    e.currentTarget.setPointerCapture(e.pointerId);

    // Track all active pointers
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger pinch: snapshot zoom state and bail — no other mode should start
    if (activePointersRef.current.size >= 2) {
      const pts = Array.from(activePointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      pinchStartZoomRef.current = zoom;
      pinchMidRef.current = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      isFogPaintingRef.current = false;
      setIsPanning(false);
      setDragTokenId(null);
      return;
    }

    // Skip non-primary pointer buttons on mouse (right-click, middle-click)
    if (e.button !== 0) return;

    // Trigger placement mode — click/tap a tile to place or edit a trigger
    if (triggerMode) {
      const world = getWorldPoint(e);
      const tileX = Math.floor(world.x / gridSize);
      const tileY = Math.floor(world.y / gridSize);
      const existing = mapTriggers.find((t) => t.tile_x === tileX && t.tile_y === tileY);
      if (existing) {
        window.dispatchEvent(new CustomEvent('dnd721-trigger-edit', { detail: { trigger: existing } }));
      } else {
        window.dispatchEvent(new CustomEvent('dnd721-trigger-tile-selected', { detail: { tileX, tileY } }));
      }
      setTriggerMode(false);
      setHoveredTile(null);
      return;
    }

    // Fog brush mode
    if (fogToolActive) {
      isFogPaintingRef.current = true;
      void paintFogAt(getWorldPoint(e));
      return;
    }

    // Ruler mode
    if (rulerActive) {
      const world = getWorldPoint(e);
      if (measureFrozen || !measureStart) {
        setMeasureStart(world);
        setMeasureEnd(null);
        setMeasureFrozen(false);
      }
      return;
    }

    // Placement mode: drop token at click position
    if (placementPending) {
      const world = getWorldPoint(e);
      const x = snap(world.x);
      const y = snap(world.y);
      const payload = placementPending;
      setPlacementPending(null);
      setGhostPos(null);

      supabase.from('tokens').insert({
        encounter_id:    encounterId,
        type:            'pc',
        label:           payload.label,
        x,
        y,
        owner_wallet:    payload.ownerWallet,
        hp:              payload.hp,
        current_hp:      payload.hp,
        ac:              payload.ac,
        map_id:          mapId ?? null,
        character_id:    payload.characterId    ?? null,
        token_image_url: payload.tokenImageUrl  ?? null,
      }).then(async ({ data, error }) => {
        if (error) { console.error('Failed to place PC token', error); return; }

        // Fetch the newly-inserted token's ID (needed for initiative entry linking)
        const { data: tokenRow } = await supabase
          .from('tokens')
          .select('id')
          .eq('encounter_id', encounterId)
          .eq('label', payload.label)
          .eq('owner_wallet', payload.ownerWallet)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const newTokenId = tokenRow?.id ?? null;

        if (payload.initiativeEntryId) {
          // Placement came from InitiativeTracker — link the token to the existing entry
          if (newTokenId) {
            await supabase
              .from('initiative_entries')
              .update({ token_id: newTokenId })
              .eq('id', payload.initiativeEntryId);
          }
        } else if (payload.ownerWallet) {
          // Bug 3: placement came from PlaceCharactersPanel — auto-create/update the
          // initiative entry so the player appears in the tracker without manual GM work.
          const { data: existingEntry } = await supabase
            .from('initiative_entries')
            .select('id')
            .eq('encounter_id', encounterId)
            .eq('wallet_address', payload.ownerWallet)
            .maybeSingle();

          if (existingEntry) {
            // Entry already exists — just link the new token
            if (newTokenId) {
              await supabase
                .from('initiative_entries')
                .update({ token_id: newTokenId })
                .eq('id', existingEntry.id);
            }
          } else {
            // No entry yet — create one (init = 0, GM or player will roll later)
            await supabase.from('initiative_entries').insert({
              encounter_id:  encounterId,
              name:          payload.label,
              init:          0,
              hp:            payload.hp,
              is_pc:         true,
              character_id:  payload.characterId ?? null,
              token_id:      newTokenId,
              wallet_address: payload.ownerWallet,
            });
          }
        }

        // Realtime subscription in MapBoardView will pick up the new token and
        // trigger revealAround automatically — no window event needed.
        window.dispatchEvent(new CustomEvent('dnd721-tokens-updated', { detail: { source: 'gm-place' } }));
      });
      return;
    }

    const world = getWorldPoint(e);
    const hit = tokens.find((t) => Math.hypot(t.x - world.x, t.y - world.y) < gridSize * 0.5);

    if (hit && canMoveTokens) {
      setDragTokenId(hit.id);
      downTokenIdRef.current = hit.id;
      downTokenPosRef.current = { x: hit.x, y: hit.y };
      setIsPanning(false);
    } else {
      const screen = getScreenPoint(e);
      panStartRef.current = screen;
      panTranslateStartRef.current = { ...translate };
      downTokenIdRef.current = null;
      downTokenPosRef.current = null;
      setIsPanning(true);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    // Update position for this pointer
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Two-finger pinch zoom
    if (activePointersRef.current.size >= 2 && pinchStartDistRef.current !== null) {
      const pts = Array.from(activePointersRef.current.values());
      const newDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM,
        pinchStartZoomRef.current * (newDist / pinchStartDistRef.current)));
      if (newZoom !== zoom && pinchMidRef.current) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const midX = pinchMidRef.current.x - rect.left;
          const midY = pinchMidRef.current.y - rect.top;
          const worldX = (midX - translate.x) / zoom;
          const worldY = (midY - translate.y) / zoom;
          setZoom(newZoom);
          setTranslate({ x: midX - worldX * newZoom, y: midY - worldY * newZoom });
        }
      }
      return;
    }

    // In trigger mode, track which tile the cursor is over for the highlight overlay
    if (triggerMode) {
      const world = getWorldPoint(e);
      setHoveredTile({ x: Math.floor(world.x / gridSize), y: Math.floor(world.y / gridSize) });
      return;
    }

    if (fogToolActive && isFogPaintingRef.current) {
      void paintFogAt(getWorldPoint(e));
      return;
    }

    if (rulerActive && measureStart && !measureFrozen) {
      setMeasureEnd(getWorldPoint(e));
    }

    if (placementPending) {
      const screen = getScreenPoint(e);
      setGhostPos(screen);
    }

    if (isPanning && panStartRef.current && panTranslateStartRef.current) {
      const screen = getScreenPoint(e);
      setTranslate({
        x: panTranslateStartRef.current.x + (screen.x - panStartRef.current.x),
        y: panTranslateStartRef.current.y + (screen.y - panStartRef.current.y),
      });
      return;
    }

    if (dragTokenId) {
      const world = getWorldPoint(e);
      setTokens((prev) =>
        prev.map((t) => (t.id === dragTokenId ? { ...t, x: snap(world.x), y: snap(world.y) } : t))
      );
    }
  };

  const onUp = async (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchStartDistRef.current = null;
    if (fogToolActive) { isFogPaintingRef.current = false; return; }
    if (rulerActive && measureStart && measureEnd) {
      setMeasureFrozen(true);
      return;
    }
    if (isPanning) setIsPanning(false);
    if (!dragTokenId) return;

    const t = tokens.find((tok) => tok.id === dragTokenId);
    setDragTokenId(null);

    const downId = downTokenIdRef.current;
    const downPos = downTokenPosRef.current;
    downTokenIdRef.current = null;
    downTokenPosRef.current = null;

    if (t && downId && t.id === downId && downPos && t.x === downPos.x && t.y === downPos.y) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dnd721-target-selected', { detail: { token: t } }));
      }
    }

    if (!t) return;
    await supabase.from('tokens').update({ x: t.x, y: t.y }).eq('id', t.id);

    // HIGH-4: Dispatch token-moved so TableClient trigger detection fires for GM moves too.
    const tileX = Math.floor(t.x / gridSize);
    const tileY = Math.floor(t.y / gridSize);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dnd721-token-moved', {
        detail: { tokenId: t.id, tileX, tileY, mapId: mapId ?? null, encounterId },
      }));
    }
  };

  const onLeave = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchStartDistRef.current = null;
    isFogPaintingRef.current = false;
    // With pointer capture, pointerup is the authoritative cleanup.
    // Only clear pan/drag if no pointers remain at all.
    if (activePointersRef.current.size === 0) {
      setIsPanning(false);
      setDragTokenId(null);
    }
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const world = getWorldPoint(e);
    const hit = tokens.find((t) => Math.hypot(t.x - world.x, t.y - world.y) < gridSize * 0.5);
    if (!hit) { setHudTokenId(null); return; }
    setHudTokenId(hit.id);
    updateHudPosition(hit);
    window.dispatchEvent(new CustomEvent('dnd721-open-monster', { detail: { token: hit } }));
  };

  /** Mouse wheel zoom */
  const onWheel = (e: React.WheelEvent) => {
    const delta = -e.deltaY;
    if (delta === 0) return;
    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * zoomFactor));
    if (newZoom === zoom) return;
    const screen = getScreenPoint(e);
    const worldX = (screen.x - translate.x) / zoom;
    const worldY = (screen.y - translate.y) / zoom;
    setZoom(newZoom);
    setTranslate({ x: screen.x - worldX * newZoom, y: screen.y - worldY * newZoom });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  const onHudClose = () => setHudTokenId(null);

  const onHudHP = async (amount: number) => {
    if (!hudTokenId) return;
    const tok = tokens.find((t) => t.id === hudTokenId);
    if (!tok) return;
    const newHp = (tok.current_hp ?? tok.hp ?? 0) + amount;
    setTokens((prev) => prev.map((t) => (t.id === hudTokenId ? { ...t, current_hp: newHp } : t)));
    await supabase.from('tokens').update({ current_hp: newHp }).eq('id', hudTokenId);
    // MED-5: Keep characters.hit_points_current in sync for PC tokens
    if (tok.character_id) {
      await supabase.from('characters').update({ hit_points_current: newHp }).eq('id', tok.character_id);
    }
  };

  const onHudDelete = async () => {
    if (!hudTokenId) return;
    const id = hudTokenId;
    setTokens((p) => p.filter((t) => t.id !== id));
    setHudTokenId(null);
    await supabase.from('tokens').delete().eq('id', id);
  };

  const transformStyle = {
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
    transformOrigin: 'top left' as const,
  };

  // Ruler overlay: convert world coords to screen coords for the SVG
  const rulerScreenStart = measureStart
    ? { x: measureStart.x * zoom + translate.x, y: measureStart.y * zoom + translate.y }
    : null;
  const rulerScreenEnd = measureEnd
    ? { x: measureEnd.x * zoom + translate.x, y: measureEnd.y * zoom + translate.y }
    : null;
  const rulerDistFt = (measureStart && measureEnd)
    ? Math.round(Math.hypot(measureEnd.x - measureStart.x, measureEnd.y - measureStart.y) / gridSize * 5)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden overscroll-none rounded-xl border border-slate-800 bg-slate-950/80"
      style={{
        cursor: fogToolActive ? 'cell' : triggerMode ? 'crosshair' : rulerActive ? 'crosshair' : placementPending ? 'crosshair' : undefined,
        touchAction: 'none',
      }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onLeave}
      onPointerCancel={onLeave}
      onContextMenu={onContextMenu}
      onWheel={onWheel}
    >
      <div className="relative inline-block" style={transformStyle}>
        <canvas ref={mapCanvasRef} className="block" />
        <canvas ref={tokenCanvasRef} className="pointer-events-none absolute left-0 top-0" />
        <canvas ref={fogCanvasRef} className="pointer-events-none absolute left-0 top-0" />
      </div>

      {/* Ghost token during placement mode */}
      {placementPending && ghostPos && (
        <div
          className="pointer-events-none absolute flex items-center justify-center rounded-full border-2 border-sky-400 bg-sky-500/30 text-[11px] font-bold text-sky-100"
          style={{
            width: gridSize * 0.7 * zoom,
            height: gridSize * 0.7 * zoom,
            left: ghostPos.x - (gridSize * 0.35 * zoom),
            top: ghostPos.y - (gridSize * 0.35 * zoom),
          }}
        >
          {placementPending.label.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* Toolbar: Ruler + Fog tools */}
      <div className="pointer-events-auto absolute right-3 top-3 z-10 flex flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={() => {
            const next = !rulerActive;
            setRulerActive(next);
            if (!next) { setMeasureStart(null); setMeasureEnd(null); setMeasureFrozen(false); }
          }}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold shadow transition ${
            rulerActive
              ? 'border-amber-500/80 bg-amber-950/90 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
              : 'border-slate-700/60 bg-slate-950/80 text-slate-300 hover:border-slate-500'
          }`}
          title="Ruler — click to measure distance (Esc to cancel)"
        >
          📏 Ruler
        </button>

        <button
          type="button"
          onClick={() => setFogToolActive((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold shadow transition ${
            fogToolActive
              ? 'border-sky-500/80 bg-sky-950/90 text-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
              : 'border-slate-700/60 bg-slate-950/80 text-slate-300 hover:border-slate-500'
          }`}
          title="Fog Brush — click/drag to reveal tiles for players"
        >
          🌫 Fog Brush
        </button>
        <button
          type="button"
          onClick={handleRevealAll}
          disabled={!canvasSize || isRevealingAll}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 shadow transition hover:border-emerald-500/60 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          title="Reveal entire map for all players"
        >
          {isRevealingAll ? '⏳ Revealing…' : '👁 Reveal All'}
        </button>
        <button
          type="button"
          onClick={handleResetFog}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-950/80 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 shadow transition hover:border-red-500/60 hover:text-red-300"
          title="Re-fog the entire map for all players"
        >
          🚫 Reset Fog
        </button>
      </div>

      {/* Ruler SVG overlay */}
      {rulerActive && rulerScreenStart && rulerScreenEnd && (
        <svg
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          style={{ overflow: 'visible' }}
        >
          <line
            x1={rulerScreenStart.x} y1={rulerScreenStart.y}
            x2={rulerScreenEnd.x}   y2={rulerScreenEnd.y}
            stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3"
            strokeLinecap="round"
          />
          {/* Start dot */}
          <circle cx={rulerScreenStart.x} cy={rulerScreenStart.y} r="5" fill="#f59e0b" />
          {/* End dot */}
          <circle cx={rulerScreenEnd.x} cy={rulerScreenEnd.y} r="5" fill="#f59e0b" />
          {/* Distance label at midpoint */}
          {rulerDistFt !== null && (() => {
            const mx = (rulerScreenStart.x + rulerScreenEnd.x) / 2;
            const my = (rulerScreenStart.y + rulerScreenEnd.y) / 2 - 14;
            return (
              <>
                <rect x={mx - 28} y={my - 10} width={56} height={18} rx={4} fill="rgba(15,15,20,0.85)" />
                <text x={mx} y={my + 4} textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {rulerDistFt} ft
                </text>
              </>
            );
          })()}
        </svg>
      )}
      {/* Ruler start dot when no end yet */}
      {rulerActive && rulerScreenStart && !rulerScreenEnd && (
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" style={{ overflow: 'visible' }}>
          <circle cx={rulerScreenStart.x} cy={rulerScreenStart.y} r="5" fill="#f59e0b" />
        </svg>
      )}

      {/* Trigger placement hover highlight */}
      {triggerMode && hoveredTile && (
        <div
          className="pointer-events-none absolute border-2 border-orange-500 bg-orange-500/20"
          style={{
            left:   translate.x + hoveredTile.x * gridSize * zoom,
            top:    translate.y + hoveredTile.y * gridSize * zoom,
            width:  gridSize * zoom,
            height: gridSize * zoom,
          }}
        />
      )}

      {/* Trigger placement mode banner */}
      {triggerMode && (
        <div className="pointer-events-auto absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-orange-600/60 bg-slate-950/90 px-3 py-1.5 text-xs text-orange-200 shadow-lg">
          <span>☠ Tap a tile to place a trigger</span>
          <button
            type="button"
            onClick={() => { setTriggerMode(false); setHoveredTile(null); }}
            className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Placement mode banner */}
      {placementPending && (
        <div className="pointer-events-auto absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-sky-600/60 bg-slate-950/90 px-3 py-1.5 text-xs text-sky-200 shadow-lg">
          <span>Tap to place <strong>{placementPending.label}</strong></span>
          <button
            type="button"
            onClick={() => { setPlacementPending(null); setGhostPos(null); }}
            className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700"
          >
            Cancel (Esc)
          </button>
        </div>
      )}

      {/* Fog brush active banner */}
      {fogToolActive && (
        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-lg border border-sky-600/60 bg-slate-950/90 px-3 py-1.5 text-xs text-sky-200 shadow-lg">
          🌫 Fog Brush active — click and drag to reveal tiles (Esc to cancel)
        </div>
      )}

      {hudPos && activeHudToken && (
        <TokenHUD
          x={hudPos.x}
          y={hudPos.y}
          hp={activeHudToken.current_hp ?? activeHudToken.hp ?? null}
          ac={activeHudToken.ac ?? null}
          label={activeHudToken.label}
          onClose={onHudClose}
          onHPChange={onHudHP}
          onDelete={onHudDelete}
          resistances={tokenResistances[activeHudToken.id] ?? []}
          immunities={tokenImmunities[activeHudToken.id] ?? []}
          onAddResistance={(type) => {
            const next = [...(tokenResistances[activeHudToken.id] ?? []), type]
            setTokenResistances(prev => ({ ...prev, [activeHudToken.id]: next }))
            supabase.from('tokens').update({ resistances: next }).eq('id', activeHudToken.id)
              .then(({ error }) => { if (error) console.error('[tokens] resistances persist error', error) })
          }}
          onRemoveResistance={(type) => {
            const next = (tokenResistances[activeHudToken.id] ?? []).filter(r => r !== type)
            setTokenResistances(prev => ({ ...prev, [activeHudToken.id]: next }))
            supabase.from('tokens').update({ resistances: next }).eq('id', activeHudToken.id)
              .then(({ error }) => { if (error) console.error('[tokens] resistances persist error', error) })
          }}
          onAddImmunity={(type) => {
            const next = [...(tokenImmunities[activeHudToken.id] ?? []), type]
            setTokenImmunities(prev => ({ ...prev, [activeHudToken.id]: next }))
            supabase.from('tokens').update({ immunities: next }).eq('id', activeHudToken.id)
              .then(({ error }) => { if (error) console.error('[tokens] immunities persist error', error) })
          }}
          onRemoveImmunity={(type) => {
            const next = (tokenImmunities[activeHudToken.id] ?? []).filter(r => r !== type)
            setTokenImmunities(prev => ({ ...prev, [activeHudToken.id]: next }))
            supabase.from('tokens').update({ immunities: next }).eq('id', activeHudToken.id)
              .then(({ error }) => { if (error) console.error('[tokens] immunities persist error', error) })
          }}
        />
      )}
    </div>
  );
};

export default MapBoard;
