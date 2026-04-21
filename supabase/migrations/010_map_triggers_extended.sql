-- 010_map_triggers_extended.sql
-- Add trigger type, damage, and condition fields to map_triggers.

ALTER TABLE map_triggers
  ADD COLUMN IF NOT EXISTS trigger_type      TEXT DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS damage_dice       TEXT,
  ADD COLUMN IF NOT EXISTS damage_type       TEXT,
  ADD COLUMN IF NOT EXISTS condition_applied TEXT;
