-- ============================================================
-- 023_chat_fixes.sql
--
-- Fixes two critical chat bugs identified in chat_bugs.md:
--
-- BUG 1 (CRITICAL): 022_combat_persistence.sql added a blanket
--   SELECT policy "session_messages_select_open" with USING(true).
--   PostgreSQL ORs multiple SELECT policies, so this policy
--   neutralises the whisper-filtering policy from 002 and makes
--   ALL messages (including whispers) visible to everyone.
--   Fix: drop the open policy.
--
-- BUG 2 / BUG 4 (CRITICAL/HIGH): session_players.wallet_address
--   has no FK to profiles.wallet_address, so PostgREST cannot
--   resolve the embedded-resource join used by TableChat to build
--   the participant/whisper list.  Every mount, the query fails
--   and TableChat falls back to an empty participant list
--   ("No other players connected") and empty avatarMap.
--   Fix: add the missing FK.
-- ============================================================


-- ── BUG 1: Drop the open SELECT policy added by 022 ──────────
-- The whisper-aware policy "session_messages_select" (from 002)
-- is correct and complete; no replacement needed.
DROP POLICY IF EXISTS "session_messages_select_open" ON public.session_messages;


-- ── BUG 2 / BUG 4: Add FK from session_players → profiles ────
-- Allows PostgREST to follow session_players.wallet_address →
-- profiles.wallet_address for embedded-resource joins.
-- NOT VALID avoids a full table scan on existing rows.
ALTER TABLE public.session_players
  ADD CONSTRAINT fk_session_players_profile
    FOREIGN KEY (wallet_address)
    REFERENCES public.profiles(wallet_address)
    ON DELETE CASCADE
    NOT VALID;
