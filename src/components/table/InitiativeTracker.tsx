'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SESSION_GATES, type SessionStatus } from '@/lib/sessionGates';

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
  death_saves?: { s: number; f: number } | null;
};

// Lowercase keys match conditions.ts ConditionKey for mechanical enforcement
type Condition =
  | 'blinded'
  | 'charmed'
  | 'concentration'
  | 'deafened'
  | 'exhaustion'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious';

const CONDITIONS: { key: Condition; label: string; color: string; ringColor: string }[] = [
  { key: 'blinded',       label: 'Blinded',        color: 'bg-slate-700/80 text-slate-300 border-slate-500',   ringColor: '#94a3b8' },
  { key: 'charmed',       label: 'Charmed',        color: 'bg-pink-900/80 text-pink-300 border-pink-700',      ringColor: '#f472b6' },
  { key: 'concentration', label: 'Concentration',  color: 'bg-sky-900/80 text-sky-300 border-sky-700',         ringColor: '#38bdf8' },
  { key: 'deafened',      label: 'Deafened',       color: 'bg-slate-600/80 text-slate-200 border-slate-500',   ringColor: '#64748b' },
  { key: 'exhaustion',    label: 'Exhaustion',     color: 'bg-orange-900/80 text-orange-400 border-orange-800', ringColor: '#ea580c' },
  { key: 'frightened',    label: 'Frightened',     color: 'bg-yellow-900/80 text-yellow-300 border-yellow-700', ringColor: '#facc15' },
  { key: 'grappled',      label: 'Grappled',       color: 'bg-amber-900/80 text-amber-300 border-amber-700',   ringColor: '#d97706' },
  { key: 'incapacitated', label: 'Incapacitated',  color: 'bg-red-900/80 text-red-300 border-red-700',         ringColor: '#f87171' },
  { key: 'invisible',     label: 'Invisible',      color: 'bg-slate-800/80 text-slate-100 border-slate-400',   ringColor: '#e2e8f0' },
  { key: 'paralyzed',     label: 'Paralyzed',      color: 'bg-blue-900/80 text-blue-300 border-blue-700',      ringColor: '#60a5fa' },
  { key: 'petrified',     label: 'Petrified',      color: 'bg-gray-800/80 text-gray-300 border-gray-600',      ringColor: '#9ca3af' },
  { key: 'poisoned',      label: 'Poisoned',       color: 'bg-green-900/80 text-green-300 border-green-700',   ringColor: '#4ade80' },
  { key: 'prone',         label: 'Prone',          color: 'bg-orange-900/80 text-orange-300 border-orange-700', ringColor: '#fb923c' },
  { key: 'restrained',    label: 'Restrained',     color: 'bg-teal-900/80 text-teal-300 border-teal-700',      ringColor: '#2dd4bf' },
  { key: 'stunned',       label: 'Stunned',        color: 'bg-purple-900/80 text-purple-300 border-purple-700', ringColor: '#c084fc' },
  { key: 'unconscious',   label: 'Unconscious',    color: 'bg-red-950/80 text-red-400 border-red-800',         ringColor: '#dc2626' },
];

// Exported so MapBoard can use the same ring colors (keyed by lowercase condition key)
export const CONDITION_RING_COLORS: Record<string, string> = Object.fromEntries(
  CONDITIONS.map(c => [c.key, c.ringColor])
);

type InitiativeTrackerProps = {
  encounterId?: string | null;
  /** Session ID — required for the Roll Initiative button to call /api/roll */
  sessionId?: string | null;
  onRoundChange?: (round: number) => void;
  /** Current session lifecycle status — gates Start Combat button */
  sessionStatus?: SessionStatus | null;
};

