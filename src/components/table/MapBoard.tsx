'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TokenHUD from '@/components/table/TokenHUD';

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
};

type MapBoardProps = {
  encounterId: string;
  mapImageUrl: string;
  gridSize?: number;
  highlightTokenId?: string;
};

type Point = { x: number; y: number };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const MapBoard: React.FC<MapBoardProps> = ({
  encounterId,
  mapImageUrl,
  gridSize = 50,
  highlightTokenId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tokenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [activeInitiativeName, setActiveInitiativeName] = useState<string | null>(null);

  const [dragTokenId, setDragTokenId] = useState<string | null>(null);

  const [hudTokenId, setHudTokenId] = useState<string | null>(null);
  const [hudPos, setHudPos] = useState<Point | null>(null);

  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<Point | null>(null);
  const panTranslateStartRef = useRef<Point | null>(null);

  const activeHudToken =
    hudTokenId ? tokens.find((t) => t.id === hudTokenId) ?? null : null;

  /** Load map image */
  useEffect(() => {
    if (!mapImageUrl) return;
    const image = new Image();
    image.src = mapImageUrl;
    image.onload = () => setImg(image);
  }, [mapImageUrl]);

  /** Listen for initiative highlight events */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ name: string | null }>;
      setActiveInitiativeName(custom.detail?.name ?? null);
    };

    window.addEventListener('dnd721-active-initiative', handler);
    return () => window.removeEventListener('dnd721-active-initiative', handler);
  }, []);

  /** Load tokens + subscribe to DB updates */
  useEffect(() => {
    let isMounted = true;

    async function loadTokens() {
      const { data, error } = await supabase
        .from('tokens')
        .select('id, label, x, y, color, hp, ac, current_hp, type, monster_id')
        .eq('encounter_id', encounterId);

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
        }))
      );
    }

    loadTokens();

    const channel = supabase
      .channel(`tokens-${encounterId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens', filter: `encounter_id=eq.${encounterId}` },
        loadTokens
      )
      .subscribe();

    window.addEventListener('dnd721-tokens-updated', loadTokens);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('dnd721-tokens-updated', loadTokens);
    };
  }, [encounterId]);

  /** Draw map + grid */
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(148,163,184,0.3)';

    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }, [img, gridSize]);

  /** Draw tokens */
  useEffect(() => {
    const canvas = tokenCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    tokens.forEach((t) => {
      const r = gridSize * 0.35;

      // Token circle
      ctx.beginPath();
      ctx.fillStyle = t.color || '#111827';
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Initiative/GM highlight
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

      // Label text
      ctx.font = `${Math.max(12, gridSize * 0.35)}px system-ui, sans-serif`;
      ctx.fillStyle = '#e5e7eb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label || 'T', t.x, t.y);
    });
  }, [tokens, img, gridSize, highlightTokenId, activeInitiativeName]);

  /** Math helpers */
  const getScreenPoint = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getWorldPoint = (e: React.MouseEvent) => {
    const p = getScreenPoint(e);
    return {
      x: (p.x - translate.x) / zoom,
      y: (p.y - translate.y) / zoom,
    };
  };

  const snap = (v: number) => Math.round(v / gridSize) * gridSize;

  /** HUD positioning */
  const updateHudPosition = (token: Token | null) => {
    if (!token) return setHudPos(null);
    setHudPos({
      x: translate.x + token.x * zoom,
      y: translate.y + token.y * zoom - 72,
    });
  };

  useEffect(() => {
    if (!hudTokenId) return setHudPos(null);
    const tok = tokens.find((t) => t.id === hudTokenId) ?? null;
    updateHudPosition(tok);
  }, [hudTokenId, tokens, zoom, translate]);

  /** Mouse events */
  const onDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const world = getWorldPoint(e);
    const hit = tokens.find((t) => Math.hypot(t.x - world.x, t.y - world.y) < gridSize * 0.5);

    if (hit) {
      setDragTokenId(hit.id);
      setIsPanning(false);
    } else {
      const screen = getScreenPoint(e);
      panStartRef.current = screen;
      panTranslateStartRef.current = { ...translate };
      setIsPanning(true);
    }
  };

  const onMove = (e: React.MouseEvent) => {
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

  const onUp = async () => {
    if (isPanning) setIsPanning(false);
    if (!dragTokenId) return;

    const t = tokens.find((tok) => tok.id === dragTokenId);
    setDragTokenId(null);
    if (!t) return;

    await supabase.from('tokens').update({ x: t.x, y: t.y }).eq('id', t.id);
  };

  const onLeave = () => {
    setIsPanning(false);
    setDragTokenId(null);
  };

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const world = getWorldPoint(e);
    const hit = tokens.find((t) => Math.hypot(t.x - world.x, t.y - world.y) < gridSize * 0.5);

    if (!hit) {
      setHudTokenId(null);
      return;
    }

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
    setTranslate({
      x: screen.x - worldX * newZoom,
      y: screen.y - worldY * newZoom,
    });
  };

  /** Prevent page scroll on wheel */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', prevent, { passive: false });
    return () => el.removeEventListener('wheel', prevent);
  }, []);

  /** HUD handlers */
  const onHudClose = () => setHudTokenId(null);

  const onHudHP = async (amount: number) => {
    if (!hudTokenId) return;
    const tok = tokens.find((t) => t.id === hudTokenId);
    if (!tok) return;

    const newHp = (tok.current_hp ?? tok.hp ?? 0) + amount;

    setTokens((prev) =>
      prev.map((t) => (t.id === hudTokenId ? { ...t, current_hp: newHp } : t))
    );

    await supabase.from('tokens').update({ current_hp: newHp }).eq('id', hudTokenId);
  };

  const onHudDelete = async () => {
    if (!hudTokenId) return;
    const id = hudTokenId;

    setTokens((p) => p.filter((t) => t.id !== id));
    setHudTokenId(null);
    await supabase.from('tokens').delete().eq('id', id);
  };

  /** Render */
  const transformStyle = {
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
    transformOrigin: 'top left' as const,
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden overscroll-none rounded-xl border border-slate-800 bg-slate-950/80"
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onLeave}
      onContextMenu={onContextMenu}
      onWheel={onWheel}
    >
      <div className="relative inline-block" style={transformStyle}>
        <canvas ref={mapCanvasRef} className="block" />
        <canvas ref={tokenCanvasRef} className="pointer-events-none absolute left-0 top-0" />
      </div>

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
        />
      )}
    </div>
  );
};

export default MapBoard;
