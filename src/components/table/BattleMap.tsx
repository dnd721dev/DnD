'use client';
import { useRef, useEffect } from 'react';
import clsx from 'clsx';

type Token = { id: string; x: number; y: number; label?: string };

export type BattleMapProps = {
  encounterId: string;
  mapImageUrl: string;
  ownerWallet?: string | null;
  gridSize?: number;
  tokens?: Token[];
  highlightTokenId?: string;
  onTileClick?: (x:number, y:number) => void;
};

export default function BattleMap({
  encounterId,
  mapImageUrl,
  ownerWallet,
  gridSize = 50,
  tokens = [],
  highlightTokenId,
  onTileClick,
}: BattleMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cols = 20, rows = 12;

  useEffect(() => {}, []);

  return (
    <div className="relative border border-neutral-800 rounded-xl overflow-hidden">
      <div
        ref={ref}
        className="relative"
        style={{ backgroundImage: `url(${mapImageUrl})`, backgroundSize: 'cover', width: cols*gridSize, height: rows*gridSize }}
      >
        <svg width={cols*gridSize} height={rows*gridSize} className="absolute inset-0 pointer-events-none">
          {Array.from({ length: cols+1 }).map((_,i) => (
            <line key={`v-${i}`} x1={i*gridSize} y1={0} x2={i*gridSize} y2={rows*gridSize} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
          ))}
          {Array.from({ length: rows+1 }).map((_,i) => (
            <line key={`h-${i}`} x1={0} y1={i*gridSize} x2={cols*gridSize} y2={i*gridSize} stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
          ))}
        </svg>

        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, ${gridSize}px)`, gridTemplateRows: `repeat(${rows}, ${gridSize}px)`}}>
          {Array.from({ length: cols*rows }).map((_,i)=> {
            const x = i % cols, y = Math.floor(i/cols);
            return (
              <button
                key={i}
                className="border border-transparent hover:border-white/20"
                onClick={() => onTileClick?.(x,y)}
                aria-label={`tile ${x},${y}`}
              />
            )
          })}
        </div>

        {tokens.map(t => (
          <div key={t.id}
            className={clsx("absolute -translate-x-1/2 -translate-y-1/2 rounded-full w-10 h-10 bg-white/80 text-black flex items-center justify-center",
              t.id === highlightTokenId && "ring-4 ring-yellow-400")}
            style={{ left: t.x*gridSize + gridSize/2, top: t.y*gridSize + gridSize/2 }}
            title={t.label || t.id}
          >
            {t.label?.slice(0,2) || 'T'}
          </div>
        ))}
      </div>
    </div>
  );
}