export default function InitiativeTracker({ encounterId, sessionId, onRoundChange, sessionStatus }: InitiativeTrackerProps) {
  const [entries, setEntries] = useState<InitiativeEntry[]>([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  // Guard: do not write back to DB until we've loaded the server state
  const [encounterLoaded, setEncounterLoaded] = useState(false);

  // Local-only per-entry state
  const [maxHpMap, setMaxHpMap] = useState<Record<string, number>>({});
  const [condMap, setCondMap] = useState<Record<string, Set<Condition>>>({});
  const [deathMap, setDeathMap] = useState<Record<string, { s: number; f: number }>>({});
  const [expandedConds, setExpandedConds] = useState<Set<string>>(new Set());

  // Drag-to-reorder state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Legendary / lair action state (persisted to initiative_entries.legendary_used)
  type LegendaryState = { type: 'legendary' | 'lair'; usesMax: number; usesLeft: number };
  const [legendaryMap, setLegendaryMap] = useState<Record<string, LegendaryState>>({});

  // Reaction used — keyed by entry ID, cleared when that entry becomes current
  const [reactionUsedSet, setReactionUsedSet] = useState<Set<string>>(new Set());

  // prevent duplicate reset calls for the same current entry
  const lastResetEntryIdRef = useRef<string | null>(null);

  // Notify parent when round changes
  useEffect(() => {
    onRoundChange?.(round);
  }, [round, onRoundChange]);

  // Reset legendary action uses each new round
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      setLegendaryMap(prev => {
        const next: Record<string, LegendaryState> = {};
        for (const [id, state] of Object.entries(prev)) {
          next[id] = { ...state, usesLeft: state.usesMax };
        }
        return next;
      });
    };
    window.addEventListener('dnd721-new-round', handler);
    return () => window.removeEventListener('dnd721-new-round', handler);
  }, []);

  // Listen for reaction-used events from PlayerSidebar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      const wallet = (ev as CustomEvent)?.detail?.wallet as string | undefined;
      if (!wallet) return;
      const entry = entries.find(e => e.wallet_address?.toLowerCase() === wallet.toLowerCase());
      if (!entry) return;
      setReactionUsedSet(prev => new Set([...prev, entry.id]));
    };
    window.addEventListener('dnd721-reaction-used', handler);
    return () => window.removeEventListener('dnd721-reaction-used', handler);
  }, [entries]);

  // Auto-clear concentration when PlayerSidebar fails the concentration save
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      const wallet = (ev as CustomEvent)?.detail?.wallet as string | undefined;
      if (!wallet) return;
      const entry = entries.find(e => e.wallet_address?.toLowerCase() === wallet.toLowerCase());
      if (!entry) return;
      setCondMap(prev => {
        const current = new Set(prev[entry.id] ?? []);
        current.delete('concentration');
        return { ...prev, [entry.id]: current };
      });
    };
    window.addEventListener('dnd721-concentration-broken', handler);
    return () => window.removeEventListener('dnd721-concentration-broken', handler);
  }, [entries]);

  // Broadcast condition changes to MapBoard (and any other listeners)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Build { [tokenId]: string[] } from condMap + entries
    const tokenConditions: Record<string, string[]> = {};
    for (const [entryId, conds] of Object.entries(condMap)) {
      if (conds.size === 0) continue;
      const entry = entries.find(e => e.id === entryId);
      if (!entry?.token_id) continue;
      tokenConditions[entry.token_id] = [...conds];
    }
    window.dispatchEvent(new CustomEvent('dnd721-conditions-updated', { detail: tokenConditions }));
  }, [condMap, entries]);

  // ── Load encounter state (turn_index, round_number, combat_started) on mount ─
  // Must happen before the persist effect starts writing so we don't overwrite
  // in-progress combat with default values.
  useEffect(() => {
    if (!encounterId) {
      setEncounterLoaded(false);
      setTurnIdx(0);
      setRound(1);
      setStarted(false);
      lastResetEntryIdRef.current = null;
      return;
    }

    setEncounterLoaded(false);

    supabase
      .from('encounters')
      .select('turn_index, round_number, combat_started')
      .eq('id', encounterId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTurnIdx((data as any).turn_index ?? 0);
          setRound((data as any).round_number ?? 1);
          setStarted((data as any).combat_started ?? false);
        }
        setEncounterLoaded(true);
      });
  }, [encounterId]);

  // ── Subscribe to encounter changes for cross-device sync ────────────────────
  // When another GM window (or the same GM after a re-mount) advances the turn,
  // this subscription updates local state so all clients stay in sync.
  useEffect(() => {
    if (!encounterId) return;

    const channel = supabase
      .channel(`initiative-encounter-state-${encounterId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'encounters', filter: `id=eq.${encounterId}` },
        (payload) => {
          const rec = (payload as any).new as any;
          // Applying the same value is a React no-op (no re-render), so this is
          // safe to call even when WE originated the write.
          setTurnIdx(rec.turn_index ?? 0);
          setRound(rec.round_number ?? 1);
          setStarted(rec.combat_started ?? false);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [encounterId]);

  // ── Load initiative entries + subscribe for this encounter ──────────────────
  useEffect(() => {
    if (!encounterId) {
      setEntries([]);
      lastResetEntryIdRef.current = null;
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
        const entries = data as InitiativeEntry[];
        setEntries(entries);
        // Capture initial HP as max HP for bar display (only for new entries)
        setMaxHpMap(prev => {
          const next = { ...prev };
          for (const e of entries) {
            if (typeof e.hp === 'number' && !(e.id in next)) {
              next[e.id] = e.hp;
            }
          }
          return next;
        });
        // Restore death saves from DB (only overwrite if not already set locally)
        setDeathMap(prev => {
          const next = { ...prev };
          for (const e of entries) {
            if (e.death_saves && !(e.id in next)) {
              next[e.id] = { s: e.death_saves.s ?? 0, f: e.death_saves.f ?? 0 };
            }
          }
          return next;
        });
        // Restore legendary_used from DB
        setLegendaryMap(prev => {
          const next = { ...prev };
          for (const e of entries) {
            const lu = (e as any).legendary_used ?? 0;
            if (lu > 0 && !(e.id in next)) {
              next[e.id] = { type: 'legendary', usesMax: 3, usesLeft: Math.max(0, 3 - lu) };
            }
          }
          return next;
        });
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
      lastResetEntryIdRef.current = null;
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

  // Broadcast active creature to same-tab components (MapBoard, GMSidebar, PlayerSidebar)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('dnd721-active-initiative', {
        detail: {
          name: current?.name ?? null,
          wallet: current?.wallet_address ?? null,
        },
      })
    );
  }, [current?.id, current?.name, current?.wallet_address]);

  // ── Persist full combat state to encounters (all columns) ───────────────────
  // Guarded by `encounterLoaded` so we never overwrite server state with
  // default values during the first render before the load finishes.
  useEffect(() => {
    if (!encounterId || !encounterLoaded) return;

    const entryId = started && current ? current.id : null;

    supabase
      .from('encounters')
      .update({
        active_entry_id: entryId,
        active_wallet:   current?.wallet_address ?? null,
        active_name:     current?.name ?? null,
        turn_index:      started ? turnIdx : 0,
        round_number:    round,
        combat_started:  started,
      })
      .eq('id', encounterId)
      .then(({ error }) => {
        if (error) console.error('Failed to persist encounter combat state:', error);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterId, encounterLoaded, started, current?.id, turnIdx, round]);

  // Reset per-turn flags automatically when it becomes someone's turn
  async function resetPerTurnFlagsForCharacter(characterId: string) {
    const { data: row, error: readErr } = await supabase
      .from('characters')
      .select('action_state')
      .eq('id', characterId)
      .maybeSingle();

    if (readErr) {
      console.error('resetPerTurnFlags read error', readErr);
      return;
    }

    const currentState = (row?.action_state ?? {}) as Record<string, any>;

    const nextState: Record<string, any> = {
      ...currentState,
      // Reset all per-turn flags at the start of this character's turn
      action_used_turn:  false,
      bonus_used_turn:   false,
      sneak_used_turn:   false,
      dashing:           false,
      move_used_ft:      0,
    };

    const { error: writeErr } = await supabase
      .from('characters')
      .update({ action_state: nextState })
      .eq('id', characterId);

    if (writeErr) console.error('resetPerTurnFlags write error', writeErr);
  }

  async function persistDeathSaves(entryId: string, saves: { s: number; f: number }) {
    await supabase
      .from('initiative_entries')
      .update({ death_saves: saves })
      .eq('id', entryId);
  }

  // Hook: whenever "current" changes, reset flags for that character (once per entry)
  useEffect(() => {
    if (!started) return;
    if (!current) return;
    // Clear reaction badge for the combatant whose turn it now is
    setReactionUsedSet(prev => {
      if (!prev.has(current.id)) return prev;
      const next = new Set(prev);
      next.delete(current.id);
      return next;
    });
    if (!current.character_id) return;
    if (lastResetEntryIdRef.current === current.id) return;
    lastResetEntryIdRef.current = current.id;
    resetPerTurnFlagsForCharacter(current.character_id);
  }, [started, current?.id, current?.character_id]);

  // Bug 4: roll 1d20 for initiative and write the result directly into the entry.
  async function rollInitiative(entry: InitiativeEntry) {
    if (!sessionId || !encounterId) return;
    try {
      const res = await fetch('/api/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notation: '1d20',
          sessionId,
          rollType: 'initiative',
          label: `${entry.name} Initiative`,
          rollerName: entry.name,
          rollerWallet: entry.wallet_address ?? undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        console.error('rollInitiative failed:', err);
        return;
      }
      const json = await res.json();
      const rolled: number = json.total;
      const { error } = await supabase
        .from('initiative_entries')
        .update({ init: rolled })
        .eq('id', entry.id);
      if (error) console.error('rollInitiative update error:', error);
    } catch (e) {
      console.error('rollInitiative error:', e);
    }
  }

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

  // Add any existing monster tokens on the map into initiative (one-click sync)
  async function syncMonsterTokens() {
    if (!encounterId) return;
    setLoading(true);
    try {
      const { data: tokens, error: tokErr } = await supabase
        .from('tokens')
        .select('id, name, current_hp, hp')
        .eq('encounter_id', encounterId)
        .eq('type', 'monster');

      if (tokErr) {
        console.error('syncMonsterTokens token load error', tokErr);
        return;
      }

      const monsterTokens = (tokens || []) as any[];
      if (monsterTokens.length === 0) return;

      const existingTokenIds = new Set(
        (entries || [])
          .map((e) => e.token_id)
          .filter(Boolean)
          .map((v) => String(v))
      );

      const inserts = monsterTokens
        .filter((t) => t?.id && !existingTokenIds.has(String(t.id)))
        .map((t) => ({
          encounter_id: encounterId,
          name: t.name ?? 'Monster',
          init: 0,
          hp: (t.current_hp ?? t.hp) ?? null,
          is_pc: false,
          character_id: null,
          token_id: t.id,
          wallet_address: null,
        }));

      if (inserts.length === 0) return;

      const { error: insErr } = await supabase.from('initiative_entries').insert(inserts);
      if (insErr) console.error('syncMonsterTokens insert error', insErr);
    } finally {
      setLoading(false);
    }
  }

  async function removeEntry(id: string) {
    // Clear active_conditions from character when removing a PC entry
    const entry = entries.find(e => e.id === id);
    if (entry?.character_id) {
      const { data: charRow } = await supabase
        .from('characters')
        .select('action_state')
        .eq('id', entry.character_id)
        .maybeSingle();
      const existing = (charRow?.action_state ?? {}) as Record<string, any>;
      await supabase
        .from('characters')
        .update({ action_state: { ...existing, active_conditions: [] } })
        .eq('id', entry.character_id);
    }

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
    lastResetEntryIdRef.current = null;
    // The persist effect will pick up these new values and write to DB.
  }

  function nextTurn() {
    if (sortedEntries.length === 0) return;
    const len = sortedEntries.length;
    const nextIdx = (turnIdx + 1) % len;
    const isNewRound = turnIdx + 1 >= len;
    const nextRound = isNewRound ? round + 1 : round;

    setTurnIdx(nextIdx);
    if (isNewRound) {
      setRound(nextRound);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dnd721-new-round', { detail: { round: nextRound } }));
      }
    }
    // The persist effect will write turn_index, round_number, active_* to DB.
  }

  function prevTurn() {
    if (sortedEntries.length === 0) return;
    const len = sortedEntries.length;
    const nextIdx = turnIdx - 1 < 0 ? len - 1 : turnIdx - 1;
    const newRound = turnIdx - 1 < 0 && round > 1 ? round - 1 : round;

    setTurnIdx(nextIdx);
    if (newRound !== round) setRound(newRound);
    // The persist effect will write to DB.
  }

  function resetCombat() {
    setTurnIdx(0);
    setRound(1);
    setStarted(false);
    lastResetEntryIdRef.current = null;
    // The persist effect will write combat_started=false, turn_index=0 to DB.
  }

  function toggleLegendary(entryId: string) {
    setLegendaryMap(prev => {
      const current = prev[entryId];
      if (!current) return { ...prev, [entryId]: { type: 'legendary', usesMax: 3, usesLeft: 3 } };
      if (current.type === 'legendary') return { ...prev, [entryId]: { ...current, type: 'lair' } };
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
  }

  function spendLegendaryUse(entryId: string) {
    setLegendaryMap(prev => {
      const current = prev[entryId];
      if (!current || current.usesLeft <= 0) return prev;
      const next = { ...prev, [entryId]: { ...current, usesLeft: current.usesLeft - 1 } };
      // Persist legendary_used to DB so it survives tab switches
      const used = current.usesMax - (current.usesLeft - 1);
      supabase.from('initiative_entries').update({ legendary_used: used }).eq('id', entryId)
        .then(({ error }) => { if (error) console.error('legendary_used persist error', error); });
      return next;
    });
  }

  function adjustLegendaryMax(entryId: string, delta: number) {
    setLegendaryMap(prev => {
      const current = prev[entryId];
      if (!current) return prev;
      const newMax = Math.max(1, Math.min(10, current.usesMax + delta));
      return { ...prev, [entryId]: { ...current, usesMax: newMax, usesLeft: Math.min(current.usesLeft, newMax) } };
    });
  }

  async function swapInit(aId: string, bId: string) {
    const a = entries.find(e => e.id === aId);
    const b = entries.find(e => e.id === bId);
    if (!a || !b || a.id === b.id) return;
    await Promise.all([
      supabase.from('initiative_entries').update({ init: b.init }).eq('id', a.id),
      supabase.from('initiative_entries').update({ init: a.init }).eq('id', b.id),
    ]);
  }

  function toggleCondition(entryId: string, cond: Condition) {
    setCondMap(prev => {
      const current = new Set(prev[entryId] ?? []);
      if (current.has(cond)) current.delete(cond);
      else current.add(cond);
      const next = { ...prev, [entryId]: current };

      // Persist to characters.action_state for PC entries (enables cross-device enforcement)
      const entry = entries.find(e => e.id === entryId);
      if (entry?.character_id) {
        const updatedConds = [...current];
        supabase
          .from('characters')
          .select('action_state')
          .eq('id', entry.character_id)
          .maybeSingle()
          .then(({ data }) => {
            const existing = (data?.action_state ?? {}) as Record<string, any>;
            return supabase
              .from('characters')
              .update({ action_state: { ...existing, active_conditions: updatedConds } })
              .eq('id', entry.character_id!);
          });
      }

      return next;
    });
  }

  function toggleCondExpand(entryId: string) {
    setExpandedConds(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  function placeToken(entry: InitiativeEntry) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('dnd721-place-token', {
      detail: {
        label: entry.name,
        hp: entry.hp,
        ac: null,
        ownerWallet: entry.wallet_address,
        initiativeEntryId: entry.id,
      },
    }));
  }

  function getHpBarColor(pct: number) {
    if (pct > 0.5) return 'bg-emerald-500';
    if (pct > 0.25) return 'bg-yellow-500';
    if (pct > 0) return 'bg-red-500';
    return 'bg-slate-600';
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
      {/* Combat controls — always at top */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={prevTurn}
          disabled={!started || sortedEntries.length === 0}
          className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-100 hover:bg-slate-700 disabled:opacity-40"
          title="Previous turn"
        >
          ◀
        </button>

        <div className="flex flex-1 items-center justify-center gap-1.5 rounded bg-slate-900 px-2 py-1">
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Round</span>
          <span className="min-w-[1.5rem] text-center text-sm font-bold text-slate-100">{round}</span>
        </div>

        <button
          type="button"
          onClick={() => (started ? nextTurn() : startCombat())}
          disabled={sortedEntries.length === 0 || (!started && sessionStatus != null && !SESSION_GATES.canUseCombat(sessionStatus))}
          title={!started && sessionStatus != null && !SESSION_GATES.canUseCombat(sessionStatus) ? 'Combat can only start when session is active' : undefined}
          className="rounded bg-emerald-700 px-3 py-1 text-[11px] font-semibold text-emerald-50 hover:bg-emerald-600 disabled:opacity-40"
        >
          {started ? 'Next ▶' : '⚔ Start'}
        </button>

        <button
          type="button"
          onClick={resetCombat}
          className="rounded bg-slate-900 px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          title="Reset combat"
        >
          ↺
        </button>
      </div>

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

      {/* Combatant list */}
      <ul className="flex flex-col gap-1 overflow-y-auto rounded-md bg-slate-950/60 p-1 text-xs" style={{ maxHeight: '14rem' }}>
        {loading && sortedEntries.length === 0 && (
          <li className="py-2 text-center text-[11px] text-slate-500">Loading…</li>
        )}
        {!loading && sortedEntries.length === 0 && (
          <li className="py-2 text-center text-[11px] text-slate-500">
            No combatants yet.
          </li>
        )}
        {sortedEntries.map((e, idx) => {
          const isActive = started && current && current.id === e.id;
          const maxHp = maxHpMap[e.id] ?? e.hp ?? null;
          const curHp = e.hp ?? 0;
          const hpPct = maxHp ? Math.max(0, Math.min(1, curHp / maxHp)) : null;
          const isDowned = typeof e.hp === 'number' && e.hp <= 0 && e.is_pc;
          const conditions = condMap[e.id] ?? new Set<Condition>();
          const death = deathMap[e.id] ?? { s: 0, f: 0 };
          const showConds = expandedConds.has(e.id);

          return (
            <li
              key={e.id}
              draggable
              onDragStart={() => setDragId(e.id)}
              onDragOver={(ev) => { ev.preventDefault(); setDragOverId(e.id); }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={() => {
                if (dragId && dragId !== e.id) swapInit(dragId, e.id);
                setDragId(null);
                setDragOverId(null);
              }}
              onDragEnd={() => { setDragId(null); setDragOverId(null); }}
              className={`flex flex-col gap-1 rounded px-1.5 py-1.5 transition-colors ${
                isActive
                  ? 'bg-emerald-900/40 ring-1 ring-emerald-500/70'
                  : dragOverId === e.id && dragId !== e.id
                  ? 'bg-slate-700/60 ring-1 ring-amber-500/50'
                  : 'bg-slate-900/60'
              }`}
            >
              {/* Row 1: name + init + controls */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex min-w-0 items-center gap-1">
                  <span className="shrink-0 cursor-grab text-[10px] text-slate-600 active:cursor-grabbing" title="Drag to reorder">⠿</span>
                  <div className="flex min-w-0 flex-col">
                    <span className={`truncate text-[11px] font-semibold ${e.is_pc ? 'text-emerald-200' : 'text-slate-100'}`}>
                      {idx + 1}. {e.name}
                    </span>
                    <span className="text-[10px] text-slate-400">Init {e.init}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {/* Bug 4: Roll initiative button — rolls 1d20 and sets init */}
                  <button
                    type="button"
                    onClick={() => rollInitiative(e)}
                    disabled={!sessionId}
                    className="rounded border border-amber-700/60 bg-amber-950/60 px-1.5 py-0.5 text-[10px] text-amber-300 hover:bg-amber-900/60 disabled:opacity-40"
                    title={sessionId ? 'Roll 1d20 for initiative' : 'Session ID required to roll'}
                  >
                    🎲
                  </button>
                  {/* Place button for unplaced PCs */}
                  {e.is_pc && !e.token_id && (
                    <button
                      type="button"
                      onClick={() => placeToken(e)}
                      className="rounded border border-sky-700/60 bg-sky-950/60 px-1.5 py-0.5 text-[10px] text-sky-300 hover:bg-sky-900/60"
                      title="Click to place this token on the map"
                    >
                      📍 Place
                    </button>
                  )}
                  {/* Conditions toggle */}
                  <button
                    type="button"
                    onClick={() => toggleCondExpand(e.id)}
                    className={`rounded px-1 py-0.5 text-[10px] transition ${
                      conditions.size > 0
                        ? 'bg-purple-900/60 text-purple-300'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Toggle conditions"
                  >
                    {conditions.size > 0 ? `☆${conditions.size}` : '☆'}
                  </button>
                  {/* HP controls */}
                  {typeof e.hp === 'number' && (
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => adjustHp(e.id, -1)}
                        className="rounded bg-slate-800 px-1 text-[10px] hover:bg-red-900/60 hover:text-red-200"
                      >
                        -1
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustHp(e.id, +1)}
                        className="rounded bg-slate-800 px-1 text-[10px] hover:bg-emerald-900/60 hover:text-emerald-200"
                      >
                        +1
                      </button>
                    </div>
                  )}
                  {/* Legendary toggle */}
                  {!e.is_pc && (
                    <button
                      type="button"
                      onClick={() => toggleLegendary(e.id)}
                      title={
                        !legendaryMap[e.id] ? 'Mark as Legendary'
                        : legendaryMap[e.id].type === 'legendary' ? 'Switch to Lair Action'
                        : 'Remove special action'
                      }
                      className={`rounded px-1 text-[10px] transition ${
                        legendaryMap[e.id]?.type === 'legendary'
                          ? 'bg-amber-900/60 text-amber-300'
                          : legendaryMap[e.id]?.type === 'lair'
                          ? 'bg-violet-900/60 text-violet-300'
                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {legendaryMap[e.id]?.type === 'legendary' ? '★' : legendaryMap[e.id]?.type === 'lair' ? '⬟' : '☆'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeEntry(e.id)}
                    className="rounded bg-slate-900 px-1 text-[10px] text-slate-500 hover:bg-slate-800 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* HP bar + death saves */}
              {typeof e.hp === 'number' && (
                <div className="flex flex-col gap-0.5">
                  {isDowned ? (
                    /* Death save pips */
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Death saves:</span>
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map(i => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setDeathMap(prev => {
                              const d = prev[e.id] ?? { s: 0, f: 0 };
                              const next = { ...d, s: d.s === i + 1 ? i : i + 1 };
                              persistDeathSaves(e.id, next);
                              return { ...prev, [e.id]: next };
                            })}
                            className={`h-4 w-4 rounded-full border text-[8px] font-bold transition ${
                              i < death.s
                                ? 'border-emerald-500 bg-emerald-700 text-emerald-100'
                                : 'border-slate-600 bg-slate-900 text-slate-500'
                            }`}
                            title={`Success ${i + 1}`}
                          >
                            {i < death.s ? '✓' : '○'}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map(i => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setDeathMap(prev => {
                              const d = prev[e.id] ?? { s: 0, f: 0 };
                              const next = { ...d, f: d.f === i + 1 ? i : i + 1 };
                              persistDeathSaves(e.id, next);
                              return { ...prev, [e.id]: next };
                            })}
                            className={`h-4 w-4 rounded-full border text-[8px] font-bold transition ${
                              i < death.f
                                ? 'border-red-500 bg-red-800 text-red-100'
                                : 'border-slate-600 bg-slate-900 text-slate-500'
                            }`}
                            title={`Failure ${i + 1}`}
                          >
                            {i < death.f ? '✗' : '○'}
                          </button>
                        ))}
                      </div>
                      {death.s >= 3 && <span className="text-[10px] text-emerald-400">Stable</span>}
                      {death.f >= 3 && <span className="text-[10px] text-red-400">Dead</span>}
                    </div>
                  ) : (
                    /* HP bar */
                    hpPct !== null && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all ${getHpBarColor(hpPct)}`}
                            style={{ width: `${hpPct * 100}%` }}
                          />
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-slate-300">
                          {e.hp}/{maxHp}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Condition badges */}
              {showConds && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {CONDITIONS.map(({ key, label, color }) => {
                    const active = conditions.has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleCondition(e.id, key)}
                        className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold transition ${
                          active ? color : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Active conditions summary (when collapsed) */}
              {!showConds && conditions.size > 0 && (
                <div className="flex flex-wrap gap-1">
                  {CONDITIONS.filter(({ key }) => conditions.has(key)).map(({ key, label, color }) => (
                    <span key={key} className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${color}`}>
                      {label}
                    </span>
                  ))}
                </div>
              )}

              {/* Reaction used badge */}
              {reactionUsedSet.has(e.id) && (
                <div className="flex items-center gap-1 rounded bg-indigo-950/60 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-300 ring-1 ring-indigo-700/40">
                  ↩ REACTION USED
                </div>
              )}

              {/* Legendary / Lair action uses */}
              {legendaryMap[e.id] && (
                <div className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${
                  legendaryMap[e.id].type === 'legendary' ? 'bg-amber-950/40' : 'bg-violet-950/40'
                }`}>
                  <span className={`text-[9px] font-semibold uppercase tracking-wide ${
                    legendaryMap[e.id].type === 'legendary' ? 'text-amber-400' : 'text-violet-400'
                  }`}>
                    {legendaryMap[e.id].type === 'legendary' ? '★ Legendary' : '⬟ Lair'}
                  </span>
                  {legendaryMap[e.id].type === 'legendary' && (
                    <>
                      <div className="flex gap-0.5">
                        {Array.from({ length: legendaryMap[e.id].usesMax }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => spendLegendaryUse(e.id)}
                            className={`h-3 w-3 rounded-sm border text-[7px] transition ${
                              i < legendaryMap[e.id].usesLeft
                                ? 'border-amber-500 bg-amber-700/70 text-amber-100'
                                : 'border-slate-700 bg-slate-900 text-slate-600'
                            }`}
                            title="Click to spend a legendary action"
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => adjustLegendaryMax(e.id, -1)}
                        className="rounded bg-slate-900 px-1 text-[9px] text-slate-500 hover:text-slate-300"
                      >-</button>
                      <button
                        type="button"
                        onClick={() => adjustLegendaryMax(e.id, +1)}
                        className="rounded bg-slate-900 px-1 text-[9px] text-slate-500 hover:text-slate-300"
                      >+</button>
                    </>
                  )}
                  {legendaryMap[e.id].type === 'lair' && (
                    <span className="text-[9px] text-violet-300">Triggers at Init 20</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Add combatant controls */}
      <div className="flex flex-col gap-2 border-t border-slate-800 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">Add combatant</span>
          <button
            type="button"
            onClick={syncMonsterTokens}
            disabled={!encounterId || loading}
            className="rounded bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            title="Add any monster tokens already on the map into initiative"
          >
            + Monsters from map
          </button>
        </div>
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
              className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <input
              name="hp"
              placeholder="HP"
              type="number"
              className="w-16 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
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
