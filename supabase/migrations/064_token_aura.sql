-- 064_token_aura.sql
-- Spell auras (Spirit Guardians, Circle of Power, etc.). When a caster
-- concentrates on an emanation spell, the app stamps the aura on the caster's
-- token so a radius ring can be drawn that FOLLOWS the token and clears when
-- concentration ends. Two additive, nullable columns — no behavior change to
-- any existing query.

ALTER TABLE tokens
  ADD COLUMN IF NOT EXISTS aura_radius_ft INTEGER,
  ADD COLUMN IF NOT EXISTS aura_label     TEXT,
  ADD COLUMN IF NOT EXISTS aura_color     TEXT;
