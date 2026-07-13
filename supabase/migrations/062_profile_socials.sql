-- ============================================================
-- Migration 062 — linked social & podcast accounts
-- ------------------------------------------------------------
-- Users link their socials (and Spotify) to their profile; the reward
-- system then DETECTS activity instead of trusting pasted links:
--   • spotify   — OAuth tokens; verifies actual podcast listens
--   • reddit    — handle; public JSON API scanned for DND721 posts/comments
--   • x         — handle; scanned via the X API when X_BEARER_TOKEN is set
--   • instagram / tiktok / youtube / telegram — handle stored for manual
--     verification (no public read APIs for per-user content)
--
-- OAuth tokens are SECRET: RLS is enabled with NO select policy, so only
-- the service-role API routes can read this table. Clients see a redacted
-- view via /api/socials.
-- ============================================================

CREATE TABLE IF NOT EXISTS profile_socials (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet        TEXT        NOT NULL,
  platform      TEXT        NOT NULL CHECK (platform IN (
    'spotify', 'x', 'reddit', 'instagram', 'tiktok', 'youtube', 'telegram'
  )),
  handle        TEXT,                -- @name / username (non-OAuth platforms)
  access_token  TEXT,                -- OAuth platforms (spotify)
  refresh_token TEXT,
  token_expires TIMESTAMPTZ,
  external_id   TEXT,                -- platform user id when known
  verified      BOOLEAN     NOT NULL DEFAULT false,  -- true for OAuth links
  last_scan     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (wallet, platform)
);

CREATE INDEX IF NOT EXISTS profile_socials_wallet_idx ON profile_socials(wallet);

ALTER TABLE profile_socials ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: tokens are readable only via service role.
