-- 008_fix_monsters_and_maps.sql

-- ── 1. Fix monsters table ─────────────────────────────────────────────────────
-- The initial migration (005) used `created_by UUID → auth.users` and was
-- missing several columns.  The codebase uses `owner_wallet TEXT` throughout.

-- Drop the old auth.uid()-based policies first (they reference created_by).
DROP POLICY IF EXISTS "Users can create custom monsters"            ON monsters;
DROP POLICY IF EXISTS "Users can update their own custom monsters"  ON monsters;

-- Now safe to drop the FK column.
ALTER TABLE monsters
  DROP COLUMN IF EXISTS created_by;

ALTER TABLE monsters
  ADD COLUMN IF NOT EXISTS owner_wallet     TEXT,
  ADD COLUMN IF NOT EXISTS armor_class      INT,
  ADD COLUMN IF NOT EXISTS hit_points       INT,
  ADD COLUMN IF NOT EXISTS cr               NUMERIC,
  ADD COLUMN IF NOT EXISTS token_image_url  TEXT,
  ADD COLUMN IF NOT EXISTS tags             TEXT[] DEFAULT '{}';

CREATE POLICY "owners_can_insert_monsters"
  ON monsters FOR INSERT
  WITH CHECK (owner_wallet = current_wallet());

CREATE POLICY "owners_can_update_monsters"
  ON monsters FOR UPDATE
  USING (owner_wallet = current_wallet());

CREATE POLICY "owners_can_delete_monsters"
  ON monsters FOR DELETE
  USING (owner_wallet = current_wallet());


-- ── 2. Fix maps table ─────────────────────────────────────────────────────────
-- The codebase inserts `is_tile_map: boolean` but the table only has `type TEXT`.
-- Add the boolean column the code expects.

ALTER TABLE maps
  ADD COLUMN IF NOT EXISTS is_tile_map BOOLEAN NOT NULL DEFAULT false;
