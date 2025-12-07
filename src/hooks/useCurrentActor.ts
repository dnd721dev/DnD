'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type InitRow = { id: string; token_id: string | null; init_value: number | null; sort_order: number | null; };
type StateRow = { turn_index: number; combat_active: boolean; };

export function useCurrentActor(encounterId: string) {
  const [tokenId, setTokenId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: state } = await supabase.from('encounter_state')
        .select('turn_index, combat_active').eq('encounter_id', encounterId).maybeSingle();

      const { data: rows } = await supabase.from('encounter_initiative')
        .select('id, token_id, init_value, sort_order').eq('encounter_id', encounterId);

      if (!state || !rows || !rows.length || !state.combat_active) {
        setTokenId(null);
        return;
      }
      const ordered = rows.slice().sort((a, b) => {
        const ai = a.init_value ?? -9999; const bi = b.init_value ?? -9999;
        if (bi !== ai) return bi - ai;
        const ao = a.sort_order ?? 0; const bo = b.sort_order ?? 0;
        return ao - bo;
      });
      const current = ordered[state.turn_index];
      setTokenId(current?.token_id ?? null);
    };

    load();
    const ch = supabase.channel(`turn-${encounterId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'encounter_state', filter: `encounter_id=eq.${encounterId}` },
        load)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'encounter_initiative', filter: `encounter_id=eq.${encounterId}` },
        load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [encounterId]);

  return tokenId; // null when no active turn or no token attached
}
