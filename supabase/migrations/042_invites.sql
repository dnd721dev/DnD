-- ============================================================
-- Migration 042 — shareable invite links (campaign + session)
-- ------------------------------------------------------------
-- A GM generates a revocable token link. Opening /join/<token> auto-prompts
-- wallet connect and joins the campaign (and the session, for session invites).
--
-- Tokens are resolved/accepted server-side via the service role, so there is
-- no public SELECT policy — the table is GM-managed only.
-- ============================================================

CREATE TABLE IF NOT EXISTS invites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT        NOT NULL UNIQUE,            -- random url-safe slug
  campaign_id UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id  UUID        REFERENCES sessions(id) ON DELETE CASCADE,  -- null = campaign invite
  created_by  TEXT        NOT NULL,                   -- GM wallet
  role        TEXT        NOT NULL DEFAULT 'player',
  max_uses    INT,                                    -- null = unlimited
  uses        INT         NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ,                            -- null = never
  revoked     BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invites_token_idx    ON invites(token);
CREATE INDEX IF NOT EXISTS invites_campaign_idx ON invites(campaign_id);
CREATE INDEX IF NOT EXISTS invites_session_idx  ON invites(session_id) WHERE session_id IS NOT NULL;

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Only the campaign's GM can manage invites. Token preview + accept run through
-- server routes using the service role (which bypasses RLS), so no public
-- SELECT is exposed and tokens are never world-readable.
CREATE POLICY "invites_gm_all" ON invites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = invites.campaign_id AND lower(c.gm_wallet) = current_wallet()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = invites.campaign_id AND lower(c.gm_wallet) = current_wallet()
    )
  );
