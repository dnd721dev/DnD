-- 051: per-player maps + map-transition portals.
--
-- A) Players can be on different maps simultaneously. Each player's "current
--    map" is an optional override on session_players; NULL means follow the
--    GM's session default (sessions.current_map_id), preserving old behavior.
-- B) Portal triggers (map_triggers.trigger_type = 'portal') carry a destination
--    map + landing tile. Stepping on one switches that player to target_map_id
--    at (target_x, target_y).

ALTER TABLE session_players
  ADD COLUMN IF NOT EXISTS current_map_id UUID REFERENCES maps(id) ON DELETE SET NULL;

ALTER TABLE map_triggers
  ADD COLUMN IF NOT EXISTS target_map_id UUID REFERENCES maps(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS target_x      INT,
  ADD COLUMN IF NOT EXISTS target_y      INT;
