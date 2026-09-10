-- 063_maps_visible_to_session_players.sql
-- Fix: players couldn't see the map during play.
--
-- Migration 046 (public/private maps) replaced the open maps SELECT policy
-- with a library policy: public maps, your own maps, or (056) maps whose NFT
-- edition you own. That works for the LIBRARY, but it broke the TABLE — a
-- player in a session where the GM runs a PRIVATE map matches none of those
-- arms, so the map never loads on their screen.
--
-- Add the missing arm: you can always read a map that belongs to a session
-- you are a player in, or to that session's campaign. Privacy is preserved —
-- other people's private maps stay hidden from the library; only actual
-- session participants gain read access, and only for their session's maps.

DROP POLICY IF EXISTS "maps_select_library" ON maps;
CREATE POLICY "maps_select_library" ON maps FOR SELECT USING (
  visibility = 'public'
  OR lower(owner_wallet) = current_wallet()
  -- Owning any minted edition of the map unlocks it (marketplace utility).
  OR EXISTS (
    SELECT 1 FROM map_editions me
    WHERE me.map_id = maps.id
      AND lower(me.owner_wallet) = current_wallet()
  )
  -- NEW: session participants can see the maps of sessions they play in
  -- (both maps attached directly to the session and maps attached to the
  -- session's campaign).
  OR EXISTS (
    SELECT 1
    FROM session_players sp
    JOIN sessions s ON s.id = sp.session_id
    WHERE lower(sp.wallet_address) = current_wallet()
      AND (
        maps.session_id = s.id
        OR (maps.campaign_id IS NOT NULL AND maps.campaign_id = s.campaign_id)
      )
  )
);
