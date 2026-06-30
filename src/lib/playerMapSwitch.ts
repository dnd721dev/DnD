import type { SupabaseClient } from '@supabase/supabase-js'

// Token x/y are stored in PIXEL space (a token on tile T sits at its center,
// T*GRID_SIZE + GRID_SIZE/2), matching the MapBoard/MapBoardView renderer which
// uses gridSize=50. Landing positions come in as TILE indices, so convert.
const GRID_SIZE = 50
const tileToPixel = (tile: number) => tile * GRID_SIZE + GRID_SIZE / 2

/**
 * Move one player onto a different map within a session.
 *  1. Sets session_players.current_map_id (the per-player "current map" override).
 *  2. Moves that player's PC token(s) onto the new map (so they actually appear
 *     on it), optionally to a specific landing TILE (x/y are tile indices).
 *
 * Used by both the GM "Party Maps" assignment route and the portal auto-switch.
 * Caller is responsible for auth.
 */
export async function switchPlayerMap(
  db: SupabaseClient,
  params: { sessionId: string; targetWallet: string; mapId: string; x?: number | null; y?: number | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const wallet = params.targetWallet.toLowerCase()

  // 1. Per-player current map override.
  const { error: spErr } = await db
    .from('session_players')
    .update({ current_map_id: params.mapId })
    .eq('session_id', params.sessionId)
    .eq('wallet_address', wallet)
  if (spErr) return { ok: false, error: spErr.message }

  // 2. Move the player's token(s) to the new map. Tokens hang off the session's
  //    encounter(s); update every PC token this wallet owns in the session.
  const { data: encs } = await db
    .from('encounters')
    .select('id')
    .eq('session_id', params.sessionId)
  const encIds = (encs ?? []).map((e: any) => e.id)

  if (encIds.length > 0) {
    const patch: Record<string, unknown> = { map_id: params.mapId }
    // x/y arrive as TILE indices; tokens are stored at the tile's pixel center.
    if (typeof params.x === 'number') patch.x = tileToPixel(params.x)
    if (typeof params.y === 'number') patch.y = tileToPixel(params.y)
    const { error: tokErr } = await db
      .from('tokens')
      .update(patch)
      .in('encounter_id', encIds)
      .eq('owner_wallet', wallet)
    if (tokErr) return { ok: false, error: tokErr.message }
  }

  return { ok: true }
}

/** Returns the session's GM wallet (lowercased) or null. */
export async function getSessionGm(db: SupabaseClient, sessionId: string): Promise<string | null> {
  const { data } = await db.from('sessions').select('gm_wallet').eq('id', sessionId).maybeSingle()
  return data?.gm_wallet ? String(data.gm_wallet).toLowerCase() : null
}
