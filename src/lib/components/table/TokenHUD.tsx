"use client";

type TokenHUDProps = {
  x: number;
  y: number;
  hp: number | null;
  ac: number | null;
  label: string;
  onClose: () => void;
  onHPChange: (amount: number) => void;
  onDelete: () => void;
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
}: TokenHUDProps) {
  return (
    <div
      className="absolute z-50 rounded-lg border border-slate-800 bg-slate-900 p-2 shadow-xl text-slate-100"
      style={{
        top: y,
        left: x,
      }}
    >
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold">{label}</p>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      <div className="space-y-1 text-xs">
        <p>HP: {hp ?? "—"}</p>
        <p>AC: {ac ?? "—"}</p>

        <div className="mt-2 flex items-center gap-1">
          <button
            onClick={() => onHPChange(-1)}
            className="rounded bg-red-700 px-2 py-1 text-[10px] hover:bg-red-600"
          >
            -1 HP
          </button>
          <button
            onClick={() => onHPChange(-5)}
            className="rounded bg-red-700 px-2 py-1 text-[10px] hover:bg-red-600"
          >
            -5 HP
          </button>

          <button
            onClick={() => onHPChange(+1)}
            className="ml-2 rounded bg-emerald-700 px-2 py-1 text-[10px] hover:bg-emerald-600"
          >
            +1 HP
          </button>
          <button
            onClick={() => onHPChange(+5)}
            className="rounded bg-emerald-700 px-2 py-1 text-[10px] hover:bg-emerald-600"
          >
            +5 HP
          </button>
        </div>

        <button
          onClick={onDelete}
          className="mt-2 w-full rounded bg-red-900 px-2 py-1 text-[10px] hover:bg-red-800"
        >
          Delete Token
        </button>
      </div>
    </div>
  );
}
