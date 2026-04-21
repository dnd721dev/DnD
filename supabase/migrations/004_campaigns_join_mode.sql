-- 004_campaigns_join_mode.sql
-- Add join_mode and join_password_hash to campaigns table.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS join_mode           TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS join_password_hash  TEXT;
