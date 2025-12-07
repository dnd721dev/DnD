'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type InitiativeEntry = {
  id: string;
  encounter_id: string;
  character_id: string | null;
  token_id: string | null;
  name: string;
  init: number;
  hp: number | null;
  is_pc: boolean;
  wallet_address: string | null;
  created_at: string;
};

type InitiativeTrackerProps = {
  encounterId?: string | null;
};

export default function InitiativeTracker({ encounterId }: InitiativeTrackerProps) {
  const [entries, setEntries] = useState<InitiativeEntry[]>([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load entries + subscribe for this encounter
  useEffect(() => {
    if (!encounterId) {
      setEntries([]);
      setTurnIdx(0);
      setRound(1);
      setStarted(false);
      return;
    }

    let isMounted = true;

    async function loadEntries() {
      setLoading(true);
      const { data, error } = await supabase
        .from('initiative_entries')
        .select('*')
        .eq('encounter_id', encounterId)
        .order('init', { ascending: false });

      if (!isMounted) return;
      setLoading(false);

      if (error) {
        console.error('Error loading initiative_entries:', error);
        return;
      }

      if (data) {
        setEntries(data as InitiativeEntry[]);
      }
    }

    loadEntries();

    const channel = supabase
      .channel(`initiative-${encounterId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'initiative_entries',
          filter: `encounter_id=eq.${encounterId}`,
        },
        () => {
          loadEntries();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [encounterId]);

  // Always work on a sorted copy high → low
  const sortedEntries = useMemo(() => {
    const arr = [...entries];
    arr.sort((a, b) => b.init - a.init || a.created_at.localeCompare(b.created_at));
    return arr;
  }, [entries]);

  // Clamp when list changes
  useEffect(() => {
    if (sortedEntries.length === 0) {
      setTurnIdx(0);
      setRound(1);
      setStarted(false);
      return;
    }
    if (turnIdx >= sortedEntries.length) {
      setTurnIdx(0);
    }
  }, [sortedEntries.length, turnIdx]);

  const current =
    sortedEntries.length > 0 && started
      ? sortedEntries[turnIdx % sortedEntries.length]
      : null;

  // Broadcast the active creature name so MapBoard can highlight tokens
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const name = current?.name ?? null;
    window.dispatchEvent(
      new CustomEvent('dnd721-active-initiative', {
        detail: { name },
      })
    );
  }, [current?.id, current?.name]);

  async function addEntry(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!encounterId) return;

    const form = e.currentTarget;
    const nameInput = form.elements.namedItem('name') as HTMLInputElement;
    const initInput = form.elements.namedItem('init') as HTMLInputElement;
    const hpInput = form.elements.namedItem('hp') as HTMLInputElement;
    const isPcInput = form.elements.namedItem('isPc') as HTMLInputElement;

    const name = nameInput.value.trim();
    if (!name) return;

    const init = Number(initInput.value || 0);
    const hp = hpInput.value ? Number(hpInput.value) : null;
    const isPc = isPcInput.checked;

    const { error } = await supabase.from('initiative_entries').insert({
      encounter_id: encounterId,
      name,
      init: isNaN(init) ? 0 : init,
      hp,
      is_pc: isPc,
      character_id: null,
      token_id: null,
      wallet_address: null,
    });

    if (error) {
      console.error('Error inserting initiative entry:', error);
    }

    nameInput.value = '';
    initInput.value = '';
    hpInput.value = '';
    isPcInput.checked = false;
  }

  async function removeEntry(id: string) {
    const { error } = await supabase
      .from('initiative_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting initiative entry:', error);
    }
  }

  async function adjustHp(id: string, delta: number) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    const newHp = (entry.hp ?? 0) + delta;

    const { error } = await supabase
      .from('initiative_entries')
      .update({ hp: newHp })
      .eq('id', id);

    if (error) {
      console.error('Error updating initiative HP:', error);
    }
  }

  function startCombat() {
    if (sortedEntries.length === 0) return;
    setStarted(true);
    setTurnIdx(0);
    setRound(1);
  }

  function nextTurn() {
    if (sortedEntries.length === 0) return;
    setTurnIdx((prev) => {
      const next = prev + 1;
      if (next >= sortedEntries.length) {
        setRound((r) => r + 1);
      }
      return next % sortedEntries.length;
    });
  }

  function prevTurn() {
    if (sortedEntries.length === 0) return;
    setTurnIdx((prev) => {
      let next = prev - 1;
      if (next < 0) {
        next = sortedEntries.length - 1;
        setRound((r) => (r > 1 ? r - 1 : 1));
      }
      return next;
    });
  }

  function resetCombat() {
    setTurnIdx(0);
    setRound(1);
    setStarted(false);
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-200">
            Initiative
          </h2>
          <p className="text-[11px] text-slate-500">
            Turn order for this encounter
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-[11px] font-mono text-slate-300">
            Round{' '}
            <span className="inline-flex min-w-[1.5rem] justify-center rounded bg-slate-800 px-1">
              {round}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={prevTurn}
              disabled={!started || sortedEntries.length === 0}
              className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700 disabled:opacity-40"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={nextTurn}
              disabled={sortedEntries.length === 0}
              className="rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-500 disabled:opacity-40"
            >
              {started ? 'Next' : 'Start'}
            </button>
            <button
              type="button"
              onClick={resetCombat}
              className="rounded bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Current turn banner */}
      {started && current && (
        <div className="rounded-lg border border-emerald-600/60 bg-emerald-900/20 px-2 py-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-100">
              Acting:{' '}
              <span className={current.is_pc ? 'text-emerald-300' : 'text-amber-200'}>
                {current.name}
              </span>
            </span>
            <span className="font-mono text-[11px] text-emerald-200">
              Init {current.init}
            </span>
          </div>
        </div>
      )}

      {/* List */}
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-md bg-slate-950/60 p-1 text-xs">
        {loading && sortedEntries.length === 0 && (
          <li className="py-2 text-center text-[11px] text-slate-500">
            Loading initiative…
          </li>
        )}
        {!loading && sortedEntries.length === 0 && (
          <li className="py-2 text-center text-[11px] text-slate-500">
            No combatants yet. Players rolling initiative will appear here.
          </li>
        )}
        {sortedEntries.map((e, idx) => {
          const isActive = started && current && current.id === e.id;
          return (
            <li
              key={e.id}
              className={`flex items-center justify-between gap-2 rounded px-1.5 py-1 ${
                isActive
                  ? 'bg-emerald-900/40 ring-1 ring-emerald-500/70'
                  : 'bg-slate-900/60'
              }`}
            >
              <div className="flex flex-col">
                <span
                  className={`text-[11px] font-semibold ${
                    e.is_pc ? 'text-emerald-200' : 'text-slate-100'
                  }`}
                >
                  {idx + 1}. {e.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  Init {e.init}
                  {typeof e.hp === 'number' && ` • HP ${e.hp}`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {typeof e.hp === 'number' && (
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => adjustHp(e.id, -1)}
                      className="rounded bg-slate-800 px-1 text-[10px] hover:bg-slate-700"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustHp(e.id, +1)}
                      className="rounded bg-slate-800 px-1 text-[10px] hover:bg-slate-700"
                    >
                      +1
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeEntry(e.id)}
                  className="rounded bg-slate-900 px-1 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Controls + form */}
      <div className="flex flex-col gap-2 border-t border-slate-800 pt-2">
        <form onSubmit={addEntry} className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <input
              name="name"
              placeholder="Name"
              className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <input
              name="init"
              placeholder="Init"
              type="number"
              className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <input
              name="hp"
              placeholder="HP"
              type="number"
              className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <label className="flex items-center gap-1 text-slate-300">
              <input
                type="checkbox"
                name="isPc"
                className="h-3 w-3 rounded border-slate-600 bg-slate-900"
              />
              PC
            </label>
            <button
              type="submit"
              disabled={!encounterId}
              className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700 disabled:opacity-40"
            >
              + Add
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
