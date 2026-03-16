-- Add active_entry_id to encounters so all clients can track whose turn it is via realtime
ALTER TABLE encounters
  ADD COLUMN IF NOT EXISTS active_entry_id TEXT REFERENCES initiative_entries(id) ON DELETE SET NULL;
