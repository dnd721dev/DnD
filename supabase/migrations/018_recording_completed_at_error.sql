-- Migration 018: add completed_at and error columns to recording tables
--
-- The webhook sets status='completed' but never stored when that happened.
-- The error column lets the recovery endpoint persist failure reasons.

ALTER TABLE session_recordings
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error        TEXT;

ALTER TABLE recording_tracks
  ADD COLUMN IF NOT EXISTS error TEXT;

-- Back-fill completed_at for existing completed rows using stopped_at as
-- a reasonable approximation (stopped_at ≈ when egress was requested to stop,
-- completed_at = when S3 upload finished; they're close enough for display).
UPDATE session_recordings
SET completed_at = stopped_at
WHERE status = 'completed'
  AND completed_at IS NULL
  AND stopped_at IS NOT NULL;
