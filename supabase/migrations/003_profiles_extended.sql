-- 003_profiles_extended.sql
-- Add social + display columns to profiles that the edit-profile form expects.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS location     TEXT,
  ADD COLUMN IF NOT EXISTS timezone     TEXT,
  ADD COLUMN IF NOT EXISTS twitter      TEXT,
  ADD COLUMN IF NOT EXISTS discord      TEXT,
  ADD COLUMN IF NOT EXISTS twitch       TEXT;
