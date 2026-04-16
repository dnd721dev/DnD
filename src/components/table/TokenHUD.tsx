"use client";

import { useState } from "react";

const DAMAGE_TYPES = [
  "acid","bludgeoning","cold","fire","force","lightning",
  "necrotic","piercing","poison","psychic","radiant","slashing","thunder",
];

type TokenHUDProps = {
  x: number;
  y: number;
  hp: number | null;
  ac: number | null;
  label: string;
  onClose: () => void;
  onHPChange: (amount: number) => void;
  onDelete: () => void;
  resistances?: string[];
  immunities?: string[];
  onAddResistance?: (type: string) => void;
  onRemoveResistance?: (type: string) => void;
  onAddImmunity?: (type: string) => void;
  onRemoveImmunity?: (type: string) => void;
};

export default function TokenHUD({
  x,
  y,
  hp,
  ac,
  label,
  onClose,
  onHPChange,
  onDelete,
  resistances = [],
  immunities = [],
  onAddResistance,
  onRemoveResistance,
  onAddImmunity,
  onRemoveImmunity,
}: TokenHUDProps) {
  const [damageInput, setDamageInput] = useState("");
  const [dmgType, setDmgType] = useState(DAMAGE_TYPES[0]);
  const [lastNote, setLastNote] = useState<string | null>(null);

  function applyDamage() {
    const raw = parseInt(damageInput, 10);
    if (isNaN(raw) || raw <= 0) return;
    const isImmune = immunities.includes(dmgType);
    const isResistant = resistances.includes(dmgType);
    if (isImmune) {
      setLastNote(`Immune to ${dmgType} — 0 damage`);
      return;
    }
    const effective = isResistant ? Math.floor(raw / 2) : raw;
    if (isResistant) setLastNote(`Resistant to ${dmgType} — halved to ${effective}`);
    else setLastNote(null);
    onHPChange(-effective);
    setDamageInput("");
  }

  return (
    <div
      className="absolute z-50 w-56 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl text-slate-100"
      style={{ top: y, left: x }}
    >
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold truncate">{label}</p>
        <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-200">✕</button>
      </div>

      <div className="space-y-1.5 text-xs">
        <p>HP: {hp ?? "—"} &nbsp;|&nbsp; AC: {ac ?? "—"}</p>

        {/* Typed damage input */}
        <div className="flex gap-1">
          <input
            type="number"
            min={1}
            value={damageInput}
            onChange={e => setDamageInput(e.target.value)}
            placeholder="dmg"
            className="w-14 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[11px] text-slate-100 focus:outline-none"
          />
          <select
            value={dmgType}
            onChange={e => setDmgType(e.target.value)}
            className="flex-1 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-200"
          >
            {DAMAGE_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={applyDamage}
            disabled={!damageInput}
            className="rounded bg-red-700 px-2 py-0.5 text-[10px] hover:bg-red-600 disabled:opacity-40"
          >
            Hit
          </button>
        </div>
        {lastNote && <p className="text-[10px] italic text-amber-400">{lastNote}</p>}

        {/* Quick HP buttons */}
        <div className="flex items-center gap-1">
          <button onClick={() => onHPChange(-1)} className="rounded bg-red-700 px-2 py-1 text-[10px] hover:bg-red-600">-1</button>
          <button onClick={() => onHPChange(-5)} className="rounded bg-red-700 px-2 py-1 text-[10px] hover:bg-red-600">-5</button>
          <button onClick={() => onHPChange(+1)} className="ml-auto rounded bg-emerald-700 px-2 py-1 text-[10px] hover:bg-emerald-600">+1</button>
          <button onClick={() => onHPChange(+5)} className="rounded bg-emerald-700 px-2 py-1 text-[10px] hover:bg-emerald-600">+5</button>
        </div>

        {/* Resistances */}
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Resistances</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {resistances.map(r => (
              <button key={r} onClick={() => onRemoveResistance?.(r)}
                className="rounded border border-blue-700/50 bg-blue-900/30 px-1.5 py-0.5 text-[9px] text-blue-300 hover:bg-blue-900/60"
                title="Click to remove"
              >{r} ✕</button>
            ))}
            <select
              className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-400"
              defaultValue=""
              onChange={e => { if (e.target.value) { onAddResistance?.(e.target.value); e.target.value = ""; }}}
            >
              <option value="">+ add</option>
              {DAMAGE_TYPES.filter(t => !resistances.includes(t) && !immunities.includes(t)).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Immunities */}
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Immunities</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {immunities.map(r => (
              <button key={r} onClick={() => onRemoveImmunity?.(r)}
                className="rounded border border-purple-700/50 bg-purple-900/30 px-1.5 py-0.5 text-[9px] text-purple-300 hover:bg-purple-900/60"
                title="Click to remove"
              >{r} ✕</button>
            ))}
            <select
              className="rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-[9px] text-slate-400"
              defaultValue=""
              onChange={e => { if (e.target.value) { onAddImmunity?.(e.target.value); e.target.value = ""; }}}
            >
              <option value="">+ add</option>
              {DAMAGE_TYPES.filter(t => !resistances.includes(t) && !immunities.includes(t)).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={onDelete}
          className="mt-1 w-full rounded bg-red-900 px-2 py-1 text-[10px] hover:bg-red-800"
        >
          Delete Token
        </button>
      </div>
    </div>
  );
}
