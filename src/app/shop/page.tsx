'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Item = {
  id: string;
  name: string;
  kind: 'consumable'|'cosmetic'|'monster';
  price: number;
  img: string;
  description: string;
  is_active: boolean;
};

export default function ShopPage(){
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('shop_items').select('*').eq('is_active', true).order('name');
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addToCart = async (id: string) => {
    await supabase.from('cart_lines').insert({ item_id: id, qty: 1 });
    alert('Added to cart');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Shop</h2>
        <a className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2" href="/shop/checkout">Checkout</a>
      </div>

      {loading ? <div>Loading…</div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(i => (
            <div key={i.id} className="rounded-2xl border border-neutral-800 overflow-hidden">
              <img src={i.img} className="h-40 w-full object-cover" />
              <div className="p-3 space-y-2">
                <div className="font-semibold">{i.name}</div>
                <div className="text-xs text-neutral-400 capitalize">{i.kind}</div>
                <p className="text-sm text-neutral-300">{i.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-sm">{i.price} cr</div>
                  <button className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2" onClick={()=>addToCart(i.id)}>
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-sm text-neutral-400">
        * Credits are a web2 placeholder. We’ll connect the marketing wallet + token later.
      </div>
    </div>
  );
}
