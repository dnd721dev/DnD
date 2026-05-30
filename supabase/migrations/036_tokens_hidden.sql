-- ============================================================
-- Migration 036 — tokens.hidden
-- ------------------------------------------------------------
-- NPC Wave 1: GM-side "hide / reveal" toggle for NPC and monster
-- tokens. Players' MapBoardView skips drawing rows where hidden
-- = true; the GM's MapBoard draws them at half opacity with a
-- "hidden" badge so the GM always knows which tokens are
-- invisible to the table.
--
-- Pattern mirrors map_triggers.is_hidden in 002.
--
-- RLS: migration 033 already restricts tokens writes to owner OR
-- session GM. That predicate covers UPDATE on this new column
-- without modification.
--
-- Realtime: tokens is already in supabase_realtime (002), so
-- payloads carry the new column automatically — no publication
-- change needed.
-- ============================================================

ALTER TABLE tokens
  ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;
