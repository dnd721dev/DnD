'use client';
import { useEffect, useRef, useState } from 'react';

type Props = { width:number; height:number; enabled:boolean };

export default function FogOfWarOverlay({ width, height, enabled }:Props){
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragStart, setDragStart] = useState<{x:number,y:number}|null>(null);

  useEffect(() => {
    const c = canvasRef.current; if(!c) return;
    c.width = width; c.height = height;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0,0,width,height);
  }, [width,height]);

  useEffect(() => {
    const c = canvasRef.current; if(!c) return;
    c.style.pointerEvents = enabled ? 'auto' : 'none';
  }, [enabled]);

  const onDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if(!enabled) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const onUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if(!enabled || !dragStart) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x2 = e.clientX - rect.left, y2 = e.clientY - rect.top;
    const x = Math.min(dragStart.x, x2), y = Math.min(dragStart.y, y2);
    const w = Math.abs(dragStart.x - x2), h = Math.abs(dragStart.y - y2);
    const ctx = (e.target as HTMLCanvasElement).getContext('2d')!;
    ctx.clearRect(x,y,w,h);
    setDragStart(null);
  };

  return (
    <canvas ref={canvasRef} width={width} height={height}
      onMouseDown={onDown} onMouseUp={onUp}
      className="absolute inset-0 z-20" />
  );
}
