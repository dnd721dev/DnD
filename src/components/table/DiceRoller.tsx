'use client';
import { useState } from 'react';
export default function DiceRoller(){
  const [expr, setExpr] = useState('1d20+5');
  const [result, setResult] = useState<number | null>(null);
  const [details, setDetails] = useState<string>('');

  const roll = () => {
    const m = expr.trim().match(/^(\d+)d(\d+)([+\-]\d+)?$/i);
    if(!m){ setDetails('Use format NdM+X, e.g., 2d6+1'); return; }
    const n = parseInt(m[1],10); const sides = parseInt(m[2],10);
    const mod = m[3] ? parseInt(m[3],10) : 0;
    let total = 0; const rolls:number[] = [];
    for(let i=0;i<n;i++){ const r = 1 + Math.floor(Math.random()*sides); rolls.push(r); total += r; }
    total += mod;
    setResult(total);
    setDetails(`Rolled [${rolls.join(', ')}] ${mod>=0?`+ ${mod}`:`- ${Math.abs(mod)}`}`);
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <input className="input flex-1" value={expr} onChange={e=>setExpr(e.target.value)} />
        <button onClick={roll} className="btn">Roll</button>
      </div>
      {result !== null && (
        <div className="text-sm">
          <div className="text-2xl font-semibold">Result: {result}</div>
          <div className="text-neutral-400">{details}</div>
        </div>
      )}
    </div>
  );
}
