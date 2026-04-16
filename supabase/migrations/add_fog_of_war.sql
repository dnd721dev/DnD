-- Fog of War infrastructure
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE throughout)

-- ── fog_reveals ──────────────────────────────────────────────────────────────
-- Tile-based persistent reveals scoped to (encounter, viewer, map).
-- map_id may be NULL for sessions that use the legacy single-map URL.
-- NULLS NOT DISTINCT ensures the unique constraint treats two NULLs as equal
-- so upsert / ignoreDuplicates works correctly.

CREATE TABLE IF NOT EXISTS fog_reveals (
  encounter_id UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  viewer_wallet TEXT NOT NULL,
  map_id        UUID REFERENCES maps(id) ON DELETE CASCADE,
  tile_x        INT NOT NULL,
  tile_y        INT NOT NULL,
  CONSTRAINT fog_reveals_unique
    UNIQUE NULLS NOT DISTINCT (encounter_id, viewer_wallet, map_id, tile_x, tile_y)
);

CREATE INDEX IF NOT EXISTS fog_reveals_enc_viewer
  ON fog_reveals(encounter_id, viewer_wallet);

ALTER TABLE fog_reveals ENABLE ROW LEVEL SECURITY;

-- Open policy — auth is handled at the application layer via wallet signatures
CREATE POLICY "fog_reveals_open"
  ON fog_reveals
  USING (true)
  WITH CHECK (true);

-- ── move_my_token RPC ─────────────────────────────────────────────────────────
-- Called by MapBoardView when a player drops their token.
-- Ownership / turn checks are enforced client-side; the RPC is a thin updater.

CREATE OR REPLACE FUNCTION move_my_token(
  p_token_id UUID,
  p_x        INT,
  p_y        INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tokens
  SET x = p_x, y = p_y
  WHERE id = p_token_id;
END;
$$;

-- ── characters: speed + vision columns ───────────────────────────────────────
-- speed : movement speed in feet (5e default 30)
-- vision: darkvision / vision range in feet (5e default 30)

ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS speed  INT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS vision INT NOT NULL DEFAULT 30;
