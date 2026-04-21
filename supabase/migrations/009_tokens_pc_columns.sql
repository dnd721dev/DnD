-- 009_tokens_pc_columns.sql
-- Add character_id and token_image_url to tokens for PC spawning.

ALTER TABLE tokens
  ADD COLUMN IF NOT EXISTS character_id    UUID REFERENCES characters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token_image_url TEXT;
