-- ============================================================
-- Migration 040 — realtime hardening
-- ------------------------------------------------------------
-- Fixes "have to refresh" gaps in the combat system.
--
-- 1. current_wallet() only read the x-wallet-address request header.
--    The realtime WebSocket has no request headers, so every identity-
--    scoped RLS policy evaluated to NULL over realtime and delivered no
--    events. WalletJwtGate calls supabase.realtime.setAuth(jwt), so the
--    socket runs as 'authenticated' with a wallet_address JWT claim — add
--    that as a fallback so header-based RLS also works over realtime.
--    REST is unchanged (header still takes precedence).
--
-- 2. characters was never added to the supabase_realtime publication, so
--    PlayerSidebar (action_state, sheet HP) and MapBoardView (move_used_ft)
--    subscriptions never fired — sheet HP after damage and movement budget
--    at turn start required a manual refresh.
--
-- 3. No table had REPLICA IDENTITY FULL. Realtime DELETE payloads then carry
--    only the primary key, so subscriptions filtered on a non-PK column
--    (tokens/initiative_entries filtered by encounter_id) drop DELETE events
--    — removed tokens/combatants lingered on other clients until refresh.
-- ============================================================

-- ── 1. current_wallet(): header → JWT claim fallback ─────────
CREATE OR REPLACE FUNCTION current_wallet()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT lower(nullif(coalesce(
    current_setting('request.headers', true)::json ->> 'x-wallet-address',
    auth.jwt() ->> 'wallet_address'
  ), ''))
$$;

-- ── 2. Add characters to the realtime publication (idempotent) ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'characters'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE characters;
  END IF;
END
$$;

-- ── 3. REPLICA IDENTITY FULL so filtered UPDATE/DELETE payloads ─
--    include the filter columns (and full old row for deletes).
ALTER TABLE tokens             REPLICA IDENTITY FULL;
ALTER TABLE initiative_entries REPLICA IDENTITY FULL;
ALTER TABLE fog_reveals        REPLICA IDENTITY FULL;
ALTER TABLE characters         REPLICA IDENTITY FULL;
ALTER TABLE encounters         REPLICA IDENTITY FULL;
