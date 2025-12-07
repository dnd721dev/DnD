'use client';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Line = {
  id: string;
  item_id: string;
  qty: number;
  created_at: string;
  item?: { name: string; price: number; kind: 'consumable'|'cosmetic'|'monster' };
};

export default function CheckoutPage(){
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cart_lines')
      .select('id, item_id, qty, created_at, item:shop_items(name, price, kind)')
      .order('created_at');
    setLines((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const total = useMemo(() => lines.reduce((s, l) => s + (l.item?.price || 0) * l.qty, 0), [lines]);

  const remove = async (id: string) => {
    await supabase.from('cart_lines').delete().eq('id', id);
    await load();
  };
  const clear = async () => {
    await supabase.from('cart_lines').delete().neq('id', '');
    await load();
  };

  const pay = async () => {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({ total })
      .select('*')
      .single();
    if (error) { alert(error.message); return; }

    for (const l of lines) {
      await supabase
        .from('order_lines')
        .insert({ order_id: order.id, item_id: l.item_id, qty: l.qty, price: l.item?.price || 0 });

      if (l.item?.kind === 'monster') {
        await supabase.from('session_events').insert({
          type: 'spawn_monster',
          payload: { item_id: l.item_id, qty: l.qty }
          // session_id: add this when you have an active session to target
        });
      }
    }
    await clear();
    alert(`Payment complete. Order #${order.id} created.`);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <h2 className="text-2xl font-semibold">Checkout</h2>

      {lines.length === 0 ? (
        <p>Your cart is empty. <a href="/shop" className="underline">Back to shop</a></p>
      ) : (
        <div className="space-y-4">
          {lines.map(l => (
            <div key={l.id} className="flex items-center justify-between rounded-2xl border border-neutral-800 p-3">
              <div>
                <div className="font-medium">{l.item?.name} × {l.qty}</div>
                <div className="text-xs text-neutral-400">{l.item?.kind} • {l.item?.price} cr each</div>
              </div>
              <button className="text-xs text-red-300 hover:text-red-200" onClick={() => remove(l.id)}>Remove</button>
            </div>
          ))}
          <div className="flex items-center justify-between font-semibold">
            <div>Total</div><div>{total} cr</div>
          </div>
          <div className="space-y-2">
            <button className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2 w-full" onClick={pay}>
              Pay with credits (Supabase)
            </button>
          </div>
          <div className="text-xs text-neutral-400">
            * Next: connect Marketing Wallet + on-chain token; map order to a specific session.
          </div>
        </div>
      )}
    </div>
  );
}
