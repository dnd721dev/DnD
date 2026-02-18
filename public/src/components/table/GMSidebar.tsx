'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import MonsterLibrary from '@/components/table/MonsterLibrary';
import InitiativeTracker from '@/components/table/InitiativeTracker';
import DMPanel from '@/components/table/DMPanel';

type GMSidebarProps = {
  encounterId?: string | null;
  address?: string | null;
  onRoll: (entry: any) => void;
  // FIX: match MonsterLibrary + TableClient spawnMonsterToken signature
  spawnMonsterToken: (monster: { id: string; name: string }) => void | Promise<void>;
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

type TabKey = 'monsters' | 'initiative' | 'tools' | 'notes' | 'chat';

export default function GMSidebar({
  encounterId,
  address,
  onRoll,
  spawnMonsterToken,
}: GMSidebarProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('monsters');

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

  // Simple local GM notes (for now, not persisted)
  const [gmNotes, setGmNotes] = useState('');

  const tabs: { key: TabKey; label: string; hint: string }[] = [
    { key: 'monsters', label: 'Monsters', hint: 'Bestiary & spawns' },
    { key: 'initiative', label: 'Initiative', hint: 'Turn order & rounds' },
    { key: 'tools', label: 'GM Tools', hint: 'Rolls & utilities' },
    { key: 'notes', label: 'Notes', hint: 'Session notes' },
    { key: 'chat', label: 'Chat', hint: 'Table chat (coming soon)' },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-yellow-700/40 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950/90 shadow-[0_0_20px_rgba(0,0,0,0.6)]">
      {/* Header + Tabs */}
      <div className="border-b border-yellow-800/50 bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 px-2.5 py-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full border border-yellow-600/70 bg-slate-950/80 text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-300 flex items-center justify-center">
              GM
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-100">
                GM Control Panel
              </span>
              <span className="text-[10px] text-yellow-300/80">
                {encounterId ? 'Encounter live' : 'No encounter selected'}
              </span>
            </div>
          </div>
          <div className="rounded-md border border-yellow-800/60 bg-slate-950/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide text-yellow-300">
            DND721
          </div>
        </div>

        <div className="flex gap-1 rounded-lg bg-slate-900/80 p-0.5">
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
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-2.5 py-2 space-y-2 text-xs">
          {activeTab === 'monsters' && (
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              {encounterId ? (
                <MonsterLibrary
                  ownerWallet={address ?? null}
                  onSpawnMonster={spawnMonsterToken}
                />
              ) : (
                <p className="text-[11px] text-slate-400">
                  Start an encounter to use the Monster Library.
                </p>
              )}
            </div>
          )}

          {activeTab === 'initiative' && (
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              <InitiativeTracker encounterId={encounterId ?? null} />
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              {encounterId ? (
                <DMPanel encounterId={encounterId} onRoll={onRoll} />
              ) : (
                <p className="text-[11px] text-slate-400">
                  Create or join an encounter to use GM tools.
                </p>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-100">
                  Session Notes
                </span>
                <span className="text-[10px] text-slate-500">
                  (Local only for now)
                </span>
              </div>
              <textarea
                value={gmNotes}
                onChange={(e) => setGmNotes(e.target.value)}
                rows={6}
                className="w-full resize-none rounded-md border border-slate-800 bg-slate-950/90 px-2 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:border-yellow-500 focus:outline-none"
                placeholder="Write NPC names, plot twists, secret DCs…"
              />
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/80 p-2 shadow-inner shadow-black/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-100">
                  Table Chat
                </span>
                <span className="rounded border border-yellow-500/60 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] text-yellow-300">
                  Coming soon
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                A real-time chat panel will live here, showing rolls, whispers,
                and table chatter. For now, use voice + dice log.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer: initiative strip */}
      <div className="border-t border-yellow-800/60 bg-slate-950/95 px-2.5 py-1.5">
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
