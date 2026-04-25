-- Migration 016: recording_tracks realtime publication + file_status column
--
-- Bug 9:  recording_tracks was not in the realtime publication, so the
--         recording editor page never received live updates when tracks
--         became available.
-- Bug 11: recording_tracks had no column to indicate whether the audio
--         file itself was ready (only transcript_status existed).

-- 1. Add file_status to track the egress-file lifecycle independently
--    of transcript status.  Set to 'ready' in the webhook when the
--    egress_ended event arrives and file_url is confirmed.
ALTER TABLE recording_tracks
  ADD COLUMN IF NOT EXISTS file_status TEXT NOT NULL DEFAULT 'recording';
  -- values: recording | ready | failed

-- 2. Back-fill: any existing row that already has a file_url is 'ready'
UPDATE recording_tracks
SET file_status = 'ready'
WHERE file_url IS NOT NULL AND file_status = 'recording';

-- 3. Add to realtime publication so the recording editor page receives
--    live updates when file_status / file_url change.
ALTER PUBLICATION supabase_realtime ADD TABLE recording_tracks;
ALTER PUBLICATION supabase_realtime ADD TABLE recording_markers;
