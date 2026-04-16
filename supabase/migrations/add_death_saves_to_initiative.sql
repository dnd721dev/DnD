-- Add death_saves column to initiative_entries to persist death save state cross-device
ALTER TABLE initiative_entries
  ADD COLUMN IF NOT EXISTS death_saves jsonb DEFAULT '{"s":0,"f":0}';
