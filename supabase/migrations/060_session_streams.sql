-- ============================================================
-- Migration 060 — live streaming (RTMP egress to X/Twitch/YouTube)
-- ------------------------------------------------------------
-- Tracks LiveKit RTMP egresses started from the table so any participant
-- can see that the session is live, and the starter (or GM) can stop it.
-- Stream keys are NEVER stored — only the platform label and egress id.
-- ============================================================

CREATE TABLE IF NOT EXISTS session_streams (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  egress_id      TEXT        NOT NULL,
  room_name      TEXT        NOT NULL,
  platform       TEXT        NOT NULL DEFAULT 'custom'
    CHECK (platform IN ('twitch', 'youtube', 'x', 'custom')),
  started_by     TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended', 'failed')),
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS session_streams_session_idx ON session_streams(session_id, status);

ALTER TABLE session_streams ENABLE ROW LEVEL SECURITY;
-- Read-open (the "LIVE" badge is public info); writes via service-role API.
CREATE POLICY "session_streams_select" ON session_streams FOR SELECT USING (true);
