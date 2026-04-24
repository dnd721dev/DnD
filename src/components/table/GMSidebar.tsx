'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import MonsterLibrary from '@/components/table/MonsterLibrary';
import InitiativeTracker from '@/components/table/InitiativeTracker';
import DMPanel from '@/components/table/DMPanel';
import { HandoutsPanel } from '@/components/table/HandoutsPanel';
import TableChat from '@/components/table/TableChat';
import SponsorsPanel from '@/components/table/SponsorsPanel';
import { TriggersPanel } from '@/components/table/TriggersPanel';

type GMSidebarProps = {
  sessionId?: string | null;
  encounterId?: string | null;
  address?: string | null;
  activeMapId?: string | null;
  onRoll: (entry: any) => void;
  spawnMonsterToken: (monster: { id: string; name: string }) => void | Promise<void>;
  sessionType?: 'set_level' | 'caya' | null;
  sessionStatus?: string | null;
  xpAwardedAlready?: number | null;
};

type InitiativeEntry = {
  id: string;
  encounter_id: string;
  name: string;
  init: number;
  is_pc: boolean;
  hp: number | null;
  wallet_address: string | null;
  created_at: string;
};

type TabKey = 'combat' | 'tools' | 'session' | 'admin';

export default function GMSidebar({
  sessionId,
  encounterId,
  address,
  activeMapId,
  onRoll,
  spawnMonsterToken,
  sessionType,
  sessionStatus,
  xpAwardedAlready,
}: GMSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('combat');
  const [collapsed, setCollapsed] = useState(false);
  const [combatRound, setCombatRound] = useState(1);

  // Resizable panel
  const [panelHeight, setPanelHeight] = useState(192);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = dragStartY.current - clientY;
    const next = Math.max(80, Math.min(window.innerHeight * 0.75, dragStartHeight.current + delta));
    setPanelHeight(next);
  }, []);

  const handleDragEnd = useCallback(() => {
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
  }, [handleDragMove]);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartHeight.current = panelHeight;
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
  }, [panelHeight, handleDragMove, handleDragEnd]);

  useEffect(() => () => handleDragEnd(), [handleDragEnd]);

  // Footer: initiative strip
  const [entries, setEntries] = useState<InitiativeEntry[]>([]);
  const [loadingStrip, setLoadingStrip] = useState(false);
  const [activeName, setActiveName] = useState<string | null>(null);

  // Listen for current acting creature from InitiativeTracker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ name: string | null }>;
      setActiveName(custom.detail?.name ?? null);
    };

    window.addEventListener('dnd721-active-initiative', handler);
    return () => {
      window.removeEventListener('dnd721-active-initiative', handler);
    };
  }, []);

  // Load initiative entries for footer strip
  useEffect(() => {
    if (!encounterId) {
      setEntries([]);
      return;
    }

    let isMounted = true;

    async function loadEntries() {
      setLoadingStrip(true);
      const { data, error } = await supabase
        .from('initiative_entries')
        .select('*')
        .eq('encounter_id', encounterId)
        .order('init', { ascending: false });

      if (!isMounted) return;
      setLoadingStrip(false);

      if (error) {
        console.error('Error loading initiative strip:', error);
        return;
      }

      setEntries((data || []) as InitiativeEntry[]);
    }

    loadEntries();

    const channel = supabase
      .channel(`initiative-strip-${encounterId}`)
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

  const sortedStrip = useMemo(() => {
    const arr = [...entries];
    arr.sort((a, b) => b.init - a.init || a.created_at.localeCompare(b.created_at));
    return arr;
  }, [entries]);

  // GM notes — persisted to sessions.gm_notes
  const [gmNotes, setGmNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load notes when session changes
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    supabase
      .from('sessions')
      .select('gm_notes')
      .eq('id', sessionId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setGmNotes((data as any)?.gm_notes ?? '');
      });

    return () => { cancelled = true; };
  }, [sessionId]);

  function handleNotesChange(value: string) {
    setGmNotes(value);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!sessionId) return;
      setNotesSaving(true);
      await supabase.from('sessions').update({ gm_notes: value }).eq('id', sessionId);
      setNotesSaving(false);
    }, 1000);
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'combat', label: '⚔ Combat' },
    { key: 'tools', label: '🎲 Tools' },
    { key: 'session', label: '📜 Session' },
    { key: 'admin', label: '⭐ Admin' },
  ];

  return (
    <div className="pointer-events-auto flex flex-col rounded-t-xl border border-b-0 border-yellow-700/40 bg-slate-950/90 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.7)]">
      {/* Drag handle */}
      <div
        className="flex h-4 shrink-0 cursor-ns-resize items-center justify-center"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="h-1.5 w-12 rounded-full bg-slate-600 hover:bg-yellow-500/60 transition-colors" />
      </div>
      {/* Header + Tabs */}
      {/* Single-row header: badge + tabs + DND721 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-yellow-800/50 bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 px-3 py-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-yellow-600/70 bg-slate-950/80 text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-300">
          GM
        </div>
        <div className="flex flex-1 gap-1 rounded-lg bg-slate-900/80 p-0.5">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-b from-yellow-500/80 to-amber-600/90 text-slate-950 shadow-[0_0_6px_rgba(250,204,21,0.7)]'
                    : 'bg-slate-950/40 text-slate-300 hover:bg-slate-800/80 hover:text-yellow-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 rounded-md border border-yellow-800/60 bg-slate-950/80 px-2 py-0.5 text-[11px] text-yellow-300/80 hover:border-yellow-500/60"
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          {collapsed ? '▲' : '▼'}
        </button>
        <div className="shrink-0 rounded-md border border-yellow-800/60 bg-slate-950/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-yellow-300">
          DND721
        </div>
      </div>

      {/* Body — 2-column grid per tab; always rendered to preserve InitiativeTracker state */}
      <div className={`overflow-hidden p-2 text-xs${collapsed ? ' hidden' : ''}`} style={{ height: panelHeight }}>

        {/* ⚔ Combat: InitiativeTracker (left) + MonsterLibrary (right) */}
        {activeTab === 'combat' && (
          <div className="grid h-full grid-cols-2 gap-2">
            <div className="overflow-y-auto rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              <InitiativeTracker encounterId={encounterId ?? null} sessionId={sessionId ?? null} onRoundChange={setCombatRound} />
            </div>
            <div className="overflow-y-auto rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              {encounterId ? (
                <MonsterLibrary onSpawnMonster={spawnMonsterToken} />
              ) : (
                <p className="text-[11px] text-slate-400">Start an encounter to spawn monsters from the library.</p>
              )}
            </div>
          </div>
        )}

        {/* 🎲 Tools: DMPanel (left) + TriggersPanel (right) */}
        {activeTab === 'tools' && (
          <div className="grid h-full grid-cols-2 gap-2">
            <div className="overflow-y-auto rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              {encounterId ? (
                <DMPanel
                  encounterId={encounterId}
                  round={combatRound}
                  onRoll={onRoll}
                  onGrantInspiration={() => window.dispatchEvent(new CustomEvent('dnd721-grant-inspiration'))}
                  sessionId={sessionId}
                  sessionType={sessionType}
                  sessionStatus={sessionStatus}
                  xpAwardedAlready={xpAwardedAlready}
                  gmWallet={address}
                />
              ) : (
                <p className="text-[11px] text-slate-400">Create or join an encounter to use GM tools.</p>
              )}
            </div>
            <div className="overflow-y-auto rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              {sessionId && address ? (
                <TriggersPanel sessionId={sessionId} gmWallet={address} mapId={activeMapId ?? null} />
              ) : (
                <p className="text-[11px] text-slate-400">Session not loaded.</p>
              )}
            </div>
          </div>
        )}

        {/* 📜 Session: Handouts+Notes (left) + Chat (right) */}
        {activeTab === 'session' && (
          <div className="grid h-full grid-cols-2 gap-2">
            <div className="flex flex-col gap-2 overflow-y-auto">
              <div className="rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
                {sessionId ? (
                  <HandoutsPanel sessionId={sessionId} isGm={true} gmWallet={address ?? null} />
                ) : (
                  <p className="text-[11px] text-slate-400">Session not loaded.</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-yellow-300/70">Session Notes</span>
                  <span className="text-[10px] text-slate-500">{notesSaving ? 'Saving…' : 'Auto-saved'}</span>
                </div>
                <textarea
                  value={gmNotes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-yellow-900/30 bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-yellow-500 focus:outline-none"
                  placeholder="Write NPC names, plot twists, secret DCs…"
                />
              </div>
            </div>
            <div className="overflow-y-auto rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              {sessionId ? (
                <TableChat sessionId={sessionId} senderWallet={address ?? null} senderName="GM" />
              ) : (
                <p className="text-[11px] text-slate-400">Session not loaded.</p>
              )}
            </div>
          </div>
        )}

        {/* ⭐ Admin: SponsorsPanel full width */}
        {activeTab === 'admin' && (
          <div className="h-full overflow-y-auto rounded-lg border border-yellow-900/30 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
            {sessionId ? (
              <SponsorsPanel sessionId={sessionId} />
            ) : (
              <p className="text-[11px] text-slate-400">Session not loaded.</p>
            )}
          </div>
        )}

      </div>

      {/* Footer: initiative strip; always rendered to preserve state */}
      <div className={`border-t border-yellow-800/60 bg-slate-950/95 px-2.5 py-1.5${collapsed ? ' hidden' : ''}`}>
        <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
          <span className="font-semibold uppercase tracking-wide text-yellow-300/90">
            Turn Order
          </span>
          <span>
            {loadingStrip
              ? 'Updating…'
              : sortedStrip.length === 0
              ? 'No rolls yet'
              : `${sortedStrip.length} combatant${
                  sortedStrip.length === 1 ? '' : 's'
                }`}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {sortedStrip.map((e) => {
            const isActive = activeName && e.name === activeName;

            const initials = e.name
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 3)
              .toUpperCase();

            return (
              <div
                key={e.id}
                className={`flex min-w-[3.2rem] flex-col items-center gap-0.5 rounded-md border px-1.5 py-1 text-[10px] ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                    : e.is_pc
                    ? 'border-slate-700 bg-slate-900/90 text-slate-100'
                    : 'border-slate-800 bg-slate-950/90 text-slate-300'
                }`}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-600 bg-slate-900/90 text-[10px] font-bold">
                  {initials || '?'}
                </div>
                <div className="max-w-[4.5rem] truncate text-center">
                  {e.name}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-slate-400">
                  <span className="font-mono">Init {e.init}</span>
                  {typeof e.hp === 'number' && (
                    <span className="font-mono">HP {e.hp}</span>
                  )}
                </div>
              </div>
            );
          })}
          {!loadingStrip && sortedStrip.length === 0 && (
            <span className="text-[10px] text-slate-500">
              Initiative entries will appear here.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
