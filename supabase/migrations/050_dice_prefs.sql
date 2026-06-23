-- 050: per-user 3D dice customization.
--
-- Stores the player's dice appearance + sound prefs so their rolls at the table
-- render in their chosen style. Shape (all optional):
--   { skin, bodyColor, numberColor, material:'plastic'|'metal'|'glass',
--     soundEnabled:boolean, soundVolume:0..1 }

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dice_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;
