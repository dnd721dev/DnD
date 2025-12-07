'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Token = {
  id: string;
  label: string;
  x: number;
  y: number;
  color?: string | null;
  hp?: number | null;
  ac?: number | null;
  owner_wallet?: string | null;
};

type MapBoardViewProps = {
  encounterId: string;
  mapImageUrl: string;
  ownerWallet?: string | null;
  gridSize?: number;
};

type Point = { x: number; y: number };

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

const MapBoardView: React.FC<MapBoardViewProps> = ({
  encounterId,
  mapImageUrl,
  ownerWallet,
  gridSize = 50,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tokenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);

  const [dragTokenId, setDragTokenId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState<Point>({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<Point | null>(null);
  const panTranslateStartRef = useRef<Point | null>(null);

  // Load map image
  useEffect(() => {
    if (!mapImageUrl) return;
    const image = new Image();
    image.src = mapImageUrl;
    image.onload = () => setImg(image);
  }, [mapImageUrl]);

  // Load tokens + subscribe realtime
  useEffect(() => {
    let isMounted = true;

    async function loadTokens() {
      const { data, error } = await supabase
        .from('tokens')
        .select('id, label, x, y, color, hp, ac, owner_wallet')
        .eq('encounter_id', encounterId);

      if (!isMounted) return;

      if (error) {
        console.error('Error loading tokens (view):', error);
        return;
      }

      if (data) {
        setTokens(
          data.map((t: any) => ({
            id: t.id,
            label: t.label,
            x: t.x,
            y: t.y,
            color: t.color,
            hp: t.hp,
            ac: t.ac,
            owner_wallet: t.owner_wallet ?? null,
          }))
        );
      }
    }

    loadTokens();

    const channel = supabase
      .channel(`tokens-view-${encounterId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tokens',
          filter: `encounter_id=eq.${encounterId}`,
        },
        () => {
          loadTokens();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [encounterId]);

  // Draw map + grid
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // Map
    context.drawImage(img, 0, 0);

    // Grid
    context.lineWidth = 1;
    context.strokeStyle = 'rgba(148,163,184,0.3)';

    for (let x = 0; x < canvas.width; x += gridSize) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }

    for (let y = 0; y < canvas.height; y += gridSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }
  }, [img, gridSize]);

  // Draw tokens
  useEffect(() => {
    const canvas = tokenCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const walletLower = ownerWallet?.toLowerCase() ?? null;

    tokens.forEach((t) => {
      const r = gridSize * 0.35;
      const isMine =
        walletLower && t.owner_wallet?.toLowerCase() === walletLower;

      ctx.beginPath();
      ctx.fillStyle = t.color || '#111827';
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();

      if (isMine) {
        const lw = Math.max(3, gridSize * 0.12);
        ctx.save();
        ctx.beginPath();
        ctx.lineWidth = lw;
        ctx.strokeStyle = 'rgba(59,130,246,0.9)';
        ctx.shadowColor = 'rgba(59,130,246,0.7)';
        ctx.shadowBlur = Math.max(8, gridSize * 0.3);
        ctx.arc(t.x, t.y, r + lw * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.font = `${Math.max(12, gridSize * 0.35)}px system-ui, sans-serif`;
      ctx.fillStyle = '#e5e7eb';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.label || 'T', t.x, t.y);
    });
  }, [tokens, img, gridSize, ownerWallet]);

  // Helpers

  const getScreenPoint = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getWorldPoint = (e: React.MouseEvent) => {
    const screen = getScreenPoint(e);
    return {
      x: (screen.x - translate.x) / zoom,
      y: (screen.y - translate.y) / zoom,
    };
  };

  const snapToGrid = (value: number) => {
    return Math.round(value / gridSize) * gridSize;
  };

  const canMoveToken = (t: Token) => {
    if (!ownerWallet) return false;
    return t.owner_wallet?.toLowerCase() === ownerWallet.toLowerCase();
  };

  // Mouse handlers

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Left click only
    if (e.button !== 0) return;

    const world = getWorldPoint(e);
    const hit = tokens.find(
      (t) => Math.hypot(t.x - world.x, t.y - world.y) < gridSize * 0.5
    );

    if (hit && canMoveToken(hit)) {
      // Drag own token
      setDragTokenId(hit.id);
      setIsPanning(false);
    } else {
      // Pan map
      const screen = getScreenPoint(e);
      setIsPanning(true);
      panStartRef.current = screen;
      panTranslateStartRef.current = { ...translate };
      setDragTokenId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && panStartRef.current && panTranslateStartRef.current) {
      const screen = getScreenPoint(e);
      const dx = screen.x - panStartRef.current.x;
      const dy = screen.y - panStartRef.current.y;
      setTranslate({
        x: panTranslateStartRef.current.x + dx,
        y: panTranslateStartRef.current.y + dy,
      });
      return;
    }

    if (dragTokenId) {
      const world = getWorldPoint(e);
      const snapped = {
        x: snapToGrid(world.x),
        y: snapToGrid(world.y),
      };
      setTokens((prev) =>
        prev.map((t) => (t.id === dragTokenId ? { ...t, ...snapped } : t))
      );
    }
  };

  const handleMouseUp = async () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (!dragTokenId) return;
    const t = tokens.find((tok) => tok.id === dragTokenId);
    setDragTokenId(null);
    if (!t) return;

    const { error } = await supabase
      .from('tokens')
      .update({ x: t.x, y: t.y })
      .eq('id', t.id);

    if (error) {
      console.error('Player failed to update token position', error);
    }
  };

  const handleMouseLeave = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    setDragTokenId(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = -e.deltaY;
    if (delta === 0) return;

    const zoomFactor = delta > 0 ? 1.1 : 0.9;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * zoomFactor));
    if (newZoom === zoom) return;

    const screen = getScreenPoint(e);
    const worldX = (screen.x - translate.x) / zoom;
    const worldY = (screen.y - translate.y) / zoom;

    const newTranslateX = screen.x - worldX * newZoom;
    const newTranslateY = screen.y - worldY * newZoom;

    setZoom(newZoom);
    setTranslate({ x: newTranslateX, y: newTranslateY });
  };

  // Native wheel listener to actually block page scroll when zooming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventScroll = (event: WheelEvent) => {
      event.preventDefault();
    };

    container.addEventListener('wheel', preventScroll, { passive: false });

    return () => {
      container.removeEventListener('wheel', preventScroll);
    };
  }, []);

  const transformStyle = {
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
    transformOrigin: 'top left' as const,
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden overscroll-none rounded-xl border border-slate-800 bg-slate-950/80"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={(e) => {
        handleWheel(e);
      }}
    >
      <div className="relative inline-block" style={transformStyle}>
        <canvas ref={mapCanvasRef} className="block" />
        <canvas
          ref={tokenCanvasRef}
          className="pointer-events-none absolute left-0 top-0"
        />
      </div>
    </div>
  );
};

export default MapBoardView;
