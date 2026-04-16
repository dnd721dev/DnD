-- Characters: CAYA flag and XP accumulator
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS is_caya boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS experience_points integer NOT NULL DEFAULT 0;

-- Sessions: type, required level, and XP award record
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'set_level',
  ADD COLUMN IF NOT EXISTS required_level integer,
  ADD COLUMN IF NOT EXISTS xp_award integer;
