'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import BattleMap from '@/components/BattleMap';
import DiceRoller from '@/components/DiceRoller';

type Session = { id: string; title: string; map_image_url: string };
type Handout = { id:string; session_id:string; title:string; content:string; created_at:string };
type Note = { id:string; session_id:string; content:string; created_at:string };
type LobbyMsg = { id:string; session_id:string; body:string; created_at:string };

export default function DmSessionPage({ params }:{ params:{ id:string }}) {
  const [session, setSession] = useState<Session | null>(null);
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [msgs, setMsgs] = useState<LobbyMsg[]>([]);
  const [highlight, setHighlight] = useState<string | undefined>(undefined);
  const [gridSize, setGrid] = useState(50);

  const loadAll = async () => {
    const [{ data: s }, { data: h }, { data: n }, { data: m }] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', params.id).single(),
      supabase.from('handouts').select('*').eq('session_id', params.id).order('created_at', { ascending: false }),
      supabase.from('notes').select('*').eq('session_id', params.id).order('created_at', { ascending: false }),
      supabase.from('lobby_messages').select('*').eq('session_id', params.id).order('created_at', { ascending: true }),
    ]);
    setSession((s as any) || null);
    setHandouts((h as any) || []);
    setNotes((n as any) || []);
    setMsgs((m as any) || []);
  };

  useEffect(() => { loadAll(); }, [params.id]);

  const addHandout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') || '');
    const content = String(fd.get('content') || '');
    if (!title) return;
    await supabase.from('handouts').insert({ session_id: params.id, title, content });
    (e.target as HTMLFormElement).reset();
    await loadAll();
  };

  const delHandout = async (id: string) => {
    await supabase.from('handouts').delete().eq('id', id);
    await loadAll();
  };

  const saveNote = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const content = String(fd.get('content') || '');
    if (!content.trim()) return;
    await supabase.from('notes').insert({ session_id: params.id, content });
    (e.target as HTMLFormElement).reset();
    await loadAll();
  };

  const sendMsg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = String(fd.get('body') || '');
    if (!body.trim()) return;
    await supabase.from('lobby_messages').insert({ session_id: params.id, body });
    (e.target as HTMLFormElement).reset();
    await loadAll();
  };

  const tokens = useMemo(() => [
    { id: 'pc1', x: 3, y: 4, label: 'PC1' },
    { id: 'pc2', x: 5, y: 2, label: 'PC2' },
    { id: 'gob', x: 10, y: 6, label: 'G1' },
  ], []);

  if (!session) return <div className="mx-auto max-w-6xl px-4 py-8">Loading session…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{session.title}</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm flex items-center gap-2">
            Grid <input type="number" className="bg-neutral-800 rounded px-3 py-2 w-20"
              value={gridSize} onChange={e=>setGrid(Number(e.target.value||50))} />
          </label>
          <a className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2"
             href={`/dm/sessions/${params.id}?role=player`} target="_blank">
            Open Player View
          </a>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <BattleMap
            mapImageUrl={session.map_image_url}
            gridSize={gridSize}
            tokens={tokens}
            highlightTokenId={highlight}
            onTileClick={(x,y)=>console.log('tile',x,y)}
          />
          <div className="flex flex-wrap gap-2">
            {tokens.map(t => (
              <button key={t.id} onClick={()=>setHighlight(t.id)}
                      className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm">
                Highlight {t.label ?? t.id}
              </button>
            ))}
            <button onClick={()=>setHighlight(undefined)} className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-sm">
              Clear
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <DiceRoller />
          <div className="rounded-2xl border border-neutral-800 p-4 space-y-2">
            <div className="font-semibold">Lobby Chat</div>
            <div className="h-40 overflow-auto border border-neutral-800 rounded p-2 text-sm space-y-1">
              {msgs.map((m)=>(<div key={m.id} className="text-neutral-300">• {m.body}</div>))}
            </div>
            <form onSubmit={sendMsg} className="flex gap-2">
              <input name="body" className="bg-neutral-800 rounded px-3 py-2 flex-1" placeholder="Say hello..." />
              <button className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2">Send</button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-neutral-800 p-4 space-y-3">
          <div className="font-semibold">DM Notes</div>
          <form onSubmit={saveNote} className="space-y-2">
            <textarea name="content" className="bg-neutral-800 rounded px-3 py-2 min-h-[120px] w-full" placeholder="Write a note…" />
            <button className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2">Save Note</button>
          </form>
          <div className="space-y-2">
            {notes.map(n => (
              <div key={n.id} className="rounded-xl border border-neutral-800 p-2 text-sm">
                <div className="text-neutral-400">{new Date(n.created_at).toLocaleString()}</div>
                <div className="whitespace-pre-wrap">{n.content}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-800 p-4 space-y-3">
          <div className="font-semibold">Handouts</div>
          <form onSubmit={addHandout} className="space-y-2">
            <input name="title" className="bg-neutral-800 rounded px-3 py-2 w-full" placeholder="Title" />
            <textarea name="content" className="bg-neutral-800 rounded px-3 py-2 min-h-[100px] w-full" placeholder="Player-facing text" />
            <button className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2">Create Handout</button>
          </form>
          <div className="space-y-2">
            {handouts.map(h => (
              <div key={h.id} className="rounded-xl border border-neutral-800 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{h.title}</div>
                  <button className="text-xs text-red-300 hover:text-red-200" onClick={()=>delHandout(h.id)}>Delete</button>
                </div>
                <div className="text-sm text-neutral-300 whitespace-pre-wrap mt-1">{h.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
