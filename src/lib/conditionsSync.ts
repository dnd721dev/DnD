import type { SupabaseClient } from '@supabase/supabase-js'

// Single canonical write for a creature's conditions. Calls the set_conditions
// RPC (SECURITY DEFINER) which mirrors the list to BOTH stores for the linked
// token<->character pair:
//   • tokens.conditions                       → map rings / initiative pips / DM panels
//   • characters.action_state.active_conditions → PlayerSidebar enforcement + sheet
//
// Pass whichever id you have: a tokenId at the table, or a characterId on the
// sheet/dashboard. (Passing both is fine.) The RPC bypasses the owner-only
// characters RLS after authorizing the caller as the session GM / participant /
// character owner, so a GM CAN restrict a player's PC.
export async function setConditions(
  db: SupabaseClient,
  args: { tokenId?: string | null; characterId?: string | null; conditions: string[] },
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db.rpc('set_conditions', {
    p_conditions: args.conditions,
    p_token_id: args.tokenId ?? null,
    p_character_id: args.characterId ?? null,
  })
  if (error) {
    console.error('[conditionsSync] set_conditions failed', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
