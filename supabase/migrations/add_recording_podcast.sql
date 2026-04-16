-- Recording podcast pipeline: per-track egress files + transcripts + publish gating

-- Individual audio track per participant (for DAW editing)
CREATE TABLE IF NOT EXISTS recording_tracks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id        UUID NOT NULL REFERENCES session_recordings(id) ON DELETE CASCADE,
  session_id          UUID NOT NULL,
  participant_identity TEXT NOT NULL,
  egress_id           TEXT,
  file_key            TEXT,
  file_url            TEXT,
  transcript          TEXT,
  transcript_status   TEXT NOT NULL DEFAULT 'none',  -- none | pending | done | failed
  created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recording_tracks_recording_id_idx ON recording_tracks(recording_id);
CREATE INDEX IF NOT EXISTS recording_tracks_egress_id_idx    ON recording_tracks(egress_id) WHERE egress_id IS NOT NULL;

-- Master script + publish gating on the composite recording
ALTER TABLE session_recordings
  ADD COLUMN IF NOT EXISTS composite_transcript        TEXT,
  ADD COLUMN IF NOT EXISTS composite_transcript_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS master_script               TEXT,
  ADD COLUMN IF NOT EXISTS master_script_status        TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS published                   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS episode_number              INTEGER,
  ADD COLUMN IF NOT EXISTS episode_title               TEXT;

-- Only published episodes appear in the RSS feed
CREATE INDEX IF NOT EXISTS session_recordings_published_idx ON session_recordings(published) WHERE published = true;
