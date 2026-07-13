// src/lib/rewards.ts
// Community reward points — point values + the idempotent award helper.
// The ledger (reward_points, migration 061) dedupes on (wallet, action,
// ref_id), so hooks can fire repeatedly without double-granting.

import type { supabaseAdmin } from './supabaseAdmin'

export type RewardAction =
  | 'podcast_listen'
  | 'social_share'
  | 'play_oneshot'
  | 'dm_oneshot'
  | 'nft_rented_out'
  | 'telegram_weekly_winner'

/** Point values per action. History stores points-as-granted, so these can
 *  be rebalanced later without rewriting the past. */
export const REWARD_POINTS: Record<RewardAction, number> = {
  podcast_listen:         5,
  social_share:           10,
  play_oneshot:           25,
  dm_oneshot:             50,
  nft_rented_out:         20,
  telegram_weekly_winner: 100,
}

export const REWARD_LABELS: Record<RewardAction, string> = {
  podcast_listen:         'Listened to a session podcast',
  social_share:           'Shared DND721 on socials',
  play_oneshot:           'Played in a one-shot',
  dm_oneshot:             "DM'd a one-shot",
  nft_rented_out:         'Rented an NFT to the community',
  telegram_weekly_winner: 'Telegram weekly winner',
}

export type AwardResult = { awarded: boolean; points: number }

/** Grant points once per (wallet, action, refId). Safe to call repeatedly —
 *  duplicate grants are silently skipped. */
export async function awardPoints(
  db: ReturnType<typeof supabaseAdmin>,
  args: { wallet: string; action: RewardAction; refId: string; note?: string },
): Promise<AwardResult> {
  const points = REWARD_POINTS[args.action]
  const { error } = await db.from('reward_points').insert({
    wallet: args.wallet.toLowerCase(),
    action: args.action,
    points,
    ref_id: args.refId,
    note: args.note ?? null,
  })
  if (error) {
    // 23505 = unique violation → already awarded; anything else is real.
    if ((error as any).code === '23505') return { awarded: false, points: 0 }
    console.error('[rewards] award failed', args.action, error.message)
    return { awarded: false, points: 0 }
  }
  return { awarded: true, points }
}
