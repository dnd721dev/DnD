-- Migration 015: Add fog_reveals to the Supabase Realtime publication
-- Without this, GM fog-brush reveals are written to the DB but player browsers
-- never receive the postgres_changes event, so they must hard-refresh to see
-- newly uncovered tiles.

ALTER PUBLICATION supabase_realtime ADD TABLE fog_reveals;
