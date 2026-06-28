// src/lib/triggerTargeting.ts
//
// Resolves which token(s) a trigger effect should land on, based on the
// trigger's target_rule. Runs SERVER-SIDE in /api/triggers/fire with the
// service-role client (single authoritative fire per move), so the result is
// the same for everyone.
//
// IMPORTANT — real token schema (migration 002 + later):
//   • tokens are keyed by `encounter_id` (TEXT), NOT a session_id.
//   • HP lives in `current_hp` (current) and `hp` (max) for ALL token kinds.
//   • "party member" = `type = 'pc'`; monsters/objects use type 'monster'/'object'.
// (There is no is_npc / npc_hp_current / character_hp_current column.)

import type { SupabaseClient } from '@supabase/supabase-js'

export type TargetRule =
  | 'self'              // the triggering token (default — unchanged behavior)
  | 'lowest_hp_party'   // party member with the lowest current HP
  | 'lowest_hp_percent' // party member with the lowest HP percentage
  | 'highest_hp_party'  // party member with the highest current HP
  | 'random_party'      // random party member
  | 'all_party'         // every party member

export const TARGET_RULES: TargetRule[] = [
  'self', 'lowest_hp_party', 'lowest_hp_percent', 'highest_hp_party', 'random_party', 'all_party',
]

export interface TargetToken {
  id: string
  label: string | null
  type: string | null
  current_hp: number | null
  hp: number | null
  owner_wallet: string | null
  character_id: string | null
}

const TOKEN_COLS = 'id, label, type, current_hp, hp, owner_wallet, character_id'

function curHp(t: TargetToken): number { return t.current_hp ?? t.hp ?? 0 }
function maxHp(t: TargetToken): number { return t.hp ?? 1 }

async function fetchToken(db: SupabaseClient, tokenId: string): Promise<TargetToken | null> {
  const { data } = await db.from('tokens').select(TOKEN_COLS).eq('id', tokenId).maybeSingle()
  return (data as TargetToken) ?? null
}

/**
 * Resolve the effect target(s) for a trigger. Returns an array so 'all_party'
 * yields everyone; every other rule yields a single-element array. Falls back to
 * the triggering token on any error or unknown rule (never throws).
 */
export async function resolveTriggerTargets(
  db: SupabaseClient,
  args: { encounterId: string; triggeringTokenId: string | null; rule: string | undefined | null },
): Promise<TargetToken[]> {
  const rule = (args.rule ?? 'self') as string

  // Default / unchanged behavior.
  if (rule === 'self') {
    if (!args.triggeringTokenId) return []
    const t = await fetchToken(db, args.triggeringTokenId)
    return t ? [t] : []
  }

  // All other rules need the live party (pc) token list for the encounter.
  const { data: party, error } = await db
    .from('tokens')
    .select(TOKEN_COLS)
    .eq('encounter_id', args.encounterId)
    .eq('type', 'pc')

  const list = (party ?? []) as TargetToken[]
  if (error || list.length === 0) {
    console.error('[triggerTargeting] party load failed or empty:', error)
    if (!args.triggeringTokenId) return []
    const t = await fetchToken(db, args.triggeringTokenId)
    return t ? [t] : []
  }

  switch (rule) {
    case 'lowest_hp_party':
      return [[...list].sort((a, b) => curHp(a) - curHp(b))[0]]
    case 'highest_hp_party':
      return [[...list].sort((a, b) => curHp(b) - curHp(a))[0]]
    case 'lowest_hp_percent':
      return [[...list].sort((a, b) => curHp(a) / maxHp(a) - curHp(b) / maxHp(b))[0]]
    case 'random_party':
      return [list[Math.floor(Math.random() * list.length)]]
    case 'all_party':
      return list
    default: {
      console.warn('[triggerTargeting] unknown target_rule:', rule, '— falling back to self')
      if (!args.triggeringTokenId) return []
      const t = await fetchToken(db, args.triggeringTokenId)
      return t ? [t] : []
    }
  }
}
