'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type DmSessionRow = {
  id: string;
  title: string;
  map_image_url: string;
  created_at: string;
};

export default function DmHome(){
  const [sessions, setSessions] = useState<DmSessionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setSessions(data as DmSessionRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get('title') || 'Untitled');
    const map_image_url = String(fd.get('mapImageUrl') || 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop');
    const { error } = await supabase.from('sessions').insert({ title, map_image_url });
    if (!error) await load();
    (e.target as HTMLFormElement).reset();
  };

  const remove = async (id: string) => {
    await supabase.from('sessions').delete().eq('id', id);
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <h2 className="text-2xl font-semibold">DM Suite</h2>

      <form onSubmit={create} className="rounded-2xl border border-neutral-800 p-4 grid sm:grid-cols-3 gap-3">
        <input name="title" className="bg-neutral-800 rounded px-3 py-2" placeholder="Session Title" />
        <input name="mapImageUrl" className="bg-neutral-800 rounded px-3 py-2 sm:col-span-2" placeholder="Map Image URL" />
        <button className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 sm:w-max" disabled={loading}>
          {loading ? 'Working…' : 'Create Session'}
        </button>
      </form>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map(s => (
          <div key={s.id} className="rounded-2xl border border-neutral-800 overflow-hidden">
            <img src={s.map_image_url} className="h-36 w-full object-cover" />
            <div className="p-3 space-y-2">
              <div className="font-semibold">{s.title}</div>
              <div className="text-xs text-neutral-400">{new Date(s.created_at).toLocaleString()}</div>
              <div className="flex gap-2">
                <a className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2" href={`/dm/sessions/${s.id}`}>Open</a>
                <button className="text-xs text-red-300 hover:text-red-200" onClick={() => remove(s.id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
