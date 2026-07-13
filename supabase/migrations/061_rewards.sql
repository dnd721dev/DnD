-- ============================================================
-- Migration 061 — DND721 community reward points
-- ------------------------------------------------------------
-- One append-only ledger; each earn action is idempotent via the
-- (wallet, action, ref_id) uniqueness key:
--   • podcast_listen         — listened to a session podcast (per recording)
--   • social_share           — shared DND721 content on socials (per platform/day)
--   • play_oneshot           — played in a completed one-shot (per session)
--   • dm_oneshot             — DM'd a completed one-shot (per session)
--   • nft_rented_out         — rented an NFT to a community member (per rental)
--   • telegram_weekly_winner — weekly winner from the Telegram DND bot (per week)
-- Point values live in code (src/lib/rewards.ts) — the ledger stores the
-- points as granted so history survives future re-balancing.
-- ============================================================

CREATE TABLE IF NOT EXISTS reward_points (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet     TEXT        NOT NULL,
  action     TEXT        NOT NULL CHECK (action IN (
    'podcast_listen', 'social_share', 'play_oneshot',
    'dm_oneshot', 'nft_rented_out', 'telegram_weekly_winner'
  )),
  points     INT         NOT NULL CHECK (points > 0),
  ref_id     TEXT        NOT NULL,   -- dedupe key (session id, rental id, week, …)
  note       TEXT,                   -- context (e.g. the shared URL)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet, action, ref_id)
);

CREATE INDEX IF NOT EXISTS reward_points_wallet_idx ON reward_points(wallet);

-- Leaderboard totals
CREATE OR REPLACE VIEW reward_totals AS
  SELECT wallet, SUM(points)::int AS total_points, COUNT(*)::int AS awards, MAX(created_at) AS last_earned
  FROM reward_points
  GROUP BY wallet;

ALTER TABLE reward_points ENABLE ROW LEVEL SECURITY;
-- Read-open (leaderboard is public); all writes via service-role API routes.
CREATE POLICY "reward_points_select" ON reward_points FOR SELECT USING (true);
